const { logError, logWarning, logInfo } = require('./console');

/**
 * Error handling system for capx-compose CLI
 * Provides custom error classes, exit codes, and user-friendly error messages
 */

// Exit codes for different error scenarios
const EXIT_CODES = {
  SUCCESS: 0,
  GENERAL_ERROR: 1,
  INVALID_ARGUMENTS: 2,
  FILE_SYSTEM_ERROR: 3,
  NETWORK_ERROR: 4,
  PERMISSION_ERROR: 5,
  VALIDATION_ERROR: 6,
  DEPENDENCY_ERROR: 7,
  TEMPLATE_ERROR: 8,
  USER_CANCELLED: 9
};

/**
 * Base error class for capx-compose errors
 */
class CreateAIAppError extends Error {
  constructor(message, exitCode = EXIT_CODES.GENERAL_ERROR, userMessage = null) {
    super(message);
    this.name = this.constructor.name;
    this.exitCode = exitCode;
    this.userMessage = userMessage || message;
    this.timestamp = new Date().toISOString();
    
    // Capture stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

/**
 * Validation error for invalid user inputs
 */
class ValidationError extends CreateAIAppError {
  constructor(message, field = null, suggestions = []) {
    const userMessage = `Invalid ${field || 'input'}: ${message}`;
    super(message, EXIT_CODES.VALIDATION_ERROR, userMessage);
    this.field = field;
    this.suggestions = suggestions;
  }
}

/**
 * File system error for file/directory operations
 */
class FileSystemError extends CreateAIAppError {
  constructor(message, path = null, operation = null) {
    const userMessage = `File system error${path ? ` at ${path}` : ''}: ${message}`;
    super(message, EXIT_CODES.FILE_SYSTEM_ERROR, userMessage);
    this.path = path;
    this.operation = operation;
  }
}

/**
 * Network error for download/fetch operations
 */
class NetworkError extends CreateAIAppError {
  constructor(message, url = null, statusCode = null) {
    const userMessage = `Network error${url ? ` accessing ${url}` : ''}: ${message}`;
    super(message, EXIT_CODES.NETWORK_ERROR, userMessage);
    this.url = url;
    this.statusCode = statusCode;
  }
}

/**
 * Permission error for access-related issues
 */
class PermissionError extends CreateAIAppError {
  constructor(message, path = null, requiredPermission = null) {
    const userMessage = `Permission denied${path ? ` for ${path}` : ''}: ${message}`;
    super(message, EXIT_CODES.PERMISSION_ERROR, userMessage);
    this.path = path;
    this.requiredPermission = requiredPermission;
  }
}

/**
 * Dependency error for package installation issues
 */
class DependencyError extends CreateAIAppError {
  constructor(message, packageName = null, packageManager = null) {
    const userMessage = `Dependency error${packageName ? ` with ${packageName}` : ''}: ${message}`;
    super(message, EXIT_CODES.DEPENDENCY_ERROR, userMessage);
    this.packageName = packageName;
    this.packageManager = packageManager;
  }
}

/**
 * Template error for template-related issues
 */
class TemplateError extends CreateAIAppError {
  constructor(message, templateName = null, templatePath = null) {
    const userMessage = `Template error${templateName ? ` with ${templateName}` : ''}: ${message}`;
    super(message, EXIT_CODES.TEMPLATE_ERROR, userMessage);
    this.templateName = templateName;
    this.templatePath = templatePath;
  }
}

/**
 * User cancellation error
 */
class UserCancelledError extends CreateAIAppError {
  constructor(message = 'Operation cancelled by user') {
    super(message, EXIT_CODES.USER_CANCELLED, message);
  }
}

/**
 * Format error message with suggestions and context
 * @param {Error} error - The error to format
 * @returns {string} Formatted error message
 */
function formatErrorMessage(error) {
  let message = error.userMessage || error.message;
  
  // Add suggestions for validation errors
  if (error instanceof ValidationError && error.suggestions.length > 0) {
    message += '\n\nSuggestions:';
    error.suggestions.forEach(suggestion => {
      message += `\n  • ${suggestion}`;
    });
  }
  
  // Add context for file system errors
  if (error instanceof FileSystemError && error.operation) {
    message += `\n\nFailed operation: ${error.operation}`;
  }
  
  // Add troubleshooting for network errors
  if (error instanceof NetworkError) {
    message += '\n\nTroubleshooting:';
    message += '\n  • Check your internet connection';
    message += '\n  • Verify the URL is accessible';
    message += '\n  • Try again in a few moments';
  }
  
  // Add troubleshooting for permission errors
  if (error instanceof PermissionError) {
    message += '\n\nTroubleshooting:';
    message += '\n  • Check file/directory permissions';
    message += '\n  • Try running with appropriate privileges';
    message += '\n  • Ensure the path is writable';
  }
  
  // Add troubleshooting for dependency errors
  if (error instanceof DependencyError) {
    message += '\n\nTroubleshooting:';
    message += '\n  • Check your internet connection';
    message += '\n  • Verify package manager is installed';
    message += '\n  • Try clearing package manager cache';
    message += '\n  • Check for package manager configuration issues';
  }
  
  return message;
}

/**
 * Global error handler that logs errors and exits with appropriate codes
 * @param {Error} error - The error to handle
 * @param {boolean} silent - Whether to suppress error output
 */
function handleError(error, silent = false) {
  if (!silent) {
    if (error instanceof CreateAIAppError) {
      // Handle our custom errors with formatted messages
      logError(formatErrorMessage(error));
      
      // Log additional context in debug mode
      if (process.env.DEBUG) {
        console.error('\nDebug information:');
        console.error(`Error type: ${error.constructor.name}`);
        console.error(`Timestamp: ${error.timestamp}`);
        console.error(`Stack trace: ${error.stack}`);
      }
    } else {
      // Handle unexpected errors
      logError('An unexpected error occurred:');
      logError(error.message);
      
      if (process.env.DEBUG) {
        console.error('\nStack trace:');
        console.error(error.stack);
      } else {
        logInfo('Run with DEBUG=1 for more detailed error information');
      }
    }
  }
  
  // Exit with appropriate code
  const exitCode = error instanceof CreateAIAppError ? error.exitCode : EXIT_CODES.GENERAL_ERROR;
  process.exit(exitCode);
}

/**
 * Wrap async functions to catch and handle errors
 * @param {Function} fn - The async function to wrap
 * @returns {Function} Wrapped function
 */
function asyncErrorHandler(fn) {
  return async (...args) => {
    try {
      return await fn(...args);
    } catch (error) {
      handleError(error);
    }
  };
}

/**
 * Handle process-level errors
 */
function setupGlobalErrorHandlers() {
  // Handle uncaught exceptions
  process.on('uncaughtException', (error) => {
    logError('Uncaught exception occurred:');
    handleError(error);
  });
  
  // Handle unhandled promise rejections
  process.on('unhandledRejection', (reason, promise) => {
    logError('Unhandled promise rejection:');
    const error = reason instanceof Error ? reason : new Error(String(reason));
    handleError(error);
  });
  
  // Handle SIGINT (Ctrl+C)
  process.on('SIGINT', () => {
    logWarning('\nOperation cancelled by user');
    process.exit(EXIT_CODES.USER_CANCELLED);
  });
  
  // Handle SIGTERM
  process.on('SIGTERM', () => {
    logWarning('\nProcess terminated');
    process.exit(EXIT_CODES.USER_CANCELLED);
  });
}

/**
 * Create a validation error with suggestions
 * @param {string} message - Error message
 * @param {string} field - Field that failed validation
 * @param {string[]} suggestions - Array of suggestions
 * @returns {ValidationError}
 */
function createValidationError(message, field, suggestions = []) {
  return new ValidationError(message, field, suggestions);
}

/**
 * Create a file system error
 * @param {string} message - Error message
 * @param {string} path - File/directory path
 * @param {string} operation - Operation that failed
 * @returns {FileSystemError}
 */
function createFileSystemError(message, path, operation) {
  return new FileSystemError(message, path, operation);
}

/**
 * Create a network error
 * @param {string} message - Error message
 * @param {string} url - URL that failed
 * @param {number} statusCode - HTTP status code
 * @returns {NetworkError}
 */
function createNetworkError(message, url, statusCode) {
  return new NetworkError(message, url, statusCode);
}

/**
 * Create a permission error
 * @param {string} message - Error message
 * @param {string} path - Path with permission issues
 * @param {string} requiredPermission - Required permission
 * @returns {PermissionError}
 */
function createPermissionError(message, path, requiredPermission) {
  return new PermissionError(message, path, requiredPermission);
}

/**
 * Create a dependency error
 * @param {string} message - Error message
 * @param {string} packageName - Package name
 * @param {string} packageManager - Package manager
 * @returns {DependencyError}
 */
function createDependencyError(message, packageName, packageManager) {
  return new DependencyError(message, packageName, packageManager);
}

/**
 * Create a template error
 * @param {string} message - Error message
 * @param {string} templateName - Template name
 * @param {string} templatePath - Template path
 * @returns {TemplateError}
 */
function createTemplateError(message, templateName, templatePath) {
  return new TemplateError(message, templateName, templatePath);
}

module.exports = {
  // Exit codes
  EXIT_CODES,
  
  // Error classes
  CreateAIAppError,
  ValidationError,
  FileSystemError,
  NetworkError,
  PermissionError,
  DependencyError,
  TemplateError,
  UserCancelledError,
  
  // Error handling functions
  handleError,
  asyncErrorHandler,
  setupGlobalErrorHandlers,
  formatErrorMessage,
  
  // Error creation helpers
  createValidationError,
  createFileSystemError,
  createNetworkError,
  createPermissionError,
  createDependencyError,
  createTemplateError
}; 