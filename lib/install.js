const { spawn } = require('child_process');
const fs = require('fs-extra');
const path = require('path');
const ora = require('ora');
const { logSuccess, logInfo, logWarning, logDim } = require('./console');

/**
 * Package Manager Detection and Installation System
 * 
 * This module provides functionality to:
 * - Detect available package managers (npm, yarn, pnpm)
 * - Manage package.json dependencies
 * - Execute package installations with progress indication
 * - Handle installation errors and recovery
 * - Proactive peer dependency analysis and feedback
 */

/**
 * Supported package managers with their configurations
 */
const PACKAGE_MANAGERS = {
  npm: {
    name: 'npm',
    command: 'npm',
    installArgs: ['install'],
    silentArgs: ['--silent', '--no-audit'],
    lockFile: 'package-lock.json',
    checkCommand: ['--version'],
    spinnerColor: 'red'
  },
  yarn: {
    name: 'yarn',
    command: 'yarn',
    installArgs: ['install'],
    silentArgs: ['--silent'],
    lockFile: 'yarn.lock',
    checkCommand: ['--version'],
    spinnerColor: 'blue'
  },
  pnpm: {
    name: 'pnpm',
    command: 'pnpm',
    installArgs: ['install'],
    silentArgs: ['--silent'],
    lockFile: 'pnpm-lock.yaml',
    checkCommand: ['--version'],
    spinnerColor: 'yellow'
  }
};

/**
 * Default Next.js dependencies that are always included
 */
const DEFAULT_DEPENDENCIES = {
  dependencies: {
    'next': '^14.0.0',
    'react': '^18.0.0',
    'react-dom': '^18.0.0'
  },
  devDependencies: {
    '@types/node': '^20.0.0',
    '@types/react': '^18.0.0',
    '@types/react-dom': '^18.0.0',
    'typescript': '^5.0.0',
    'eslint': '^8.0.0',
    'eslint-config-next': '^14.0.0'
  }
};

/**
 * Installation progress phases with descriptive messages
 */
const INSTALLATION_PHASES = {
  PREPARING: 'Preparing installation...',
  RESOLVING: 'Resolving dependencies...',
  DOWNLOADING: 'Downloading packages...',
  LINKING: 'Linking dependencies...',
  BUILDING: 'Building packages...',
  FINALIZING: 'Finalizing installation...'
};

/**
 * Progress UI manager for package installation
 */
class InstallationProgressUI {
  constructor(packageManager, options = {}) {
    this.packageManager = packageManager;
    this.options = {
      silent: false,
      verbose: false,
      ...options
    };
    this.spinner = null;
    this.startTime = null;
    this.currentPhase = null;
  }

  /**
   * Start the progress spinner
   * @param {string} initialMessage - Initial message to display
   */
  start(initialMessage = INSTALLATION_PHASES.PREPARING) {
    if (this.options.silent) {
      return;
    }

    this.startTime = Date.now();
    this.spinner = ora({
      text: initialMessage,
      color: this.packageManager.spinnerColor || 'cyan',
      spinner: 'dots'
    }).start();

    this.currentPhase = 'PREPARING';
  }

  /**
   * Update the spinner text and phase
   * @param {string} phase - Installation phase key
   * @param {string} [customMessage] - Custom message to override default
   */
  updatePhase(phase, customMessage) {
    if (this.options.silent || !this.spinner) {
      return;
    }

    this.currentPhase = phase;
    const message = customMessage || INSTALLATION_PHASES[phase] || phase;
    const elapsed = this.getElapsedTime();
    
    this.spinner.text = `${message} ${elapsed}`;
  }

  /**
   * Update spinner with custom message
   * @param {string} message - Custom message to display
   */
  updateMessage(message) {
    if (this.options.silent || !this.spinner) {
      return;
    }

    const elapsed = this.getElapsedTime();
    this.spinner.text = `${message} ${elapsed}`;
  }

  /**
   * Mark installation as successful
   * @param {string} [message] - Success message
   */
  succeed(message) {
    if (this.options.silent || !this.spinner) {
      if (!this.options.silent) {
        console.log(message || '✅ Installation completed successfully!');
      }
      return;
    }

    const elapsed = this.getElapsedTime();
    const finalMessage = message || `Installation completed successfully! ${elapsed}`;
    this.spinner.succeed(finalMessage);
    this.cleanup();
  }

  /**
   * Mark installation as failed
   * @param {string} [message] - Error message
   */
  fail(message) {
    if (this.options.silent || !this.spinner) {
      if (!this.options.silent) {
        console.error(message || '❌ Installation failed!');
      }
      return;
    }

    const elapsed = this.getElapsedTime();
    const finalMessage = message || `Installation failed! ${elapsed}`;
    this.spinner.fail(finalMessage);
    this.cleanup();
  }

  /**
   * Stop spinner with warning
   * @param {string} [message] - Warning message
   */
  warn(message) {
    if (this.options.silent || !this.spinner) {
      if (!this.options.silent) {
        console.warn(message || '⚠️  Installation completed with warnings');
      }
      return;
    }

    const elapsed = this.getElapsedTime();
    const finalMessage = message || `Installation completed with warnings ${elapsed}`;
    this.spinner.warn(finalMessage);
    this.cleanup();
  }

  /**
   * Stop spinner with info message
   * @param {string} [message] - Info message
   */
  info(message) {
    if (this.options.silent || !this.spinner) {
      if (!this.options.silent) {
        console.info(message || 'ℹ️  Installation information');
      }
      return;
    }

    const elapsed = this.getElapsedTime();
    const finalMessage = message || `Installation info ${elapsed}`;
    this.spinner.info(finalMessage);
    this.cleanup();
  }

  /**
   * Stop and cleanup spinner
   */
  stop() {
    if (this.spinner) {
      this.spinner.stop();
      this.cleanup();
    }
  }

  /**
   * Get elapsed time since start
   * @returns {string} - Formatted elapsed time
   */
  getElapsedTime() {
    if (!this.startTime) {
      return '';
    }

    const elapsed = Date.now() - this.startTime;
    const seconds = Math.floor(elapsed / 1000);
    
    if (seconds < 60) {
      return `(${seconds}s)`;
    } else {
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = seconds % 60;
      return `(${minutes}m ${remainingSeconds}s)`;
    }
  }

  /**
   * Cleanup spinner resources
   */
  cleanup() {
    this.spinner = null;
    this.startTime = null;
    this.currentPhase = null;
  }

  /**
   * Log verbose information if verbose mode is enabled
   * @param {string} message - Message to log
   */
  verbose(message) {
    if (this.options.verbose && !this.options.silent) {
      console.log(`[VERBOSE] ${message}`);
    }
  }

  /**
   * Handle process interruption gracefully
   */
  handleInterruption() {
    if (this.spinner) {
      this.fail('Installation interrupted by user');
    }
  }
}

/**
 * Create and configure progress UI for installation
 * @param {Object} packageManager - Package manager configuration
 * @param {Object} options - Progress UI options
 * @param {boolean} [options.silent=false] - Silent mode (no spinner)
 * @param {boolean} [options.verbose=false] - Verbose logging
 * @returns {InstallationProgressUI} - Progress UI instance
 */
function createProgressUI(packageManager, options = {}) {
  const progressUI = new InstallationProgressUI(packageManager, options);

  // Handle process interruption
  const handleInterruption = () => {
    progressUI.handleInterruption();
    process.exit(1);
  };

  process.on('SIGINT', handleInterruption);
  process.on('SIGTERM', handleInterruption);

  return progressUI;
}

/**
 * Simulate installation phases for testing
 * @param {InstallationProgressUI} progressUI - Progress UI instance
 * @param {number} [duration=5000] - Total simulation duration in ms
 * @returns {Promise<void>}
 */
async function simulateInstallation(progressUI, duration = 5000) {
  const phases = Object.keys(INSTALLATION_PHASES);
  const phaseTime = duration / phases.length;

  progressUI.start();

  for (let i = 0; i < phases.length; i++) {
    const phase = phases[i];
    progressUI.updatePhase(phase);
    
    // Simulate work
    await new Promise(resolve => setTimeout(resolve, phaseTime));
  }

  progressUI.succeed();
}

/**
 * Check if a package manager is available on the system
 * @param {string} manager - Package manager name (npm, yarn, pnpm)
 * @returns {Promise<boolean>} - True if available, false otherwise
 */
async function isPackageManagerAvailable(manager) {
  const config = PACKAGE_MANAGERS[manager];
  if (!config) {
    return false;
  }

  return new Promise((resolve) => {
    let resolved = false;
    
    const child = spawn(config.command, config.checkCommand, {
      stdio: 'ignore',
      shell: true
    });

    const resolveOnce = (value) => {
      if (!resolved) {
        resolved = true;
        resolve(value);
      }
    };

    child.on('close', (code) => {
      resolveOnce(code === 0);
    });

    child.on('error', () => {
      resolveOnce(false);
    });

    // Timeout after 5 seconds
    const timeout = setTimeout(() => {
      if (child && typeof child.kill === 'function') {
        try {
          child.kill();
        } catch (error) {
          // Ignore kill errors
        }
      }
      resolveOnce(false);
    }, 5000);

    // Clean up timeout if process completes early
    child.on('close', () => {
      clearTimeout(timeout);
    });

    child.on('error', () => {
      clearTimeout(timeout);
    });
  });
}

/**
 * Detect available package managers on the system
 * @returns {Promise<string[]>} - Array of available package manager names
 */
async function detectAvailablePackageManagers() {
  const managers = Object.keys(PACKAGE_MANAGERS);
  const availableManagers = [];

  for (const manager of managers) {
    const isAvailable = await isPackageManagerAvailable(manager);
    if (isAvailable) {
      availableManagers.push(manager);
    }
  }

  return availableManagers;
}

/**
 * Detect preferred package manager based on lock files in the project directory
 * @param {string} projectDir - Project directory path
 * @returns {Promise<string|null>} - Preferred package manager name or null
 */
async function detectPreferredPackageManager(projectDir) {
  const managers = Object.keys(PACKAGE_MANAGERS);

  for (const manager of managers) {
    const config = PACKAGE_MANAGERS[manager];
    const lockFilePath = path.join(projectDir, config.lockFile);
    
    try {
      if (await fs.pathExists(lockFilePath)) {
        return manager;
      }
    } catch (error) {
      // Continue checking other managers
    }
  }

  return null;
}

/**
 * Get the best package manager to use based on availability and preferences
 * @param {Object} options - Configuration options
 * @param {string} [options.projectDir] - Project directory path
 * @param {string} [options.preferredManager] - User's preferred package manager
 * @param {boolean} [options.allowFallback=true] - Allow fallback to other managers
 * @returns {Promise<Object>} - Package manager configuration object
 */
async function getPackageManager(options = {}) {
  const {
    projectDir = process.cwd(),
    preferredManager,
    allowFallback = true
  } = options;

  const availableManagers = await detectAvailablePackageManagers();

  if (availableManagers.length === 0) {
    throw new Error('No package manager found. Please install npm, yarn, or pnpm.');
  }

  // If user specified a preferred manager, try to use it
  if (preferredManager) {
    if (availableManagers.includes(preferredManager)) {
      return {
        ...PACKAGE_MANAGERS[preferredManager],
        reason: 'user preference'
      };
    } else if (!allowFallback) {
      throw new Error(`Preferred package manager '${preferredManager}' is not available.`);
    }
  }

  // Try to detect based on lock files
  const detectedManager = await detectPreferredPackageManager(projectDir);
  if (detectedManager && availableManagers.includes(detectedManager)) {
    return {
      ...PACKAGE_MANAGERS[detectedManager],
      reason: 'detected from lock file'
    };
  }

  // Fallback to the first available manager (preference order: npm, yarn, pnpm)
  const fallbackOrder = ['npm', 'yarn', 'pnpm'];
  for (const manager of fallbackOrder) {
    if (availableManagers.includes(manager)) {
      return {
        ...PACKAGE_MANAGERS[manager],
        reason: 'fallback'
      };
    }
  }

  // This should never happen since we checked availableManagers.length > 0
  throw new Error('No suitable package manager found.');
}

/**
 * Read and parse package.json file
 * @param {string} projectDir - Project directory path
 * @returns {Promise<Object>} - Parsed package.json object or default structure
 */
async function readPackageJson(projectDir) {
  const packageJsonPath = path.join(projectDir, 'package.json');
  
  try {
    if (await fs.pathExists(packageJsonPath)) {
      const content = await fs.readFile(packageJsonPath, 'utf8');
      return JSON.parse(content);
    }
  } catch (error) {
    console.warn(`Warning: Could not read package.json: ${error.message}`);
  }

  // Return default package.json structure
  return {
    name: path.basename(projectDir),
    version: '0.1.0',
    private: true,
    scripts: {
      dev: 'next dev',
      build: 'next build',
      start: 'next start',
      lint: 'next lint'
    },
    dependencies: {},
    devDependencies: {}
  };
}

/**
 * Validate package.json structure
 * @param {Object} packageJson - Package.json object to validate
 * @returns {Object} - Validation result with isValid and errors
 */
function validatePackageJson(packageJson) {
  const errors = [];

  if (!packageJson || typeof packageJson !== 'object') {
    errors.push('Package.json must be a valid object');
    return { isValid: false, errors };
  }

  if (!packageJson.name || typeof packageJson.name !== 'string') {
    errors.push('Package name is required and must be a string');
  }

  if (!packageJson.version || typeof packageJson.version !== 'string') {
    errors.push('Package version is required and must be a string');
  }

  // Validate dependencies structure
  const depFields = ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies'];
  for (const field of depFields) {
    if (packageJson[field] && typeof packageJson[field] !== 'object') {
      errors.push(`${field} must be an object`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Merge dependencies from multiple sources with conflict resolution
 * @param {Object} baseDeps - Base dependencies object
 * @param {Object} newDeps - New dependencies to merge
 * @param {Object} options - Merge options
 * @param {boolean} [options.overwrite=false] - Whether to overwrite existing versions
 * @param {boolean} [options.preferNewer=true] - Prefer newer versions when conflicting
 * @returns {Object} - Merged dependencies object
 */
function mergeDependencies(baseDeps = {}, newDeps = {}, options = {}) {
  const { overwrite = false, preferNewer = true } = options;
  const merged = { ...baseDeps };

  for (const [pkg, version] of Object.entries(newDeps)) {
    if (!merged[pkg] || overwrite) {
      merged[pkg] = version;
    } else if (preferNewer && merged[pkg] !== version) {
      // Simple version comparison - in a real implementation, you'd use semver
      // For now, we'll keep the existing version unless explicitly overwriting
      console.warn(`Version conflict for ${pkg}: existing ${merged[pkg]}, new ${version}. Keeping existing.`);
    }
  }

  return merged;
}

/**
 * Update package.json with new dependencies
 * @param {string} projectDir - Project directory path
 * @param {Object} newDependencies - Dependencies to add/update
 * @param {Object} [newDependencies.dependencies] - Production dependencies
 * @param {Object} [newDependencies.devDependencies] - Development dependencies
 * @param {Object} [newDependencies.peerDependencies] - Peer dependencies
 * @param {Object} options - Update options
 * @param {boolean} [options.backup=true] - Create backup before updating
 * @param {boolean} [options.overwrite=false] - Overwrite existing versions
 * @returns {Promise<Object>} - Updated package.json object
 */
async function updatePackageJson(projectDir, newDependencies = {}, options = {}) {
  const { backup = true, overwrite = false } = options;
  const packageJsonPath = path.join(projectDir, 'package.json');

  // Read existing package.json
  let packageJson = await readPackageJson(projectDir);

  // Validate existing package.json
  const validation = validatePackageJson(packageJson);
  if (!validation.isValid) {
    throw new Error(`Invalid package.json: ${validation.errors.join(', ')}`);
  }

  // Create backup if requested
  if (backup && await fs.pathExists(packageJsonPath)) {
    const backupPath = path.join(projectDir, 'package.json.backup');
    await fs.copy(packageJsonPath, backupPath);
  }

  // Merge dependencies
  const mergeOptions = { overwrite };
  
  if (newDependencies.dependencies) {
    packageJson.dependencies = mergeDependencies(
      packageJson.dependencies,
      newDependencies.dependencies,
      mergeOptions
    );
  }

  if (newDependencies.devDependencies) {
    packageJson.devDependencies = mergeDependencies(
      packageJson.devDependencies,
      newDependencies.devDependencies,
      mergeOptions
    );
  }

  if (newDependencies.peerDependencies) {
    packageJson.peerDependencies = mergeDependencies(
      packageJson.peerDependencies || {},
      newDependencies.peerDependencies,
      mergeOptions
    );
  }

  // Ensure required scripts exist
  if (!packageJson.scripts) {
    packageJson.scripts = {};
  }

  const requiredScripts = {
    dev: 'next dev',
    build: 'next build',
    start: 'next start',
    lint: 'next lint'
  };

  for (const [script, command] of Object.entries(requiredScripts)) {
    if (!packageJson.scripts[script]) {
      packageJson.scripts[script] = command;
    }
  }

  return packageJson;
}

/**
 * Write package.json to disk
 * @param {string} projectDir - Project directory path
 * @param {Object} packageJson - Package.json object to write
 * @returns {Promise<void>}
 */
async function writePackageJson(projectDir, packageJson) {
  const packageJsonPath = path.join(projectDir, 'package.json');
  
  // Validate before writing
  const validation = validatePackageJson(packageJson);
  if (!validation.isValid) {
    throw new Error(`Cannot write invalid package.json: ${validation.errors.join(', ')}`);
  }

  // Write with proper formatting
  const content = JSON.stringify(packageJson, null, 2) + '\n';
  await fs.writeFile(packageJsonPath, content, 'utf8');
}

/**
 * Prepare dependencies for a project based on selected SDK packages
 * @param {Array<string>} selectedPackages - Array of selected SDK package names
 * @param {Object} templateConfigs - Template configurations containing dependencies
 * @returns {Object} - Combined dependencies object
 */
function prepareDependencies(selectedPackages = [], templateConfigs = {}) {
  let combinedDeps = {
    dependencies: { ...DEFAULT_DEPENDENCIES.dependencies },
    devDependencies: { ...DEFAULT_DEPENDENCIES.devDependencies }
  };

  // Add dependencies from selected packages
  for (const packageName of selectedPackages) {
    const config = templateConfigs[packageName];
    if (config && config.dependencies) {
      if (config.dependencies.dependencies) {
        combinedDeps.dependencies = mergeDependencies(
          combinedDeps.dependencies,
          config.dependencies.dependencies
        );
      }
      if (config.dependencies.devDependencies) {
        combinedDeps.devDependencies = mergeDependencies(
          combinedDeps.devDependencies,
          config.dependencies.devDependencies
        );
      }
    }
  }

  return combinedDeps;
}

/**
 * Restore package.json from backup
 * @param {string} projectDir - Project directory path
 * @returns {Promise<boolean>} - True if restored successfully, false otherwise
 */
async function restorePackageJsonBackup(projectDir) {
  const packageJsonPath = path.join(projectDir, 'package.json');
  const backupPath = path.join(projectDir, 'package.json.backup');

  try {
    if (await fs.pathExists(backupPath)) {
      await fs.copy(backupPath, packageJsonPath);
      await fs.remove(backupPath); // Clean up backup
      return true;
    }
  } catch (error) {
    console.error(`Failed to restore package.json backup: ${error.message}`);
  }

  return false;
}

/**
 * Installation result object
 */
class InstallationResult {
  constructor(success = false, data = null, error = null, warnings = []) {
    this.success = success;
    this.data = data;
    this.error = error;
    this.warnings = warnings;
    this.timestamp = new Date().toISOString();
  }

  /**
   * Create a successful result
   * @param {*} data - Success data
   * @param {Array<string>} warnings - Optional warnings
   * @returns {InstallationResult}
   */
  static success(data, warnings = []) {
    return new InstallationResult(true, data, null, warnings);
  }

  /**
   * Create a failed result
   * @param {string|Error} error - Error message or Error object
   * @param {*} data - Optional partial data
   * @returns {InstallationResult}
   */
  static failure(error, data = null) {
    const errorMessage = error instanceof Error ? error.message : error;
    return new InstallationResult(false, data, errorMessage);
  }
}

/**
 * Package installation executor
 */
class PackageInstallationExecutor {
  constructor(packageManager, options = {}) {
    this.packageManager = packageManager;
    this.options = {
      timeout: 300000, // 5 minutes default
      silent: false,
      verbose: false,
      retries: 1,
      ...options
    };
    this.progressUI = null;
  }

  /**
   * Set progress UI instance
   * @param {InstallationProgressUI} progressUI - Progress UI instance
   */
  setProgressUI(progressUI) {
    this.progressUI = progressUI;
  }

  /**
   * Execute package installation
   * @param {string} projectDir - Project directory path
   * @param {Object} options - Installation options
   * @param {boolean} [options.production=false] - Install only production dependencies
   * @param {Array<string>} [options.additionalArgs=[]] - Additional arguments
   * @returns {Promise<InstallationResult>}
   */
  async executeInstallation(projectDir, options = {}) {
    const { production = false, additionalArgs = [] } = options;

    try {
      // Prepare installation command
      const command = this.packageManager.command;
      let args = [
        ...this.packageManager.installArgs,
        ...(this.options.silent ? this.packageManager.silentArgs : []),
        ...(production ? ['--production'] : []),
        ...additionalArgs
      ];

      if (this.progressUI) {
        this.progressUI.updatePhase('RESOLVING');
        this.progressUI.verbose(`Executing: ${command} ${args.join(' ')}`);
      }

      // Execute installation with retries
      let lastError = null;
      let usedLegacyPeerDeps = false;
      
      for (let attempt = 1; attempt <= this.options.retries + 1; attempt++) {
        try {
          const result = await this.runInstallCommand(command, args, projectDir, attempt);
          
          // If we used --legacy-peer-deps, add a warning
          if (usedLegacyPeerDeps && result.success) {
            result.warnings = result.warnings || [];
            result.warnings.push('Used --legacy-peer-deps to resolve dependency conflicts');
          }
          
          return result;
        } catch (error) {
          lastError = error;
          
          // Check if this is a peer dependency error and we haven't tried legacy mode yet
          if (this.packageManager.name === 'npm' && 
              !usedLegacyPeerDeps && 
              (error.message.includes('peer dep') || 
               error.message.includes('ERESOLVE') ||
               error.message.includes('conflicting peer dependency'))) {
            
            if (this.progressUI) {
              this.progressUI.updateMessage('Peer dependency conflicts detected, retrying with --legacy-peer-deps...');
            }
            
            // Add --legacy-peer-deps flag for npm
            args = [
              ...this.packageManager.installArgs,
              ...(this.options.silent ? this.packageManager.silentArgs : []),
              ...(production ? ['--production'] : []),
              '--legacy-peer-deps',
              ...additionalArgs
            ];
            
            usedLegacyPeerDeps = true;
            continue; // Try again with legacy peer deps
          }
          
          if (attempt <= this.options.retries) {
            if (this.progressUI) {
              this.progressUI.updateMessage(`Installation failed (attempt ${attempt}), retrying...`);
              this.progressUI.verbose(`Retry ${attempt}: ${error.message}`);
            }
            
            // Wait before retry (exponential backoff)
            await this.delay(1000 * attempt);
          }
        }
      }

      throw lastError;

    } catch (error) {
      return InstallationResult.failure(error);
    }
  }

  /**
   * Run the actual install command
   * @param {string} command - Package manager command
   * @param {Array<string>} args - Command arguments
   * @param {string} projectDir - Project directory
   * @param {number} attempt - Current attempt number
   * @returns {Promise<InstallationResult>}
   */
  async runInstallCommand(command, args, projectDir, attempt = 1) {
    return new Promise((resolve, reject) => {
      const child = spawn(command, args, {
        cwd: projectDir,
        stdio: ['ignore', 'pipe', 'pipe'],
        shell: true
      });

      let stdout = '';
      let stderr = '';
      let hasTimedOut = false;

      // Set up timeout
      const timeout = setTimeout(() => {
        hasTimedOut = true;
        child.kill('SIGTERM');
        
        // Force kill after 5 seconds
        setTimeout(() => {
          if (!child.killed) {
            child.kill('SIGKILL');
          }
        }, 5000);
      }, this.options.timeout);

      // Capture output
      child.stdout.on('data', (data) => {
        const output = data.toString();
        stdout += output;
        
        if (this.progressUI) {
          this.updateProgressFromOutput(output);
        }
      });

      child.stderr.on('data', (data) => {
        const output = data.toString();
        stderr += output;
        
        if (this.progressUI && this.options.verbose) {
          this.progressUI.verbose(`stderr: ${output.trim()}`);
        }
      });

      child.on('close', (code) => {
        clearTimeout(timeout);

        if (hasTimedOut) {
          reject(new Error(`Installation timed out after ${this.options.timeout / 1000} seconds`));
          return;
        }

        if (code === 0) {
          const warnings = this.extractWarnings(stdout, stderr);
          resolve(InstallationResult.success({
            stdout,
            stderr,
            exitCode: code,
            attempt
          }, warnings));
        } else {
          const error = this.parseInstallationError(code, stdout, stderr);
          reject(error);
        }
      });

      child.on('error', (error) => {
        clearTimeout(timeout);
        reject(new Error(`Failed to start installation process: ${error.message}`));
      });
    });
  }

  /**
   * Update progress UI based on package manager output
   * @param {string} output - Package manager output
   */
  updateProgressFromOutput(output) {
    if (!this.progressUI) return;

    const lowerOutput = output.toLowerCase();

    // Common patterns across package managers
    if (lowerOutput.includes('resolv') || lowerOutput.includes('fetch')) {
      this.progressUI.updatePhase('RESOLVING');
    } else if (lowerOutput.includes('download') || lowerOutput.includes('extract')) {
      this.progressUI.updatePhase('DOWNLOADING');
    } else if (lowerOutput.includes('link') || lowerOutput.includes('symlink')) {
      this.progressUI.updatePhase('LINKING');
    } else if (lowerOutput.includes('build') || lowerOutput.includes('compile')) {
      this.progressUI.updatePhase('BUILDING');
    } else if (lowerOutput.includes('audit') || lowerOutput.includes('vulnerabilit')) {
      this.progressUI.updatePhase('FINALIZING');
    }

    // Package manager specific patterns
    if (this.packageManager.name === 'npm') {
      if (lowerOutput.includes('added') && lowerOutput.includes('package')) {
        this.progressUI.updatePhase('FINALIZING');
      }
    } else if (this.packageManager.name === 'yarn') {
      if (lowerOutput.includes('done in')) {
        this.progressUI.updatePhase('FINALIZING');
      }
    } else if (this.packageManager.name === 'pnpm') {
      if (lowerOutput.includes('progress')) {
        this.progressUI.updatePhase('DOWNLOADING');
      }
    }
  }

  /**
   * Parse installation error from output
   * @param {number} exitCode - Process exit code
   * @param {string} stdout - Standard output
   * @param {string} stderr - Standard error
   * @returns {Error} - Parsed error with helpful message
   */
  parseInstallationError(exitCode, stdout, stderr) {
    const output = (stdout + stderr).toLowerCase();

    // Common error patterns
    if (output.includes('enotfound') || output.includes('network')) {
      return new Error('Network error: Unable to connect to package registry. Please check your internet connection.');
    }
    
    if (output.includes('eacces') || output.includes('permission denied')) {
      return new Error('Permission error: Insufficient permissions to install packages. Try running with appropriate permissions.');
    }
    
    if (output.includes('enospc') || output.includes('no space')) {
      return new Error('Disk space error: Insufficient disk space to install packages.');
    }
    
    if (output.includes('404') || output.includes('not found')) {
      return new Error('Package not found: One or more packages could not be found in the registry.');
    }
    
    if (output.includes('version') && output.includes('conflict')) {
      return new Error('Version conflict: Unable to resolve package version conflicts.');
    }

    // Package manager specific errors
    if (this.packageManager.name === 'npm') {
      if (output.includes('peer dep')) {
        return new Error('Peer dependency error: Unmet peer dependencies detected.');
      }
    }

    // Generic error
    const errorLines = stderr.split('\n').filter(line => 
      line.trim() && !line.includes('warn') && !line.includes('deprecated')
    );
    
    const errorMessage = errorLines.length > 0 
      ? errorLines[errorLines.length - 1].trim()
      : `Installation failed with exit code ${exitCode}`;

    return new Error(`Installation failed: ${errorMessage}`);
  }

  /**
   * Extract warnings from installation output
   * @param {string} stdout - Standard output
   * @param {string} stderr - Standard error
   * @returns {Array<string>} - Array of warning messages
   */
  extractWarnings(stdout, stderr) {
    const warnings = [];
    const output = stdout + stderr;
    const lines = output.split('\n');

    for (const line of lines) {
      const lowerLine = line.toLowerCase();
      if (lowerLine.includes('warn') || lowerLine.includes('deprecated')) {
        warnings.push(line.trim());
      }
    }

    return warnings;
  }

  /**
   * Delay execution for specified milliseconds
   * @param {number} ms - Milliseconds to delay
   * @returns {Promise<void>}
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Create package installation executor
 * @param {Object} packageManager - Package manager configuration
 * @param {Object} options - Executor options
 * @returns {PackageInstallationExecutor}
 */
function createInstallationExecutor(packageManager, options = {}) {
  return new PackageInstallationExecutor(packageManager, options);
}

/**
 * Error types for classification
 */
const ERROR_TYPES = {
  NETWORK: 'network',
  PERMISSION: 'permission',
  DISK_SPACE: 'disk_space',
  PACKAGE_NOT_FOUND: 'package_not_found',
  VERSION_CONFLICT: 'version_conflict',
  PEER_DEPENDENCY: 'peer_dependency',
  TIMEOUT: 'timeout',
  PROCESS: 'process',
  UNKNOWN: 'unknown'
};

/**
 * Recovery suggestions for different error types
 */
const RECOVERY_SUGGESTIONS = {
  [ERROR_TYPES.NETWORK]: [
    'Check your internet connection',
    'Try using a different network or VPN',
    'Configure npm/yarn to use a different registry',
    'Check if your firewall is blocking the connection'
  ],
  [ERROR_TYPES.PERMISSION]: [
    'Run the command with appropriate permissions (sudo on Unix systems)',
    'Check file/directory permissions in the project folder',
    'Use a package manager that doesn\'t require root access (like pnpm)',
    'Configure npm to use a different global directory'
  ],
  [ERROR_TYPES.DISK_SPACE]: [
    'Free up disk space on your system',
    'Clean npm/yarn cache: npm cache clean --force or yarn cache clean',
    'Remove node_modules and try again',
    'Use a different drive with more space'
  ],
  [ERROR_TYPES.PACKAGE_NOT_FOUND]: [
    'Check if the package name is spelled correctly',
    'Verify the package exists in the npm registry',
    'Try using a different version of the package',
    'Check if the package has been deprecated or removed'
  ],
  [ERROR_TYPES.VERSION_CONFLICT]: [
    'Update package.json to use compatible versions',
    'Use npm ls or yarn list to identify conflicting dependencies',
    'Consider using npm-check-updates to update dependencies',
    'Remove node_modules and package-lock.json, then reinstall'
  ],
  [ERROR_TYPES.PEER_DEPENDENCY]: [
    'Install the required peer dependencies manually',
    'Check the package documentation for peer dependency requirements',
    'Use npm install --legacy-peer-deps as a temporary workaround',
    'Update to a version that doesn\'t have peer dependency conflicts'
  ],
  [ERROR_TYPES.TIMEOUT]: [
    'Try again with a longer timeout',
    'Check your internet connection speed',
    'Use a faster package manager like pnpm',
    'Clear package manager cache and try again'
  ],
  [ERROR_TYPES.PROCESS]: [
    'Ensure the package manager is properly installed',
    'Check if the package manager command is in your PATH',
    'Try restarting your terminal/command prompt',
    'Reinstall the package manager'
  ],
  [ERROR_TYPES.UNKNOWN]: [
    'Try removing node_modules and package-lock.json, then reinstall',
    'Clear package manager cache',
    'Try using a different package manager',
    'Check the package manager\'s documentation for similar issues'
  ]
};

/**
 * Error classification and recovery system
 */
class ErrorHandler {
  /**
   * Classify error type based on error message
   * @param {Error} error - Error object
   * @returns {string} - Error type from ERROR_TYPES
   */
  static classifyError(error) {
    const message = error.message.toLowerCase();

    if (message.includes('network') || message.includes('enotfound') || 
        message.includes('timeout') && message.includes('connect')) {
      return ERROR_TYPES.NETWORK;
    }
    
    if (message.includes('permission') || message.includes('eacces')) {
      return ERROR_TYPES.PERMISSION;
    }
    
    if (message.includes('disk space') || message.includes('enospc')) {
      return ERROR_TYPES.DISK_SPACE;
    }
    
    if (message.includes('not found') || message.includes('404')) {
      return ERROR_TYPES.PACKAGE_NOT_FOUND;
    }
    
    if (message.includes('version conflict') || message.includes('conflicting')) {
      return ERROR_TYPES.VERSION_CONFLICT;
    }
    
    if (message.includes('peer dep')) {
      return ERROR_TYPES.PEER_DEPENDENCY;
    }
    
    if (message.includes('timed out')) {
      return ERROR_TYPES.TIMEOUT;
    }
    
    if (message.includes('failed to start') || message.includes('command not found')) {
      return ERROR_TYPES.PROCESS;
    }

    return ERROR_TYPES.UNKNOWN;
  }

  /**
   * Get recovery suggestions for an error
   * @param {Error} error - Error object
   * @returns {Array<string>} - Array of recovery suggestions
   */
  static getRecoverySuggestions(error) {
    const errorType = this.classifyError(error);
    return RECOVERY_SUGGESTIONS[errorType] || RECOVERY_SUGGESTIONS[ERROR_TYPES.UNKNOWN];
  }

  /**
   * Format error message with recovery suggestions
   * @param {Error} error - Error object
   * @param {Object} options - Formatting options
   * @returns {string} - Formatted error message
   */
  static formatErrorMessage(error, options = {}) {
    const { includeRecovery = true, includeDocLinks = true } = options;
    const errorType = this.classifyError(error);
    const suggestions = this.getRecoverySuggestions(error);

    let message = `❌ Installation failed: ${error.message}\n`;
    
    if (includeRecovery && suggestions.length > 0) {
      message += '\n💡 Suggested solutions:\n';
      suggestions.forEach((suggestion, index) => {
        message += `   ${index + 1}. ${suggestion}\n`;
      });
    }

    if (includeDocLinks) {
      message += '\n📚 For more help:\n';
      message += '   • npm documentation: https://docs.npmjs.com/\n';
      message += '   • yarn documentation: https://yarnpkg.com/getting-started\n';
      message += '   • pnpm documentation: https://pnpm.io/\n';
    }

    return message;
  }
}

/**
 * Installation orchestrator that coordinates all components
 */
class InstallationOrchestrator {
  constructor(options = {}) {
    this.options = {
      silent: false,
      verbose: false,
      timeout: 300000,
      retries: 1,
      autoRecover: true,
      ...options
    };
    this.packageManager = null;
    this.progressUI = null;
    this.executor = null;
  }

  /**
   * Install dependencies for a project
   * @param {string} projectDir - Project directory path
   * @param {Array<string>} selectedPackages - Selected SDK packages
   * @param {Object} templateConfigs - Template configurations
   * @param {Object} installOptions - Installation options
   * @returns {Promise<InstallationResult>}
   */
  async installDependencies(projectDir, selectedPackages = [], templateConfigs = {}, installOptions = {}) {
    let backupCreated = false;

    try {
      // Step 1: Detect package manager
      this.packageManager = await getPackageManager({
        projectDir,
        preferredManager: installOptions.packageManager,
        allowFallback: true
      });

      // Step 2: Prepare dependencies
      const dependencies = prepareDependencies(selectedPackages, templateConfigs);
      
      // Step 3: Update package.json
      const updatedPackageJson = await updatePackageJson(projectDir, dependencies, {
        backup: true,
        overwrite: installOptions.overwrite || false
      });
      backupCreated = true;

      // Step 4: Write package.json
      await writePackageJson(projectDir, updatedPackageJson);

      // Step 5: Perform peer dependency analysis (if enabled)
      let peerAnalysisResult = null;
      if (installOptions.enablePeerAnalysis !== false && process.env.NODE_ENV !== 'test') {
        try {
          peerAnalysisResult = await performPeerDependencyAnalysis(projectDir, dependencies, {
            silent: this.options.silent,
            verbose: this.options.verbose
          });
        } catch (analysisError) {
          // Don't fail installation if analysis fails
          if (!this.options.silent) {
            logWarning(`⚠️  Peer dependency analysis failed: ${analysisError.message}`);
          }
        }
      }

      // Step 6: Set up progress UI
      this.progressUI = createProgressUI(this.packageManager, {
        silent: this.options.silent,
        verbose: this.options.verbose
      });

      // Step 7: Set up installation executor
      this.executor = createInstallationExecutor(this.packageManager, {
        timeout: this.options.timeout,
        silent: this.options.silent,
        verbose: this.options.verbose,
        retries: this.options.retries
      });

      this.executor.setProgressUI(this.progressUI);

      // Step 8: Execute installation
      this.progressUI.start('Starting package installation...');
      
      const result = await this.executor.executeInstallation(projectDir, {
        production: installOptions.production,
        additionalArgs: installOptions.additionalArgs
      });

      // Include peer dependency analysis in result
      if (peerAnalysisResult) {
        result.peerDependencyAnalysis = peerAnalysisResult;
      }

      if (result.success) {
        this.progressUI.succeed('✅ Dependencies installed successfully!');
        
        // Clean up backup file after successful installation
        if (backupCreated) {
          try {
            const backupPath = path.join(projectDir, 'package.json.backup');
            if (await fs.pathExists(backupPath)) {
              await fs.remove(backupPath);
            }
          } catch (cleanupError) {
            // Silently ignore cleanup errors - not critical
          }
        }
        
        if (result.warnings && result.warnings.length > 0) {
          const importantWarnings = result.warnings.filter(warning => 
            !warning.includes('deprecated') && 
            !warning.includes('no longer supported') &&
            !warning.includes('funding')
          );
          
          if (importantWarnings.length > 0) {
            console.log('\n⚠️  Installation warnings:');
            importantWarnings.forEach(warning => console.log(`   ${warning}`));
          }
        }
      } else {
        throw new Error(result.error);
      }

      return result;

    } catch (error) {
      // Handle installation failure
      if (this.progressUI) {
        this.progressUI.fail('Installation failed');
      }

      // Attempt recovery if enabled
      if (this.options.autoRecover && backupCreated) {
        await this.attemptRecovery(projectDir, error);
      }

      // Format and display error message
      const errorMessage = ErrorHandler.formatErrorMessage(error, {
        includeRecovery: true,
        includeDocLinks: true
      });

      if (!this.options.silent) {
        console.error(errorMessage);
      }

      return InstallationResult.failure(error);
    }
  }

  /**
   * Attempt to recover from installation failure
   * @param {string} projectDir - Project directory path
   * @param {Error} error - Installation error
   * @returns {Promise<boolean>} - True if recovery was attempted
   */
  async attemptRecovery(projectDir, error) {
    try {
      if (!this.options.silent) {
        console.log('\n🔄 Attempting to recover from installation failure...');
      }

      // Restore package.json backup
      const restored = await restorePackageJsonBackup(projectDir);
      
      if (restored) {
        if (!this.options.silent) {
          console.log('✅ Package.json restored from backup');
        }
        return true;
      } else {
        if (!this.options.silent) {
          console.log('⚠️  Could not restore package.json backup');
        }
        return false;
      }
    } catch (recoveryError) {
      if (!this.options.silent) {
        console.error(`❌ Recovery failed: ${recoveryError.message}`);
      }
      return false;
    }
  }

  /**
   * Cleanup resources
   */
  cleanup() {
    if (this.progressUI) {
      this.progressUI.stop();
    }
  }
}

/**
 * Main installation function that orchestrates the entire process
 * @param {string} projectDir - Project directory path
 * @param {Array<string>} selectedPackages - Selected SDK packages
 * @param {Object} templateConfigs - Template configurations
 * @param {Object} options - Installation options
 * @returns {Promise<InstallationResult>}
 */
async function installProjectDependencies(projectDir, selectedPackages = [], templateConfigs = {}, options = {}) {
  const orchestrator = new InstallationOrchestrator(options);
  
  try {
    return await orchestrator.installDependencies(projectDir, selectedPackages, templateConfigs, options);
  } finally {
    orchestrator.cleanup();
  }
}

/**
 * Perform proactive peer dependency analysis during installation
 * @param {string} projectDir - Project directory path
 * @param {object} dependencies - Dependencies to analyze
 * @param {object} options - Analysis options
 * @returns {Promise<object>} Analysis result with feedback
 */
async function performPeerDependencyAnalysis(projectDir, dependencies, options = {}) {
  const { silent = false, verbose = false } = options;
  
  try {
    // Import the peer dependency analyzer
    const { PeerDependencyAnalyzer } = require('./dependency-analyzer');
    const analyzer = new PeerDependencyAnalyzer({
      timeout: 30000,
      maxConcurrency: 5,
      enableCache: true
    });

    if (!silent) {
      logInfo('🔍 Analyzing peer dependencies...');
    }

    // Extract all package names from dependencies
    const allPackages = [
      ...Object.keys(dependencies.dependencies || {}),
      ...Object.keys(dependencies.devDependencies || {})
    ];

    if (allPackages.length === 0) {
      return { conflicts: [], resolutions: [], hasIssues: false };
    }

    const startTime = Date.now();
    const analysisResult = await analyzer.analyzePeerDependencies(allPackages);
    const analysisTime = Date.now() - startTime;

    if (!silent && verbose) {
      logDim(`   Analysis completed in ${analysisTime}ms`);
    }

    // Process and display results
    const hasIssues = analysisResult.conflicts.length > 0;
    
    if (hasIssues && !silent) {
      displayInstallationPeerDependencyFeedback(analysisResult, { verbose });
    } else if (!silent && analysisResult.conflicts.length === 0) {
      logSuccess('✅ No peer dependency conflicts detected');
    }

    return {
      conflicts: analysisResult.conflicts,
      resolutions: analysisResult.resolutions,
      hasIssues,
      analysisTime
    };

  } catch (error) {
    if (!silent) {
      logWarning(`⚠️  Peer dependency analysis failed: ${error.message}`);
      logDim('   Continuing with installation...');
    }
    return { conflicts: [], resolutions: [], hasIssues: false, error: error.message };
  }
}

/**
 * Display peer dependency feedback during installation
 * @param {object} analysisResult - Analysis result from PeerDependencyAnalyzer
 * @param {object} options - Display options
 */
function displayInstallationPeerDependencyFeedback(analysisResult, options = {}) {
  const { verbose = false } = options;
  const { conflicts, resolutions } = analysisResult;

  if (conflicts.length === 0 && resolutions.length === 0) {
    return;
  }

  console.log('');
  logWarning('⚠️  Peer dependency issues detected:');

  // Group conflicts by severity
  const severityGroups = {
    high: conflicts.filter(c => c.type === 'missing' || c.type === 'incompatible'),
    medium: conflicts.filter(c => c.type === 'version_mismatch'),
    low: conflicts.filter(c => !['missing', 'incompatible', 'version_mismatch'].includes(c.type))
  };

  // Display high severity issues (missing/incompatible)
  if (severityGroups.high.length > 0) {
    logWarning(`   Critical issues (${severityGroups.high.length}):`);
    severityGroups.high.forEach(conflict => {
      const icon = conflict.type === 'missing' ? '❌' : '⚠️';
      logWarning(`   ${icon} ${conflict.package}: ${conflict.type}`);
      if (verbose) {
        logDim(`      Required: ${conflict.requiredVersion} (by ${conflict.requiredBy.join(', ')})`);
      }
    });
  }

  // Display medium severity issues (version mismatches)
  if (severityGroups.medium.length > 0) {
    logInfo(`   Version mismatches (${severityGroups.medium.length}):`);
    severityGroups.medium.forEach(conflict => {
      logDim(`   🔄 ${conflict.package}: needs ${conflict.requiredVersion}`);
    });
  }

  // Display automatic resolutions if any
  if (resolutions.length > 0) {
    console.log('');
    logInfo(`🔧 Automatic resolutions available (${resolutions.length}):`);
    resolutions.forEach(resolution => {
      const actionIcon = resolution.action === 'add' ? '➕' : '🔄';
      logInfo(`   ${actionIcon} ${resolution.package}: ${resolution.action} ${resolution.version}`);
      if (verbose) {
        logDim(`      ${resolution.reason} (confidence: ${resolution.confidence})`);
      }
    });
  }

  // Provide guidance
  console.log('');
  logInfo('💡 Installation will proceed with --legacy-peer-deps if needed');
  logDim('   This resolves most peer dependency conflicts automatically');
  console.log('');
}

module.exports = {
  PACKAGE_MANAGERS,
  isPackageManagerAvailable,
  detectAvailablePackageManagers,
  detectPreferredPackageManager,
  getPackageManager,
  DEFAULT_DEPENDENCIES,
  readPackageJson,
  validatePackageJson,
  mergeDependencies,
  updatePackageJson,
  writePackageJson,
  prepareDependencies,
  restorePackageJsonBackup,
  INSTALLATION_PHASES,
  InstallationProgressUI,
  createProgressUI,
  simulateInstallation,
  InstallationResult,
  PackageInstallationExecutor,
  createInstallationExecutor,
  ERROR_TYPES,
  RECOVERY_SUGGESTIONS,
  ErrorHandler,
  InstallationOrchestrator,
  installProjectDependencies,
  performPeerDependencyAnalysis,
  displayInstallationPeerDependencyFeedback
}; 