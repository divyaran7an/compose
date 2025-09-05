const fs = require('fs');
const path = require('path');
const https = require('https');
const { validateTemplate, validateAllTemplates, checkNpmPackageExists } = require('../../../lib/templateValidator');
const { validateTemplateConfig } = require('../../../lib/templateConfigSchema');
const { listTemplates } = require('../../../lib/templateDiscovery');

// Mock dependencies
jest.mock('fs');
jest.mock('https');
jest.mock('../../../lib/templateConfigSchema');
jest.mock('../../../lib/templateDiscovery');

describe('Template Validator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock console methods to avoid output during tests
    jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('checkNpmPackageExists', () => {
    test('should return true for existing package', async () => {
      const mockResponse = { statusCode: 200 };
      const mockRequest = {
        on: jest.fn().mockReturnThis()
      };

      https.get.mockImplementation((url, callback) => {
        callback(mockResponse);
        return mockRequest;
      });

      const result = await checkNpmPackageExists('react');

      expect(result).toBe(true);
      expect(https.get).toHaveBeenCalledWith('https://registry.npmjs.org/react', expect.any(Function));
    });

    test('should return false for non-existing package', async () => {
      const mockResponse = { statusCode: 404 };
      const mockRequest = {
        on: jest.fn().mockReturnThis()
      };

      https.get.mockImplementation((url, callback) => {
        callback(mockResponse);
        return mockRequest;
      });

      const result = await checkNpmPackageExists('non-existent-package');

      expect(result).toBe(false);
    });

    test('should return false on network error', async () => {
      const mockRequest = {
        on: jest.fn((event, callback) => {
          if (event === 'error') {
            callback(new Error('Network error'));
          }
          return mockRequest;
        })
      };

      https.get.mockImplementation(() => mockRequest);

      const result = await checkNpmPackageExists('any-package');

      expect(result).toBe(false);
    });

    test('should handle different status codes', async () => {
      const testCases = [
        { statusCode: 200, expected: true },
        { statusCode: 404, expected: false },
        { statusCode: 500, expected: false },
        { statusCode: 301, expected: false }
      ];

      for (const testCase of testCases) {
        const mockResponse = { statusCode: testCase.statusCode };
        const mockRequest = { on: jest.fn().mockReturnThis() };

        https.get.mockImplementation((url, callback) => {
          callback(mockResponse);
          return mockRequest;
        });

        const result = await checkNpmPackageExists('test-package');
        expect(result).toBe(testCase.expected);
      }
    });
  });

  describe('validateTemplate', () => {
    const mockTemplate = {
      sdk: 'test-sdk',
      template: 'default',
      path: '/path/to/template',
      config: {
        name: 'Test Template',
        description: 'A test template',
        packages: [
          { name: 'react', version: '^18.0.0' }
        ],
        devPackages: [
          { name: 'typescript', version: '^5.0.0' }
        ],
        files: {
          'index.ts': 'src/index.ts',
          'component.tsx': 'src/components/Component.tsx'
        },
        envVars: []
      }
    };

    test('should validate a correct template', async () => {
      // Mock schema validation
      validateTemplateConfig.mockReturnValue({ valid: true, errors: null });

      // Mock file existence
      fs.existsSync.mockReturnValue(true);

      // Mock npm package existence
      https.get.mockImplementation((url, callback) => {
        callback({ statusCode: 200 });
        return { on: jest.fn().mockReturnThis() };
      });

      const result = await validateTemplate(mockTemplate);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.sdk).toBe('test-sdk');
      expect(result.template).toBe('default');
    });

    test('should detect schema validation errors', async () => {
      validateTemplateConfig.mockReturnValue({
        valid: false,
        errors: [{ message: 'Missing required field' }]
      });

      fs.existsSync.mockReturnValue(true);
      https.get.mockImplementation((url, callback) => {
        callback({ statusCode: 200 });
        return { on: jest.fn().mockReturnThis() };
      });

      const result = await validateTemplate(mockTemplate);

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].type).toBe('schema');
      expect(result.errors[0].message).toBe('Missing required field');
    });

    test('should detect missing files', async () => {
      validateTemplateConfig.mockReturnValue({ valid: true, errors: null });

      // Mock file existence - first file exists, second doesn't
      fs.existsSync.mockImplementation((filePath) => {
        return filePath.includes('index.ts');
      });

      https.get.mockImplementation((url, callback) => {
        callback({ statusCode: 200 });
        return { on: jest.fn().mockReturnThis() };
      });

      const result = await validateTemplate(mockTemplate);

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].type).toBe('file');
      expect(result.errors[0].message).toBe('File not found: component.tsx');
    });

    test('should detect non-existent npm packages', async () => {
      validateTemplateConfig.mockReturnValue({ valid: true, errors: null });
      fs.existsSync.mockReturnValue(true);

      // Mock npm package existence - react exists, typescript doesn't
      https.get.mockImplementation((url, callback) => {
        const statusCode = url.includes('react') ? 200 : 404;
        callback({ statusCode });
        return { on: jest.fn().mockReturnThis() };
      });

      const result = await validateTemplate(mockTemplate);

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].type).toBe('package');
      expect(result.errors[0].message).toBe('Unknown npm package: typescript');
    });

    test('should handle templates with no files', async () => {
      const templateWithoutFiles = {
        ...mockTemplate,
        config: {
          ...mockTemplate.config,
          files: {}
        }
      };

      validateTemplateConfig.mockReturnValue({ valid: true, errors: null });
      https.get.mockImplementation((url, callback) => {
        callback({ statusCode: 200 });
        return { on: jest.fn().mockReturnThis() };
      });

      const result = await validateTemplate(templateWithoutFiles);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should handle templates with no packages', async () => {
      const templateWithoutPackages = {
        ...mockTemplate,
        config: {
          ...mockTemplate.config,
          packages: [],
          devPackages: []
        }
      };

      validateTemplateConfig.mockReturnValue({ valid: true, errors: null });
      fs.existsSync.mockReturnValue(true);

      const result = await validateTemplate(templateWithoutPackages);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should handle packages without names', async () => {
      const templateWithInvalidPackages = {
        ...mockTemplate,
        config: {
          ...mockTemplate.config,
          packages: [
            { name: 'react', version: '^18.0.0' },
            { version: '^5.0.0' }, // Missing name
            null, // Null package
            { name: '', version: '^1.0.0' } // Empty name
          ],
          devPackages: [] // Remove devPackages to test only the packages array
        }
      };

      validateTemplateConfig.mockReturnValue({ valid: true, errors: null });
      fs.existsSync.mockReturnValue(true);
      https.get.mockImplementation((url, callback) => {
        callback({ statusCode: 200 });
        return { on: jest.fn().mockReturnThis() };
      });

      const result = await validateTemplate(templateWithInvalidPackages);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      // Should only check the 'react' package (empty name packages are skipped)
      expect(https.get).toHaveBeenCalledTimes(1);
    });

    test('should accumulate multiple errors', async () => {
      validateTemplateConfig.mockReturnValue({
        valid: false,
        errors: [{ message: 'Schema error' }]
      });

      fs.existsSync.mockReturnValue(false); // All files missing

      https.get.mockImplementation((url, callback) => {
        callback({ statusCode: 404 }); // All packages missing
        return { on: jest.fn().mockReturnThis() };
      });

      const result = await validateTemplate(mockTemplate);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
      
      const errorTypes = result.errors.map(e => e.type);
      expect(errorTypes).toContain('schema');
      expect(errorTypes).toContain('file');
      expect(errorTypes).toContain('package');
    });

    test('should handle fs.existsSync errors gracefully', async () => {
      validateTemplateConfig.mockReturnValue({ valid: true, errors: null });

      // Mock fs.existsSync to throw an error
      fs.existsSync.mockImplementation(() => {
        throw new Error('File system error');
      });

      https.get.mockImplementation((url, callback) => {
        callback({ statusCode: 200 });
        return { on: jest.fn().mockReturnThis() };
      });

      const result = await validateTemplate(mockTemplate);

      // Should treat missing files as errors
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.type === 'file')).toBe(true);
    });
  });

  describe('validateAllTemplates', () => {
    const mockTemplates = [
      {
        sdk: 'supabase',
        template: 'default',
        path: '/path/to/supabase',
        config: {
          name: 'Supabase',
          description: 'Supabase template',
          packages: [{ name: 'react', version: '^18.0.0' }],
          files: { 'index.ts': 'src/index.ts' },
          envVars: []
        }
      },
      {
        sdk: 'vercel-ai',
        template: 'default',
        path: '/path/to/vercel-ai',
        config: {
          name: 'Vercel AI',
          description: 'Vercel AI template',
          packages: [{ name: 'non-existent-package', version: '^1.0.0' }],
          files: { 'missing.ts': 'src/missing.ts' },
          envVars: []
        }
      }
    ];

    beforeEach(() => {
      listTemplates.mockReturnValue(mockTemplates);
    });

    test('should validate all templates and return JSON results', async () => {
      validateTemplateConfig.mockReturnValue({ valid: true, errors: null });

      // First template: all files exist, packages exist
      // Second template: files missing, packages don't exist
      fs.existsSync.mockImplementation((filePath) => {
        return filePath.includes('supabase');
      });

      https.get.mockImplementation((url, callback) => {
        const statusCode = url.includes('react') ? 200 : 404;
        callback({ statusCode });
        return { on: jest.fn().mockReturnThis() };
      });

      const result = await validateAllTemplates({ json: true });

      expect(result.results).toHaveLength(2);
      expect(result.summary.valid).toBe(1);
      expect(result.summary.invalid).toBe(1);

      // First template should be valid
      expect(result.results[0].valid).toBe(true);
      expect(result.results[0].sdk).toBe('supabase');

      // Second template should be invalid
      expect(result.results[1].valid).toBe(false);
      expect(result.results[1].sdk).toBe('vercel-ai');
      expect(result.results[1].errors.length).toBeGreaterThan(0);
    });

    test('should validate all templates and print pretty results', async () => {
      validateTemplateConfig.mockReturnValue({ valid: true, errors: null });
      fs.existsSync.mockReturnValue(true);
      https.get.mockImplementation((url, callback) => {
        callback({ statusCode: 200 });
        return { on: jest.fn().mockReturnThis() };
      });

      const result = await validateAllTemplates({ json: false });

      expect(result.results).toHaveLength(2);
      expect(result.summary.valid).toBe(2);
      expect(result.summary.invalid).toBe(0);

      // Should have printed to console
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Template Validation Report')
      );
    });

    test('should show hidden templates', async () => {
      // Mock validateTemplateConfig to avoid undefined errors
      validateTemplateConfig.mockReturnValue({ valid: true, errors: null });
      fs.existsSync.mockReturnValue(true);
      https.get.mockImplementation((url, callback) => {
        callback({ statusCode: 200 });
        return { on: jest.fn().mockReturnThis() };
      });

      await validateAllTemplates();

      expect(listTemplates).toHaveBeenCalledWith({ showHidden: true });
    });

    test('should handle empty template list', async () => {
      listTemplates.mockReturnValue([]);

      const result = await validateAllTemplates({ json: true });

      expect(result.results).toHaveLength(0);
      expect(result.summary.valid).toBe(0);
      expect(result.summary.invalid).toBe(0);
    });

    test('should handle validation errors in pretty print mode', async () => {
      validateTemplateConfig.mockReturnValue({
        valid: false,
        errors: [{ message: 'Invalid config' }]
      });
      fs.existsSync.mockReturnValue(false);
      https.get.mockImplementation((url, callback) => {
        callback({ statusCode: 404 });
        return { on: jest.fn().mockReturnThis() };
      });

      const result = await validateAllTemplates({ json: false });

      expect(result.summary.valid).toBe(0);
      expect(result.summary.invalid).toBe(2);

      // Should print error details
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('[SCHEMA]')
      );
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('[FILE]')
      );
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('[PACKAGE]')
      );
    });

    test('should return correct structure for JSON mode', async () => {
      validateTemplateConfig.mockReturnValue({ valid: true, errors: null });
      fs.existsSync.mockReturnValue(true);
      https.get.mockImplementation((url, callback) => {
        callback({ statusCode: 200 });
        return { on: jest.fn().mockReturnThis() };
      });

      const result = await validateAllTemplates({ json: true });

      expect(result).toHaveProperty('results');
      expect(result).toHaveProperty('summary');
      expect(result.summary).toHaveProperty('valid');
      expect(result.summary).toHaveProperty('invalid');

      result.results.forEach(r => {
        expect(r).toHaveProperty('sdk');
        expect(r).toHaveProperty('template');
        expect(r).toHaveProperty('path');
        expect(r).toHaveProperty('valid');
        expect(r).toHaveProperty('errors');
      });
    });
  });
}); 