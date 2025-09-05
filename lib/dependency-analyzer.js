const { execSync, spawn } = require('child_process');
const semver = require('semver');
const path = require('path');
const fs = require('fs-extra');
const os = require('os');

/**
 * Core Peer Dependency Analysis Engine
 * Proactively analyzes and resolves peer dependency conflicts before installation
 * Enhanced with comprehensive edge case handling and error recovery
 */
class PeerDependencyAnalyzer {
  constructor(options = {}) {
    this.options = {
      timeout: options.timeout || 30000, // 30 seconds timeout for npm info calls
      retries: options.retries || 3,
      cacheEnabled: options.cacheEnabled !== false,
      offline: options.offline || false,
      registry: options.registry || 'https://registry.npmjs.org/',
      verbose: options.verbose || false,
      
      // Enhanced edge case options
      enablePrivateRegistry: options.enablePrivateRegistry || false,
      privateRegistryAuth: options.privateRegistryAuth || null,
      fallbackToCache: options.fallbackToCache !== false,
      skipMalformedPackages: options.skipMalformedPackages !== false,
      maxConcurrentRequests: options.maxConcurrentRequests || 5,
      networkRetryDelay: options.networkRetryDelay || 1000,
      enableOfflineCache: options.enableOfflineCache !== false,
      offlineCachePath: options.offlineCachePath || path.join(os.tmpdir(), 'capx-compose-peer-cache'),
      
      ...options
    };
    
    // Internal state
    this.packageInfoCache = new Map();
    this.peerDependencyCache = new Map();
    this.offlineCache = new Map();
    this.analysisResults = [];
    this.conflicts = [];
    this.resolutions = [];
    this.warnings = [];
    this.errors = [];
    this.networkErrors = [];
    this.malformedPackages = [];
    
    // Progress tracking
    this.progressCallback = options.progressCallback || null;
    this.currentPhase = 'idle';
    this.totalPackages = 0;
    this.processedPackages = 0;
    this.failedPackages = 0;
    this.skippedPackages = 0;
    
    // Initialize offline cache if enabled
    if (this.options.enableOfflineCache) {
      this._initializeOfflineCache();
    }
  }

  /**
   * Main analysis method - analyzes all dependencies for peer dependency conflicts
   * @param {object} dependencies - Dependencies object from merged templates
   * @param {object} devDependencies - Dev dependencies object
   * @returns {Promise<object>} Analysis results with conflicts and resolutions
   */
  async analyzePeerDependencies(dependencies = {}, devDependencies = {}) {
    this.currentPhase = 'initializing';
    this._updateProgress('Initializing peer dependency analysis...');
    
    // Reset state
    this._resetState();
    
    // Combine all dependencies for analysis
    const allDependencies = { ...dependencies, ...devDependencies };
    const packageNames = Object.keys(allDependencies);
    this.totalPackages = packageNames.length;
    
    if (packageNames.length === 0) {
      return this._generateEmptyResult();
    }

    try {
      // Phase 1: Fetch package metadata
      this.currentPhase = 'fetching';
      this._updateProgress('Fetching package metadata...');
      const packageInfoMap = await this._fetchAllPackageInfo(allDependencies);
      
      // Phase 2: Extract peer dependencies
      this.currentPhase = 'extracting';
      this._updateProgress('Extracting peer dependencies...');
      const peerDependencyMap = this._extractPeerDependencies(packageInfoMap);
      
      // Phase 3: Detect conflicts
      this.currentPhase = 'analyzing';
      this._updateProgress('Analyzing peer dependency conflicts...');
      const conflicts = this._detectPeerDependencyConflicts(allDependencies, peerDependencyMap);
      
      // Phase 4: Resolve conflicts
      this.currentPhase = 'resolving';
      this._updateProgress('Resolving conflicts...');
      const resolutions = await this._resolveConflicts(conflicts, allDependencies, peerDependencyMap);
      
      // Phase 5: Generate final result
      this.currentPhase = 'finalizing';
      this._updateProgress('Finalizing analysis...');
      const result = this._generateAnalysisResult(allDependencies, conflicts, resolutions, packageInfoMap);
      
      // Phase 6: Save offline cache
      if (this.options.enableOfflineCache) {
        await this._saveOfflineCache();
      }
      
      this.currentPhase = 'complete';
      this._updateProgress('Peer dependency analysis complete');
      
      return result;
      
    } catch (error) {
      this.currentPhase = 'error';
      this.errors.push({
        type: 'analysis_error',
        message: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      });
      
      // Save cache even on error to preserve partial results
      if (this.options.enableOfflineCache) {
        try {
          await this._saveOfflineCache();
        } catch (cacheError) {
          // Don't fail the entire analysis for cache save errors
        }
      }
      
      throw new Error(`Peer dependency analysis failed: ${error.message}`);
    }
  }

  /**
   * Fetch package information for all dependencies
   * @private
   * @param {object} dependencies - Dependencies to analyze
   * @returns {Promise<Map>} Map of package names to their info
   */
  async _fetchAllPackageInfo(dependencies) {
    const packageInfoMap = new Map();
    const packageEntries = Object.entries(dependencies);
    
    // Process packages in batches to avoid overwhelming npm registry
    const batchSize = 5;
    for (let i = 0; i < packageEntries.length; i += batchSize) {
      const batch = packageEntries.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async ([packageName, version]) => {
        try {
          const info = await this.getPackageInfo(packageName, version);
          packageInfoMap.set(packageName, info);
          this.processedPackages++;
          this._updateProgress(`Fetched info for ${packageName} (${this.processedPackages}/${this.totalPackages})`);
        } catch (error) {
          this.warnings.push({
            type: 'package_info_fetch_failed',
            package: packageName,
            version,
            message: error.message,
            timestamp: new Date().toISOString()
          });
          
          // Continue with empty info to avoid blocking analysis
          packageInfoMap.set(packageName, { 
            name: packageName, 
            version, 
            peerDependencies: {},
            _fetchError: error.message 
          });
        }
      });
      
      await Promise.all(batchPromises);
      
      // Small delay between batches to be respectful to npm registry
      if (i + batchSize < packageEntries.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    return packageInfoMap;
  }

  /**
   * Initialize offline cache system
   * @private
   */
  async _initializeOfflineCache() {
    try {
      await fs.ensureDir(this.options.offlineCachePath);
      
      // Load existing cache if available
      const cacheFile = path.join(this.options.offlineCachePath, 'package-cache.json');
      if (await fs.pathExists(cacheFile)) {
        const cacheData = await fs.readJson(cacheFile);
        this.offlineCache = new Map(Object.entries(cacheData));
      }
    } catch (error) {
      this.warnings.push({
        type: 'offline_cache_init_failed',
        message: `Failed to initialize offline cache: ${error.message}`,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Save offline cache to disk
   * @private
   */
  async _saveOfflineCache() {
    if (!this.options.enableOfflineCache || this.offlineCache.size === 0) {
      return;
    }

    try {
      const cacheFile = path.join(this.options.offlineCachePath, 'package-cache.json');
      const cacheData = Object.fromEntries(this.offlineCache);
      await fs.writeJson(cacheFile, cacheData, { spaces: 2 });
    } catch (error) {
      this.warnings.push({
        type: 'offline_cache_save_failed',
        message: `Failed to save offline cache: ${error.message}`,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Enhanced package info retrieval with comprehensive error handling
   * @param {string} packageName - Name of the package
   * @param {string} version - Version range
   * @returns {Promise<object>} Package information including peer dependencies
   */
  async getPackageInfo(packageName, version) {
    const cacheKey = `${packageName}@${version}`;
    
    // Check memory cache first
    if (this.options.cacheEnabled && this.packageInfoCache.has(cacheKey)) {
      return this.packageInfoCache.get(cacheKey);
    }
    
    // Check offline cache
    if (this.options.enableOfflineCache && this.offlineCache.has(cacheKey)) {
      const cachedInfo = this.offlineCache.get(cacheKey);
      this.packageInfoCache.set(cacheKey, cachedInfo);
      return cachedInfo;
    }
    
    // Handle offline mode
    if (this.options.offline) {
      return this._getOfflinePackageInfo(packageName, version);
    }
    
    // Validate package name to prevent malformed package issues
    if (!this._isValidPackageName(packageName)) {
      const error = new Error(`Invalid package name: ${packageName}`);
      this._handleMalformedPackage(packageName, version, error);
      return this._createFallbackPackageInfo(packageName, version, 'invalid_name');
    }

    try {
      // Resolve the actual version that would be installed
      const resolvedVersion = await this._resolvePackageVersion(packageName, version);
      const resolvedCacheKey = `${packageName}@${resolvedVersion}`;
      
      // Check cache with resolved version
      if (this.options.cacheEnabled && this.packageInfoCache.has(resolvedCacheKey)) {
        const cachedInfo = this.packageInfoCache.get(resolvedCacheKey);
        this.packageInfoCache.set(cacheKey, cachedInfo); // Cache with original key too
        return cachedInfo;
      }
      
      // Fetch package info from npm with enhanced error handling
      const packageInfo = await this._fetchPackageInfoWithRetry(packageName, resolvedVersion);
      
      // Validate and normalize package info
      const normalizedInfo = this._normalizePackageInfo(packageInfo, packageName, resolvedVersion);
      
      // Cache the result
      if (this.options.cacheEnabled) {
        this.packageInfoCache.set(cacheKey, normalizedInfo);
        this.packageInfoCache.set(resolvedCacheKey, normalizedInfo);
      }
      
      // Save to offline cache
      if (this.options.enableOfflineCache) {
        this.offlineCache.set(cacheKey, normalizedInfo);
      }
      
      return normalizedInfo;
      
    } catch (error) {
      this._handlePackageInfoError(packageName, version, error);
      
      // Try fallback strategies
      return await this._tryFallbackStrategies(packageName, version, error);
    }
  }

  /**
   * Validate package name format
   * @private
   * @param {string} packageName - Package name to validate
   * @returns {boolean} True if valid
   */
  _isValidPackageName(packageName) {
    if (!packageName || typeof packageName !== 'string') {
      return false;
    }
    
    // Basic npm package name validation
    const validNameRegex = /^(@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/;
    return validNameRegex.test(packageName) && packageName.length <= 214;
  }

  /**
   * Handle malformed package errors
   * @private
   * @param {string} packageName - Package name
   * @param {string} version - Version
   * @param {Error} error - Error that occurred
   */
  _handleMalformedPackage(packageName, version, error) {
    this.malformedPackages.push({
      package: packageName,
      version,
      error: error.message,
      timestamp: new Date().toISOString()
    });
    
    this.warnings.push({
      type: 'malformed_package',
      package: packageName,
      version,
      message: `Malformed package detected: ${error.message}`,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Create fallback package info for failed packages
   * @private
   * @param {string} packageName - Package name
   * @param {string} version - Version
   * @param {string} reason - Reason for fallback
   * @returns {object} Fallback package info
   */
  _createFallbackPackageInfo(packageName, version, reason) {
    return {
      name: packageName,
      version,
      peerDependencies: {},
      dependencies: {},
      engines: {},
      description: '',
      _fallback: true,
      _fallbackReason: reason,
      _fetchedAt: new Date().toISOString()
    };
  }

  /**
   * Fetch package info with enhanced retry logic and private registry support
   * @private
   * @param {string} packageName - Package name
   * @param {string} version - Version
   * @returns {Promise<object>} Package information
   */
  async _fetchPackageInfoWithRetry(packageName, version) {
    let lastError;
    
    for (let attempt = 1; attempt <= this.options.retries; attempt++) {
      try {
        const command = this._buildNpmInfoCommand(packageName, version);
        const result = await this._executeCommandWithTimeout(command);
        
        let packageInfo;
        try {
          packageInfo = JSON.parse(result);
        } catch (parseError) {
          throw new Error(`Failed to parse npm info response for ${packageName}: ${parseError.message}`);
        }
        
        // Validate the response structure
        if (!this._isValidPackageInfo(packageInfo)) {
          throw new Error(`Invalid package info structure for ${packageName}`);
        }
        
        return packageInfo;
        
      } catch (error) {
        lastError = error;
        
        // Log network errors separately
        if (this._isNetworkError(error)) {
          this.networkErrors.push({
            package: packageName,
            version,
            attempt,
            error: error.message,
            timestamp: new Date().toISOString()
          });
        }
        
        if (attempt < this.options.retries) {
          // Progressive backoff delay
          const delay = this.options.networkRetryDelay * Math.pow(2, attempt - 1);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    throw lastError;
  }

  /**
   * Build npm info command with private registry support
   * @private
   * @param {string} packageName - Package name
   * @param {string} version - Version
   * @returns {string} npm command
   */
  _buildNpmInfoCommand(packageName, version) {
    let command = `npm info ${packageName}@${version} --json`;
    
    // Add registry if specified
    if (this.options.registry && this.options.registry !== 'https://registry.npmjs.org/') {
      command += ` --registry=${this.options.registry}`;
    }
    
    // Add authentication for private registries
    if (this.options.enablePrivateRegistry && this.options.privateRegistryAuth) {
      // Note: In production, auth should be handled via .npmrc or environment variables
      // This is a fallback for programmatic access
      if (this.options.privateRegistryAuth.token) {
        command += ` --//registry.npmjs.org/:_authToken=${this.options.privateRegistryAuth.token}`;
      }
    }
    
    return command;
  }

  /**
   * Execute command with enhanced timeout and error handling
   * @private
   * @param {string} command - Command to execute
   * @returns {Promise<string>} Command output
   */
  async _executeCommandWithTimeout(command) {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Command timeout after ${this.options.timeout}ms: ${command}`));
      }, this.options.timeout);
      
      try {
        const output = execSync(command, { 
          encoding: 'utf8',
          timeout: this.options.timeout,
          stdio: ['pipe', 'pipe', 'pipe'],
          env: { ...process.env, NODE_ENV: 'production' } // Ensure clean environment
        });
        clearTimeout(timeout);
        resolve(output);
      } catch (error) {
        clearTimeout(timeout);
        
        // Enhance error message with more context
        const enhancedError = new Error(`Command failed: ${command}\nError: ${error.message}`);
        enhancedError.originalError = error;
        enhancedError.command = command;
        enhancedError.exitCode = error.status;
        
        reject(enhancedError);
      }
    });
  }

  /**
   * Check if error is network-related
   * @private
   * @param {Error} error - Error to check
   * @returns {boolean} True if network error
   */
  _isNetworkError(error) {
    const networkErrorPatterns = [
      'ENOTFOUND',
      'ECONNREFUSED',
      'ETIMEDOUT',
      'ECONNRESET',
      'network',
      'timeout',
      'registry',
      'fetch failed'
    ];
    
    const errorMessage = error.message.toLowerCase();
    return networkErrorPatterns.some(pattern => errorMessage.includes(pattern));
  }

  /**
   * Validate package info structure
   * @private
   * @param {object} packageInfo - Package info to validate
   * @returns {boolean} True if valid
   */
  _isValidPackageInfo(packageInfo) {
    return packageInfo && 
           typeof packageInfo === 'object' && 
           packageInfo.name && 
           packageInfo.version;
  }

  /**
   * Normalize package info structure
   * @private
   * @param {object} packageInfo - Raw package info
   * @param {string} packageName - Expected package name
   * @param {string} version - Expected version
   * @returns {object} Normalized package info
   */
  _normalizePackageInfo(packageInfo, packageName, version) {
    return {
      name: packageInfo.name || packageName,
      version: packageInfo.version || version,
      description: packageInfo.description || '',
      peerDependencies: packageInfo.peerDependencies || {},
      dependencies: packageInfo.dependencies || {},
      devDependencies: packageInfo.devDependencies || {},
      engines: packageInfo.engines || {},
      keywords: packageInfo.keywords || [],
      homepage: packageInfo.homepage || '',
      repository: packageInfo.repository || {},
      bugs: packageInfo.bugs || {},
      license: packageInfo.license || '',
      _fetchedAt: new Date().toISOString(),
      _registry: this.options.registry
    };
  }

  /**
   * Handle package info retrieval errors
   * @private
   * @param {string} packageName - Package name
   * @param {string} version - Version
   * @param {Error} error - Error that occurred
   */
  _handlePackageInfoError(packageName, version, error) {
    this.errors.push({
      type: 'package_info_error',
      package: packageName,
      version,
      message: error.message,
      isNetworkError: this._isNetworkError(error),
      timestamp: new Date().toISOString()
    });
    
    if (this.options.verbose) {
      console.warn(`Failed to fetch package info for ${packageName}@${version}: ${error.message}`);
    }
  }

  /**
   * Try fallback strategies when package info fetch fails
   * @private
   * @param {string} packageName - Package name
   * @param {string} version - Version
   * @param {Error} originalError - Original error
   * @returns {Promise<object>} Fallback package info
   */
  async _tryFallbackStrategies(packageName, version, originalError) {
    // Strategy 1: Check offline cache with broader version matching
    if (this.options.fallbackToCache && this.options.enableOfflineCache) {
      const cachedInfo = this._findCachedVersionFallback(packageName, version);
      if (cachedInfo) {
        this.warnings.push({
          type: 'using_cached_fallback',
          package: packageName,
          version,
          message: 'Using cached version as fallback',
          timestamp: new Date().toISOString()
        });
        return cachedInfo;
      }
    }
    
    // Strategy 2: Try without version constraint
    if (version !== 'latest') {
      try {
        return await this._fetchPackageInfoWithRetry(packageName, 'latest');
      } catch (fallbackError) {
        // Continue to next strategy
      }
    }
    
    // Strategy 3: Skip malformed packages if enabled
    if (this.options.skipMalformedPackages) {
      this.skippedPackages++;
      return this._createFallbackPackageInfo(packageName, version, 'skipped_malformed');
    }
    
    // Strategy 4: Create minimal fallback info
    this.failedPackages++;
    return this._createFallbackPackageInfo(packageName, version, 'fetch_failed');
  }

  /**
   * Find cached version with broader matching
   * @private
   * @param {string} packageName - Package name
   * @param {string} version - Version range
   * @returns {object|null} Cached package info or null
   */
  _findCachedVersionFallback(packageName, version) {
    // Look for exact match first
    const exactKey = `${packageName}@${version}`;
    if (this.offlineCache.has(exactKey)) {
      return this.offlineCache.get(exactKey);
    }
    
    // Look for any version of the package
    for (const [key, info] of this.offlineCache.entries()) {
      if (key.startsWith(`${packageName}@`)) {
        return info;
      }
    }
    
    return null;
  }

  /**
   * Get peer dependencies for a specific package
   * @param {string} packageName - Name of the package
   * @param {string} version - Version range
   * @returns {Promise<object>} Peer dependencies object
   */
  async getPeerDependencies(packageName, version) {
    const cacheKey = `peers:${packageName}@${version}`;
    
    // Check cache first
    if (this.options.cacheEnabled && this.peerDependencyCache.has(cacheKey)) {
      return this.peerDependencyCache.get(cacheKey);
    }
    
    try {
      const packageInfo = await this.getPackageInfo(packageName, version);
      const peerDependencies = packageInfo.peerDependencies || {};
      
      // Cache the result
      if (this.options.cacheEnabled) {
        this.peerDependencyCache.set(cacheKey, peerDependencies);
      }
      
      return peerDependencies;
      
    } catch (error) {
      // Return empty object if we can't fetch peer dependencies
      this.warnings.push({
        type: 'peer_dependencies_fetch_failed',
        package: packageName,
        version,
        message: error.message,
        timestamp: new Date().toISOString()
      });
      
      return {};
    }
  }

  /**
   * Extract peer dependencies from all package info
   * @private
   * @param {Map} packageInfoMap - Map of package info
   * @returns {Map} Map of package names to their peer dependencies
   */
  _extractPeerDependencies(packageInfoMap) {
    const peerDependencyMap = new Map();
    
    for (const [packageName, packageInfo] of packageInfoMap) {
      const peerDeps = packageInfo.peerDependencies || {};
      if (Object.keys(peerDeps).length > 0) {
        peerDependencyMap.set(packageName, peerDeps);
      }
    }
    
    return peerDependencyMap;
  }

  /**
   * Detect peer dependency conflicts
   * @private
   * @param {object} dependencies - All dependencies
   * @param {Map} peerDependencyMap - Map of peer dependencies
   * @returns {Array} Array of detected conflicts
   */
  _detectPeerDependencyConflicts(dependencies, peerDependencyMap) {
    const conflicts = [];
    
    for (const [packageName, peerDeps] of peerDependencyMap) {
      for (const [peerName, peerVersionRange] of Object.entries(peerDeps)) {
        const installedVersion = dependencies[peerName];
        
        if (!installedVersion) {
          // Missing peer dependency
          conflicts.push({
            type: 'missing_peer',
            package: packageName,
            peerDependency: peerName,
            requiredVersion: peerVersionRange,
            installedVersion: null,
            severity: 'high',
            message: `${packageName} requires peer dependency ${peerName}@${peerVersionRange} but it's not installed`
          });
        } else {
          // Check version compatibility
          try {
            const isCompatible = this._checkVersionCompatibility(installedVersion, peerVersionRange);
            
            if (!isCompatible) {
              conflicts.push({
                type: 'version_mismatch',
                package: packageName,
                peerDependency: peerName,
                requiredVersion: peerVersionRange,
                installedVersion,
                severity: 'medium',
                message: `${packageName} requires ${peerName}@${peerVersionRange} but ${installedVersion} will be installed`
              });
            }
          } catch (error) {
            // Version comparison failed
            conflicts.push({
              type: 'version_check_failed',
              package: packageName,
              peerDependency: peerName,
              requiredVersion: peerVersionRange,
              installedVersion,
              severity: 'low',
              message: `Could not verify version compatibility for ${peerName}: ${error.message}`
            });
          }
        }
      }
    }
    
    return conflicts;
  }

  /**
   * Check if installed version satisfies peer dependency requirement
   * @private
   * @param {string} installedVersion - Version that will be installed
   * @param {string} requiredRange - Required version range
   * @returns {boolean} Whether versions are compatible
   */
  _checkVersionCompatibility(installedVersion, requiredRange) {
    try {
      // Clean version strings
      const cleanInstalled = semver.coerce(installedVersion);
      const cleanRequired = requiredRange.replace(/^\^|~/, '');
      
      if (!cleanInstalled) {
        return false;
      }
      
      // Check if installed version satisfies the required range
      return semver.satisfies(cleanInstalled.version, requiredRange);
    } catch (error) {
      // If semver parsing fails, assume incompatible
      return false;
    }
  }

  /**
   * Resolve detected conflicts
   * @private
   * @param {Array} conflicts - Detected conflicts
   * @param {object} dependencies - Current dependencies
   * @param {Map} peerDependencyMap - Peer dependency map
   * @returns {Promise<Array>} Array of resolutions
   */
  async _resolveConflicts(conflicts, dependencies, peerDependencyMap) {
    const resolutions = [];
    
    for (const conflict of conflicts) {
      try {
        const resolution = await this._resolveConflict(conflict, dependencies, peerDependencyMap);
        if (resolution) {
          resolutions.push(resolution);
        }
      } catch (error) {
        this.warnings.push({
          type: 'conflict_resolution_failed',
          conflict,
          message: error.message,
          timestamp: new Date().toISOString()
        });
      }
    }
    
    return resolutions;
  }

  /**
   * Resolve a single conflict
   * @private
   * @param {object} conflict - Conflict to resolve
   * @param {object} dependencies - Current dependencies
   * @param {Map} peerDependencyMap - Peer dependency map
   * @returns {Promise<object|null>} Resolution or null if can't resolve
   */
  async _resolveConflict(conflict, dependencies, peerDependencyMap) {
    switch (conflict.type) {
      case 'missing_peer':
        return this._resolveMissingPeer(conflict, dependencies);
      
      case 'version_mismatch':
        return this._resolveVersionMismatch(conflict, dependencies);
      
      case 'version_check_failed':
        return this._resolveVersionCheckFailed(conflict, dependencies);
      
      default:
        return null;
    }
  }

  /**
   * Resolve missing peer dependency
   * @private
   * @param {object} conflict - Missing peer conflict
   * @param {object} dependencies - Current dependencies
   * @returns {object} Resolution
   */
  _resolveMissingPeer(conflict, dependencies) {
    return {
      type: 'add_dependency',
      package: conflict.peerDependency,
      version: conflict.requiredVersion,
      reason: `Required as peer dependency by ${conflict.package}`,
      action: 'add',
      confidence: 'high',
      originalConflict: conflict
    };
  }

  /**
   * Resolve version mismatch
   * @private
   * @param {object} conflict - Version mismatch conflict
   * @param {object} dependencies - Current dependencies
   * @returns {object|null} Resolution or null
   */
  _resolveVersionMismatch(conflict, dependencies) {
    try {
      // Try to find a compatible version
      const compatibleVersion = this._findCompatibleVersion(
        conflict.installedVersion,
        conflict.requiredVersion
      );
      
      if (compatibleVersion) {
        return {
          type: 'update_version',
          package: conflict.peerDependency,
          fromVersion: conflict.installedVersion,
          toVersion: compatibleVersion,
          reason: `Updated to satisfy peer dependency requirement from ${conflict.package}`,
          action: 'update',
          confidence: 'medium',
          originalConflict: conflict
        };
      }
      
      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Resolve version check failed
   * @private
   * @param {object} conflict - Version check failed conflict
   * @param {object} dependencies - Current dependencies
   * @returns {object} Resolution
   */
  _resolveVersionCheckFailed(conflict, dependencies) {
    return {
      type: 'warning_only',
      package: conflict.peerDependency,
      version: conflict.installedVersion,
      reason: `Could not verify compatibility with ${conflict.package}, proceeding with current version`,
      action: 'warn',
      confidence: 'low',
      originalConflict: conflict
    };
  }

  /**
   * Find a version that satisfies both current and required ranges
   * @private
   * @param {string} currentVersion - Current version range
   * @param {string} requiredVersion - Required version range
   * @returns {string|null} Compatible version or null
   */
  _findCompatibleVersion(currentVersion, requiredVersion) {
    try {
      // For now, prefer the more restrictive version
      // This is a simplified approach - could be enhanced with actual version resolution
      const currentCoerced = semver.coerce(currentVersion);
      const requiredCoerced = semver.coerce(requiredVersion);
      
      if (!currentCoerced || !requiredCoerced) {
        return null;
      }
      
      // If required version is higher, use it
      if (semver.gt(requiredCoerced.version, currentCoerced.version)) {
        return requiredVersion;
      }
      
      // Check if current version satisfies required range
      if (semver.satisfies(currentCoerced.version, requiredVersion)) {
        return currentVersion;
      }
      
      // Try to find intersection (simplified)
      return requiredVersion;
    } catch (error) {
      return null;
    }
  }

  /**
   * Execute a command with timeout and retry logic
   * @private
   * @param {string} command - Command to execute
   * @returns {Promise<string>} Command output
   */
  async _executeCommand(command) {
    let lastError;
    
    for (let attempt = 1; attempt <= this.options.retries; attempt++) {
      try {
        const result = await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error(`Command timeout after ${this.options.timeout}ms`));
          }, this.options.timeout);
          
          try {
            const output = execSync(command, { 
              encoding: 'utf8',
              timeout: this.options.timeout,
              stdio: ['pipe', 'pipe', 'pipe']
            });
            clearTimeout(timeout);
            resolve(output);
          } catch (error) {
            clearTimeout(timeout);
            reject(error);
          }
        });
        
        return result;
      } catch (error) {
        lastError = error;
        
        if (attempt < this.options.retries) {
          // Wait before retry
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
      }
    }
    
    throw lastError;
  }

  /**
   * Resolve package version from version range
   * @private
   * @param {string} packageName - Package name
   * @param {string} versionRange - Version range
   * @returns {Promise<string>} Resolved version
   */
  async _resolvePackageVersion(packageName, versionRange) {
    try {
      // Use npm view to get the version that would be installed
      const command = `npm view ${packageName}@"${versionRange}" version --json`;
      const result = await this._executeCommand(command);
      
      let versions = JSON.parse(result);
      
      // Handle single version vs array of versions
      if (Array.isArray(versions)) {
        return versions[versions.length - 1]; // Latest matching version
      } else {
        return versions;
      }
    } catch (error) {
      // Fallback to coerced version
      const coerced = semver.coerce(versionRange);
      return coerced ? coerced.version : versionRange;
    }
  }

  /**
   * Get offline package info (fallback)
   * @private
   * @param {string} packageName - Package name
   * @param {string} version - Version
   * @returns {object} Basic package info
   */
  _getOfflinePackageInfo(packageName, version) {
    return {
      name: packageName,
      version,
      peerDependencies: {},
      dependencies: {},
      engines: {},
      description: '',
      _offline: true,
      _fetchedAt: new Date().toISOString()
    };
  }

  /**
   * Generate analysis result with comprehensive edge case reporting
   * @private
   * @param {object} dependencies - All dependencies
   * @param {Array} conflicts - Detected conflicts
   * @param {Array} resolutions - Generated resolutions
   * @param {Map} packageInfoMap - Package info map
   * @returns {object} Complete analysis result
   */
  _generateAnalysisResult(dependencies, conflicts, resolutions, packageInfoMap) {
    const result = {
      success: true,
      timestamp: new Date().toISOString(),
      summary: {
        totalPackages: Object.keys(dependencies).length,
        packagesWithPeerDeps: Array.from(packageInfoMap.values())
          .filter(info => Object.keys(info.peerDependencies || {}).length > 0).length,
        conflictsDetected: conflicts.length,
        conflictsResolved: resolutions.length,
        warningsGenerated: this.warnings.length,
        errorsEncountered: this.errors.length,
        
        // Enhanced edge case reporting
        packagesProcessed: this.processedPackages,
        packagesFailed: this.failedPackages,
        packagesSkipped: this.skippedPackages,
        networkErrors: this.networkErrors.length,
        malformedPackages: this.malformedPackages.length,
        fallbacksUsed: Array.from(packageInfoMap.values())
          .filter(info => info._fallback || info._offline).length,
        cacheHits: this.packageInfoCache.size,
        offlineCacheSize: this.offlineCache.size
      },
      conflicts,
      resolutions,
      warnings: this.warnings,
      errors: this.errors,
      
      // Enhanced edge case data
      networkErrors: this.networkErrors,
      malformedPackages: this.malformedPackages,
      edgeCases: this._generateEdgeCaseReport(packageInfoMap),
      
      recommendations: this._generateRecommendations(conflicts, resolutions),
      modifiedDependencies: this._applyResolutions(dependencies, resolutions),
      metadata: {
        analyzer: 'PeerDependencyAnalyzer',
        version: '1.0.0',
        options: this.options,
        cacheStats: {
          packageInfoCacheSize: this.packageInfoCache.size,
          peerDependencyCacheSize: this.peerDependencyCache.size,
          offlineCacheSize: this.offlineCache.size,
          offlineCacheEnabled: this.options.enableOfflineCache
        },
        performance: {
          totalPackages: this.totalPackages,
          processedPackages: this.processedPackages,
          failedPackages: this.failedPackages,
          skippedPackages: this.skippedPackages,
          successRate: this.totalPackages > 0 ? 
            ((this.processedPackages - this.failedPackages) / this.totalPackages * 100).toFixed(2) + '%' : '100%'
        }
      }
    };
    
    return result;
  }

  /**
   * Generate comprehensive edge case report
   * @private
   * @param {Map} packageInfoMap - Package info map
   * @returns {object} Edge case report
   */
  _generateEdgeCaseReport(packageInfoMap) {
    const report = {
      fallbackPackages: [],
      offlinePackages: [],
      invalidPackages: [],
      networkFailures: [],
      cacheUtilization: {
        memoryCache: this.packageInfoCache.size,
        offlineCache: this.offlineCache.size,
        cacheHitRate: this.totalPackages > 0 ? 
          (this.packageInfoCache.size / this.totalPackages * 100).toFixed(2) + '%' : '0%'
      },
      recommendations: []
    };

    // Analyze package info for edge cases
    for (const [packageName, info] of packageInfoMap.entries()) {
      if (info._fallback) {
        report.fallbackPackages.push({
          package: packageName,
          reason: info._fallbackReason,
          version: info.version
        });
      }
      
      if (info._offline) {
        report.offlinePackages.push({
          package: packageName,
          version: info.version
        });
      }
      
      if (info._fetchError) {
        report.invalidPackages.push({
          package: packageName,
          error: info._fetchError,
          version: info.version
        });
      }
    }

    // Network failure analysis
    const networkFailuresByPackage = new Map();
    for (const error of this.networkErrors) {
      const key = error.package;
      if (!networkFailuresByPackage.has(key)) {
        networkFailuresByPackage.set(key, []);
      }
      networkFailuresByPackage.get(key).push(error);
    }

    for (const [packageName, failures] of networkFailuresByPackage.entries()) {
      report.networkFailures.push({
        package: packageName,
        attempts: failures.length,
        lastError: failures[failures.length - 1].error,
        firstAttempt: failures[0].timestamp,
        lastAttempt: failures[failures.length - 1].timestamp
      });
    }

    // Generate recommendations based on edge cases
    if (report.fallbackPackages.length > 0) {
      report.recommendations.push({
        type: 'fallback_packages',
        message: `${report.fallbackPackages.length} packages used fallback data`,
        action: 'Consider checking network connectivity or package availability',
        severity: 'medium'
      });
    }

    if (report.networkFailures.length > 0) {
      report.recommendations.push({
        type: 'network_issues',
        message: `${report.networkFailures.length} packages experienced network failures`,
        action: 'Check network connectivity and npm registry accessibility',
        severity: 'high'
      });
    }

    if (this.malformedPackages.length > 0) {
      report.recommendations.push({
        type: 'malformed_packages',
        message: `${this.malformedPackages.length} packages have invalid names or structure`,
        action: 'Review package names and versions for typos or invalid formats',
        severity: 'high'
      });
    }

    if (this.options.offline && report.offlinePackages.length > 0) {
      report.recommendations.push({
        type: 'offline_mode',
        message: `Analysis ran in offline mode with ${report.offlinePackages.length} packages`,
        action: 'Results may be incomplete. Run online for full analysis',
        severity: 'low'
      });
    }

    return report;
  }

  /**
   * Generate recommendations based on analysis
   * @private
   * @param {Array} conflicts - Detected conflicts
   * @param {Array} resolutions - Generated resolutions
   * @returns {Array} Array of recommendations
   */
  _generateRecommendations(conflicts, resolutions) {
    const recommendations = [];
    
    // High severity conflicts
    const highSeverityConflicts = conflicts.filter(c => c.severity === 'high');
    if (highSeverityConflicts.length > 0) {
      recommendations.push({
        type: 'high_priority',
        message: `${highSeverityConflicts.length} high-severity peer dependency conflicts detected`,
        action: 'Review and resolve these conflicts before proceeding',
        conflicts: highSeverityConflicts.map(c => c.package)
      });
    }
    
    // Unresolved conflicts
    const unresolvedConflicts = conflicts.filter(c => 
      !resolutions.some(r => r.originalConflict === c)
    );
    if (unresolvedConflicts.length > 0) {
      recommendations.push({
        type: 'manual_review',
        message: `${unresolvedConflicts.length} conflicts could not be automatically resolved`,
        action: 'Manual review and resolution required',
        conflicts: unresolvedConflicts.map(c => c.package)
      });
    }
    
    // Installation flags
    if (conflicts.length > resolutions.length) {
      recommendations.push({
        type: 'installation_flags',
        message: 'Consider using --legacy-peer-deps flag during installation',
        action: 'Add --legacy-peer-deps to npm install command if conflicts persist'
      });
    }
    
    return recommendations;
  }

  /**
   * Apply resolutions to dependencies
   * @private
   * @param {object} dependencies - Original dependencies
   * @param {Array} resolutions - Resolutions to apply
   * @returns {object} Modified dependencies
   */
  _applyResolutions(dependencies, resolutions) {
    const modified = { ...dependencies };
    
    for (const resolution of resolutions) {
      switch (resolution.action) {
        case 'add':
          modified[resolution.package] = resolution.version;
          break;
        case 'update':
          modified[resolution.package] = resolution.toVersion;
          break;
        // 'warn' action doesn't modify dependencies
      }
    }
    
    return modified;
  }

  /**
   * Generate empty result for no dependencies
   * @private
   * @returns {object} Empty analysis result
   */
  _generateEmptyResult() {
    return {
      success: true,
      timestamp: new Date().toISOString(),
      summary: {
        totalPackages: 0,
        packagesWithPeerDeps: 0,
        conflictsDetected: 0,
        conflictsResolved: 0,
        warningsGenerated: 0,
        errorsEncountered: 0
      },
      conflicts: [],
      resolutions: [],
      warnings: [],
      errors: [],
      recommendations: [],
      modifiedDependencies: {},
      metadata: {
        analyzer: 'PeerDependencyAnalyzer',
        version: '1.0.0',
        options: this.options
      }
    };
  }

  /**
   * Reset internal state
   * @private
   */
  _resetState() {
    this.analysisResults = [];
    this.conflicts = [];
    this.resolutions = [];
    this.warnings = [];
    this.errors = [];
    this.networkErrors = [];
    this.malformedPackages = [];
    this.processedPackages = 0;
    this.failedPackages = 0;
    this.skippedPackages = 0;
  }

  /**
   * Update progress
   * @private
   * @param {string} message - Progress message
   */
  _updateProgress(message) {
    if (this.progressCallback) {
      this.progressCallback({
        phase: this.currentPhase,
        message,
        processed: this.processedPackages,
        total: this.totalPackages,
        percentage: this.totalPackages > 0 ? (this.processedPackages / this.totalPackages) * 100 : 0
      });
    }
    
    if (this.options.verbose) {
      console.log(`[PeerDependencyAnalyzer] ${message}`);
    }
  }

  /**
   * Clear all caches
   */
  clearCache() {
    this.packageInfoCache.clear();
    this.peerDependencyCache.clear();
  }

  /**
   * Get cache statistics
   * @returns {object} Cache statistics
   */
  getCacheStats() {
    return {
      packageInfoCacheSize: this.packageInfoCache.size,
      peerDependencyCacheSize: this.peerDependencyCache.size,
      cacheEnabled: this.options.cacheEnabled
    };
  }

  /**
   * Set progress callback
   * @param {Function} callback - Progress callback function
   */
  setProgressCallback(callback) {
    this.progressCallback = callback;
  }

  /**
   * Get current analysis state
   * @returns {object} Current state
   */
  getState() {
    return {
      currentPhase: this.currentPhase,
      totalPackages: this.totalPackages,
      processedPackages: this.processedPackages,
      conflictsFound: this.conflicts.length,
      resolutionsGenerated: this.resolutions.length,
      warningsGenerated: this.warnings.length,
      errorsEncountered: this.errors.length
    };
  }
}

module.exports = {
  PeerDependencyAnalyzer
}; 