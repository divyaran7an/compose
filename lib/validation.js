const fs = require('fs-extra');
const path = require('path');
const { createValidationError, createFileSystemError, createPermissionError } = require('./errors');

/**
 * Validation module for capx-compose CLI
 * Provides validation functions for project names, directories, and user inputs
 */

// Reserved names that cannot be used as project names
const RESERVED_NAMES = [
  // Node.js built-ins
  'node_modules', 'package.json', 'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml',
  
  // Common directories
  'src', 'lib', 'bin', 'test', 'tests', 'dist', 'build', 'public', 'static',
  
  // Framework-specific
  'next', 'react', 'vue', 'angular', 'svelte', 'nuxt', 'gatsby',
  
  // Package managers and tools
  'npm', 'npx', 'yarn', 'pnpm', 'node', 'git', 'docker',
  
  // Common files
  'index', 'main', 'app', 'server', 'client', 'config', 'env',
  
  // System files
  'con', 'prn', 'aux', 'nul', 'com1', 'com2', 'com3', 'com4', 'com5', 'com6', 'com7', 'com8', 'com9',
  'lpt1', 'lpt2', 'lpt3', 'lpt4', 'lpt5', 'lpt6', 'lpt7', 'lpt8', 'lpt9'
];

// Valid project name pattern (npm package name rules)
const VALID_NAME_PATTERN = /^[a-z0-9]([a-z0-9\-_])*[a-z0-9]$|^[a-z0-9]$/;

/**
 * Validate project name according to npm package naming rules
 * @param {string} name - The project name to validate
 * @returns {object} Validation result with isValid, error, and suggestions
 */
function validateProjectName(name) {
  const suggestions = [];
  
  // Check if name is provided
  if (!name || typeof name !== 'string') {
    return {
      isValid: false,
      error: 'Project name is required',
      suggestions: ['Provide a valid project name']
    };
  }
  
  // Trim whitespace
  const trimmedName = name.trim();
  
  if (trimmedName !== name) {
    suggestions.push('Remove leading/trailing whitespace');
  }
  
  if (trimmedName.length === 0) {
    return {
      isValid: false,
      error: 'Project name is required',
      suggestions: ['Provide a non-empty project name']
    };
  }
  
  // Check length limits
  if (trimmedName.length > 214) {
    return {
      isValid: false,
      error: 'Project name is too long (max 214 characters)',
      suggestions: ['Use a shorter name', 'Consider abbreviations']
    };
  }
  
  // Check for leading dot first
  if (trimmedName.startsWith('.')) {
    return {
      isValid: false,
      error: 'Project name cannot start with a dot',
      suggestions: ['Remove the leading dot', 'Use a different name']
    };
  }
  
  // Check for reserved names
  if (RESERVED_NAMES.includes(trimmedName.toLowerCase())) {
    return {
      isValid: false,
      error: `"${trimmedName}" is a reserved name`,
      suggestions: [
        'Add a prefix or suffix (e.g., "my-app", "app-name")',
        'Use a different descriptive name',
        'Add your organization name as prefix'
      ]
    };
  }
  
  // Check for uppercase letters
  if (trimmedName !== trimmedName.toLowerCase()) {
    suggestions.push('Use lowercase letters only');
  }
  
  // Check for invalid characters
  if (!VALID_NAME_PATTERN.test(trimmedName.toLowerCase())) {
    const invalidChars = [];
    
    // Check for spaces
    if (trimmedName.includes(' ')) {
      invalidChars.push('spaces');
      suggestions.push('Replace spaces with hyphens (-)');
    }
    
    // Check for special characters
    const specialChars = trimmedName.match(/[^a-z0-9\-_]/gi);
    if (specialChars) {
      invalidChars.push('special characters');
      suggestions.push('Use only letters, numbers, hyphens (-), and underscores (_)');
    }
    
    // Check for leading/trailing hyphens or underscores
    if (trimmedName.startsWith('-') || trimmedName.startsWith('_')) {
      suggestions.push('Do not start with hyphens (-) or underscores (_)');
    }
    
    if (trimmedName.endsWith('-') || trimmedName.endsWith('_')) {
      suggestions.push('Do not end with hyphens (-) or underscores (_)');
    }
    
    return {
      isValid: false,
      error: `Project name contains invalid ${invalidChars.join(' and ')}`,
      suggestions
    };
  }
  
  // If we have suggestions but no errors, it means the name could be improved
  if (suggestions.length > 0) {
    return {
      isValid: true,
      warning: 'Project name could be improved',
      suggestions
    };
  }
  
  return {
    isValid: true,
    normalizedName: trimmedName.toLowerCase()
  };
}

/**
 * Check if a directory exists and validate it for project creation
 * @param {string} dirPath - The directory path to check
 * @returns {object} Validation result with isValid, error, and suggestions
 */
async function validateProjectDirectory(dirPath) {
  try {
    // Check if path is provided
    if (!dirPath || typeof dirPath !== 'string') {
      throw createValidationError('Directory path is required', 'directory');
    }
    
    const absolutePath = path.resolve(dirPath);
    const parentDir = path.dirname(absolutePath);
    
    // Check if parent directory exists and is writable
    try {
      await fs.access(parentDir, fs.constants.F_OK | fs.constants.W_OK);
    } catch (error) {
      if (error.code === 'ENOENT') {
        throw createFileSystemError(
          `Parent directory does not exist: ${parentDir}`,
          parentDir,
          'access'
        );
      } else if (error.code === 'EACCES') {
        throw createPermissionError(
          `No write permission for parent directory: ${parentDir}`,
          parentDir,
          'write'
        );
      } else {
        throw createFileSystemError(
          `Cannot access parent directory: ${error.message}`,
          parentDir,
          'access'
        );
      }
    }
    
    // Check if target directory already exists
    const exists = await fs.pathExists(absolutePath);
    
    if (exists) {
      // Check if it's a directory
      const stats = await fs.stat(absolutePath);
      
      if (!stats.isDirectory()) {
        throw createFileSystemError(
          `Path exists but is not a directory: ${absolutePath}`,
          absolutePath,
          'stat'
        );
      }
      
      // Check if directory is empty
      const contents = await fs.readdir(absolutePath);
      
      if (contents.length > 0) {
        // Filter out hidden files for the check
        const visibleContents = contents.filter(item => !item.startsWith('.'));
        
        if (visibleContents.length > 0) {
          return {
            isValid: false,
            error: `Directory is not empty: ${absolutePath}`,
            suggestions: [
              'Choose a different directory name',
              'Remove existing files from the directory',
              'Use a subdirectory instead'
            ],
            directoryContents: contents
          };
        }
      }
      
      // Directory exists but is empty (or only has hidden files)
      return {
        isValid: true,
        warning: 'Directory already exists but is empty',
        directoryExists: true
      };
    }
    
    return {
      isValid: true,
      directoryExists: false
    };
    
  } catch (error) {
    // Re-throw our custom errors
    if (error.name && error.name.includes('Error')) {
      throw error;
    }
    
    // Handle unexpected errors
    throw createFileSystemError(
      `Unexpected error validating directory: ${error.message}`,
      dirPath,
      'validate'
    );
  }
}

/**
 * Validate template selection
 * @param {string|string[]} templates - Template name(s) to validate
 * @param {string[]} availableTemplates - List of available templates
 * @returns {object} Validation result
 */
function validateTemplateSelection(templates, availableTemplates = []) {
  if (!templates) {
    return {
      isValid: true,
      templates: []
    };
  }
  
  const templateList = Array.isArray(templates) ? templates : [templates];
  const invalidTemplates = [];
  const validTemplates = [];
  
  for (const template of templateList) {
    if (typeof template !== 'string' || template.trim().length === 0) {
      invalidTemplates.push(template);
      continue;
    }
    
    const trimmedTemplate = template.trim();
    
    if (availableTemplates.length > 0 && !availableTemplates.includes(trimmedTemplate)) {
      invalidTemplates.push(trimmedTemplate);
    } else {
      validTemplates.push(trimmedTemplate);
    }
  }
  
  if (invalidTemplates.length > 0) {
    const suggestions = [];
    
    if (availableTemplates.length > 0) {
      suggestions.push('Available templates: ' + availableTemplates.join(', '));
      suggestions.push('Check template name spelling');
    }
    
    return {
      isValid: false,
      error: `Invalid template(s): ${invalidTemplates.join(', ')}`,
      suggestions,
      invalidTemplates,
      validTemplates
    };
  }
  
  return {
    isValid: true,
    templates: validTemplates
  };
}

/**
 * Validate package manager selection
 * @param {string} packageManager - Package manager to validate
 * @returns {object} Validation result
 */
function validatePackageManager(packageManager) {
  const validManagers = ['npm', 'yarn', 'pnpm'];
  
  if (!packageManager) {
    return {
      isValid: true,
      packageManager: null // Auto-detect
    };
  }
  
  if (typeof packageManager !== 'string') {
    return {
      isValid: false,
      error: 'Package manager must be a string',
      suggestions: [`Valid options: ${validManagers.join(', ')}`]
    };
  }
  
  const trimmed = packageManager.trim().toLowerCase();
  
  if (!validManagers.includes(trimmed)) {
    return {
      isValid: false,
      error: `Invalid package manager: ${packageManager}`,
      suggestions: [
        `Valid options: ${validManagers.join(', ')}`,
        'Leave empty for auto-detection'
      ]
    };
  }
  
  return {
    isValid: true,
    packageManager: trimmed
  };
}

/**
 * Comprehensive validation for project creation
 * @param {object} options - Project options to validate
 * @returns {object} Complete validation result
 */
async function validateProjectOptions(options = {}) {
  const {
    projectName,
    projectPath,
    templates,
    packageManager,
    availableTemplates
  } = options;
  
  const results = {
    isValid: true,
    errors: [],
    warnings: [],
    suggestions: [],
    validatedOptions: {}
  };
  
  // Validate project name
  try {
    const nameResult = validateProjectName(projectName);
    
    if (!nameResult.isValid) {
      results.isValid = false;
      results.errors.push({
        field: 'projectName',
        error: nameResult.error,
        suggestions: nameResult.suggestions
      });
    } else {
      results.validatedOptions.projectName = nameResult.normalizedName || projectName;
      
      if (nameResult.warning) {
        results.warnings.push({
          field: 'projectName',
          warning: nameResult.warning,
          suggestions: nameResult.suggestions
        });
      }
    }
  } catch (error) {
    results.isValid = false;
    results.errors.push({
      field: 'projectName',
      error: error.message,
      suggestions: ['Provide a valid project name']
    });
  }
  
  // Validate project directory
  if (projectPath) {
    try {
      const dirResult = await validateProjectDirectory(projectPath);
      
      if (!dirResult.isValid) {
        results.isValid = false;
        results.errors.push({
          field: 'projectPath',
          error: dirResult.error,
          suggestions: dirResult.suggestions
        });
      } else {
        results.validatedOptions.projectPath = path.resolve(projectPath);
        
        if (dirResult.warning) {
          results.warnings.push({
            field: 'projectPath',
            warning: dirResult.warning
          });
        }
      }
    } catch (error) {
      results.isValid = false;
      results.errors.push({
        field: 'projectPath',
        error: error.userMessage || error.message,
        suggestions: ['Check directory path and permissions']
      });
    }
  }
  
  // Validate templates
  const templateResult = validateTemplateSelection(templates, availableTemplates);
  
  if (!templateResult.isValid) {
    results.isValid = false;
    results.errors.push({
      field: 'templates',
      error: templateResult.error,
      suggestions: templateResult.suggestions
    });
  } else {
    results.validatedOptions.templates = templateResult.templates;
  }
  
  // Validate package manager
  const pmResult = validatePackageManager(packageManager);
  
  if (!pmResult.isValid) {
    results.isValid = false;
    results.errors.push({
      field: 'packageManager',
      error: pmResult.error,
      suggestions: pmResult.suggestions
    });
  } else {
    results.validatedOptions.packageManager = pmResult.packageManager;
  }
  
  return results;
}

/**
 * Generate a suggested project name based on invalid input
 * @param {string} invalidName - The invalid project name
 * @returns {string} Suggested valid project name
 */
function suggestProjectName(invalidName) {
  if (!invalidName || typeof invalidName !== 'string') {
    return 'my-app';
  }
  
  let suggested = invalidName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\-_]/g, '-') // Replace invalid chars with hyphens
    .replace(/^[-_]+|[-_]+$/g, '') // Remove leading/trailing hyphens/underscores
    .replace(/[-_]{2,}/g, '-'); // Replace multiple consecutive hyphens/underscores with single hyphen
  
  // Ensure it doesn't start or end with hyphen/underscore
  suggested = suggested.replace(/^[-_]+|[-_]+$/g, '');
  
  // If empty after cleaning, use default
  if (!suggested) {
    return 'my-app';
  }
  
  // If it's a reserved name, add prefix
  if (RESERVED_NAMES.includes(suggested)) {
    suggested = `my-${suggested}`;
  }
  
  // Ensure minimum length
  if (suggested.length < 2) {
    suggested = `${suggested}-app`;
  }
  
  return suggested;
}

module.exports = {
  validateProjectName,
  validateProjectDirectory,
  validateTemplateSelection,
  validatePackageManager,
  validateProjectOptions,
  suggestProjectName,
  RESERVED_NAMES,
  VALID_NAME_PATTERN
}; 