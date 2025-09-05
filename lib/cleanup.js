const fs = require('fs-extra');
const path = require('path');
const { logInfo, logWarning, logError } = require('./console');

/**
 * Cleanup tracker to monitor created files and directories during operations
 */
class CleanupTracker {
  constructor(options = {}) {
    this.createdPaths = [];
    this.options = {
      autoCleanup: true,
      confirmBeforeCleanup: false,
      preserveExisting: true,
      ...options
    };
    this.isActive = true;
  }

  /**
   * Track a path that was created during the operation
   * @param {string} filePath - Path that was created
   * @param {string} type - Type of path ('file' or 'directory')
   */
  track(filePath, type = 'unknown') {
    if (!this.isActive) return;
    
    const absolutePath = path.resolve(filePath);
    
    // Check if already tracked
    const existing = this.createdPaths.find(item => item.path === absolutePath);
    if (existing) return;
    
    this.createdPaths.push({
      path: absolutePath,
      type,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Track multiple paths at once
   * @param {Array} paths - Array of paths to track
   * @param {string} type - Type of paths ('file' or 'directory')
   */
  trackMultiple(paths, type = 'unknown') {
    if (!paths || !Array.isArray(paths)) {
      return; // Gracefully handle undefined or non-array inputs
    }
    paths.forEach(filePath => {
      if (filePath) { // Only track non-null/undefined paths
        this.track(filePath, type);
      }
    });
  }

  /**
   * Get all tracked paths
   * @returns {Array} Array of tracked path objects
   */
  getTrackedPaths() {
    return [...this.createdPaths];
  }

  /**
   * Check if a path is being tracked
   * @param {string} filePath - Path to check
   * @returns {boolean} True if path is tracked
   */
  isTracked(filePath) {
    const absolutePath = path.resolve(filePath);
    return this.createdPaths.some(item => item.path === absolutePath);
  }

  /**
   * Remove a path from tracking (useful when operation succeeds)
   * @param {string} filePath - Path to untrack
   */
  untrack(filePath) {
    const absolutePath = path.resolve(filePath);
    this.createdPaths = this.createdPaths.filter(item => item.path !== absolutePath);
  }

  /**
   * Clear all tracked paths
   */
  clear() {
    this.createdPaths = [];
  }

  /**
   * Disable tracking (useful when operation succeeds)
   */
  disable() {
    this.isActive = false;
  }

  /**
   * Perform cleanup of all tracked paths
   * @param {Object} options - Cleanup options
   * @returns {Object} Cleanup result
   */
  async cleanup(options = {}) {
    const opts = { ...this.options, ...options };
    const result = {
      success: true,
      cleanedPaths: [],
      errors: [],
      skippedPaths: []
    };

    if (this.createdPaths.length === 0) {
      logInfo('No paths to clean up');
      return result;
    }

    const pathsToClean = [...this.createdPaths]
      .sort((a, b) => {
        // Clean files before directories, and deeper paths before shallow ones
        const aDepth = a.path.split(path.sep).length;
        const bDepth = b.path.split(path.sep).length;
        
        if (a.type === 'file' && b.type === 'directory') return -1;
        if (a.type === 'directory' && b.type === 'file') return 1;
        
        return bDepth - aDepth; // Deeper paths first
      });

    logInfo(`Starting cleanup of ${pathsToClean.length} path(s)...`);

    for (const item of pathsToClean) {
      try {
        const exists = await fs.pathExists(item.path);
        
        if (!exists) {
          result.skippedPaths.push({
            path: item.path,
            reason: 'Path does not exist'
          });
          continue;
        }

        // Check if we should preserve existing files
        if (opts.preserveExisting) {
          const stats = await fs.stat(item.path);
          const createdTime = new Date(item.timestamp);
          
          // If file was modified after we created it, skip it
          // Add a small buffer (1 second) to account for filesystem timestamp precision
          if (stats.mtime.getTime() > createdTime.getTime() + 1000) {
            result.skippedPaths.push({
              path: item.path,
              reason: 'File was modified after creation'
            });
            continue;
          }
        }

        // Perform the cleanup
        await fs.remove(item.path);
        result.cleanedPaths.push(item.path);
        
        logInfo(`Cleaned up: ${item.path}`);
        
      } catch (error) {
        result.errors.push({
          path: item.path,
          error: error.message
        });
        logError(`Failed to clean up ${item.path}: ${error.message}`);
      }
    }

    if (result.errors.length > 0) {
      result.success = false;
      logWarning(`Cleanup completed with ${result.errors.length} error(s)`);
    } else {
      logInfo(`Cleanup completed successfully. Removed ${result.cleanedPaths.length} path(s)`);
    }

    // Clear tracked paths after cleanup attempt
    this.clear();

    return result;
  }
}

/**
 * Create a new cleanup tracker
 * @param {Object} options - Tracker options
 * @returns {CleanupTracker} New cleanup tracker instance
 */
function createCleanupTracker(options = {}) {
  return new CleanupTracker(options);
}

/**
 * Cleanup utility for removing directories safely
 * @param {string} dirPath - Directory path to remove
 * @param {Object} options - Cleanup options
 * @returns {Object} Cleanup result
 */
async function cleanupDirectory(dirPath, options = {}) {
  const opts = {
    force: false,
    checkEmpty: true,
    ...options
  };

  try {
    const exists = await fs.pathExists(dirPath);
    if (!exists) {
      return { success: true, message: 'Directory does not exist' };
    }

    const stats = await fs.stat(dirPath);
    if (!stats.isDirectory()) {
      throw new Error('Path is not a directory');
    }

    // Check if directory is empty (if requested)
    if (opts.checkEmpty) {
      const contents = await fs.readdir(dirPath);
      if (contents.length > 0 && !opts.force) {
        return { 
          success: false, 
          message: 'Directory is not empty (use force: true to override)' 
        };
      }
    }

    await fs.remove(dirPath);
    logInfo(`Removed directory: ${dirPath}`);
    
    return { success: true, message: 'Directory removed successfully' };
    
  } catch (error) {
    logError(`Failed to remove directory ${dirPath}: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Cleanup utility for removing files safely
 * @param {string} filePath - File path to remove
 * @param {Object} options - Cleanup options
 * @returns {Object} Cleanup result
 */
async function cleanupFile(filePath, options = {}) {
  try {
    const exists = await fs.pathExists(filePath);
    if (!exists) {
      return { success: true, message: 'File does not exist' };
    }

    const stats = await fs.stat(filePath);
    if (!stats.isFile()) {
      throw new Error('Path is not a file');
    }

    await fs.remove(filePath);
    logInfo(`Removed file: ${filePath}`);
    
    return { success: true, message: 'File removed successfully' };
    
  } catch (error) {
    logError(`Failed to remove file ${filePath}: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Cleanup multiple paths with error handling
 * @param {Array} paths - Array of paths to clean up
 * @param {Object} options - Cleanup options
 * @returns {Object} Cleanup result summary
 */
async function cleanupPaths(paths, options = {}) {
  const result = {
    success: true,
    cleanedPaths: [],
    errors: [],
    total: paths.length
  };

  for (const filePath of paths) {
    try {
      const exists = await fs.pathExists(filePath);
      if (exists) {
        await fs.remove(filePath);
        result.cleanedPaths.push(filePath);
        logInfo(`Cleaned up: ${filePath}`);
      }
    } catch (error) {
      result.errors.push({ path: filePath, error: error.message });
      logError(`Failed to clean up ${filePath}: ${error.message}`);
    }
  }

  if (result.errors.length > 0) {
    result.success = false;
  }

  return result;
}

/**
 * Enhanced error handler with automatic cleanup
 * @param {Error} error - The error that occurred
 * @param {CleanupTracker} tracker - Cleanup tracker instance
 * @param {Object} options - Handler options
 */
async function handleErrorWithCleanup(error, tracker, options = {}) {
  const opts = {
    logError: true,
    performCleanup: true,
    rethrow: true,
    ...options
  };

  if (opts.logError) {
    logError('Operation failed:', error.message);
    if (error.stack && process.env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'test') {
      console.error(error.stack);
    }
  }

  if (opts.performCleanup && tracker) {
    logInfo('Performing automatic cleanup...');
    const cleanupResult = await tracker.cleanup();
    
    if (!cleanupResult.success) {
      logWarning('Cleanup completed with errors. Some files may need manual removal.');
    }
  }

  if (opts.rethrow) {
    throw error;
  }

  return { error, cleanupPerformed: opts.performCleanup };
}

/**
 * Wrapper function to execute operations with automatic cleanup on failure
 * @param {Function} operation - Async operation to execute
 * @param {CleanupTracker} tracker - Cleanup tracker instance
 * @param {Object} options - Wrapper options
 * @returns {Promise} Operation result
 */
async function withCleanup(operation, tracker, options = {}) {
  try {
    const result = await operation(tracker);
    
    // If operation succeeds, disable cleanup tracking
    if (tracker) {
      tracker.disable();
    }
    
    return result;
  } catch (error) {
    await handleErrorWithCleanup(error, tracker, options);
  }
}

module.exports = {
  CleanupTracker,
  createCleanupTracker,
  cleanupDirectory,
  cleanupFile,
  cleanupPaths,
  handleErrorWithCleanup,
  withCleanup
}; 