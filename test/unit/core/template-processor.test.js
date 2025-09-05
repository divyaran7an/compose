const fs = require('fs-extra');
const path = require('path');
const { 
  TemplateConfigReader, 
  DependencyMerger,
  FileCopyManager,
  ConfigurationGenerator,
  templateConfigReader,
  dependencyMerger,
  fileCopyManager,
  configurationGenerator,
  readTemplateConfig,
  readSelectedTemplateConfigs,
  extractMetadataSummary,
  clearConfigCache,
  getConfigErrors,
  getConfigStatistics,
  mergeDependencies,
  getDependencyConflictReport,
  clearDependencyState,
  copyTemplateFiles,
  getCopyStatistics,
  clearCopyState,
  generateConfigurationFiles,
  getConfigurationStatistics,
  clearConfigurationState
} = require('../../../lib/template-processor');

describe('TemplateConfigReader', () => {
  let tempDir;
  let reader;

  beforeEach(async () => {
    // Create temporary directory for test templates
    tempDir = path.join(__dirname, 'temp-templates');
    await fs.ensureDir(tempDir);
    
    // Create fresh reader instance for each test
    reader = new TemplateConfigReader();
  });

  afterEach(async () => {
    // Clean up temporary directory
    await fs.remove(tempDir);
    
    // Clear singleton cache
    clearConfigCache();
  });

  describe('readTemplateConfig', () => {
    it('should read and validate a valid template configuration', async () => {
      // Create test template
      const templateDir = path.join(tempDir, 'test-sdk');
      await fs.ensureDir(templateDir);
      
      const config = {
        name: 'test-template',
        displayName: 'Test Template',
        description: 'A test template',
        packages: [
          { name: 'react', version: '^18.0.0' }
        ],
        envVars: [
          { name: 'TEST_VAR', description: 'Test variable' }
        ],
        files: {
          'test.tsx': 'src/pages/test.tsx'
        }
      };
      
      await fs.writeJson(path.join(templateDir, 'config.json'), config);
      await fs.writeFile(path.join(templateDir, 'test.tsx'), 'test content');

      const result = await reader.readTemplateConfig(templateDir, 'test-sdk', 'test-template');

      expect(result.name).toBe('test-template');
      expect(result.displayName).toBe('Test Template');
      expect(result._metadata).toBeDefined();
      expect(result._metadata.sdk).toBe('test-sdk');
      expect(result._metadata.templateName).toBe('test-template');
      expect(result._metadata.fileCount).toBe(1);
      expect(result._metadata.packageCount).toBe(1);
      expect(result._metadata.envVarCount).toBe(1);
    });

    it('should throw error for missing config file', async () => {
      const templateDir = path.join(tempDir, 'missing-config');
      await fs.ensureDir(templateDir);

      await expect(
        reader.readTemplateConfig(templateDir, 'test-sdk', 'missing')
      ).rejects.toThrow('Template configuration not found');
    });

    it('should throw error for invalid JSON', async () => {
      const templateDir = path.join(tempDir, 'invalid-json');
      await fs.ensureDir(templateDir);
      
      await fs.writeFile(path.join(templateDir, 'config.json'), '{ invalid json }');

      await expect(
        reader.readTemplateConfig(templateDir, 'test-sdk', 'invalid')
      ).rejects.toThrow('Invalid JSON in template config');
    });

    it('should throw error for invalid config structure', async () => {
      const templateDir = path.join(tempDir, 'invalid-structure');
      await fs.ensureDir(templateDir);
      
      const invalidConfig = {
        name: 'test',
        // Missing required fields
      };
      
      await fs.writeJson(path.join(templateDir, 'config.json'), invalidConfig);

      await expect(
        reader.readTemplateConfig(templateDir, 'test-sdk', 'invalid')
      ).rejects.toThrow('Template configuration validation failed');
    });

    it('should throw error for missing template files', async () => {
      const templateDir = path.join(tempDir, 'missing-files');
      await fs.ensureDir(templateDir);
      
      const config = {
        name: 'test-template',
        description: 'A test template',
        packages: [],
        envVars: [],
        files: {
          'missing.tsx': 'src/pages/missing.tsx'
        }
      };
      
      await fs.writeJson(path.join(templateDir, 'config.json'), config);

      await expect(
        reader.readTemplateConfig(templateDir, 'test-sdk', 'missing-files')
      ).rejects.toThrow('Template files not found: missing.tsx');
    });

    it('should cache configurations', async () => {
      const templateDir = path.join(tempDir, 'cache-test');
      await fs.ensureDir(templateDir);
      
      const config = {
        name: 'cache-test',
        description: 'Cache test template',
        packages: [],
        envVars: [],
        files: {}
      };
      
      await fs.writeJson(path.join(templateDir, 'config.json'), config);

      // First read
      const result1 = await reader.readTemplateConfig(templateDir, 'test-sdk', 'cache-test');
      
      // Second read should use cache
      const result2 = await reader.readTemplateConfig(templateDir, 'test-sdk', 'cache-test');
      
      expect(result1).toBe(result2); // Same object reference
      expect(reader.getCache().size).toBe(1);
    });
  });

  describe('readSelectedTemplateConfigs', () => {
    it('should read multiple template configurations', async () => {
      // Create two test templates
      const template1Dir = path.join(tempDir, 'template1');
      const template2Dir = path.join(tempDir, 'template2');
      
      await fs.ensureDir(template1Dir);
      await fs.ensureDir(template2Dir);
      
      const config1 = {
        name: 'template1',
        description: 'First template',
        packages: [],
        envVars: [],
        files: {}
      };
      
      const config2 = {
        name: 'template2',
        description: 'Second template',
        packages: [],
        envVars: [],
        files: {}
      };
      
      await fs.writeJson(path.join(template1Dir, 'config.json'), config1);
      await fs.writeJson(path.join(template2Dir, 'config.json'), config2);

      const selectedTemplates = [
        { path: template1Dir, sdk: 'sdk1', templateName: 'template1' },
        { path: template2Dir, sdk: 'sdk2', templateName: 'template2' }
      ];

      const results = await reader.readSelectedTemplateConfigs(selectedTemplates);

      expect(results).toHaveLength(2);
      expect(results[0].name).toBe('template1');
      expect(results[1].name).toBe('template2');
    });

    it('should handle errors gracefully and continue processing', async () => {
      const validTemplateDir = path.join(tempDir, 'valid');
      const invalidTemplateDir = path.join(tempDir, 'invalid');
      
      await fs.ensureDir(validTemplateDir);
      await fs.ensureDir(invalidTemplateDir);
      
      const validConfig = {
        name: 'valid',
        description: 'Valid template',
        packages: [],
        envVars: [],
        files: {}
      };
      
      await fs.writeJson(path.join(validTemplateDir, 'config.json'), validConfig);
      // Don't create config for invalid template

      const selectedTemplates = [
        { path: validTemplateDir, sdk: 'sdk1', templateName: 'valid' },
        { path: invalidTemplateDir, sdk: 'sdk2', templateName: 'invalid' }
      ];

      const results = await reader.readSelectedTemplateConfigs(selectedTemplates);

      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('valid');
      expect(reader.getErrors()).toHaveLength(1);
    });
  });

  describe('extractMetadataSummary', () => {
    it('should extract correct metadata summary', async () => {
      const configs = [
        {
          name: 'template1',
          _metadata: {
            sdk: 'sdk1',
            templateName: 'template1',
            fileCount: 2,
            packageCount: 3,
            envVarCount: 1
          }
        },
        {
          name: 'template2',
          displayName: 'Template 2',
          _metadata: {
            sdk: 'sdk1',
            templateName: 'template2',
            fileCount: 1,
            packageCount: 2,
            envVarCount: 2
          }
        },
        {
          name: 'template3',
          _metadata: {
            sdk: 'sdk2',
            templateName: 'template3',
            fileCount: 3,
            packageCount: 1,
            envVarCount: 0
          }
        }
      ];

      const summary = reader.extractMetadataSummary(configs);

      expect(summary.totalTemplates).toBe(3);
      expect(summary.sdks).toEqual(['sdk1', 'sdk2']);
      expect(summary.totalFiles).toBe(6);
      expect(summary.totalPackages).toBe(6);
      expect(summary.totalEnvVars).toBe(3);
      expect(summary.templatesBySDK.sdk1).toHaveLength(2);
      expect(summary.templatesBySDK.sdk2).toHaveLength(1);
    });
  });

  describe('singleton functions', () => {
    it('should work with singleton instance', async () => {
      const templateDir = path.join(tempDir, 'singleton-test');
      await fs.ensureDir(templateDir);
      
      const config = {
        name: 'singleton-test',
        description: 'Singleton test template',
        packages: [],
        envVars: [],
        files: {}
      };
      
      await fs.writeJson(path.join(templateDir, 'config.json'), config);

      const result = await readTemplateConfig(templateDir, 'test-sdk', 'singleton-test');
      
      expect(result.name).toBe('singleton-test');
      
      const stats = getConfigStatistics();
      expect(stats.cachedConfigs).toBe(1);
    });
  });

  describe('error handling and statistics', () => {
    it('should track errors and provide statistics', async () => {
      const invalidTemplateDir = path.join(tempDir, 'error-test');
      await fs.ensureDir(invalidTemplateDir);

      try {
        await reader.readTemplateConfig(invalidTemplateDir, 'test-sdk', 'error-test');
      } catch (error) {
        // Expected to fail
      }

      const errors = reader.getErrors();
      expect(errors).toHaveLength(1);
      expect(errors[0].sdk).toBe('test-sdk');
      expect(errors[0].templateName).toBe('error-test');

      const stats = reader.getStatistics();
      expect(stats.totalErrors).toBe(1);
      expect(stats.errorsBySDK['test-sdk']).toBe(1);
    });

    it('should clear cache and errors', () => {
      reader.cache.set('test', {});
      reader.errors.push({ test: 'error' });

      reader.clearCache();

      expect(reader.getCache().size).toBe(0);
      expect(reader.getErrors()).toHaveLength(0);
    });
  });
});

describe('Integration with real templates', () => {
  it('should read actual template configurations', async () => {
    const templatesDir = path.join(__dirname, '../templates');
    
    // Test with supabase template if it exists
    const supabaseDir = path.join(templatesDir, 'supabase');
    
    if (await fs.pathExists(supabaseDir)) {
      const config = await readTemplateConfig(supabaseDir, 'supabase', 'default');
      
      expect(config.name).toBe('supabase');
      expect(config._metadata).toBeDefined();
      expect(config._metadata.sdk).toBe('supabase');
      expect(config.packages).toBeDefined();
      expect(config.envVars).toBeDefined();
      expect(config.files).toBeDefined();
    }
  });
});

describe('DependencyMerger', () => {
  let merger;

  beforeEach(() => {
    merger = new DependencyMerger();
  });

  afterEach(() => {
    clearDependencyState();
  });

  describe('mergeDependencies', () => {
    it('should merge dependencies without conflicts', () => {
      const templateConfigs = [
        {
          _metadata: { sdk: 'template1', templateName: 'default' },
          packages: [
            { name: 'react', version: '^18.0.0' },
            { name: 'lodash', version: '^4.17.21' }
          ],
          devPackages: [
            { name: 'jest', version: '^29.0.0' }
          ]
        },
        {
          _metadata: { sdk: 'template2', templateName: 'default' },
          packages: [
            { name: 'axios', version: '^1.0.0' },
            { name: 'moment', version: '^2.29.0' }
          ],
          devPackages: [
            { name: 'eslint', version: '^8.0.0' }
          ]
        }
      ];

      const result = merger.mergeDependencies(templateConfigs);

      expect(result.dependencies).toEqual({
        react: '^18.0.0',
        lodash: '^4.17.21',
        axios: '^1.0.0',
        moment: '^2.29.0'
      });

      expect(result.devDependencies).toEqual({
        jest: '^29.0.0',
        eslint: '^8.0.0'
      });

      expect(result.conflicts).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
      expect(result.summary.totalPackages).toBe(6);
    });

    it('should resolve version conflicts using highest strategy', () => {
      merger.setStrategy('highest');

      const templateConfigs = [
        {
          _metadata: { sdk: 'template1', templateName: 'default' },
          packages: [
            { name: 'react', version: '^17.0.0' },
            { name: 'lodash', version: '^4.17.20' }
          ]
        },
        {
          _metadata: { sdk: 'template2', templateName: 'default' },
          packages: [
            { name: 'react', version: '^18.0.0' },
            { name: 'lodash', version: '^4.17.21' }
          ]
        }
      ];

      const result = merger.mergeDependencies(templateConfigs);

      expect(result.dependencies.react).toBe('^18.0.0');
      expect(result.dependencies.lodash).toBe('^4.17.21');
      expect(result.conflicts).toHaveLength(2);
      expect(result.conflicts[0].package).toBe('react');
      expect(result.conflicts[0].resolution).toBe('^18.0.0');
      expect(result.conflicts[0].strategy).toBe('highest');
    });

    it('should resolve version conflicts using lowest strategy', () => {
      merger.setStrategy('lowest');

      const templateConfigs = [
        {
          _metadata: { sdk: 'template1', templateName: 'default' },
          packages: [
            { name: 'react', version: '^17.0.0' },
            { name: 'lodash', version: '^4.17.21' }
          ]
        },
        {
          _metadata: { sdk: 'template2', templateName: 'default' },
          packages: [
            { name: 'react', version: '^18.0.0' },
            { name: 'lodash', version: '^4.17.20' }
          ]
        }
      ];

      const result = merger.mergeDependencies(templateConfigs);

      expect(result.dependencies.react).toBe('^17.0.0');
      expect(result.dependencies.lodash).toBe('^4.17.20');
      expect(result.conflicts).toHaveLength(2);
    });

    it('should handle compatible version strategy', () => {
      merger.setStrategy('compatible');

      const templateConfigs = [
        {
          _metadata: { sdk: 'template1', templateName: 'default' },
          packages: [
            { name: 'react', version: '^18.0.0' },
            { name: 'lodash', version: '~4.17.20' }
          ]
        },
        {
          _metadata: { sdk: 'template2', templateName: 'default' },
          packages: [
            { name: 'react', version: '^18.2.0' },
            { name: 'lodash', version: '~4.17.21' }
          ]
        }
      ];

      const result = merger.mergeDependencies(templateConfigs);

      expect(result.dependencies.react).toBe('^18.2.0');
      expect(result.dependencies.lodash).toBe('~4.17.21');
      expect(result.conflicts).toHaveLength(2);
    });

    it('should handle incompatible versions gracefully', () => {
      const templateConfigs = [
        {
          _metadata: { sdk: 'template1', templateName: 'default' },
          packages: [
            { name: 'react', version: '^16.0.0' }
          ]
        },
        {
          _metadata: { sdk: 'template2', templateName: 'default' },
          packages: [
            { name: 'react', version: '^18.0.0' }
          ]
        }
      ];

      const result = merger.mergeDependencies(templateConfigs);

      expect(result.dependencies.react).toBe('^18.0.0'); // highest strategy default
      expect(result.conflicts).toHaveLength(1);
      expect(result.conflicts[0].package).toBe('react');
    });

    it('should handle invalid semver versions', () => {
      const templateConfigs = [
        {
          _metadata: { sdk: 'template1', templateName: 'default' },
          packages: [
            { name: 'invalid-package', version: 'not-a-version' }
          ]
        },
        {
          _metadata: { sdk: 'template2', templateName: 'default' },
          packages: [
            { name: 'invalid-package', version: 'also-not-a-version' }
          ]
        }
      ];

      const result = merger.mergeDependencies(templateConfigs);

      expect(result.dependencies['invalid-package']).toBeDefined();
      expect(result.conflicts).toHaveLength(1);
      expect(result.conflicts[0].error).toContain('Invalid semver versions');
      expect(result.warnings).toHaveLength(1);
    });

    it('should handle manual strategy by throwing errors', () => {
      merger.setStrategy('manual');

      const templateConfigs = [
        {
          _metadata: { sdk: 'template1', templateName: 'default' },
          packages: [
            { name: 'react', version: '^17.0.0' }
          ]
        },
        {
          _metadata: { sdk: 'template2', templateName: 'default' },
          packages: [
            { name: 'react', version: '^18.0.0' }
          ]
        }
      ];

      const result = merger.mergeDependencies(templateConfigs);

      expect(result.conflicts).toHaveLength(1);
      expect(result.conflicts[0].error).toContain('Manual resolution required');
      expect(result.warnings).toHaveLength(1);
    });

    it('should merge same versions without conflicts', () => {
      const templateConfigs = [
        {
          _metadata: { sdk: 'template1', templateName: 'default' },
          packages: [
            { name: 'react', version: '^18.0.0' }
          ]
        },
        {
          _metadata: { sdk: 'template2', templateName: 'default' },
          packages: [
            { name: 'react', version: '^18.0.0' }
          ]
        }
      ];

      const result = merger.mergeDependencies(templateConfigs);

      expect(result.dependencies.react).toBe('^18.0.0');
      expect(result.conflicts).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });
  });

  describe('strategy management', () => {
    it('should set and validate strategies', () => {
      expect(() => merger.setStrategy('smart')).not.toThrow();
      expect(() => merger.setStrategy('highest')).not.toThrow();
      expect(() => merger.setStrategy('lowest')).not.toThrow();
      expect(() => merger.setStrategy('compatible')).not.toThrow();
      expect(() => merger.setStrategy('manual')).not.toThrow();
      
      expect(() => merger.setStrategy('invalid')).toThrow('Invalid strategy');
    });

    it('should use default strategy', () => {
      expect(merger.strategy).toBe('smart');
    });
  });

  describe('conflict reporting', () => {
    it('should provide detailed conflict reports', () => {
      const templateConfigs = [
        {
          _metadata: { sdk: 'template1', templateName: 'default' },
          packages: [
            { name: 'react', version: '^17.0.0' },
            { name: 'lodash', version: '^4.17.20' }
          ]
        },
        {
          _metadata: { sdk: 'template2', templateName: 'default' },
          packages: [
            { name: 'react', version: '^18.0.0' },
            { name: 'lodash', version: '^4.17.21' }
          ]
        }
      ];

      merger.mergeDependencies(templateConfigs);
      const report = merger.getConflictReport();

      expect(report.conflicts).toHaveLength(2);
      expect(report.summary.totalConflicts).toBe(2);
      expect(report.summary.resolvedConflicts).toBe(2);
      expect(report.summary.unresolvedConflicts).toBe(0);
    });

    it('should clear state', () => {
      merger.conflicts = [{ test: 'conflict' }];
      merger.warnings = [{ test: 'warning' }];

      merger.clearState();

      expect(merger.conflicts).toHaveLength(0);
      expect(merger.warnings).toHaveLength(0);
    });
  });

  describe('singleton functions', () => {
    it('should work with singleton merger', async () => {
      const templateConfigs = [
        {
          _metadata: { sdk: 'template1', templateName: 'default' },
          packages: [
            { name: 'react', version: '^18.0.0' }
          ]
        }
      ];

      const result = await mergeDependencies(templateConfigs);

      expect(result.dependencies.react).toBe('^18.0.0');
      expect(result.summary.totalTemplates).toBe(1);
    });

    it('should work with strategy parameter', async () => {
      const templateConfigs = [
        {
          _metadata: { sdk: 'template1', templateName: 'default' },
          packages: [
            { name: 'react', version: '^17.0.0' }
          ]
        },
        {
          _metadata: { sdk: 'template2', templateName: 'default' },
          packages: [
            { name: 'react', version: '^18.0.0' }
          ]
        }
      ];

      const result = await mergeDependencies(templateConfigs, 'lowest');

      expect(result.dependencies.react).toBe('^17.0.0');
      expect(result.conflicts[0].strategy).toBe('lowest');
    });
  });
});

describe('Integration: Config Reader + Dependency Merger', () => {
  it('should work together with real template configurations', async () => {
    const templatesDir = path.join(__dirname, '../templates');
    const supabaseDir = path.join(templatesDir, 'supabase');
    const vercelAiDir = path.join(templatesDir, 'vercel-ai');

    if (await fs.pathExists(supabaseDir) && await fs.pathExists(vercelAiDir)) {
      // Read template configurations
      const supabaseConfig = await readTemplateConfig(supabaseDir, 'supabase', 'default');
      const vercelAiConfig = await readTemplateConfig(vercelAiDir, 'vercel-ai', 'default');

      // Merge dependencies
      const dependencyResult = await mergeDependencies([supabaseConfig, vercelAiConfig], 'highest');

      expect(dependencyResult.dependencies).toBeDefined();
      expect(dependencyResult.devDependencies).toBeDefined();
      expect(dependencyResult.summary.totalTemplates).toBe(2);
      expect(dependencyResult.summary.totalPackages).toBeGreaterThan(0);

      // Should have common packages like react, next
      expect(dependencyResult.dependencies.react).toBeDefined();
      expect(dependencyResult.dependencies.next).toBeDefined();
    }
  });
});

describe('FileCopyManager', () => {
  let copyManager;
  let tempDir;
  let sourceDir;
  let targetDir;

  beforeEach(async () => {
    copyManager = new FileCopyManager();
    
    // Create temporary directories
    tempDir = path.join(__dirname, 'temp-copy-test');
    sourceDir = path.join(tempDir, 'source');
    targetDir = path.join(tempDir, 'target');
    
    await fs.ensureDir(sourceDir);
    await fs.ensureDir(targetDir);
  });

  afterEach(async () => {
    // Clean up temporary directories
    await fs.remove(tempDir);
    clearCopyState();
  });

  describe('copyTemplateFiles', () => {
    it('should copy files from template configurations', async () => {
      // Create test files
      await fs.writeFile(path.join(sourceDir, 'test.txt'), 'Hello World');
      await fs.writeFile(path.join(sourceDir, 'config.json'), '{"name": "test"}');
      
      const templateConfigs = [{
        _metadata: { templatePath: sourceDir, sdk: 'test', templateName: 'default' },
        files: {
          'test.txt': 'output.txt',
          'config.json': 'config/app.json'
        }
      }];

      const result = await copyManager.copyTemplateFiles(templateConfigs, targetDir);

      expect(result.summary.copiedCount).toBe(2);
      expect(result.summary.errorCount).toBe(0);
      expect(await fs.pathExists(path.join(targetDir, 'output.txt'))).toBe(true);
      expect(await fs.pathExists(path.join(targetDir, 'config/app.json'))).toBe(true);
      
      const content = await fs.readFile(path.join(targetDir, 'output.txt'), 'utf8');
      expect(content).toBe('Hello World');
    });

    it('should substitute template variables', async () => {
      const templateContent = 'Project: {{projectName}}\nAuthor: {{author}}\nVersion: {{version}}';
      await fs.writeFile(path.join(sourceDir, 'template.txt'), templateContent);
      
      const templateConfigs = [{
        _metadata: { templatePath: sourceDir, sdk: 'test', templateName: 'default' },
        files: {
          'template.txt': 'output.txt'
        }
      }];

      const variables = {
        projectName: 'My Project',
        author: 'John Doe',
        version: '1.0.0'
      };

      const result = await copyManager.copyTemplateFiles(templateConfigs, targetDir, { variables });

      expect(result.summary.copiedCount).toBe(1);
      
      const content = await fs.readFile(path.join(targetDir, 'output.txt'), 'utf8');
      expect(content).toBe('Project: My Project\nAuthor: John Doe\nVersion: 1.0.0');
      expect(result.copiedFiles[0].substituted).toBe(true);
    });

    it('should substitute variables in file paths', async () => {
      await fs.writeFile(path.join(sourceDir, 'component.tsx'), 'export const Component = () => <div>{{projectName}}</div>;');
      
      const templateConfigs = [{
        _metadata: { templatePath: sourceDir, sdk: 'test', templateName: 'default' },
        files: {
          'component.tsx': 'src/components/{{componentName}}.tsx'
        }
      }];

      const variables = {
        projectName: 'MyApp',
        componentName: 'Header'
      };

      const result = await copyManager.copyTemplateFiles(templateConfigs, targetDir, { variables });

      expect(result.summary.copiedCount).toBe(1);
      expect(await fs.pathExists(path.join(targetDir, 'src/components/Header.tsx'))).toBe(true);
      
      const content = await fs.readFile(path.join(targetDir, 'src/components/Header.tsx'), 'utf8');
      expect(content).toBe('export const Component = () => <div>MyApp</div>;');
    });

    it('should handle binary files correctly', async () => {
      // Create a simple binary file with null bytes (clearly binary)
      const binaryData = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D]);
      await fs.writeFile(path.join(sourceDir, 'image.png'), binaryData);
      
      const templateConfigs = [{
        _metadata: { templatePath: sourceDir, sdk: 'test', templateName: 'default' },
        files: {
          'image.png': 'assets/logo.png'
        }
      }];

      const result = await copyManager.copyTemplateFiles(templateConfigs, targetDir);

      expect(result.summary.copiedCount).toBe(1);
      expect(await fs.pathExists(path.join(targetDir, 'assets/logo.png'))).toBe(true);
      
      const copiedData = await fs.readFile(path.join(targetDir, 'assets/logo.png'));
      expect(copiedData).toEqual(binaryData);
    });

    it('should handle file conflicts with overwrite strategy', async () => {
      // Create source file
      await fs.writeFile(path.join(sourceDir, 'test.txt'), 'New content');
      
      // Create existing target file
      await fs.ensureDir(path.join(targetDir, 'existing'));
      await fs.writeFile(path.join(targetDir, 'existing/file.txt'), 'Old content');
      
      const templateConfigs = [{
        _metadata: { templatePath: sourceDir, sdk: 'test', templateName: 'default' },
        files: {
          'test.txt': 'existing/file.txt'
        }
      }];

      copyManager.setConflictStrategy('overwrite');
      const result = await copyManager.copyTemplateFiles(templateConfigs, targetDir);

      expect(result.summary.copiedCount).toBe(1);
      expect(result.conflicts).toHaveLength(1);
      expect(result.conflicts[0].strategy).toBe('overwrite');
      
      const content = await fs.readFile(path.join(targetDir, 'existing/file.txt'), 'utf8');
      expect(content).toBe('New content');
    });

    it('should handle file conflicts with skip strategy', async () => {
      // Create source file
      await fs.writeFile(path.join(sourceDir, 'test.txt'), 'New content');
      
      // Create existing target file
      await fs.ensureDir(path.join(targetDir, 'existing'));
      await fs.writeFile(path.join(targetDir, 'existing/file.txt'), 'Old content');
      
      const templateConfigs = [{
        _metadata: { templatePath: sourceDir, sdk: 'test', templateName: 'default' },
        files: {
          'test.txt': 'existing/file.txt'
        }
      }];

      copyManager.setConflictStrategy('skip');
      const result = await copyManager.copyTemplateFiles(templateConfigs, targetDir);

      expect(result.summary.copiedCount).toBe(0);
      expect(result.summary.skippedCount).toBe(1);
      expect(result.conflicts).toHaveLength(1);
      expect(result.skippedFiles[0].reason).toBe('file_exists');
      
      const content = await fs.readFile(path.join(targetDir, 'existing/file.txt'), 'utf8');
      expect(content).toBe('Old content');
    });

    it('should handle missing source files gracefully', async () => {
      const templateConfigs = [{
        _metadata: { templatePath: sourceDir, sdk: 'test', templateName: 'default' },
        files: {
          'nonexistent.txt': 'output.txt'
        }
      }];

      const result = await copyManager.copyTemplateFiles(templateConfigs, targetDir);

      expect(result.summary.copiedCount).toBe(0);
      expect(result.summary.errorCount).toBe(1);
      expect(result.errors[0].type).toBe('copy_error');
      expect(result.errors[0].error).toContain('Source file not found');
    });

    it('should preserve file permissions', async () => {
      // Create executable file
      await fs.writeFile(path.join(sourceDir, 'script.sh'), '#!/bin/bash\necho "Hello"');
      await fs.chmod(path.join(sourceDir, 'script.sh'), 0o755);
      
      const templateConfigs = [{
        _metadata: { templatePath: sourceDir, sdk: 'test', templateName: 'default' },
        files: {
          'script.sh': 'bin/script.sh'
        }
      }];

      const result = await copyManager.copyTemplateFiles(templateConfigs, targetDir);

      expect(result.summary.copiedCount).toBe(1);
      
      const stats = await fs.stat(path.join(targetDir, 'bin/script.sh'));
      expect(stats.mode & 0o777).toBe(0o755);
    });

    it('should handle multiple templates with file conflicts', async () => {
      // Create files in different template directories
      const template1Dir = path.join(sourceDir, 'template1');
      const template2Dir = path.join(sourceDir, 'template2');
      
      await fs.ensureDir(template1Dir);
      await fs.ensureDir(template2Dir);
      
      await fs.writeFile(path.join(template1Dir, 'shared.txt'), 'Template 1 content');
      await fs.writeFile(path.join(template2Dir, 'shared.txt'), 'Template 2 content');
      
      const templateConfigs = [
        {
          _metadata: { templatePath: template1Dir, sdk: 'template1', templateName: 'default' },
          files: { 'shared.txt': 'shared.txt' }
        },
        {
          _metadata: { templatePath: template2Dir, sdk: 'template2', templateName: 'default' },
          files: { 'shared.txt': 'shared.txt' }
        }
      ];

      const result = await copyManager.copyTemplateFiles(templateConfigs, targetDir);

      expect(result.summary.copiedCount).toBe(2);
      expect(result.conflicts).toHaveLength(1);
      
      // Second template should overwrite first
      const content = await fs.readFile(path.join(targetDir, 'shared.txt'), 'utf8');
      expect(content).toBe('Template 2 content');
    });
  });

  describe('conflict strategies', () => {
    it('should validate conflict strategies', () => {
      expect(() => copyManager.setConflictStrategy('overwrite')).not.toThrow();
      expect(() => copyManager.setConflictStrategy('skip')).not.toThrow();
      expect(() => copyManager.setConflictStrategy('merge')).not.toThrow();
      
      expect(() => copyManager.setConflictStrategy('invalid')).toThrow('Invalid conflict strategy');
    });

    it('should use default overwrite strategy', () => {
      expect(copyManager.conflictStrategy).toBe('overwrite');
    });
  });

  describe('variable management', () => {
    it('should set and use template variables', async () => {
      copyManager.setVariables({ projectName: 'Test Project', version: '2.0.0' });
      
      await fs.writeFile(path.join(sourceDir, 'template.txt'), '{{projectName}} v{{version}}');
      
      const templateConfigs = [{
        _metadata: { templatePath: sourceDir, sdk: 'test', templateName: 'default' },
        files: { 'template.txt': 'output.txt' }
      }];

      const result = await copyManager.copyTemplateFiles(templateConfigs, targetDir);

      const content = await fs.readFile(path.join(targetDir, 'output.txt'), 'utf8');
      expect(content).toBe('Test Project v2.0.0');
    });

    it('should merge variables from options', async () => {
      copyManager.setVariables({ projectName: 'Base Project' });
      
      await fs.writeFile(path.join(sourceDir, 'template.txt'), '{{projectName}} by {{author}}');
      
      const templateConfigs = [{
        _metadata: { templatePath: sourceDir, sdk: 'test', templateName: 'default' },
        files: { 'template.txt': 'output.txt' }
      }];

      const result = await copyManager.copyTemplateFiles(templateConfigs, targetDir, {
        variables: { author: 'Jane Doe' }
      });

      const content = await fs.readFile(path.join(targetDir, 'output.txt'), 'utf8');
      expect(content).toBe('Base Project by Jane Doe');
    });

    it('should leave unmatched variables unchanged', async () => {
      await fs.writeFile(path.join(sourceDir, 'template.txt'), '{{projectName}} {{unknownVar}}');
      
      const templateConfigs = [{
        _metadata: { templatePath: sourceDir, sdk: 'test', templateName: 'default' },
        files: { 'template.txt': 'output.txt' }
      }];

      const result = await copyManager.copyTemplateFiles(templateConfigs, targetDir, {
        variables: { projectName: 'Test' }
      });

      const content = await fs.readFile(path.join(targetDir, 'output.txt'), 'utf8');
      expect(content).toBe('Test {{unknownVar}}');
    });
  });

  describe('statistics and reporting', () => {
    it('should provide copy statistics', async () => {
      await fs.writeFile(path.join(sourceDir, 'file1.txt'), 'content1');
      await fs.writeFile(path.join(sourceDir, 'file2.txt'), 'content2');
      
      const templateConfigs = [{
        _metadata: { templatePath: sourceDir, sdk: 'test', templateName: 'default' },
        files: {
          'file1.txt': 'output1.txt',
          'file2.txt': 'output2.txt'
        }
      }];

      await copyManager.copyTemplateFiles(templateConfigs, targetDir);
      const stats = copyManager.getStatistics();

      expect(stats.totalFiles).toBe(2);
      expect(stats.copiedFiles).toBe(2);
      expect(stats.skippedFiles).toBe(0);
      expect(stats.errors).toBe(0);
      expect(stats.copyLog).toHaveLength(2);
    });

    it('should clear copy state', async () => {
      copyManager.copyLog = [{ test: 'data' }];
      copyManager.errors = [{ test: 'error' }];
      copyManager.skippedFiles = [{ test: 'skipped' }];

      copyManager.clearState();

      expect(copyManager.copyLog).toHaveLength(0);
      expect(copyManager.errors).toHaveLength(0);
      expect(copyManager.skippedFiles).toHaveLength(0);
    });
  });

  describe('singleton functions', () => {
    it('should work with singleton copy manager', async () => {
      await fs.writeFile(path.join(sourceDir, 'test.txt'), 'singleton test');
      
      const templateConfigs = [{
        _metadata: { templatePath: sourceDir, sdk: 'test', templateName: 'default' },
        files: { 'test.txt': 'output.txt' }
      }];

      const result = await copyTemplateFiles(templateConfigs, targetDir);

      expect(result.summary.copiedCount).toBe(1);
      expect(await fs.pathExists(path.join(targetDir, 'output.txt'))).toBe(true);
    });

    it('should provide singleton statistics', async () => {
      const stats = getCopyStatistics();
      expect(stats).toBeDefined();
      expect(typeof stats.totalFiles).toBe('number');
    });
  });
});

describe('Integration: Full Template Processing Pipeline', () => {
  let tempDir;
  let sourceDir;
  let targetDir;

  beforeEach(async () => {
    tempDir = path.join(__dirname, 'temp-integration-test');
    sourceDir = path.join(tempDir, 'templates');
    targetDir = path.join(tempDir, 'project');
    
    await fs.ensureDir(sourceDir);
    await fs.ensureDir(targetDir);
  });

  afterEach(async () => {
    await fs.remove(tempDir);
    clearConfigCache();
    clearDependencyState();
    clearCopyState();
  });

  it('should process complete template pipeline: config -> dependencies -> files', async () => {
    // Create mock template structure
    const template1Dir = path.join(sourceDir, 'template1');
    const template2Dir = path.join(sourceDir, 'template2');
    
    await fs.ensureDir(template1Dir);
    await fs.ensureDir(template2Dir);
    
    // Template 1 config and files
    const template1Config = {
      name: 'template1',
      description: 'First template',
      packages: [
        { name: 'react', version: '^18.0.0' },
        { name: 'lodash', version: '^4.17.21' }
      ],
      files: {
        'component.tsx': 'src/components/{{componentName}}.tsx',
        'README.md': 'README.md'
      }
    };
    
    await fs.writeFile(path.join(template1Dir, 'config.json'), JSON.stringify(template1Config, null, 2));
    await fs.writeFile(path.join(template1Dir, 'component.tsx'), 'export const {{componentName}} = () => <div>{{projectName}}</div>;');
    await fs.writeFile(path.join(template1Dir, 'README.md'), '# {{projectName}}\n\nTemplate 1 project');
    
    // Template 2 config and files
    const template2Config = {
      name: 'template2',
      description: 'Second template',
      packages: [
        { name: 'react', version: '^17.0.0' },
        { name: 'axios', version: '^1.0.0' }
      ],
      devPackages: [
        { name: 'typescript', version: '^4.9.0' }
      ],
      files: {
        'utils.ts': 'src/utils/{{utilsName}}.ts',
        'package.json': 'package.json'
      }
    };
    
    await fs.writeFile(path.join(template2Dir, 'config.json'), JSON.stringify(template2Config, null, 2));
    await fs.writeFile(path.join(template2Dir, 'utils.ts'), 'export const {{utilsName}} = "{{projectName}}";');
    await fs.writeFile(path.join(template2Dir, 'package.json'), '{\n  "name": "{{projectName}}",\n  "version": "1.0.0"\n}');
    
    // Step 1: Read template configurations
    const config1 = await readTemplateConfig(template1Dir, 'template1', 'default');
    const config2 = await readTemplateConfig(template2Dir, 'template2', 'default');
    
    expect(config1.name).toBe('template1');
    expect(config2.name).toBe('template2');
    
    // Step 2: Merge dependencies
    const dependencyResult = await mergeDependencies([config1, config2], 'highest');
    
    expect(dependencyResult.dependencies.react).toBe('^18.0.0'); // highest version
    expect(dependencyResult.dependencies.lodash).toBe('^4.17.21');
    expect(dependencyResult.dependencies.axios).toBe('^1.0.0');
    expect(dependencyResult.devDependencies.typescript).toBe('^4.9.0');
    expect(dependencyResult.conflicts).toHaveLength(1); // react version conflict
    
    // Step 3: Copy template files
    const variables = {
      projectName: 'MyAwesomeProject',
      componentName: 'Header',
      utilsName: 'helpers'
    };
    
    const copyResult = await copyTemplateFiles([config1, config2], targetDir, { variables });
    
    expect(copyResult.summary.copiedCount).toBe(4);
    expect(copyResult.conflicts).toHaveLength(0); // no file conflicts
    
    // Verify file contents
    const componentContent = await fs.readFile(path.join(targetDir, 'src/components/Header.tsx'), 'utf8');
    expect(componentContent).toBe('export const Header = () => <div>MyAwesomeProject</div>;');
    
    const utilsContent = await fs.readFile(path.join(targetDir, 'src/utils/helpers.ts'), 'utf8');
    expect(utilsContent).toBe('export const helpers = "MyAwesomeProject";');
    
    const packageContent = await fs.readFile(path.join(targetDir, 'package.json'), 'utf8');
    expect(packageContent).toContain('"name": "MyAwesomeProject"');
    
    const readmeContent = await fs.readFile(path.join(targetDir, 'README.md'), 'utf8');
    expect(readmeContent).toBe('# MyAwesomeProject\n\nTemplate 1 project');
    
    // Verify directory structure
    expect(await fs.pathExists(path.join(targetDir, 'src/components'))).toBe(true);
    expect(await fs.pathExists(path.join(targetDir, 'src/utils'))).toBe(true);
  });
});

describe('ConfigurationGenerator', () => {
  let generator;
  let tempDir;
  let targetDir;

  beforeEach(async () => {
    generator = new ConfigurationGenerator({
      projectName: 'Test Project',
      projectDescription: 'A test project for configuration generation',
      author: 'Test Author'
    });
    
    // Create temporary directories
    tempDir = path.join(__dirname, 'temp-config-test');
    targetDir = path.join(tempDir, 'target');
    
    await fs.ensureDir(targetDir);
  });

  afterEach(async () => {
    // Clean up temporary directories
    await fs.remove(tempDir);
    clearConfigurationState();
  });

  describe('generateConfigurationFiles', () => {
    it('should generate .env.example and setup.md files', async () => {
      const templateConfigs = [
        {
          _metadata: { sdk: 'supabase', templateName: 'default' },
          name: 'supabase-template',
          description: 'Supabase integration',
          envVars: [
            { name: 'SUPABASE_URL', example: 'https://your-project.supabase.co', description: 'Supabase project URL', required: true },
            { name: 'SUPABASE_ANON_KEY', example: 'your-anon-key', description: 'Supabase anonymous key', required: true }
          ],
          setup: 'Create a Supabase project and configure authentication',
          installation: 'npm install @supabase/supabase-js',
          configuration: 'Configure your Supabase project settings',
          usage: 'Use Supabase for authentication and database operations',
          troubleshooting: 'Check your Supabase project settings if authentication fails'
        },
        {
          _metadata: { sdk: 'vercel-ai', templateName: 'chat' },
          name: 'vercel-ai-template',
          description: 'Vercel AI SDK integration',
          envVars: [
            { name: 'OPENAI_API_KEY', example: 'sk-...', description: 'OpenAI API key', required: true },
            { name: 'AI_MODEL', example: 'gpt-3.5-turbo', description: 'AI model to use', required: false }
          ],
          examples: [
            {
              title: 'Basic Chat',
              description: 'Simple chat implementation',
              language: 'javascript',
              code: 'const { openai } = require("ai/openai");\n\nconst response = await openai.chat.completions.create({...});'
            }
          ]
        }
      ];

      const result = await generator.generateConfigurationFiles(templateConfigs, targetDir);

      expect(result.summary.templatesProcessed).toBe(2);
      expect(result.summary.envVariables).toBe(4); // 4 unique env variables (2 from each template)
      expect(result.generatedFiles).toHaveLength(2);
      expect(result.errors).toHaveLength(0);

      // Check .env.example file
      expect(await fs.pathExists(path.join(targetDir, '.env.example'))).toBe(true);
      const envContent = await fs.readFile(path.join(targetDir, '.env.example'), 'utf8');
      expect(envContent).toContain('SUPABASE_URL=https://your-project.supabase.co');
      expect(envContent).toContain('OPENAI_API_KEY=sk-...');
      expect(envContent).toContain('# Supabase project URL');
      expect(envContent).toContain('# supabase/default Configuration');
      expect(envContent).toContain('# vercel-ai/chat Configuration');

      // Check setup.md file
      expect(await fs.pathExists(path.join(targetDir, 'setup.md'))).toBe(true);
      const setupContent = await fs.readFile(path.join(targetDir, 'setup.md'), 'utf8');
      expect(setupContent).toContain('# Test Project Setup Guide');
      expect(setupContent).toContain('## Supabase Setup');
      expect(setupContent).toContain('## Vercel-ai Setup');
      expect(setupContent).toContain('Create a Supabase project');
      expect(setupContent).toContain('Basic Chat');
    });

    it('should handle environment variable conflicts', async () => {
      const templateConfigs = [
        {
          _metadata: { sdk: 'template1', templateName: 'default' },
          envVars: [
            { name: 'API_KEY', example: 'key1', description: 'Template 1 API key', required: true }
          ]
        },
        {
          _metadata: { sdk: 'template2', templateName: 'default' },
          envVars: [
            { name: 'API_KEY', example: 'key2', description: 'Template 2 API key', required: true }
          ]
        }
      ];

      const result = await generator.generateConfigurationFiles(templateConfigs, targetDir);

      expect(result.summary.envVariables).toBe(1); // 1 unique variable with conflict
      expect(result.generatedFiles[0].conflicts).toHaveLength(1);

      const envContent = await fs.readFile(path.join(targetDir, '.env.example'), 'utf8');
      expect(envContent).toContain('# Variable Conflicts (Review Required)');
      expect(envContent).toContain('# API_KEY:');
      expect(envContent).toContain('#   template1/default: \"key1\" - Template 1 API key');
      expect(envContent).toContain('#   template2/default: \"key2\" - Template 2 API key');
    });

    it('should handle templates without environment variables', async () => {
      const templateConfigs = [
        {
          _metadata: { sdk: 'simple', templateName: 'basic' },
          name: 'simple-template',
          description: 'A simple template without env vars',
          setup: 'No special setup required'
        }
      ];

      const result = await generator.generateConfigurationFiles(templateConfigs, targetDir);

      expect(result.summary.envVariables).toBe(0);
      expect(result.generatedFiles).toHaveLength(2); // Still generates both files

      const envContent = await fs.readFile(path.join(targetDir, '.env.example'), 'utf8');
      expect(envContent).toContain('# Environment Variables for Test Project');
      expect(envContent).not.toContain('# simple/basic Configuration');

      const setupContent = await fs.readFile(path.join(targetDir, 'setup.md'), 'utf8');
      expect(setupContent).toContain('## Simple Setup');
      expect(setupContent).toContain('No special setup required');
    });

    it('should handle optional environment variables', async () => {
      const templateConfigs = [
        {
          _metadata: { sdk: 'test', templateName: 'default' },
          envVars: [
            { name: 'REQUIRED_VAR', example: 'value1', description: 'Required variable', required: true },
            { name: 'OPTIONAL_VAR', example: 'value2', description: 'Optional variable', required: false }
          ]
        }
      ];

      const result = await generator.generateConfigurationFiles(templateConfigs, targetDir);

      const envContent = await fs.readFile(path.join(targetDir, '.env.example'), 'utf8');
      expect(envContent).toContain('# Required variable\nREQUIRED_VAR=value1');
      expect(envContent).toContain('# Optional variable\n# Optional\nOPTIONAL_VAR=value2');

      const setupContent = await fs.readFile(path.join(targetDir, 'setup.md'), 'utf8');
      expect(setupContent).toContain('### Required Environment Variables');
      expect(setupContent).toContain('- `REQUIRED_VAR`: Required variable');
      expect(setupContent).not.toContain('- `OPTIONAL_VAR`'); // Optional vars not listed in required section
    });

    it('should generate comprehensive setup.md with all sections', async () => {
      const templateConfigs = [
        {
          _metadata: { sdk: 'comprehensive', templateName: 'full' },
          name: 'comprehensive-template',
          description: 'A comprehensive template with all features',
          installation: 'Install additional dependencies',
          configuration: 'Configure the comprehensive settings',
          setup: 'Follow the comprehensive setup guide',
          usage: 'Use the comprehensive features',
          troubleshooting: 'Check comprehensive troubleshooting guide',
          envVars: [
            { name: 'COMP_API_KEY', example: 'comp-key', description: 'Comprehensive API key', required: true }
          ],
          examples: [
            {
              title: 'Advanced Usage',
              description: 'Advanced comprehensive usage',
              language: 'typescript',
              code: 'const comp = new Comprehensive({ apiKey: process.env.COMP_API_KEY });'
            }
          ]
        }
      ];

      const result = await generator.generateConfigurationFiles(templateConfigs, targetDir);

      const setupContent = await fs.readFile(path.join(targetDir, 'setup.md'), 'utf8');
      
      // Check all major sections
      expect(setupContent).toContain('# Test Project Setup Guide');
      expect(setupContent).toContain('## Table of Contents');
      expect(setupContent).toContain('## Installation');
      expect(setupContent).toContain('## Configuration');
      expect(setupContent).toContain('## Comprehensive Setup');
      expect(setupContent).toContain('## Usage Examples');
      expect(setupContent).toContain('## Troubleshooting');
      
      // Check specific content
      expect(setupContent).toContain('Install additional dependencies');
      expect(setupContent).toContain('Configure the comprehensive settings');
      expect(setupContent).toContain('Follow the comprehensive setup guide');
      expect(setupContent).toContain('Advanced Usage');
      expect(setupContent).toContain('```typescript');
      expect(setupContent).toContain('Check comprehensive troubleshooting guide');
    });

    it('should handle file generation errors gracefully', async () => {
      const templateConfigs = [
        {
          _metadata: { sdk: 'test', templateName: 'default' },
          envVars: [
            { name: 'TEST_VAR', example: 'test', description: 'Test variable' }
          ]
        }
      ];

      // Use invalid target directory to trigger error
      const invalidDir = '/invalid/path/that/does/not/exist';
      
      const result = await generator.generateConfigurationFiles(templateConfigs, invalidDir);

      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.generatedFiles).toHaveLength(0);
    });
  });

  describe('project configuration', () => {
    it('should use project configuration in generated files', async () => {
      const customGenerator = new ConfigurationGenerator({
        projectName: 'Custom Project Name',
        projectDescription: 'Custom project description for testing',
        author: 'Custom Author'
      });

      const templateConfigs = [
        {
          _metadata: { sdk: 'test', templateName: 'default' },
          envVars: [
            { name: 'TEST_VAR', example: 'test', description: 'Test variable' }
          ]
        }
      ];

      const result = await customGenerator.generateConfigurationFiles(templateConfigs, targetDir);

      const envContent = await fs.readFile(path.join(targetDir, '.env.example'), 'utf8');
      expect(envContent).toContain('# Environment Variables for Custom Project Name');

      const setupContent = await fs.readFile(path.join(targetDir, 'setup.md'), 'utf8');
      expect(setupContent).toContain('# Custom Project Name Setup Guide');
      expect(setupContent).toContain('Custom project description for testing');
    });

    it('should handle missing project configuration gracefully', async () => {
      const minimalGenerator = new ConfigurationGenerator();

      const templateConfigs = [
        {
          _metadata: { sdk: 'test', templateName: 'default' },
          envVars: [
            { name: 'TEST_VAR', example: 'test', description: 'Test variable' }
          ]
        }
      ];

      const result = await minimalGenerator.generateConfigurationFiles(templateConfigs, targetDir);

      expect(result.errors).toHaveLength(0);
      
      const envContent = await fs.readFile(path.join(targetDir, '.env.example'), 'utf8');
      expect(envContent).toContain('# Environment Variables for My Project'); // default name

      const setupContent = await fs.readFile(path.join(targetDir, 'setup.md'), 'utf8');
      expect(setupContent).toContain('# My Project Setup Guide'); // default name
    });
  });

  describe('statistics and state management', () => {
    it('should provide generation statistics', async () => {
      const templateConfigs = [
        {
          _metadata: { sdk: 'test1', templateName: 'default' },
          envVars: [
            { name: 'TEST1_VAR', example: 'test1', description: 'Test 1 variable' }
          ]
        },
        {
          _metadata: { sdk: 'test2', templateName: 'default' },
          envVars: [
            { name: 'TEST2_VAR', example: 'test2', description: 'Test 2 variable' }
          ]
        }
      ];

      await generator.generateConfigurationFiles(templateConfigs, targetDir);
      const stats = generator.getStatistics();

      expect(stats.generatedFiles).toBe(2);
      expect(stats.errors).toBe(0);
      expect(stats.files).toHaveLength(2);
      expect(stats.errorsList).toHaveLength(0);
    });

    it('should clear generation state', async () => {
      generator.generatedFiles = [{ test: 'data' }];
      generator.errors = [{ test: 'error' }];

      generator.clearState();

      expect(generator.generatedFiles).toHaveLength(0);
      expect(generator.errors).toHaveLength(0);
    });
  });

  describe('singleton functions', () => {
    it('should work with singleton configuration generator', async () => {
      const templateConfigs = [
        {
          _metadata: { sdk: 'singleton', templateName: 'test' },
          envVars: [
            { name: 'SINGLETON_VAR', example: 'singleton', description: 'Singleton test variable' }
          ]
        }
      ];

      const result = await generateConfigurationFiles(templateConfigs, targetDir, {
        projectName: 'Singleton Test Project'
      });

      expect(result.summary.templatesProcessed).toBe(1);
      expect(result.summary.envVariables).toBe(1);
      expect(await fs.pathExists(path.join(targetDir, '.env.example'))).toBe(true);
      expect(await fs.pathExists(path.join(targetDir, 'setup.md'))).toBe(true);
    });

    it('should provide singleton statistics', async () => {
      const stats = getConfigurationStatistics();
      expect(stats).toBeDefined();
      expect(typeof stats.generatedFiles).toBe('number');
      expect(typeof stats.errors).toBe('number');
    });
  });
}); 