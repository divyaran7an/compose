const ora = require('ora');
const { logSuccess, logError, logWarning, logInfo } = require('./console');

/**
 * Progress indicator system for capx-compose CLI
 * Provides spinners, progress bars, and status updates for long-running operations
 */

/**
 * Create a spinner for long-running operations
 * @param {string} text - Initial text to display
 * @param {object} options - Spinner options
 * @returns {object} Spinner instance with enhanced methods
 */
function createSpinner(text = 'Loading...', options = {}) {
  // In test environment, return a no-op spinner to avoid ora dependency issues
  if (process.env.NODE_ENV === 'test') {
    return {
      _spinner: null,
      start() { return this; },
      stop() { return this; },
      updateText(newText) { this._text = newText; return this; },
      get text() { return this._text || text; },
      set text(value) { this._text = value; },
      succeed(message) { return this; },
      fail(message) { return this; },
      warn(message) { return this; },
      info(message) { return this; },
      clear() { return this; },
      _text: text
    };
  }
  
  const defaultOptions = {
    spinner: 'dots',
    color: 'cyan',
    ...options
  };
  
  const spinner = ora({
    text,
    ...defaultOptions
  });
  
  // Enhanced spinner with additional methods
  const enhancedSpinner = {
    _spinner: spinner, // Store reference to avoid closure issues
    
    /**
     * Start the spinner
     */
    start() {
      this._spinner.start();
      return this;
    },
    
    /**
     * Stop the spinner
     */
    stop() {
      this._spinner.stop();
      return this;
    },
    
    /**
     * Update spinner text and continue spinning
     * @param {string} newText - New text to display
     */
    updateText(newText) {
      this._spinner.text = newText;
      return this;
    },
    
    /**
     * Get current text
     */
    get text() {
      return this._spinner ? this._spinner.text : '';
    },
    
    /**
     * Set current text
     */
    set text(value) {
      if (this._spinner) {
        this._spinner.text = value;
      }
    },
    
    /**
     * Complete spinner with success message
     * @param {string} message - Success message
     */
    succeed(message) {
      this._spinner.succeed(message);
      return this;
    },
    
    /**
     * Complete spinner with error message
     * @param {string} message - Error message
     */
    fail(message) {
      this._spinner.fail(message);
      return this;
    },
    
    /**
     * Complete spinner with warning message
     * @param {string} message - Warning message
     */
    warn(message) {
      this._spinner.warn(message);
      return this;
    },
    
    /**
     * Complete spinner with info message
     * @param {string} message - Info message
     */
    info(message) {
      this._spinner.info(message);
      return this;
    },
    
    /**
     * Stop spinner and clear line
     */
    clear() {
      this._spinner.stop();
      return this;
    }
  };
  
  return enhancedSpinner;
}

/**
 * Progress tracker for operations with known steps
 */
class ProgressTracker {
  constructor(totalSteps, options = {}) {
    this.totalSteps = totalSteps;
    this.currentStep = 0;
    this.options = {
      showPercentage: true,
      showStepCount: true,
      silent: process.env.NODE_ENV === 'test' || options.silent === true,
      ...options
    };
    this.spinner = null;
    this.isActive = false;
  }
  
  /**
   * Start the progress tracker
   * @param {string} initialText - Initial text to display
   */
  start(initialText = 'Starting...') {
    this.currentStep = 0;
    this.isActive = true;
    
    if (this.options.silent) {
      return this;
    }
    
    this.spinner = createSpinner(this._formatText(initialText));
    this.spinner.start();
    return this;
  }
  
  /**
   * Update progress to next step
   * @param {string} text - Text for current step
   */
  nextStep(text) {
    if (!this.isActive) return this;
    
    this.currentStep++;
    
    if (this.options.silent) {
      return this;
    }
    
    const formattedText = this._formatText(text);
    this.spinner.updateText(formattedText);
    return this;
  }
  
  /**
   * Set progress to specific step
   * @param {number} step - Step number (1-based)
   * @param {string} text - Text for current step
   */
  setStep(step, text) {
    if (!this.isActive) return this;
    
    this.currentStep = Math.max(0, Math.min(step, this.totalSteps));
    
    if (this.options.silent) {
      return this;
    }
    
    const formattedText = this._formatText(text);
    this.spinner.updateText(formattedText);
    return this;
  }
  
  /**
   * Complete progress with success
   * @param {string} message - Success message
   */
  succeed(message = 'Completed successfully') {
    if (!this.isActive) return this;
    
    this.isActive = false;
    
    if (this.options.silent) {
      return this;
    }
    
    this.spinner.succeed(message);
    return this;
  }
  
  /**
   * Complete progress with error
   * @param {string} message - Error message
   */
  fail(message = 'Operation failed') {
    if (!this.isActive) return this;
    
    this.isActive = false;
    
    if (this.options.silent) {
      return this;
    }
    
    this.spinner.fail(message);
    return this;
  }
  
  /**
   * Complete progress with warning
   * @param {string} message - Warning message
   */
  warn(message = 'Completed with warnings') {
    if (!this.isActive) return this;
    
    this.isActive = false;
    
    if (this.options.silent) {
      return this;
    }
    
    this.spinner.warn(message);
    return this;
  }
  
  /**
   * Stop progress tracker
   */
  stop() {
    if (!this.isActive) return this;
    
    this.isActive = false;
    
    if (this.options.silent) {
      return this;
    }
    
    this.spinner.clear();
    return this;
  }
  
  /**
   * Format text with progress indicators
   * @private
   */
  _formatText(text) {
    let formatted = text;
    
    if (this.options.showStepCount) {
      formatted = `[${this.currentStep}/${this.totalSteps}] ${formatted}`;
    }
    
    if (this.options.showPercentage) {
      const percentage = Math.round((this.currentStep / this.totalSteps) * 100);
      formatted = `${formatted} (${percentage}%)`;
    }
    
    return formatted;
  }
}

/**
 * File operation progress tracker
 */
class FileProgressTracker {
  constructor(totalFiles, options = {}) {
    this.totalFiles = totalFiles;
    this.processedFiles = 0;
    this.options = {
      showFileCount: true,
      showCurrentFile: true,
      silent: process.env.NODE_ENV === 'test' || options.silent === true,
      ...options
    };
    this.spinner = null;
    this.isActive = false;
  }
  
  /**
   * Start file progress tracking
   * @param {string} operation - Operation name (e.g., 'Copying', 'Processing')
   */
  start(operation = 'Processing') {
    this.processedFiles = 0;
    this.isActive = true;
    
    if (this.options.silent) {
      return this;
    }
    
    const text = this._formatText(operation, 'files...');
    this.spinner = createSpinner(text);
    this.spinner.start();
    return this;
  }
  
  /**
   * Update progress for next file
   * @param {string} fileName - Current file being processed
   * @param {string} operation - Operation name
   */
  nextFile(fileName, operation = 'Processing') {
    if (!this.isActive) return this;
    
    this.processedFiles++;
    
    if (this.options.silent) {
      return this;
    }
    
    const text = this._formatText(operation, fileName);
    this.spinner.updateText(text);
    return this;
  }
  
  /**
   * Complete file processing with success
   * @param {string} message - Success message
   */
  succeed(message) {
    if (!this.isActive) return this;
    
    this.isActive = false;
    
    if (this.options.silent) {
      return this;
    }
    
    const finalMessage = message || `Successfully processed ${this.totalFiles} files`;
    this.spinner.succeed(finalMessage);
    return this;
  }
  
  /**
   * Complete file processing with error
   * @param {string} message - Error message
   */
  fail(message) {
    if (!this.isActive) return this;
    
    this.isActive = false;
    
    if (this.options.silent) {
      return this;
    }
    
    const finalMessage = message || `Failed to process files (${this.processedFiles}/${this.totalFiles} completed)`;
    this.spinner.fail(finalMessage);
    return this;
  }
  
  /**
   * Stop file progress tracking
   */
  stop() {
    if (!this.isActive) return this;
    
    this.isActive = false;
    
    if (this.options.silent) {
      return this;
    }
    
    this.spinner.clear();
    return this;
  }
  
  /**
   * Format text with file progress indicators
   * @private
   */
  _formatText(operation, fileName) {
    let formatted = operation;
    
    if (this.options.showFileCount) {
      formatted = `${formatted} (${this.processedFiles}/${this.totalFiles})`;
    }
    
    if (this.options.showCurrentFile && fileName && fileName !== 'files...') {
      // Truncate long file names
      const displayName = fileName.length > 40 ? `...${fileName.slice(-37)}` : fileName;
      formatted = `${formatted}: ${displayName}`;
    } else if (fileName === 'files...') {
      formatted = `${formatted} ${fileName}`;
    }
    
    return formatted;
  }
}

/**
 * Installation progress tracker for package managers
 */
class InstallationProgressTracker {
  constructor(packages = [], options = {}) {
    this.packages = Array.isArray(packages) ? packages : [];
    this.totalPackages = this.packages.length;
    this.installedPackages = 0;
    this.options = {
      showPackageCount: true,
      showCurrentPackage: true,
      silent: process.env.NODE_ENV === 'test' || options.silent === true,
      ...options
    };
    this.spinner = null;
    this.isActive = false;
  }
  
  /**
   * Start installation progress tracking
   * @param {string} packageManager - Package manager name
   */
  start(packageManager = 'npm') {
    this.installedPackages = 0;
    this.isActive = true;
    
    if (this.options.silent) {
      return this;
    }
    
    const text = this._formatText(packageManager, 'dependencies...');
    this.spinner = createSpinner(text);
    this.spinner.start();
    return this;
  }
  
  /**
   * Update progress for package installation
   * @param {string} packageName - Current package being installed
   * @param {string} packageManager - Package manager name
   */
  installPackage(packageName, packageManager = 'npm') {
    if (!this.isActive) return this;
    
    this.installedPackages++;
    
    if (this.options.silent) {
      return this;
    }
    
    const text = this._formatText(packageManager, packageName);
    this.spinner.updateText(text);
    return this;
  }
  
  /**
   * Update progress with general installation message
   * @param {string} message - Installation message
   * @param {string} packageManager - Package manager name
   */
  updateMessage(message, packageManager = 'npm') {
    if (!this.isActive) return this;
    
    if (this.options.silent) {
      return this;
    }
    
    const text = this._formatText(packageManager, message);
    this.spinner.updateText(text);
    return this;
  }
  
  /**
   * Complete installation with success
   * @param {string} message - Success message
   */
  succeed(message) {
    if (!this.isActive) return this;
    
    this.isActive = false;
    
    if (this.options.silent) {
      return this;
    }
    
    const finalMessage = message || `Successfully installed ${this.totalPackages} packages`;
    this.spinner.succeed(finalMessage);
    return this;
  }
  
  /**
   * Complete installation with error
   * @param {string} message - Error message
   */
  fail(message) {
    if (!this.isActive) return this;
    
    this.isActive = false;
    
    if (this.options.silent) {
      return this;
    }
    
    const finalMessage = message || 'Package installation failed';
    this.spinner.fail(finalMessage);
    return this;
  }
  
  /**
   * Stop installation progress tracking
   */
  stop() {
    if (!this.isActive) return this;
    
    this.isActive = false;
    
    if (this.options.silent) {
      return this;
    }
    
    this.spinner.clear();
    return this;
  }
  
  /**
   * Format text with installation progress indicators
   * @private
   */
  _formatText(packageManager, currentItem) {
    let formatted = `Installing with ${packageManager}`;
    
    if (this.options.showPackageCount && this.totalPackages > 0) {
      formatted = `${formatted} (${this.installedPackages}/${this.totalPackages})`;
    }
    
    if (this.options.showCurrentPackage && currentItem && currentItem !== 'dependencies...') {
      formatted = `${formatted}: ${currentItem}`;
    } else if (currentItem === 'dependencies...') {
      formatted = `${formatted} ${currentItem}`;
    }
    
    return formatted;
  }
}

/**
 * Simple progress utilities
 */
const progress = {
  /**
   * Show a simple spinner for an async operation
   * @param {Promise} promise - Promise to track
   * @param {string} text - Text to display
   * @param {object} options - Spinner options
   * @returns {Promise} Original promise result
   */
  async withSpinner(promise, text = 'Loading...', options = {}) {
    const spinner = createSpinner(text, options);
    spinner.start();
    
    try {
      const result = await promise;
      spinner.succeed();
      return result;
    } catch (error) {
      spinner.fail();
      throw error;
    }
  },
  
  /**
   * Show a spinner with custom success/error messages
   * @param {Promise} promise - Promise to track
   * @param {object} messages - Success and error messages
   * @param {object} options - Spinner options
   * @returns {Promise} Original promise result
   */
  async withMessages(promise, messages = {}, options = {}) {
    const { loading = 'Loading...', success = 'Done', error = 'Failed' } = messages;
    const spinner = createSpinner(loading, options);
    spinner.start();
    
    try {
      const result = await promise;
      spinner.succeed(success);
      return result;
    } catch (err) {
      spinner.fail(error);
      throw err;
    }
  },
  
  /**
   * Create a delay with spinner (for testing/demo purposes)
   * @param {number} ms - Milliseconds to delay
   * @param {string} text - Text to display
   * @returns {Promise} Promise that resolves after delay
   */
  async delay(ms, text = 'Please wait...') {
    return this.withSpinner(
      new Promise(resolve => setTimeout(resolve, ms)),
      text
    );
  }
};

function createProgressTracker(totalSteps, options = {}) {
  // In test environment, return a no-op tracker to avoid ora dependency issues
  if (process.env.NODE_ENV === 'test') {
    return {
      currentStep: 0,
      totalSteps,
      spinner: null,
      start() { return this; },
      nextStep(stepName) { 
        this.currentStep++; 
        return this; 
      },
      updateProgress(stepName, percentage) { return this; },
      complete(message) { return this; },
      fail(message) { return this; },
      stop() { return this; }
    };
  }
  
  const defaultOptions = {
    spinner: 'dots',
    color: 'cyan',
    showPercentage: true,
    ...options
  };
  
  let currentStep = 0;
  let spinner = null;
  
  const tracker = {
    currentStep,
    totalSteps,
    spinner,
    
    /**
     * Start the progress tracker
     * @param {string} initialMessage - Initial message to display
     */
    start(initialMessage = 'Starting...') {
      this.spinner = createSpinner(initialMessage, defaultOptions);
      this.spinner.start();
      return this;
    },
    
    /**
     * Move to next step
     * @param {string} stepName - Name of the current step
     */
    nextStep(stepName) {
      this.currentStep++;
      const percentage = Math.round((this.currentStep / this.totalSteps) * 100);
      
      let message = `[${this.currentStep}/${this.totalSteps}] ${stepName}`;
      if (defaultOptions.showPercentage) {
        message += ` (${percentage}%)`;
      }
      
      if (this.spinner) {
        this.spinner.updateText(message);
      }
      
      return this;
    },
    
    /**
     * Update progress with custom percentage
     * @param {string} stepName - Name of the current step
     * @param {number} percentage - Custom percentage (0-100)
     */
    updateProgress(stepName, percentage = null) {
      const actualPercentage = percentage !== null ? 
        Math.round(percentage) : 
        Math.round((this.currentStep / this.totalSteps) * 100);
      
      let message = `[${this.currentStep}/${this.totalSteps}] ${stepName}`;
      if (defaultOptions.showPercentage) {
        message += ` (${actualPercentage}%)`;
      }
      
      if (this.spinner) {
        this.spinner.updateText(message);
      }
      
      return this;
    },
    
    /**
     * Complete the progress tracker
     * @param {string} message - Completion message
     */
    complete(message = 'Completed!') {
      if (this.spinner) {
        this.spinner.succeed(message);
      }
      return this;
    },
    
    /**
     * Fail the progress tracker
     * @param {string} message - Error message
     */
    fail(message = 'Failed!') {
      if (this.spinner) {
        this.spinner.fail(message);
      }
      return this;
    },
    
    /**
     * Stop the progress tracker
     */
    stop() {
      if (this.spinner) {
        this.spinner.stop();
      }
      return this;
    }
  };
  
  return tracker;
}

/**
 * Create a file progress tracker
 * @param {Array} files - Array of file names to track
 * @param {object} options - Configuration options
 * @returns {object} File progress tracker instance
 */
function createFileProgressTracker(files, options = {}) {
  // In test environment, return a no-op tracker to avoid ora dependency issues
  if (process.env.NODE_ENV === 'test') {
    return {
      totalFiles: files.length,
      currentFileIndex: 0,
      start() { return this; },
      nextFile() { 
        this.currentFileIndex++; 
        return this; 
      },
      complete(message) { return this; },
      fail(message) { return this; },
      stop() { return this; }
    };
  }
  
  return new FileProgressTracker(files, options);
}

/**
 * Create an installation progress tracker
 * @param {Array} packages - Array of package names to track
 * @param {object} options - Configuration options
 * @returns {object} Installation progress tracker instance
 */
function createInstallationProgressTracker(packages, options = {}) {
  // In test environment, return a no-op tracker to avoid ora dependency issues
  if (process.env.NODE_ENV === 'test') {
    return {
      totalPackages: packages.length,
      start() { return this; },
      updatePackage(packageName) { return this; },
      updateGeneral(message) { return this; },
      complete(message) { return this; },
      fail(message) { return this; },
      stop() { return this; }
    };
  }
  
  return new InstallationProgressTracker(packages, options);
}

module.exports = {
  createSpinner,
  createProgressTracker,
  createFileProgressTracker,
  createInstallationProgressTracker,
  ProgressTracker,
  FileProgressTracker,
  InstallationProgressTracker,
  progress
}; 