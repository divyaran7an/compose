const fs = require('fs-extra');
const path = require('path');
const os = require('os');
const {
  validateProjectName,
  validateProjectDirectory,
  validateTemplateSelection,
  validatePackageManager,
  validateProjectOptions,
  suggestProjectName,
  RESERVED_NAMES,
  VALID_NAME_PATTERN
} = require('../../../lib/validation');

// Mock error functions
jest.mock('../../../lib/errors', () => ({
  createValidationError: jest.fn((message, field) => {
    const error = new Error(message);
    error.field = field;
    error.name = 'ValidationError';
    return error;
  }),
  createFileSystemError: jest.fn((message, path, operation) => {
    const error = new Error(message);
    error.path = path;
    error.operation = operation;
    error.name = 'FileSystemError';
    return error;
  }),
  createPermissionError: jest.fn((message, path, permission) => {
    const error = new Error(message);
    error.path = path;
    error.requiredPermission = permission;
    error.name = 'PermissionError';
    return error;
  })
}));

describe('Validation Module', () => {
  let tempDir;

  beforeEach(async () => {
    // Create a temporary directory for testing
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'capx-compose-test-'));
  });

  afterEach(async () => {
    // Clean up temporary directory
    if (tempDir) {
      await fs.remove(tempDir);
    }
  });

  describe('validateProjectName', () => {
    test('should accept valid project names', () => {
      const validNames = [
        'my-app',
        'myapp',
        'my_app',
        'app123',
        'a',
        'my-awesome-app',
        'project-2024'
      ];

      validNames.forEach(name => {
        const result = validateProjectName(name);
        expect(result.isValid).toBe(true);
        expect(result.normalizedName).toBe(name.toLowerCase());
      });
    });

    test('should reject empty or null names', () => {
      const invalidNames = [null, undefined, '', '   '];

      invalidNames.forEach(name => {
        const result = validateProjectName(name);
        expect(result.isValid).toBe(false);
        expect(result.error).toContain('required');
      });
    });

    test('should reject names that are too long', () => {
      const longName = 'a'.repeat(215);
      const result = validateProjectName(longName);
      
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('too long');
      expect(result.suggestions).toContain('Use a shorter name');
    });

    test('should reject reserved names', () => {
      const reservedNames = ['node_modules', 'react', 'npm', 'test'];

      reservedNames.forEach(name => {
        const result = validateProjectName(name);
        expect(result.isValid).toBe(false);
        expect(result.error).toContain('reserved name');
        expect(result.suggestions.length).toBeGreaterThan(0);
      });
    });

    test('should reject names with invalid characters', () => {
      const invalidNames = [
        'my app',
        'my@app',
        'my#app',
        'my$app',
        'my%app'
      ];

      invalidNames.forEach(name => {
        const result = validateProjectName(name);
        expect(result.isValid).toBe(false);
        expect(result.error).toContain('invalid');
      });
    });

    test('should reject names starting with dots', () => {
      const result = validateProjectName('.myapp');
      
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('cannot start with a dot');
    });

    test('should reject names starting or ending with hyphens/underscores', () => {
      const invalidNames = ['-myapp', 'myapp-', '_myapp', 'myapp_'];

      invalidNames.forEach(name => {
        const result = validateProjectName(name);
        expect(result.isValid).toBe(false);
        expect(result.suggestions.some(s => s.includes('Do not start') || s.includes('Do not end'))).toBe(true);
      });
    });

    test('should provide suggestions for uppercase names', () => {
      const result = validateProjectName('MyApp');
      
      expect(result.isValid).toBe(true);
      expect(result.warning).toContain('could be improved');
      expect(result.suggestions).toContain('Use lowercase letters only');
    });

    test('should handle names with spaces', () => {
      const result = validateProjectName('my app');
      
      expect(result.isValid).toBe(false);
      expect(result.suggestions).toContain('Replace spaces with hyphens (-)');
    });
  });

  describe('validateProjectDirectory', () => {
    test('should accept non-existent directory in valid parent', async () => {
      const testPath = path.join(tempDir, 'new-project');
      const result = await validateProjectDirectory(testPath);
      
      expect(result.isValid).toBe(true);
      expect(result.directoryExists).toBe(false);
    });

    test('should accept empty existing directory', async () => {
      const testPath = path.join(tempDir, 'empty-dir');
      await fs.ensureDir(testPath);
      
      const result = await validateProjectDirectory(testPath);
      
      expect(result.isValid).toBe(true);
      expect(result.directoryExists).toBe(true);
      expect(result.warning).toContain('already exists but is empty');
    });

    test('should reject non-empty directory', async () => {
      const testPath = path.join(tempDir, 'non-empty-dir');
      await fs.ensureDir(testPath);
      await fs.writeFile(path.join(testPath, 'file.txt'), 'content');
      
      const result = await validateProjectDirectory(testPath);
      
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('not empty');
      expect(result.suggestions.length).toBeGreaterThan(0);
    });

    test('should accept directory with only hidden files', async () => {
      const testPath = path.join(tempDir, 'hidden-files-dir');
      await fs.ensureDir(testPath);
      await fs.writeFile(path.join(testPath, '.hidden'), 'content');
      
      const result = await validateProjectDirectory(testPath);
      
      expect(result.isValid).toBe(true);
      expect(result.directoryExists).toBe(true);
    });

    test('should reject null or empty path', async () => {
      await expect(validateProjectDirectory(null)).rejects.toThrow();
      await expect(validateProjectDirectory('')).rejects.toThrow();
    });

    test('should handle non-existent parent directory', async () => {
      const testPath = path.join(tempDir, 'non-existent', 'project');
      
      await expect(validateProjectDirectory(testPath)).rejects.toThrow();
    });
  });

  describe('validateTemplateSelection', () => {
    const availableTemplates = ['react', 'vue', 'angular', 'svelte'];

    test('should accept valid templates', () => {
      const result = validateTemplateSelection(['react', 'vue'], availableTemplates);
      
      expect(result.isValid).toBe(true);
      expect(result.templates).toEqual(['react', 'vue']);
    });

    test('should accept empty template list', () => {
      const result = validateTemplateSelection([], availableTemplates);
      
      expect(result.isValid).toBe(true);
      expect(result.templates).toEqual([]);
    });

    test('should accept null/undefined templates', () => {
      const result = validateTemplateSelection(null, availableTemplates);
      
      expect(result.isValid).toBe(true);
      expect(result.templates).toEqual([]);
    });

    test('should reject invalid templates', () => {
      const result = validateTemplateSelection(['react', 'invalid'], availableTemplates);
      
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Invalid template(s): invalid');
      expect(result.suggestions).toContain('Available templates: react, vue, angular, svelte');
    });

    test('should handle single template string', () => {
      const result = validateTemplateSelection('react', availableTemplates);
      
      expect(result.isValid).toBe(true);
      expect(result.templates).toEqual(['react']);
    });

    test('should trim template names', () => {
      const result = validateTemplateSelection([' react ', '  vue  '], availableTemplates);
      
      expect(result.isValid).toBe(true);
      expect(result.templates).toEqual(['react', 'vue']);
    });

    test('should work without available templates list', () => {
      const result = validateTemplateSelection(['anything']);
      
      expect(result.isValid).toBe(true);
      expect(result.templates).toEqual(['anything']);
    });
  });

  describe('validatePackageManager', () => {
    test('should accept valid package managers', () => {
      const validManagers = ['npm', 'yarn', 'pnpm'];

      validManagers.forEach(manager => {
        const result = validatePackageManager(manager);
        expect(result.isValid).toBe(true);
        expect(result.packageManager).toBe(manager);
      });
    });

    test('should accept null/undefined for auto-detection', () => {
      const result = validatePackageManager(null);
      
      expect(result.isValid).toBe(true);
      expect(result.packageManager).toBeNull();
    });

    test('should reject invalid package managers', () => {
      const result = validatePackageManager('invalid');
      
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Invalid package manager');
      expect(result.suggestions).toContain('Valid options: npm, yarn, pnpm');
    });

    test('should handle case insensitive input', () => {
      const result = validatePackageManager('NPM');
      
      expect(result.isValid).toBe(true);
      expect(result.packageManager).toBe('npm');
    });

    test('should trim whitespace', () => {
      const result = validatePackageManager('  yarn  ');
      
      expect(result.isValid).toBe(true);
      expect(result.packageManager).toBe('yarn');
    });

    test('should reject non-string input', () => {
      const result = validatePackageManager(123);
      
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('must be a string');
    });
  });

  describe('validateProjectOptions', () => {
    test('should validate all options successfully', async () => {
      const testPath = path.join(tempDir, 'test-project');
      const options = {
        projectName: 'my-app',
        projectPath: testPath,
        templates: ['react'],
        packageManager: 'npm',
        availableTemplates: ['react', 'vue']
      };

      const result = await validateProjectOptions(options);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.validatedOptions.projectName).toBe('my-app');
      expect(result.validatedOptions.templates).toEqual(['react']);
      expect(result.validatedOptions.packageManager).toBe('npm');
    });

    test('should collect multiple validation errors', async () => {
      const options = {
        projectName: 'Invalid Name!',
        projectPath: '/non/existent/parent/project',
        templates: ['invalid-template'],
        packageManager: 'invalid-manager',
        availableTemplates: ['react', 'vue']
      };

      const result = await validateProjectOptions(options);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      
      const errorFields = result.errors.map(e => e.field);
      expect(errorFields).toContain('projectName');
      expect(errorFields).toContain('templates');
      expect(errorFields).toContain('packageManager');
    });

    test('should handle warnings separately from errors', async () => {
      const testPath = path.join(tempDir, 'test-project');
      const options = {
        projectName: 'MyApp', // Valid but has uppercase
        projectPath: testPath,
        templates: [],
        packageManager: 'npm'
      };

      const result = await validateProjectOptions(options);
      
      expect(result.isValid).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0].field).toBe('projectName');
      expect(result.warnings[0].warning).toContain('could be improved');
    });
  });

  describe('suggestProjectName', () => {
    test('should clean up invalid characters', () => {
      const suggestions = [
        { input: 'My App!', expected: 'my-app' },
        { input: 'my@app#test', expected: 'my-app-test' },
        { input: '  spaced  name  ', expected: 'spaced-name' },
        { input: 'UPPERCASE', expected: 'uppercase' },
        { input: '-invalid-', expected: 'invalid' }
      ];

      suggestions.forEach(({ input, expected }) => {
        const result = suggestProjectName(input);
        expect(result).toBe(expected);
      });
    });

    test('should handle reserved names', () => {
      const result = suggestProjectName('react');
      expect(result).toBe('my-react');
    });

    test('should handle empty or invalid input', () => {
      expect(suggestProjectName('')).toBe('my-app');
      expect(suggestProjectName(null)).toBe('my-app');
      expect(suggestProjectName('!!!')).toBe('my-app');
    });

    test('should ensure minimum length', () => {
      const result = suggestProjectName('a');
      expect(result.length).toBeGreaterThan(1);
    });

    test('should handle multiple consecutive special characters', () => {
      const result = suggestProjectName('my---app___test');
      expect(result).toBe('my-app-test');
    });
  });

  describe('Constants', () => {
    test('RESERVED_NAMES should contain expected values', () => {
      expect(RESERVED_NAMES).toContain('node_modules');
      expect(RESERVED_NAMES).toContain('react');
      expect(RESERVED_NAMES).toContain('npm');
      expect(RESERVED_NAMES).toContain('test');
    });

    test('VALID_NAME_PATTERN should match valid names', () => {
      const validNames = ['app', 'my-app', 'my_app', 'app123'];
      const invalidNames = ['-app', 'app-', '_app', 'app_', 'my app'];

      validNames.forEach(name => {
        expect(VALID_NAME_PATTERN.test(name)).toBe(true);
      });

      invalidNames.forEach(name => {
        expect(VALID_NAME_PATTERN.test(name)).toBe(false);
      });
    });
  });
}); 