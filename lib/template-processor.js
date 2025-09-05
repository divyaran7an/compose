const fs = require('fs-extra');
const path = require('path');
const semver = require('semver');
const { validateTemplateConfig } = require('./templateConfigSchema');
const { PeerDependencyAnalyzer } = require('./dependency-analyzer');

/**
 * Template Configuration Reader
 * Provides enhanced functionality to read, parse, and validate template configurations
 */
class TemplateConfigReader {
  constructor() {
    this.cache = new Map();
    this.errors = [];
  }

  /**
   * Read and parse a single template configuration
   * @param {string} templatePath - Path to the template directory
   * @param {string} sdk - SDK name (e.g., 'supabase', 'vercel-ai')
   * @param {string} templateName - Template name (default: 'default')
   * @returns {Promise<object>} Parsed and validated template configuration
   */
  async readTemplateConfig(templatePath, sdk, templateName = 'default') {
    const cacheKey = `${sdk}/${templateName}`;
    
    // Check cache first
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    const configPath = path.join(templatePath, 'config.json');
    
    try {
      // Check if config file exists
      if (!(await fs.pathExists(configPath))) {
        throw new Error(`Template configuration not found: ${configPath}`);
      }

      // Read and parse config file
      const configRaw = await fs.readFile(configPath, 'utf-8');
      let config;
      
      try {
        config = JSON.parse(configRaw);
      } catch (parseError) {
        throw new Error(`Invalid JSON in template config: ${parseError.message}`);
      }

      // Validate configuration structure
      const { valid, errors: validationErrors } = validateTemplateConfig(config);
      
      if (!valid) {
        const errorMessages = validationErrors.map(err => 
          `${err.instancePath || 'root'}: ${err.message}`
        ).join(', ');
        throw new Error(`Template configuration validation failed: ${errorMessages}`);
      }

      // Enhance config with metadata
      const enhancedConfig = {
        ...config,
        _metadata: {
          sdk,
          templateName,
          templatePath,
          configPath,
          lastRead: new Date().toISOString(),
          fileCount: Object.keys(config.files || {}).length,
          packageCount: (config.packages || []).length + (config.devPackages || []).length,
          envVarCount: (config.envVars || []).length
        }
      };

      // Validate that referenced files exist
      await this._validateTemplateFiles(templatePath, config.files || {});

      // Cache the result
      this.cache.set(cacheKey, enhancedConfig);
      
      return enhancedConfig;

    } catch (error) {
      const errorInfo = {
        sdk,
        templateName,
        templatePath,
        configPath,
        error: error.message,
        timestamp: new Date().toISOString()
      };
      
      this.errors.push(errorInfo);
      throw new Error(`Failed to read template config for ${sdk}/${templateName}: ${error.message}`);
    }
  }

  /**
   * Read configurations for multiple selected templates
   * @param {Array<object>} selectedTemplates - Array of template objects with path, sdk, and templateName
   * @returns {Promise<Array<object>>} Array of parsed template configurations
   */
  async readSelectedTemplateConfigs(selectedTemplates) {
    const configs = [];
    const readErrors = [];

    for (const template of selectedTemplates) {
      try {
        const config = await this.readTemplateConfig(
          template.path,
          template.sdk,
          template.templateName || template.template || 'default'
        );
        configs.push(config);
      } catch (error) {
        readErrors.push({
          template,
          error: error.message
        });
      }
    }

    if (readErrors.length > 0) {
      console.warn(`[TemplateConfigReader] ${readErrors.length} template(s) failed to load:`);
      readErrors.forEach(({ template, error }) => {
        console.warn(`  - ${template.sdk}/${template.templateName || template.template}: ${error}`);
      });
    }

    return configs;
  }

  /**
   * Extract metadata summary from template configurations
   * @param {Array<object>} configs - Array of template configurations
   * @returns {object} Metadata summary
   */
  extractMetadataSummary(configs) {
    const summary = {
      totalTemplates: configs.length,
      sdks: [...new Set(configs.map(c => c._metadata.sdk))],
      totalFiles: configs.reduce((sum, c) => sum + c._metadata.fileCount, 0),
      totalPackages: configs.reduce((sum, c) => sum + c._metadata.packageCount, 0),
      totalEnvVars: configs.reduce((sum, c) => sum + c._metadata.envVarCount, 0),
      templatesBySDK: {}
    };

    // Group templates by SDK
    configs.forEach(config => {
      const sdk = config._metadata.sdk;
      if (!summary.templatesBySDK[sdk]) {
        summary.templatesBySDK[sdk] = [];
      }
      summary.templatesBySDK[sdk].push({
        name: config.name,
        displayName: config.displayName,
        templateName: config._metadata.templateName,
        fileCount: config._metadata.fileCount,
        packageCount: config._metadata.packageCount,
        envVarCount: config._metadata.envVarCount
      });
    });

    return summary;
  }

  /**
   * Validate that all files referenced in template config exist
   * @private
   * @param {string} templatePath - Path to template directory
   * @param {object} filesMapping - Files mapping from config
   */
  async _validateTemplateFiles(templatePath, filesMapping) {
    const missingFiles = [];

    for (const [sourceFile, targetPath] of Object.entries(filesMapping)) {
      const sourcePath = path.join(templatePath, sourceFile);
      
      if (!(await fs.pathExists(sourcePath))) {
        missingFiles.push(sourceFile);
      }
    }

    if (missingFiles.length > 0) {
      throw new Error(`Template files not found: ${missingFiles.join(', ')}`);
    }
  }

  /**
   * Clear the configuration cache
   */
  clearCache() {
    this.cache.clear();
    this.errors = [];
  }

  /**
   * Get all cached configurations
   * @returns {Map} Cache map
   */
  getCache() {
    return this.cache;
  }

  /**
   * Get all errors encountered during configuration reading
   * @returns {Array} Array of error objects
   */
  getErrors() {
    return this.errors;
  }

  /**
   * Get configuration reading statistics
   * @returns {object} Statistics object
   */
  getStatistics() {
    return {
      cachedConfigs: this.cache.size,
      totalErrors: this.errors.length,
      errorsBySDK: this.errors.reduce((acc, error) => {
        acc[error.sdk] = (acc[error.sdk] || 0) + 1;
        return acc;
      }, {})
    };
  }
}

/**
 * Dependency Merger
 * Advanced dependency merging and conflict resolution for package dependencies from multiple templates
 */
class DependencyMerger {
  constructor(options = {}) {
    this.strategy = options.strategy || 'smart'; // 'smart', 'highest', 'lowest', 'compatible', 'manual'
    this.conflicts = [];
    this.warnings = [];
    this.resolutions = [];
    this.compatibilityCache = new Map();
    
    // Peer dependency analysis options
    this.enablePeerAnalysis = options.enablePeerAnalysis !== false && process.env.NODE_ENV !== 'test'; // Default to true, disabled in tests
    this.peerAnalysisOptions = {
      timeout: options.peerAnalysisTimeout || 30000,
      maxConcurrency: options.peerAnalysisMaxConcurrency || 5,
      enableCache: options.peerAnalysisEnableCache !== false,
      ...options.peerAnalysisOptions
    };
    this.peerDependencyAnalyzer = new PeerDependencyAnalyzer(this.peerAnalysisOptions);
  }

  /**
   * Merge dependencies from multiple template configurations
   * @param {Array<object>} templateConfigs - Array of template configurations
   * @returns {Promise<object>|object} Merged dependencies result (async if peer analysis enabled, sync otherwise)
   */
  mergeDependencies(templateConfigs) {
    const result = {
      dependencies: {},
      devDependencies: {},
      peerDependencies: {},
      conflicts: [],
      warnings: [],
      resolutions: [],
      peerDependencyAnalysis: null,
      summary: {
        totalTemplates: templateConfigs.length,
        totalPackages: 0,
        conflictCount: 0,
        warningCount: 0,
        resolutionCount: 0,
        compatibilityIssues: 0,
        peerDependencyIssues: 0
      }
    };

    // Reset internal state
    this.conflicts = [];
    this.warnings = [];
    this.resolutions = [];
    this.compatibilityCache.clear();

    // Process each template
    for (const config of templateConfigs) {
      this._mergeTemplatePackages(config, result);
    }

    // Perform post-processing analysis
    this._analyzeCompatibility(result);
    
    // If peer dependency analysis is disabled (e.g., during tests), return synchronously
    if (!this.enablePeerAnalysis) {
      this._generateResolutionSummary(result);
      this._finalizeResult(result);
      return result;
    }

    // If peer dependency analysis is enabled, return a promise
    return this._performAsyncAnalysis(result);
  }

  /**
   * Perform async peer dependency analysis
   * @private
   * @param {object} result - The result object to analyze
   * @returns {Promise<object>} The final result with peer dependency analysis
   */
  async _performAsyncAnalysis(result) {
    // Perform peer dependency analysis if enabled
    try {
      result.peerDependencyAnalysis = await this._analyzePeerDependencies(result);
      result.summary.peerDependencyIssues = result.peerDependencyAnalysis.conflicts.length;
    } catch (error) {
      this.warnings.push({
        type: 'peer_analysis_error',
        message: `Peer dependency analysis failed: ${error.message}`,
        recommendation: 'Continuing without peer dependency analysis'
      });
    }
    
    this._generateResolutionSummary(result);
    this._finalizeResult(result);
    return result;
  }

  /**
   * Finalize the result object with conflicts, warnings, and summary
   * @private
   * @param {object} result - The result object to finalize
   */
  _finalizeResult(result) {
    // Finalize result
    result.conflicts = this.conflicts;
    result.warnings = this.warnings;
    result.resolutions = this.resolutions;
    result.summary.totalPackages = 
      Object.keys(result.dependencies).length + 
      Object.keys(result.devDependencies).length + 
      Object.keys(result.peerDependencies).length;
    result.summary.conflictCount = this.conflicts.length;
    result.summary.warningCount = this.warnings.length;
    result.summary.resolutionCount = this.resolutions.length;
  }

  /**
   * Merge packages from a single template into the result
   * @private
   * @param {object} config - Template configuration
   * @param {object} result - Accumulating result object
   */
  _mergeTemplatePackages(config, result) {
    const templateName = `${config._metadata?.sdk || 'unknown'}/${config._metadata?.templateName || 'default'}`;

    // Merge regular dependencies
    if (config.packages) {
      for (const pkg of config.packages) {
        this._mergePackage(pkg, result.dependencies, 'dependencies', templateName);
      }
    }

    // Merge dev dependencies
    if (config.devPackages) {
      for (const pkg of config.devPackages) {
        this._mergePackage(pkg, result.devDependencies, 'devDependencies', templateName);
      }
    }

    // Merge peer dependencies (if present in future)
    if (config.peerDependencies) {
      for (const pkg of config.peerDependencies) {
        this._mergePackage(pkg, result.peerDependencies, 'peerDependencies', templateName);
      }
    }
  }

  /**
   * Merge a single package into the target dependencies object
   * @private
   * @param {object} pkg - Package object with name and version
   * @param {object} target - Target dependencies object
   * @param {string} type - Dependency type ('dependencies', 'devDependencies', etc.)
   * @param {string} templateName - Name of the template providing this package
   */
  _mergePackage(pkg, target, type, templateName) {
    const { name, version } = pkg;

    if (!target[name]) {
      // First occurrence of this package
      target[name] = version;
      return;
    }

    // Package already exists, check for conflicts
    const existingVersion = target[name];
    
    if (existingVersion === version) {
      // Same version, no conflict
      return;
    }

    // Version conflict detected - create detailed conflict record
    const conflict = {
      package: name,
      type,
      versions: [
        { version: existingVersion, source: 'previous' },
        { version, source: templateName }
      ],
      resolution: null,
      strategy: this.strategy,
      severity: 'unknown',
      compatibility: null,
      recommendation: null
    };

    try {
      const resolutionResult = this._resolveVersionConflict(existingVersion, version, name, templateName);
      target[name] = resolutionResult.resolvedVersion;
      conflict.resolution = resolutionResult.resolvedVersion;
      conflict.severity = resolutionResult.severity;
      conflict.compatibility = resolutionResult.compatibility;
      conflict.recommendation = resolutionResult.recommendation;
      
      // Add to resolutions for summary
      this.resolutions.push({
        package: name,
        from: existingVersion,
        to: resolutionResult.resolvedVersion,
        strategy: this.strategy,
        confidence: resolutionResult.confidence || 'medium'
      });

      // Generate appropriate warnings based on severity
      if (resolutionResult.severity === 'high') {
        this.warnings.push({
          package: name,
          type: 'high_risk_resolution',
          message: `High-risk version conflict resolved for ${name}: ${existingVersion} → ${resolutionResult.resolvedVersion}. ${resolutionResult.recommendation}`,
          versions: [existingVersion, version],
          recommendation: resolutionResult.recommendation
        });
      } else if (resolutionResult.severity === 'medium') {
        this.warnings.push({
          package: name,
          type: 'version_conflict',
          message: `Version conflict resolved for ${name}: ${existingVersion} → ${resolutionResult.resolvedVersion}`,
          versions: [existingVersion, version]
        });
      }
    } catch (error) {
      // Handle resolution errors
      conflict.error = error.message;
      conflict.severity = 'critical';
      
      const isManualStrategyError = error.message.includes('Manual resolution required');
      
      if (isManualStrategyError) {
        // Manual strategy - mark as unresolvable
        this.warnings.push({
          package: name,
          type: 'manual_resolution_required',
          message: `Manual resolution required for ${name}: ${existingVersion} vs ${version}`,
          versions: [existingVersion, version],
          recommendation: 'Please manually specify the desired version for this package'
        });
        
        // Use fallback strategy for practical purposes
        target[name] = this._fallbackResolution(existingVersion, version, name);
      } else {
        // Technical error - try fallback and warn
        this.warnings.push({
          package: name,
          type: 'resolution_error',
          message: `Error resolving version conflict for ${name}: ${error.message}`,
          versions: [existingVersion, version],
          recommendation: 'Using fallback resolution strategy'
        });
        
        target[name] = this._fallbackResolution(existingVersion, version, name);
        conflict.resolution = target[name];
      }
    }

    this.conflicts.push(conflict);
  }

  /**
   * Advanced version conflict resolution with detailed analysis
   * @private
   * @param {string} version1 - First version
   * @param {string} version2 - Second version
   * @param {string} packageName - Package name for error reporting
   * @param {string} templateName - Template name for context
   * @returns {object} Resolution result with detailed information
   */
  _resolveVersionConflict(version1, version2, packageName, templateName) {
    // Handle manual strategy first
    if (this.strategy === 'manual') {
      throw new Error(`Manual resolution required for ${packageName}: ${version1} vs ${version2}`);
    }

    // Parse and validate versions
    const parsed1 = this._parseVersion(version1);
    const parsed2 = this._parseVersion(version2);

    if (!parsed1.valid || !parsed2.valid) {
      throw new Error(`Invalid semver versions for ${packageName}: ${version1}, ${version2}`);
    }

    // Analyze compatibility
    const compatibility = this._analyzeVersionCompatibility(version1, version2, packageName);
    
    // Determine resolution strategy
    let resolvedVersion;
    let confidence = 'medium';
    let severity = 'low';
    let recommendation = '';

    switch (this.strategy) {
      case 'smart':
        const smartResult = this._smartResolution(parsed1, parsed2, compatibility, packageName);
        resolvedVersion = smartResult.version;
        confidence = smartResult.confidence;
        severity = smartResult.severity;
        recommendation = smartResult.recommendation;
        break;
        
      case 'highest':
        resolvedVersion = semver.gt(parsed1.clean, parsed2.clean) ? version1 : version2;
        severity = this._calculateSeverity(parsed1, parsed2, 'highest');
        recommendation = severity === 'high' ? 'Consider testing thoroughly as this may introduce breaking changes' : '';
        break;
      
      case 'lowest':
        resolvedVersion = semver.lt(parsed1.clean, parsed2.clean) ? version1 : version2;
        severity = this._calculateSeverity(parsed1, parsed2, 'lowest');
        recommendation = severity === 'high' ? 'Using older version may miss important features or security fixes' : '';
        break;
      
      case 'compatible':
        const compatResult = this._compatibleResolution(parsed1, parsed2, compatibility);
        resolvedVersion = compatResult.version;
        confidence = compatResult.confidence;
        severity = compatResult.severity;
        recommendation = compatResult.recommendation;
        break;
      
      default:
        resolvedVersion = semver.gt(parsed1.clean, parsed2.clean) ? version1 : version2;
        break;
    }

    return {
      resolvedVersion,
      compatibility,
      severity,
      confidence,
      recommendation
    };
  }

  /**
   * Smart resolution strategy that considers multiple factors
   * @private
   */
  _smartResolution(parsed1, parsed2, compatibility, packageName) {
    const majorDiff = Math.abs(parsed1.major - parsed2.major);
    const minorDiff = Math.abs(parsed1.minor - parsed2.minor);
    
    // If major versions differ significantly, it's high risk
    if (majorDiff > 1) {
      return {
        version: semver.gt(parsed1.clean, parsed2.clean) ? parsed1.original : parsed2.original,
        confidence: 'low',
        severity: 'high',
        recommendation: `Major version difference detected (${majorDiff} versions apart). Consider updating all templates to use compatible versions.`
      };
    }
    
    // If minor versions are compatible, prefer higher
    if (majorDiff === 0 && compatibility.compatible) {
      return {
        version: semver.gt(parsed1.clean, parsed2.clean) ? parsed1.original : parsed2.original,
        confidence: 'high',
        severity: 'low',
        recommendation: 'Versions are compatible, using higher version.'
      };
    }
    
    // If one version satisfies the other's range, use the more specific one
    if (compatibility.satisfies) {
      const moreSpecific = this._getMoreSpecificVersion(parsed1, parsed2);
      return {
        version: moreSpecific.original,
        confidence: 'high',
        severity: 'low',
        recommendation: 'Using more specific version that satisfies both requirements.'
      };
    }
    
    // Default to higher version with medium confidence
    return {
      version: semver.gt(parsed1.clean, parsed2.clean) ? parsed1.original : parsed2.original,
      confidence: 'medium',
      severity: 'medium',
      recommendation: 'Using higher version. Test compatibility carefully.'
    };
  }

  /**
   * Compatible resolution strategy
   * @private
   */
  _compatibleResolution(parsed1, parsed2, compatibility) {
    if (compatibility.compatible) {
      return {
        version: semver.gt(parsed1.clean, parsed2.clean) ? parsed1.original : parsed2.original,
        confidence: 'high',
        severity: 'low',
        recommendation: 'Versions are compatible.'
      };
    }
    
    if (compatibility.satisfies) {
      return {
        version: compatibility.intersection || (semver.gt(parsed1.clean, parsed2.clean) ? parsed1.original : parsed2.original),
        confidence: 'medium',
        severity: 'medium',
        recommendation: 'Using version that satisfies both ranges.'
      };
    }
    
    throw new Error(`Incompatible version ranges: ${parsed1.original} and ${parsed2.original}`);
  }

  /**
   * Parse version string into detailed information
   * @private
   */
  _parseVersion(version) {
    try {
      const coerced = semver.coerce(version);
      if (!coerced) {
        return { valid: false, original: version };
      }
      
      return {
        valid: true,
        original: version,
        clean: coerced.version,
        major: coerced.major,
        minor: coerced.minor,
        patch: coerced.patch,
        isRange: version !== coerced.version,
        prefix: version.match(/^[\^~]/) ? version[0] : ''
      };
    } catch (error) {
      return { valid: false, original: version, error: error.message };
    }
  }

  /**
   * Analyze compatibility between two versions
   * @private
   */
  _analyzeVersionCompatibility(version1, version2, packageName) {
    const cacheKey = `${packageName}:${version1}:${version2}`;
    if (this.compatibilityCache.has(cacheKey)) {
      return this.compatibilityCache.get(cacheKey);
    }

    const result = {
      compatible: false,
      satisfies: false,
      intersection: null,
      risk: 'unknown'
    };

    try {
      const parsed1 = this._parseVersion(version1);
      const parsed2 = this._parseVersion(version2);
      
      if (!parsed1.valid || !parsed2.valid) {
        result.risk = 'high';
        this.compatibilityCache.set(cacheKey, result);
        return result;
      }

      // Check if versions satisfy each other
      try {
        if (semver.satisfies(parsed1.clean, version2)) {
          result.satisfies = true;
          result.compatible = true;
        } else if (semver.satisfies(parsed2.clean, version1)) {
          result.satisfies = true;
          result.compatible = true;
        }
      } catch (satisfiesError) {
        // Continue with other checks
      }

      // Check major version compatibility
      if (parsed1.major === parsed2.major) {
        result.compatible = true;
        result.risk = 'low';
      } else if (Math.abs(parsed1.major - parsed2.major) === 1) {
        result.risk = 'medium';
      } else {
        result.risk = 'high';
      }

      // Try to find intersection for ranges
      try {
        const range1 = new semver.Range(version1);
        const range2 = new semver.Range(version2);
        
        if (range1.intersects(range2)) {
          result.compatible = true;
          // Simplified intersection - use higher version
          result.intersection = semver.gt(parsed1.clean, parsed2.clean) ? version1 : version2;
        }
      } catch (rangeError) {
        // Range parsing failed, stick with basic compatibility
      }

    } catch (error) {
      result.risk = 'high';
    }

    this.compatibilityCache.set(cacheKey, result);
    return result;
  }

  /**
   * Calculate severity based on version differences
   * @private
   */
  _calculateSeverity(parsed1, parsed2, strategy) {
    const majorDiff = Math.abs(parsed1.major - parsed2.major);
    const minorDiff = Math.abs(parsed1.minor - parsed2.minor);
    
    if (majorDiff > 1) return 'high';
    if (majorDiff === 1) return 'medium';
    if (minorDiff > 5) return 'medium';
    return 'low';
  }

  /**
   * Get the more specific version between two parsed versions
   * @private
   */
  _getMoreSpecificVersion(parsed1, parsed2) {
    // Prefer exact versions over ranges
    if (!parsed1.isRange && parsed2.isRange) return parsed1;
    if (parsed1.isRange && !parsed2.isRange) return parsed2;
    
    // Prefer tilde over caret (more restrictive)
    if (parsed1.prefix === '~' && parsed2.prefix === '^') return parsed1;
    if (parsed1.prefix === '^' && parsed2.prefix === '~') return parsed2;
    
    // Default to higher version
    return semver.gt(parsed1.clean, parsed2.clean) ? parsed1 : parsed2;
  }

  /**
   * Fallback resolution when primary strategy fails
   * @private
   */
  _fallbackResolution(version1, version2, packageName) {
    try {
      const coerced1 = semver.coerce(version1);
      const coerced2 = semver.coerce(version2);
      
      if (coerced1 && coerced2) {
        return semver.gt(coerced1.version, coerced2.version) ? version1 : version2;
      }
    } catch (error) {
      // If all else fails, use the second version (newer template)
    }
    
    return version2;
  }

  /**
   * Analyze overall compatibility of the final dependency set
   * @private
   */
  _analyzeCompatibility(result) {
    const allDeps = { ...result.dependencies, ...result.devDependencies };
    const knownIncompatibilities = this._getKnownIncompatibilities();
    
    for (const [pkg1, version1] of Object.entries(allDeps)) {
      for (const [pkg2, version2] of Object.entries(allDeps)) {
        if (pkg1 >= pkg2) continue; // Avoid duplicate checks
        
        const incompatibility = knownIncompatibilities.find(inc => 
          (inc.package1 === pkg1 && inc.package2 === pkg2) ||
          (inc.package1 === pkg2 && inc.package2 === pkg1)
        );
        
        if (incompatibility) {
          const isIncompatible = this._checkSpecificIncompatibility(
            pkg1, version1, pkg2, version2, incompatibility
          );
          
          if (isIncompatible) {
            this.warnings.push({
              package: `${pkg1} + ${pkg2}`,
              type: 'known_incompatibility',
              message: `Known incompatibility detected: ${pkg1}@${version1} with ${pkg2}@${version2}`,
              recommendation: incompatibility.recommendation || 'Check documentation for compatible versions'
            });
            result.summary.compatibilityIssues++;
          }
        }
      }
    }
  }

  /**
   * Analyze peer dependencies for the merged dependency set
   * @private
   * @param {object} result - Merged dependencies result
   * @returns {Promise<object>} Peer dependency analysis result
   */
  async _analyzePeerDependencies(result) {
    const allDependencies = { ...result.dependencies, ...result.devDependencies };
    const packageNames = Object.keys(allDependencies);
    
    if (packageNames.length === 0) {
      return {
        conflicts: [],
        resolutions: [],
        summary: {
          totalPackages: 0,
          conflictCount: 0,
          resolutionCount: 0,
          analysisTime: 0
        }
      };
    }

    const startTime = Date.now();
    const analysisResult = await this.peerDependencyAnalyzer.analyzePeerDependencies(packageNames);
    const analysisTime = Date.now() - startTime;

    // Process conflicts and generate resolutions
    const processedConflicts = [];
    const generatedResolutions = [];

    for (const conflict of analysisResult.conflicts) {
      const processedConflict = {
        package: conflict.package,
        type: 'peer_dependency',
        conflictType: conflict.type,
        currentVersion: allDependencies[conflict.package] || 'not installed',
        requiredVersion: conflict.requiredVersion,
        requiredBy: conflict.requiredBy,
        severity: this._calculatePeerDependencySeverity(conflict),
        recommendation: this._generatePeerDependencyRecommendation(conflict)
      };

      processedConflicts.push(processedConflict);

      // Generate resolution if confidence is high enough
      if (conflict.resolution && conflict.resolution.confidence === 'high') {
        const resolution = {
          package: conflict.package,
          action: conflict.resolution.action,
          version: conflict.resolution.version,
          confidence: conflict.resolution.confidence,
          reason: conflict.resolution.reason
        };

        generatedResolutions.push(resolution);

        // Apply resolution to the result if it's adding a missing dependency
        if (conflict.resolution.action === 'add' && !allDependencies[conflict.package]) {
          result.dependencies[conflict.package] = conflict.resolution.version;
          
          // Add to main resolutions list for summary
          this.resolutions.push({
            package: conflict.package,
            from: 'missing',
            to: conflict.resolution.version,
            strategy: 'peer_dependency_analysis',
            confidence: 'high'
          });
        }
        
        // Apply resolution if it's updating an existing dependency
        if (conflict.resolution.action === 'update' && allDependencies[conflict.package]) {
          const oldVersion = allDependencies[conflict.package];
          result.dependencies[conflict.package] = conflict.resolution.version;
          
          // Add to main resolutions list for summary
          this.resolutions.push({
            package: conflict.package,
            from: oldVersion,
            to: conflict.resolution.version,
            strategy: 'peer_dependency_analysis',
            confidence: conflict.resolution.confidence
          });
        }
      }

      // Add warnings for medium/low confidence issues
      if (conflict.resolution && conflict.resolution.confidence !== 'high') {
        this.warnings.push({
          package: conflict.package,
          type: 'peer_dependency_warning',
          message: `Peer dependency issue detected for ${conflict.package}: ${conflict.type}`,
          recommendation: processedConflict.recommendation
        });
      }
    }

    return {
      conflicts: processedConflicts,
      resolutions: generatedResolutions,
      summary: {
        totalPackages: packageNames.length,
        conflictCount: processedConflicts.length,
        resolutionCount: generatedResolutions.length,
        analysisTime
      }
    };
  }

  /**
   * Calculate severity for peer dependency conflicts
   * @private
   */
  _calculatePeerDependencySeverity(conflict) {
    switch (conflict.type) {
      case 'missing':
        return 'high'; // Missing peer dependencies can cause runtime errors
      case 'version_mismatch':
        return 'medium'; // Version mismatches may cause compatibility issues
      case 'incompatible':
        return 'high'; // Incompatible versions likely to cause issues
      default:
        return 'low';
    }
  }

  /**
   * Generate recommendation for peer dependency conflicts
   * @private
   */
  _generatePeerDependencyRecommendation(conflict) {
    switch (conflict.type) {
      case 'missing':
        return `Install ${conflict.package}@${conflict.requiredVersion} as required by ${conflict.requiredBy.join(', ')}`;
      case 'version_mismatch':
        return `Update ${conflict.package} to ${conflict.requiredVersion} to satisfy peer dependency requirements`;
      case 'incompatible':
        return `Resolve version incompatibility for ${conflict.package} - current version may not work with ${conflict.requiredBy.join(', ')}`;
      default:
        return `Review peer dependency requirements for ${conflict.package}`;
    }
  }

  /**
   * Get known package incompatibilities
   * @private
   */
  _getKnownIncompatibilities() {
    return [
      {
        package1: 'react',
        package2: '@types/react',
        check: (reactVer, typesVer) => {
          // React 18 needs @types/react ^18
          const reactMajor = semver.major(semver.coerce(reactVer));
          const typesMajor = semver.major(semver.coerce(typesVer));
          return reactMajor !== typesMajor;
        },
        recommendation: 'Ensure React and @types/react have matching major versions'
      },
      {
        package1: 'next',
        package2: 'react',
        check: (nextVer, reactVer) => {
          // Next.js 14 requires React 18+
          const nextMajor = semver.major(semver.coerce(nextVer));
          const reactMajor = semver.major(semver.coerce(reactVer));
          return nextMajor >= 14 && reactMajor < 18;
        },
        recommendation: 'Next.js 14+ requires React 18 or higher'
      }
    ];
  }

  /**
   * Check specific incompatibility
   * @private
   */
  _checkSpecificIncompatibility(pkg1, version1, pkg2, version2, incompatibility) {
    try {
      if (incompatibility.package1 === pkg1) {
        return incompatibility.check(version1, version2);
      } else {
        return incompatibility.check(version2, version1);
      }
    } catch (error) {
      return false; // If check fails, assume compatible
    }
  }

  /**
   * Generate resolution summary
   * @private
   */
  _generateResolutionSummary(result) {
    if (this.resolutions.length === 0) return;
    
    const summary = {
      totalResolutions: this.resolutions.length,
      byConfidence: {
        high: this.resolutions.filter(r => r.confidence === 'high').length,
        medium: this.resolutions.filter(r => r.confidence === 'medium').length,
        low: this.resolutions.filter(r => r.confidence === 'low').length
      },
      recommendations: []
    };
    
    // Add strategic recommendations
    if (summary.byConfidence.low > 0) {
      summary.recommendations.push('Consider manually reviewing low-confidence resolutions');
    }
    
    if (result.summary.compatibilityIssues > 0) {
      summary.recommendations.push('Address known compatibility issues before proceeding');
    }
    
    result.summary.resolutionSummary = summary;
  }

  /**
   * Get detailed conflict report with enhanced information
   * @returns {object} Enhanced conflict report
   */
  getConflictReport() {
    return {
      conflicts: this.conflicts,
      warnings: this.warnings,
      resolutions: this.resolutions,
      summary: {
        totalConflicts: this.conflicts.length,
        resolvedConflicts: this.conflicts.filter(c => c.resolution && !c.error).length,
        unresolvedConflicts: this.conflicts.filter(c => c.error).length,
        totalWarnings: this.warnings.length,
        totalResolutions: this.resolutions.length,
        bySeverity: {
          low: this.conflicts.filter(c => c.severity === 'low').length,
          medium: this.conflicts.filter(c => c.severity === 'medium').length,
          high: this.conflicts.filter(c => c.severity === 'high').length,
          critical: this.conflicts.filter(c => c.severity === 'critical').length
        },
        byConfidence: {
          high: this.resolutions.filter(r => r.confidence === 'high').length,
          medium: this.resolutions.filter(r => r.confidence === 'medium').length,
          low: this.resolutions.filter(r => r.confidence === 'low').length
        }
      }
    };
  }

  /**
   * Set conflict resolution strategy
   * @param {string} strategy - Resolution strategy ('smart', 'highest', 'lowest', 'compatible', 'manual')
   */
  setStrategy(strategy) {
    const validStrategies = ['smart', 'highest', 'lowest', 'compatible', 'manual'];
    if (!validStrategies.includes(strategy)) {
      throw new Error(`Invalid strategy: ${strategy}. Valid strategies: ${validStrategies.join(', ')}`);
    }
    this.strategy = strategy;
  }

  /**
   * Clear conflicts, warnings, and resolutions
   */
  clearState() {
    this.conflicts = [];
    this.warnings = [];
    this.resolutions = [];
    this.compatibilityCache.clear();
    if (this.peerDependencyAnalyzer) {
      this.peerDependencyAnalyzer.clearCache();
    }
  }
}

/**
 * File Copy Manager
 * Handles copying files from templates to target project with conflict resolution and variable substitution
 */
class FileCopyManager {
  constructor(options = {}) {
    this.conflictStrategy = options.conflictStrategy || 'overwrite'; // 'overwrite', 'skip', 'merge'
    this.variables = options.variables || {};
    this.copyLog = [];
    this.errors = [];
    this.skippedFiles = [];
  }

  /**
   * Copy files from multiple templates to target directory
   * @param {Array<object>} templateConfigs - Array of template configurations with file mappings
   * @param {string} targetDir - Target directory path
   * @param {object} options - Copy options
   * @returns {Promise<object>} Copy result summary
   */
  async copyTemplateFiles(templateConfigs, targetDir, options = {}) {
    const result = {
      copiedFiles: [],
      skippedFiles: [],
      errors: [],
      conflicts: [],
      summary: {
        totalFiles: 0,
        copiedCount: 0,
        skippedCount: 0,
        errorCount: 0,
        conflictCount: 0
      }
    };

    // Reset internal state
    this.copyLog = [];
    this.errors = [];
    this.skippedFiles = [];

    // Merge variables from options
    const mergedVariables = { ...this.variables, ...options.variables };

    // Process each template
    for (const config of templateConfigs) {
      await this._copyTemplateFiles(config, targetDir, mergedVariables, result);
    }

    // Finalize result
    result.copiedFiles = this.copyLog;
    result.skippedFiles = this.skippedFiles;
    result.errors = this.errors;
    result.summary.totalFiles = this.copyLog.length + this.skippedFiles.length + this.errors.length;
    result.summary.copiedCount = this.copyLog.length;
    result.summary.skippedCount = this.skippedFiles.length;
    result.summary.errorCount = this.errors.length;

    return result;
  }

  /**
   * Copy files from a single template
   * @private
   * @param {object} config - Template configuration
   * @param {string} targetDir - Target directory path
   * @param {object} variables - Template variables
   * @param {object} result - Accumulating result object
   */
  async _copyTemplateFiles(config, targetDir, variables, result) {
    const templateDir = config._metadata?.templatePath || '';
    const templateName = `${config._metadata?.sdk || 'unknown'}/${config._metadata?.templateName || 'default'}`;

    if (!config.files || Object.keys(config.files).length === 0) {
      return;
    }

    // Process each file mapping
    for (const [sourceFile, targetPath] of Object.entries(config.files)) {
      try {
        await this._copyFile(
          templateDir,
          sourceFile,
          targetDir,
          targetPath,
          variables,
          templateName,
          result
        );
      } catch (error) {
        this.errors.push({
          sourceFile,
          targetPath,
          templateName,
          error: error.message,
          type: 'copy_error'
        });
      }
    }
  }

  /**
   * Copy a single file with conflict resolution and variable substitution
   * @private
   * @param {string} templateDir - Template directory path
   * @param {string} sourceFile - Source file path relative to template
   * @param {string} targetDir - Target directory path
   * @param {string} targetPath - Target file path relative to target directory
   * @param {object} variables - Template variables
   * @param {string} templateName - Template name for logging
   * @param {object} result - Result object for conflict tracking
   */
  async _copyFile(templateDir, sourceFile, targetDir, targetPath, variables, templateName, result) {
    const sourcePath = path.join(templateDir, sourceFile);
    const resolvedTargetPath = this._substituteVariables(targetPath, variables);
    const destPath = path.join(targetDir, resolvedTargetPath);

    // Check if source file exists
    if (!await fs.pathExists(sourcePath)) {
      throw new Error(`Source file not found: ${sourcePath}`);
    }

    // Ensure target directory exists
    await fs.ensureDir(path.dirname(destPath));

    // Check for conflicts
    const targetExists = await fs.pathExists(destPath);
    if (targetExists) {
      const conflict = {
        sourceFile,
        targetPath: resolvedTargetPath,
        templateName,
        strategy: this.conflictStrategy
      };

      switch (this.conflictStrategy) {
        case 'skip':
          this.skippedFiles.push({
            sourceFile,
            targetPath: resolvedTargetPath,
            templateName,
            reason: 'file_exists'
          });
          result.conflicts.push(conflict);
          return;

        case 'merge':
          // For now, treat merge as overwrite for most files
          // Special handling for specific file types can be added later
          if (this._shouldMergeFile(destPath)) {
            await this._mergeFile(sourcePath, destPath, variables);
          } else {
            await this._copyWithSubstitution(sourcePath, destPath, variables);
          }
          break;

        case 'overwrite':
        default:
          await this._copyWithSubstitution(sourcePath, destPath, variables);
          break;
      }

      result.conflicts.push(conflict);
    } else {
      // No conflict, copy normally
      await this._copyWithSubstitution(sourcePath, destPath, variables);
    }

    // Log successful copy
    this.copyLog.push({
      sourceFile,
      targetPath: resolvedTargetPath,
      templateName,
      substituted: this._hasTemplateVariables(targetPath) || await this._fileHasTemplateVariables(sourcePath)
    });
  }

  /**
   * Copy file with template variable substitution
   * @private
   * @param {string} sourcePath - Source file path
   * @param {string} destPath - Destination file path
   * @param {object} variables - Template variables
   */
  async _copyWithSubstitution(sourcePath, destPath, variables) {
    // Check if file is binary
    if (await this._isBinaryFile(sourcePath)) {
      // Copy binary files directly
      await fs.copy(sourcePath, destPath);
      return;
    }

    // Read file content
    let content = await fs.readFile(sourcePath, 'utf8');

    // Substitute variables in content
    content = this._substituteVariables(content, variables);

    // Write to destination
    await fs.writeFile(destPath, content, 'utf8');

    // Copy file permissions
    const stats = await fs.stat(sourcePath);
    await fs.chmod(destPath, stats.mode);
  }

  /**
   * Merge file content (placeholder for future implementation)
   * @private
   * @param {string} sourcePath - Source file path
   * @param {string} destPath - Destination file path
   * @param {object} variables - Template variables
   */
  async _mergeFile(sourcePath, destPath, variables) {
    // For now, just overwrite
    // Future implementation could handle JSON merging, etc.
    await this._copyWithSubstitution(sourcePath, destPath, variables);
  }

  /**
   * Check if file should be merged rather than overwritten
   * @private
   * @param {string} filePath - File path to check
   * @returns {boolean} True if file should be merged
   */
  _shouldMergeFile(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    const basename = path.basename(filePath).toLowerCase();
    
    // Files that could potentially be merged
    const mergeableFiles = ['package.json', '.env', '.env.example'];
    const mergeableExtensions = ['.json', '.yaml', '.yml'];
    
    return mergeableFiles.includes(basename) || mergeableExtensions.includes(ext);
  }

  /**
   * Check if file is binary
   * @private
   * @param {string} filePath - File path to check
   * @returns {Promise<boolean>} True if file is binary
   */
  async _isBinaryFile(filePath) {
    try {
      // Read first 1024 bytes to check for binary content
      const buffer = await fs.readFile(filePath, { encoding: null, flag: 'r' });
      const chunk = buffer.slice(0, Math.min(1024, buffer.length));
      
      // Check for null bytes (common in binary files)
      for (let i = 0; i < chunk.length; i++) {
        if (chunk[i] === 0) {
          return true;
        }
      }
      
      // Check for high percentage of non-printable characters
      let nonPrintableCount = 0;
      for (let i = 0; i < chunk.length; i++) {
        const byte = chunk[i];
        // Consider bytes outside printable ASCII range (except common whitespace)
        if (byte < 32 && byte !== 9 && byte !== 10 && byte !== 13) {
          nonPrintableCount++;
        } else if (byte > 126) {
          nonPrintableCount++;
        }
      }
      
      // If more than 30% non-printable, consider it binary
      return (nonPrintableCount / chunk.length) > 0.3;
    } catch (error) {
      // If we can't read the file, assume it's binary to be safe
      return true;
    }
  }

  /**
   * Check if file content has template variables
   * @private
   * @param {string} filePath - File path to check
   * @returns {Promise<boolean>} True if file has template variables
   */
  async _fileHasTemplateVariables(filePath) {
    try {
      if (await this._isBinaryFile(filePath)) {
        return false;
      }
      
      const content = await fs.readFile(filePath, 'utf8');
      return this._hasTemplateVariables(content);
    } catch (error) {
      return false;
    }
  }

  /**
   * Check if string has template variables
   * @private
   * @param {string} str - String to check
   * @returns {boolean} True if string has template variables
   */
  _hasTemplateVariables(str) {
    return /\{\{[^}]+\}\}/.test(str);
  }

  /**
   * Substitute template variables in string
   * @private
   * @param {string} str - String with template variables
   * @param {object} variables - Variables to substitute
   * @returns {string} String with variables substituted
   */
  _substituteVariables(str, variables) {
    return str.replace(/\{\{([^}]+)\}\}/g, (match, varName) => {
      const trimmedVarName = varName.trim();
      return variables[trimmedVarName] !== undefined ? variables[trimmedVarName] : match;
    });
  }

  /**
   * Set conflict resolution strategy
   * @param {string} strategy - Strategy ('overwrite', 'skip', 'merge')
   */
  setConflictStrategy(strategy) {
    const validStrategies = ['overwrite', 'skip', 'merge'];
    if (!validStrategies.includes(strategy)) {
      throw new Error(`Invalid conflict strategy: ${strategy}. Valid strategies: ${validStrategies.join(', ')}`);
    }
    this.conflictStrategy = strategy;
  }

  /**
   * Set template variables
   * @param {object} variables - Template variables
   */
  setVariables(variables) {
    this.variables = { ...variables };
  }

  /**
   * Get copy statistics
   * @returns {object} Copy statistics
   */
  getStatistics() {
    return {
      totalFiles: this.copyLog.length + this.skippedFiles.length + this.errors.length,
      copiedFiles: this.copyLog.length,
      skippedFiles: this.skippedFiles.length,
      errors: this.errors.length,
      copyLog: this.copyLog,
      skippedFilesList: this.skippedFiles,
      errorsList: this.errors
    };
  }

  /**
   * Clear copy state
   */
  clearState() {
    this.copyLog = [];
    this.errors = [];
    this.skippedFiles = [];
  }
}

/**
 * Configuration Generator
 * Handles generation of unified configuration files from multiple templates
 */
class ConfigurationGenerator {
  constructor(options = {}) {
    this.projectName = options.projectName || 'My Project';
    this.projectDescription = options.projectDescription || '';
    this.author = options.author || '';
    this.generatedFiles = [];
    this.errors = [];
  }

  /**
   * Generate unified configuration files from template configurations
   * @param {Array<object>} templateConfigs - Array of template configurations
   * @param {string} targetDir - Target directory for generated files
   * @param {object} options - Generation options
   * @returns {Promise<object>} Generation result
   */
  async generateConfigurationFiles(templateConfigs, targetDir, options = {}) {
    const result = {
      generatedFiles: [],
      errors: [],
      summary: {
        envVariables: 0,
        setupSections: 0,
        templatesProcessed: 0
      }
    };

    // Reset internal state
    this.generatedFiles = [];
    this.errors = [];

    try {
      // Generate .env.example file
      const envResult = await this._generateEnvExample(templateConfigs, targetDir, options);
      if (envResult.success) {
        this.generatedFiles.push(envResult);
        result.summary.envVariables = envResult.variableCount;
      } else {
        this.errors.push(envResult.error);
      }

      // Generate setup.md file
      const setupResult = await this._generateSetupMd(templateConfigs, targetDir, options);
      if (setupResult.success) {
        this.generatedFiles.push(setupResult);
        result.summary.setupSections = setupResult.sectionCount;
      } else {
        this.errors.push(setupResult.error);
      }

      result.summary.templatesProcessed = templateConfigs.length;
    } catch (error) {
      this.errors.push({
        type: 'generation_error',
        message: error.message,
        stack: error.stack
      });
    }

    // Finalize result
    result.generatedFiles = this.generatedFiles;
    result.errors = this.errors;

    return result;
  }

  /**
   * Generate unified .env.example file
   * @private
   * @param {Array<object>} templateConfigs - Template configurations
   * @param {string} targetDir - Target directory
   * @param {object} options - Generation options
   * @returns {Promise<object>} Generation result
   */
  async _generateEnvExample(templateConfigs, targetDir, options) {
    try {
      const envVars = new Map();
      const templateSections = [];

      // Process each template's environment variables
      for (const config of templateConfigs) {
        const templateName = `${config._metadata?.sdk || 'unknown'}/${config._metadata?.templateName || 'default'}`;
        const sectionVars = [];

        if (config.envVars && Array.isArray(config.envVars)) {
          for (const envVar of config.envVars) {
            const key = envVar.name || envVar.key;
            const value = envVar.example || envVar.defaultValue || '';
            const description = envVar.description || '';
            const required = envVar.required !== false; // default to true

            if (key) {
              // Handle conflicts by checking for actual differences
              if (envVars.has(key)) {
                const existing = envVars.get(key);
                
                // Only create a conflict if there are actual differences in value or description
                const hasDifferentValue = existing.value !== value;
                const hasDifferentDescription = existing.description !== description;
                
                if (hasDifferentValue || hasDifferentDescription) {
                  existing.conflicts = existing.conflicts || [];
                  existing.conflicts.push({
                    template: templateName,
                    value: value,
                    description: description
                  });
                }
                // If values and descriptions are the same, just silently merge (no conflict)
              } else {
                envVars.set(key, {
                  key,
                  value,
                  description,
                  required,
                  template: templateName,
                  conflicts: []
                });
              }

              sectionVars.push(key);
            }
          }
        }

        if (sectionVars.length > 0) {
          templateSections.push({
            templateName,
            variables: sectionVars
          });
        }
      }

      // Generate .env.example content
      const content = this._buildEnvExampleContent(envVars, templateSections);
      
      // Write file
      const filePath = path.join(targetDir, '.env.example');
      await fs.writeFile(filePath, content, 'utf8');

      return {
        success: true,
        filePath,
        fileName: '.env.example',
        variableCount: envVars.size,
        templateCount: templateSections.length,
        conflicts: Array.from(envVars.values()).filter(v => v.conflicts.length > 0)
      };
    } catch (error) {
      return {
        success: false,
        error: {
          type: 'env_generation_error',
          message: `Failed to generate .env.example: ${error.message}`,
          stack: error.stack
        }
      };
    }
  }

  /**
   * Build .env.example file content
   * @private
   * @param {Map} envVars - Environment variables map
   * @param {Array} templateSections - Template sections
   * @returns {string} File content
   */
  _buildEnvExampleContent(envVars, templateSections) {
    let content = `# Environment Variables for ${this.projectName}\n`;
    content += `# Copy this file to .env and fill in your actual values\n\n`;

    // Get all unique environment variables (deduplicated)
    const uniqueVars = Array.from(envVars.values());
    
    // Separate variables into categories
    const conflictedVars = uniqueVars.filter(v => v.conflicts.length > 0);
    const regularVars = uniqueVars.filter(v => v.conflicts.length === 0);
    
    // Group regular variables by template for organization
    const varsByTemplate = new Map();
    
    for (const envVar of regularVars) {
      const templateName = envVar.template;
      if (!varsByTemplate.has(templateName)) {
        varsByTemplate.set(templateName, []);
      }
      varsByTemplate.get(templateName).push(envVar);
    }
    
    // Add template-specific sections for regular variables
    for (const [templateName, vars] of varsByTemplate) {
      if (vars.length > 0) {
        content += `# ${templateName} Configuration\n`;
        for (const envVar of vars) {
          content += this._formatEnvVariable(envVar);
        }
        content += `\n`;
      }
    }
    
    // Add conflicts section only if there are actual conflicts
    if (conflictedVars.length > 0) {
      content += `# Variable Conflicts (Review Required)\n`;
      content += `# The following variables have different values across templates:\n`;
      
      for (const envVar of conflictedVars) {
        content += `# ${envVar.key}:\n`;
        content += `#   ${envVar.template}: "${envVar.value}" - ${envVar.description}\n`;
        for (const conflict of envVar.conflicts) {
          content += `#   ${conflict.template}: "${conflict.value}" - ${conflict.description}\n`;
        }
        content += `${envVar.key}=${envVar.value}\n\n`;
      }
    }

    return content;
  }

  /**
   * Format a single environment variable
   * @private
   * @param {object} envVar - Environment variable object
   * @returns {string} Formatted variable
   */
  _formatEnvVariable(envVar) {
    let content = '';
    
    if (envVar.description) {
      content += `# ${envVar.description}\n`;
    }
    
    if (!envVar.required) {
      content += `# Optional\n`;
    }
    
    content += `${envVar.key}=${envVar.value}\n\n`;
    
    return content;
  }

  /**
   * Generate unified setup.md file
   * @private
   * @param {Array<object>} templateConfigs - Template configurations
   * @param {string} targetDir - Target directory
   * @param {object} options - Generation options
   * @returns {Promise<object>} Generation result
   */
  async _generateSetupMd(templateConfigs, targetDir, options) {
    try {
      const sections = [];

      // Build setup documentation
      let content = this._buildSetupHeader();
      
      // Add installation section
      content += this._buildInstallationSection(templateConfigs);
      
      // Add configuration section
      content += this._buildConfigurationSection(templateConfigs);
      
      // Add template-specific sections
      for (const config of templateConfigs) {
        const templateSection = this._buildTemplateSection(config);
        if (templateSection) {
          content += templateSection;
          sections.push(config._metadata?.sdk || 'unknown');
        }
      }
      
      // Add usage examples
      content += this._buildUsageSection(templateConfigs);
      
      // Add troubleshooting section
      content += this._buildTroubleshootingSection(templateConfigs);

      // Write file
      const filePath = path.join(targetDir, 'setup.md');
      await fs.writeFile(filePath, content, 'utf8');

      return {
        success: true,
        filePath,
        fileName: 'setup.md',
        sectionCount: sections.length + 4, // +4 for standard sections
        templateCount: templateConfigs.length
      };
    } catch (error) {
      return {
        success: false,
        error: {
          type: 'setup_generation_error',
          message: `Failed to generate setup.md: ${error.message}`,
          stack: error.stack
        }
      };
    }
  }

  /**
   * Build setup.md header
   * @private
   * @returns {string} Header content
   */
  _buildSetupHeader() {
    return `# ${this.projectName} Setup Guide

${this.projectDescription ? this.projectDescription + '\n\n' : ''}This guide will help you set up and configure your project with all the integrated SDKs and templates.

## Table of Contents

- [Installation](#installation)
- [Configuration](#configuration)
- [SDK Setup](#sdk-setup)
- [Usage Examples](#usage-examples)
- [Troubleshooting](#troubleshooting)

`;
  }

  /**
   * Build installation section
   * @private
   * @param {Array<object>} templateConfigs - Template configurations
   * @returns {string} Installation section content
   */
  _buildInstallationSection(templateConfigs) {
    let content = `## Installation

### Prerequisites

- Node.js (version 16 or higher)
- npm or yarn package manager

### Install Dependencies

\`\`\`bash
npm install
# or
yarn install
\`\`\`

`;

    // Add template-specific installation notes
    const installationNotes = templateConfigs
      .map(config => config.installation)
      .filter(Boolean);

    if (installationNotes.length > 0) {
      content += `### Additional Setup Requirements

`;
      installationNotes.forEach((note, index) => {
        content += `${index + 1}. ${note}\n`;
      });
      content += `\n`;
    }

    return content;
  }

  /**
   * Build configuration section
   * @private
   * @param {Array<object>} templateConfigs - Template configurations
   * @returns {string} Configuration section content
   */
  _buildConfigurationSection(templateConfigs) {
    let content = `## Configuration

### Environment Variables

Copy the example environment file and configure your settings:

\`\`\`bash
cp .env.example .env
\`\`\`

Edit the \`.env\` file with your actual values. See the comments in \`.env.example\` for guidance on each variable.

`;

    // Add configuration notes from templates
    const configNotes = templateConfigs
      .map(config => config.configuration)
      .filter(Boolean);

    if (configNotes.length > 0) {
      content += `### Additional Configuration Notes

`;
      configNotes.forEach(note => {
        content += `- ${note}\n`;
      });
      content += `\n`;
    }

    return content;
  }

  /**
   * Build template-specific section
   * @private
   * @param {object} config - Template configuration
   * @returns {string} Template section content
   */
  _buildTemplateSection(config) {
    const templateName = config._metadata?.sdk || 'Unknown';
    const displayName = templateName.charAt(0).toUpperCase() + templateName.slice(1);
    
    let content = `## ${displayName} Setup

`;

    if (config.description) {
      content += `${config.description}\n\n`;
    }

    // Add setup instructions
    if (config.setup) {
      content += `### Setup Instructions

${config.setup}

`;
    }

    // Add API keys or credentials section
    if (config.envVars && config.envVars.length > 0) {
      const requiredVars = config.envVars.filter(v => v.required !== false);
      if (requiredVars.length > 0) {
        content += `### Required Environment Variables

`;
        requiredVars.forEach(envVar => {
          content += `- \`${envVar.name || envVar.key}\`: ${envVar.description || 'No description provided'}\n`;
        });
        content += `\n`;
      }
    }

    // Add usage examples
    if (config.examples && Array.isArray(config.examples)) {
      content += `### ${displayName} Examples

`;
      config.examples.forEach((example, index) => {
        content += `#### Example ${index + 1}: ${example.title || 'Basic Usage'}

${example.description || ''}

\`\`\`${example.language || 'javascript'}
${example.code}
\`\`\`

`;
      });
    }

    return content;
  }

  /**
   * Build usage section
   * @private
   * @param {Array<object>} templateConfigs - Template configurations
   * @returns {string} Usage section content
   */
  _buildUsageSection(templateConfigs) {
    let content = `## Usage Examples

### Getting Started

After completing the setup, you can start using the integrated SDKs:

\`\`\`bash
npm run dev
# or
yarn dev
\`\`\`

`;

    // Add template-specific usage examples
    const usageExamples = templateConfigs
      .map(config => config.usage)
      .filter(Boolean);

    if (usageExamples.length > 0) {
      content += `### SDK-Specific Usage

`;
      usageExamples.forEach((usage, index) => {
        content += `${usage}\n\n`;
      });
    }

    return content;
  }

  /**
   * Build troubleshooting section
   * @private
   * @param {Array<object>} templateConfigs - Template configurations
   * @returns {string} Troubleshooting section content
   */
  _buildTroubleshootingSection(templateConfigs) {
    let content = `## Troubleshooting

### Common Issues

1. **Environment Variables Not Loading**
   - Ensure your \`.env\` file is in the project root
   - Check that variable names match exactly (case-sensitive)
   - Restart your development server after changing environment variables

2. **Package Installation Errors**
   - Clear your node_modules: \`rm -rf node_modules package-lock.json\`
   - Reinstall dependencies: \`npm install\`
   - Check Node.js version compatibility

3. **SDK Authentication Issues**
   - Verify your API keys are correct and active
   - Check that environment variables are properly set
   - Review SDK-specific documentation for authentication requirements

`;

    // Add template-specific troubleshooting
    const troubleshootingNotes = templateConfigs
      .map(config => config.troubleshooting)
      .filter(Boolean);

    if (troubleshootingNotes.length > 0) {
      content += `### SDK-Specific Issues

`;
      troubleshootingNotes.forEach((note, index) => {
        content += `${index + 1}. ${note}\n`;
      });
      content += `\n`;
    }

    content += `### Getting Help

If you continue to experience issues:

1. Check the official documentation for each SDK
2. Review the template-specific guides in this document
3. Search for similar issues in the project repository
4. Create a new issue with detailed error information

`;

    return content;
  }

  /**
   * Get generation statistics
   * @returns {object} Generation statistics
   */
  getStatistics() {
    return {
      generatedFiles: this.generatedFiles.length,
      errors: this.errors.length,
      files: this.generatedFiles,
      errorsList: this.errors
    };
  }

  /**
   * Clear generation state
   */
  clearState() {
    this.generatedFiles = [];
    this.errors = [];
  }
}

// Export singleton instance and class for testing
const templateConfigReader = new TemplateConfigReader();
const dependencyMerger = new DependencyMerger();
const fileCopyManager = new FileCopyManager();
const configurationGenerator = new ConfigurationGenerator();

module.exports = {
  TemplateConfigReader,
  DependencyMerger,
  FileCopyManager,
  ConfigurationGenerator,
  templateConfigReader,
  dependencyMerger,
  fileCopyManager,
  configurationGenerator,
  // Convenience functions that use the singleton
  readTemplateConfig: (templatePath, sdk, templateName) => 
    templateConfigReader.readTemplateConfig(templatePath, sdk, templateName),
  readSelectedTemplateConfigs: (selectedTemplates) => 
    templateConfigReader.readSelectedTemplateConfigs(selectedTemplates),
  extractMetadataSummary: (configs) => 
    templateConfigReader.extractMetadataSummary(configs),
  clearConfigCache: () => templateConfigReader.clearCache(),
  getConfigErrors: () => templateConfigReader.getErrors(),
  getConfigStatistics: () => templateConfigReader.getStatistics(),
  // Dependency merger functions
  mergeDependencies: (templateConfigs, strategy) => {
    if (strategy) dependencyMerger.setStrategy(strategy);
    return Promise.resolve(dependencyMerger.mergeDependencies(templateConfigs));
  },
  getDependencyConflictReport: () => dependencyMerger.getConflictReport(),
  clearDependencyState: () => dependencyMerger.clearState(),
  // File copy functions
  copyTemplateFiles: (templateConfigs, targetDir, options) => 
    fileCopyManager.copyTemplateFiles(templateConfigs, targetDir, options),
  getCopyStatistics: () => fileCopyManager.getStatistics(),
  clearCopyState: () => fileCopyManager.clearState(),
  // Configuration generator functions
  generateConfigurationFiles: (templateConfigs, targetDir, options) => 
    configurationGenerator.generateConfigurationFiles(templateConfigs, targetDir, options),
  getConfigurationStatistics: () => configurationGenerator.getStatistics(),
  clearConfigurationState: () => configurationGenerator.clearState()
}; 