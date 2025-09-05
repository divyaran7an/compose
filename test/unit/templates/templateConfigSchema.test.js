const { validateTemplateConfig } = require('../../../lib/templateConfigSchema');

describe('Template Config Schema Validation', () => {
  describe('valid configurations', () => {
    test('should validate minimal valid config', () => {
      const config = {
        name: 'test-template',
        description: 'A test template',
        packages: [],
        envVars: [],
        files: {}
      };

      const { valid, errors } = validateTemplateConfig(config);
      expect(valid).toBe(true);
      expect(errors).toBeNull();
    });

    test('should validate complete valid config', () => {
      const config = {
        name: 'complete-template',
        description: 'A complete test template',
        packages: [
          { name: 'react', version: '^18.0.0' },
          { name: 'next', version: '^14.0.0' }
        ],
        devPackages: [
          { name: 'typescript', version: '^5.0.0' }
        ],
        envVars: [
          { name: 'API_KEY', description: 'API key for service', required: true },
          { name: 'DEBUG', description: 'Debug mode', required: false }
        ],
        files: {
          'index.ts': 'src/index.ts',
          'README.md': 'README.md'
        },
        tags: ['web', 'react'],
        visible: true
      };

      const { valid, errors } = validateTemplateConfig(config);
      expect(valid).toBe(true);
      expect(errors).toBeNull();
    });

    test('should apply default values', () => {
      const config = {
        name: 'test-template',
        description: 'A test template',
        packages: [],
        envVars: [],
        files: {}
      };

      // Create a copy to test defaults
      const configCopy = JSON.parse(JSON.stringify(config));
      const { valid, errors } = validateTemplateConfig(configCopy);
      
      expect(valid).toBe(true);
      expect(errors).toBeNull();
      
      // Check that defaults are applied to the copy
      expect(configCopy.devPackages).toEqual([]);
      expect(configCopy.tags).toEqual([]);
      expect(configCopy.visible).toBe(true);
    });
  });

  describe('invalid configurations', () => {
    test('should reject config missing required fields', () => {
      // Test with completely empty object first
      const emptyConfig = {};
      const emptyResult = validateTemplateConfig(JSON.parse(JSON.stringify(emptyConfig)));
      expect(emptyResult.valid).toBe(false);
      expect(emptyResult.errors).not.toBeNull();
      expect(emptyResult.errors.length).toBeGreaterThan(0);

      const configs = [
        // Missing name
        {
          description: 'A test template',
          packages: [],
          envVars: [],
          files: {}
        },
        // Missing description
        {
          name: 'test-template',
          packages: [],
          envVars: [],
          files: {}
        },
        // Missing packages
        {
          name: 'test-template',
          description: 'A test template',
          envVars: [],
          files: {}
        },
        // Missing files (envVars gets default value, so this should still fail)
        {
          name: 'test-template',
          description: 'A test template',
          packages: []
        }
      ];

      configs.forEach((config, index) => {
        // Create a copy to avoid mutation
        const configCopy = JSON.parse(JSON.stringify(config));
        const { valid, errors } = validateTemplateConfig(configCopy);
        if (valid) {
          console.log(`Config ${index} unexpectedly passed validation:`, config);
          console.log('Errors:', errors);
        }
        expect(valid).toBe(false);
        expect(errors).not.toBeNull();
        expect(errors.length).toBeGreaterThan(0);
      });
    });

    test('should reject config with invalid package structure', () => {
      const config = {
        name: 'test-template',
        description: 'A test template',
        packages: [
          { name: 'react' }, // missing version
          { version: '^18.0.0' }, // missing name
          { name: 'next', version: '^14.0.0', extra: 'field' } // extra field
        ],
        envVars: [],
        files: {}
      };

      const { valid, errors } = validateTemplateConfig(config);
      expect(valid).toBe(false);
      expect(errors).not.toBeNull();
    });

    test('should reject config with invalid envVar structure', () => {
      const config = {
        name: 'test-template',
        description: 'A test template',
        packages: [],
        envVars: [
          { name: 'API_KEY' }, // missing description and required
          { description: 'API key', required: true }, // missing name
          { name: 'DEBUG', description: 'Debug mode' } // missing required
        ],
        files: {}
      };

      const { valid, errors } = validateTemplateConfig(config);
      expect(valid).toBe(false);
      expect(errors).not.toBeNull();
    });

    test('should reject config with invalid field types', () => {
      const config = {
        name: 123, // should be string
        description: 'A test template',
        packages: 'not-an-array', // should be array
        envVars: [],
        files: 'not-an-object' // should be object
      };

      const { valid, errors } = validateTemplateConfig(config);
      expect(valid).toBe(false);
      expect(errors).not.toBeNull();
    });

    test('should reject config with additional properties', () => {
      const config = {
        name: 'test-template',
        description: 'A test template',
        packages: [],
        envVars: [],
        files: {},
        invalidField: 'should not be allowed'
      };

      const { valid, errors } = validateTemplateConfig(config);
      expect(valid).toBe(false);
      expect(errors).not.toBeNull();
      expect(errors.some(e => e.keyword === 'additionalProperties')).toBe(true);
    });
  });

  describe('edge cases', () => {
    test('should handle empty arrays and objects', () => {
      const config = {
        name: 'empty-template',
        description: 'Template with empty collections',
        packages: [],
        devPackages: [],
        envVars: [],
        files: {},
        tags: []
      };

      const { valid, errors } = validateTemplateConfig(config);
      expect(valid).toBe(true);
      expect(errors).toBeNull();
    });

    test('should validate files object with various patterns', () => {
      const config = {
        name: 'files-template',
        description: 'Template with various file patterns',
        packages: [],
        envVars: [],
        files: {
          'simple.txt': 'simple.txt',
          'path/to/file.js': 'src/path/to/file.js',
          '.env.example': '.env.example',
          'file-with-dashes.ts': 'lib/file-with-dashes.ts',
          'file_with_underscores.tsx': 'components/file_with_underscores.tsx'
        }
      };

      const { valid, errors } = validateTemplateConfig(config);
      expect(valid).toBe(true);
      expect(errors).toBeNull();
    });

    test('should validate boolean fields correctly', () => {
      const configs = [
        {
          name: 'visible-true',
          description: 'Template with visible true',
          packages: [],
          envVars: [],
          files: {},
          visible: true
        },
        {
          name: 'visible-false',
          description: 'Template with visible false',
          packages: [],
          envVars: [],
          files: {},
          visible: false
        }
      ];

      configs.forEach(config => {
        const { valid, errors } = validateTemplateConfig(config);
        expect(valid).toBe(true);
        expect(errors).toBeNull();
      });
    });

    test('should reject invalid boolean values', () => {
      const config = {
        name: 'invalid-boolean',
        description: 'Template with invalid boolean',
        packages: [],
        envVars: [
          { name: 'TEST', description: 'Test var', required: 'yes' } // should be boolean
        ],
        files: {},
        visible: 'true' // should be boolean
      };

      const { valid, errors } = validateTemplateConfig(config);
      expect(valid).toBe(false);
      expect(errors).not.toBeNull();
    });
  });

  describe('real template validation', () => {
    test('should validate actual supabase template config', () => {
      const config = {
        name: 'supabase',
        description: 'Supabase integration template with database schema, authentication, and Next.js example components.',
        packages: [
          { name: 'next', version: '^14.0.0' },
          { name: 'react', version: '^18.0.0' },
          { name: 'react-dom', version: '^18.0.0' },
          { name: '@supabase/supabase-js', version: '^2.39.5' }
        ],
        devPackages: [
          { name: 'typescript', version: '^5.0.0' },
          { name: '@types/react', version: '^18.0.0' },
          { name: '@types/node', version: '^18.0.0' }
        ],
        envVars: [
          { name: 'SUPABASE_URL', description: 'Your Supabase project URL', required: true },
          { name: 'SUPABASE_ANON_KEY', description: 'Your Supabase anon public key', required: true }
        ],
        files: {
          'example.tsx': 'src/pages/supabase-example.tsx',
          'auth-example.tsx': 'src/pages/supabase-auth.tsx',
          'README.md': 'README.md',
          'schema.sql': 'schema.sql'
        }
      };

      const { valid, errors } = validateTemplateConfig(config);
      expect(valid).toBe(true);
      expect(errors).toBeNull();
    });

    test('should validate actual vercel-ai template config', () => {
      const config = {
        name: 'Vercel AI Basic',
        description: 'A minimal starter with Vercel AI SDK integration.',
        packages: [
          { name: 'vercel-ai', version: '^1.0.0' }
        ],
        envVars: [
          { name: 'VERCEL_AI_KEY', description: 'API key for Vercel AI', required: true }
        ],
        files: {
          'README.md': 'README.md'
        }
      };

      const { valid, errors } = validateTemplateConfig(config);
      expect(valid).toBe(true);
      expect(errors).toBeNull();
    });
  });
}); 