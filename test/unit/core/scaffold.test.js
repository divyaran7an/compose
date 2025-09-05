const fs = require('fs-extra');
const path = require('path');
const os = require('os');
const {
  scaffoldProject,
  createDirectory,
  generatePackageJson,
  generateConfigFiles,
  createProjectStructure,
  generateSampleEnv,
  applyTemplate
} = require('../../../lib/scaffold');

describe('Scaffold Module', () => {
  let testDir;
  let originalCwd;

  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'scaffold-test-'));
    originalCwd = process.cwd();
    process.chdir(testDir);
  });

  afterEach(() => {
    process.chdir(originalCwd);
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('createDirectory', () => {
    test('should create a new directory', async () => {
      const dirPath = path.join(testDir, 'new-project');
      
      await createDirectory(dirPath);
      
      expect(fs.existsSync(dirPath)).toBe(true);
      expect(fs.statSync(dirPath).isDirectory()).toBe(true);
    });

    test('should throw error if directory already exists', async () => {
      const dirPath = path.join(testDir, 'existing-project');
      fs.mkdirSync(dirPath);
      
      await expect(createDirectory(dirPath)).rejects.toThrow('Directory already exists');
    });

    test('should handle permission errors', async () => {
      // Mock fs.pathExists to return false but fs.mkdirp to throw
      const originalMkdirp = fs.mkdirp;
      fs.mkdirp = jest.fn().mockRejectedValue(new Error('Permission denied'));
      
      const dirPath = path.join(testDir, 'permission-test');
      
      await expect(createDirectory(dirPath)).rejects.toThrow('Permission denied');
      
      fs.mkdirp = originalMkdirp;
    });
  });

  describe('generatePackageJson', () => {
    test('should generate basic package.json with TypeScript', async () => {
      const projectDir = path.join(testDir, 'test-project');
      fs.mkdirSync(projectDir);
      
      await generatePackageJson(projectDir, { 
        projectName: 'test-app', 
        typescript: true 
      });
      
      const packageJsonPath = path.join(projectDir, 'package.json');
      expect(fs.existsSync(packageJsonPath)).toBe(true);
      
      const packageJson = fs.readJsonSync(packageJsonPath);
      expect(packageJson.name).toBe('test-app');
      expect(packageJson.version).toBe('0.1.0');
      expect(packageJson.dependencies).toHaveProperty('next');
      expect(packageJson.dependencies).toHaveProperty('react');
      expect(packageJson.dependencies).toHaveProperty('react-dom');
      expect(packageJson.devDependencies).toHaveProperty('typescript');
      expect(packageJson.devDependencies).toHaveProperty('@types/react');
    });

    test('should generate package.json without TypeScript', async () => {
      const projectDir = path.join(testDir, 'test-project');
      fs.mkdirSync(projectDir);
      
      await generatePackageJson(projectDir, { 
        projectName: 'js-app', 
        typescript: false,
        tailwind: true,
        eslint: false
      });
      
      const packageJson = fs.readJsonSync(path.join(projectDir, 'package.json'));
      expect(packageJson.name).toBe('js-app');
      // Should have Tailwind dependencies but no TypeScript dependencies
      expect(packageJson.devDependencies).toEqual({
        tailwindcss: '^3.3.0',
        postcss: '^8.4.31',
        autoprefixer: '^10.4.16'
      });
      // Should not have TypeScript dependencies
      expect(packageJson.devDependencies.typescript).toBeUndefined();
      expect(packageJson.devDependencies['@types/react']).toBeUndefined();
      expect(packageJson.devDependencies['@types/node']).toBeUndefined();
    });

    test('should use default project name if not provided', async () => {
      const projectDir = path.join(testDir, 'test-project');
      fs.mkdirSync(projectDir);
      
      await generatePackageJson(projectDir);
      
      const packageJson = fs.readJsonSync(path.join(projectDir, 'package.json'));
      expect(packageJson.name).toBe('next-app');
    });

    test('should handle write errors', async () => {
      const projectDir = path.join(testDir, 'test-project');
      fs.mkdirSync(projectDir);
      
      // Mock fs.writeJson to throw an error
      const originalWriteJson = fs.writeJson;
      fs.writeJson = jest.fn().mockRejectedValue(new Error('Write failed'));
      
      await expect(generatePackageJson(projectDir)).rejects.toThrow('Write failed');
      
      fs.writeJson = originalWriteJson;
    });
  });

  describe('generateConfigFiles', () => {
    test('should generate Next.js config files with TypeScript', async () => {
      const projectDir = path.join(testDir, 'test-project');
      fs.mkdirSync(projectDir);
      
      await generateConfigFiles(projectDir, { typescript: true });
      
      expect(fs.existsSync(path.join(projectDir, 'next.config.js'))).toBe(true);
      expect(fs.existsSync(path.join(projectDir, '.gitignore'))).toBe(true);
      expect(fs.existsSync(path.join(projectDir, 'tsconfig.json'))).toBe(true);
      
      const tsconfig = fs.readJsonSync(path.join(projectDir, 'tsconfig.json'));
      expect(tsconfig.compilerOptions).toHaveProperty('target');
      expect(tsconfig.compilerOptions.jsx).toBe('preserve');
    });

    test('should generate config files without TypeScript', async () => {
      const projectDir = path.join(testDir, 'test-project');
      fs.mkdirSync(projectDir);
      
      await generateConfigFiles(projectDir, { typescript: false });
      
      expect(fs.existsSync(path.join(projectDir, 'next.config.js'))).toBe(true);
      expect(fs.existsSync(path.join(projectDir, '.gitignore'))).toBe(true);
      expect(fs.existsSync(path.join(projectDir, 'tsconfig.json'))).toBe(false);
    });

    test('should generate config files with Tailwind CSS', async () => {
      const projectDir = path.join(testDir, 'test-project');
      fs.mkdirSync(projectDir);
      
      await generateConfigFiles(projectDir, { 
        typescript: false, 
        tailwind: true, 
        eslint: false 
      });
      
      expect(fs.existsSync(path.join(projectDir, 'next.config.js'))).toBe(true);
      expect(fs.existsSync(path.join(projectDir, '.gitignore'))).toBe(true);
      expect(fs.existsSync(path.join(projectDir, 'tailwind.config.js'))).toBe(true);
      expect(fs.existsSync(path.join(projectDir, 'postcss.config.js'))).toBe(true);
      
      const tailwindConfig = fs.readFileSync(path.join(projectDir, 'tailwind.config.js'), 'utf8');
      expect(tailwindConfig).toContain('tailwindcss');
      expect(tailwindConfig).toContain('content');
    });

    test('should generate config files with ESLint for TypeScript', async () => {
      const projectDir = path.join(testDir, 'test-project');
      fs.mkdirSync(projectDir);
      
      const result = await generateConfigFiles(projectDir, { 
        typescript: true, 
        tailwind: false, 
        eslint: true 
      });
      
      expect(fs.existsSync(path.join(projectDir, '.eslintrc.json'))).toBe(true);
      expect(result).toHaveProperty('createdFiles');
      expect(Array.isArray(result.createdFiles)).toBe(true);
      expect(result.createdFiles).toContain(path.join(projectDir, '.eslintrc.json'));
      
      const eslintConfig = fs.readJsonSync(path.join(projectDir, '.eslintrc.json'));
      expect(eslintConfig.extends).toContain('@typescript-eslint/recommended');
      expect(eslintConfig.parser).toBe('@typescript-eslint/parser');
      expect(eslintConfig.plugins).toContain('@typescript-eslint');
    });

    test('should generate config files with ESLint for JavaScript', async () => {
      const projectDir = path.join(testDir, 'test-project');
      fs.mkdirSync(projectDir);
      
      const result = await generateConfigFiles(projectDir, { 
        typescript: false, 
        tailwind: false, 
        eslint: true 
      });
      
      expect(fs.existsSync(path.join(projectDir, '.eslintrc.json'))).toBe(true);
      expect(result).toHaveProperty('createdFiles');
      expect(Array.isArray(result.createdFiles)).toBe(true);
      
      const eslintConfig = fs.readJsonSync(path.join(projectDir, '.eslintrc.json'));
      expect(eslintConfig.extends).toEqual(['next/core-web-vitals']);
      expect(eslintConfig.rules).toHaveProperty('no-unused-vars');
    });

    test('should return array of created file paths', async () => {
      const projectDir = path.join(testDir, 'test-project');
      fs.mkdirSync(projectDir);
      
      const result = await generateConfigFiles(projectDir, { 
        typescript: true, 
        tailwind: true, 
        eslint: true 
      });
      
      expect(result).toHaveProperty('createdFiles');
      expect(Array.isArray(result.createdFiles)).toBe(true);
      expect(result.createdFiles.length).toBeGreaterThan(0);
      expect(result.createdFiles).toContain(path.join(projectDir, 'next.config.js'));
      expect(result.createdFiles).toContain(path.join(projectDir, '.gitignore'));
      expect(result.createdFiles).toContain(path.join(projectDir, 'tsconfig.json'));
      expect(result.createdFiles).toContain(path.join(projectDir, 'tailwind.config.js'));
      expect(result.createdFiles).toContain(path.join(projectDir, 'postcss.config.js'));
      expect(result.createdFiles).toContain(path.join(projectDir, '.eslintrc.json'));
    });

    test('should generate correct next.config.js content', async () => {
      const projectDir = path.join(testDir, 'test-project');
      fs.mkdirSync(projectDir);
      
      await generateConfigFiles(projectDir);
      
      const nextConfigContent = fs.readFileSync(path.join(projectDir, 'next.config.js'), 'utf8');
      expect(nextConfigContent).toContain('reactStrictMode: true');
      expect(nextConfigContent).toContain('module.exports = nextConfig');
    });

    test('should generate correct .gitignore content', async () => {
      const projectDir = path.join(testDir, 'test-project');
      fs.mkdirSync(projectDir);
      
      await generateConfigFiles(projectDir);
      
      const gitignoreContent = fs.readFileSync(path.join(projectDir, '.gitignore'), 'utf8');
      expect(gitignoreContent).toContain('node_modules');
      expect(gitignoreContent).toContain('.next');
      expect(gitignoreContent).toContain('.env*');
    });
  });

  describe('createProjectStructure', () => {
    test('should create project structure with TypeScript', async () => {
      const projectDir = path.join(testDir, 'test-project');
      fs.mkdirSync(projectDir);
      
      await createProjectStructure(projectDir, { typescript: true });
      
      expect(fs.existsSync(path.join(projectDir, 'src', 'pages'))).toBe(true);
      expect(fs.existsSync(path.join(projectDir, 'public'))).toBe(true);
      expect(fs.existsSync(path.join(projectDir, 'src', 'pages', '_app.tsx'))).toBe(true);
      expect(fs.existsSync(path.join(projectDir, 'src', 'styles', 'globals.css'))).toBe(true);
    });

    test('should create project structure with JavaScript', async () => {
      const projectDir = path.join(testDir, 'test-project');
      fs.mkdirSync(projectDir);
      
      await createProjectStructure(projectDir, { typescript: false });
      
      expect(fs.existsSync(path.join(projectDir, 'src', 'pages', '_app.jsx'))).toBe(true);
    });

    test('should generate correct _app page content', async () => {
      const projectDir = path.join(testDir, 'test-project');
      fs.mkdirSync(projectDir);
      
      await createProjectStructure(projectDir);
      
      const appContent = fs.readFileSync(path.join(projectDir, 'src', 'pages', '_app.tsx'), 'utf8');
      expect(appContent).toContain('import \'../styles/globals.css\'');
      expect(appContent).toContain('export default function App');
    });

    test('should generate globals.css', async () => {
      const projectDir = path.join(testDir, 'test-project');
      fs.mkdirSync(projectDir);
      
      await createProjectStructure(projectDir);
      
      const cssContent = fs.readFileSync(path.join(projectDir, 'src', 'styles', 'globals.css'), 'utf8');
      expect(cssContent).toContain('body {');
      expect(cssContent).toContain('font-family:');
    });
  });

  describe('generateSampleEnv', () => {
    test('should generate sample.env with environment variables', async () => {
      const projectDir = path.join(testDir, 'test-project');
      fs.mkdirSync(projectDir);
      
      const envVars = [
        { name: 'API_KEY', description: 'Your API key' },
        { name: 'DATABASE_URL', description: 'Database connection string' },
        { name: 'DEBUG' } // No description
      ];
      
      await generateSampleEnv(projectDir, envVars);
      
      const sampleEnvPath = path.join(projectDir, 'sample.env');
      expect(fs.existsSync(sampleEnvPath)).toBe(true);
      
      const content = fs.readFileSync(sampleEnvPath, 'utf8');
      expect(content).toContain('# Your API key');
      expect(content).toContain('API_KEY=');
      expect(content).toContain('# Database connection string');
      expect(content).toContain('DATABASE_URL=');
      expect(content).toContain('DEBUG=');
    });

    test('should not create file if no environment variables', async () => {
      const projectDir = path.join(testDir, 'test-project');
      fs.mkdirSync(projectDir);
      
      await generateSampleEnv(projectDir, []);
      
      expect(fs.existsSync(path.join(projectDir, 'sample.env'))).toBe(false);
    });

    test('should handle environment variables without descriptions', async () => {
      const projectDir = path.join(testDir, 'test-project');
      fs.mkdirSync(projectDir);
      
      const envVars = [{ name: 'SIMPLE_VAR' }];
      
      await generateSampleEnv(projectDir, envVars);
      
      const content = fs.readFileSync(path.join(projectDir, 'sample.env'), 'utf8');
      expect(content).toBe('SIMPLE_VAR=\n');
    });
  });

  // Note: applyTemplate function has been replaced by the comprehensive template processing system
  // These tests are now covered by the integration tests below

  describe('scaffoldProject', () => {
    test('should create complete project with all components', async () => {
      const projectPath = path.join(testDir, 'complete-project');
      
      const options = {
        projectName: 'my-awesome-app',
        typescript: true,
        envVars: [
          { name: 'API_KEY', description: 'API key for service' }
        ],
        templates: []
      };
      
      await scaffoldProject(projectPath, { ...options, installDependencies: false });
      
      // Check directory was created
      expect(fs.existsSync(projectPath)).toBe(true);
      
      // Check package.json
      const packageJson = fs.readJsonSync(path.join(projectPath, 'package.json'));
      expect(packageJson.name).toBe('my-awesome-app');
      
      // Check config files
      expect(fs.existsSync(path.join(projectPath, 'next.config.js'))).toBe(true);
      expect(fs.existsSync(path.join(projectPath, 'tsconfig.json'))).toBe(true);
      
      // Check project structure
      expect(fs.existsSync(path.join(projectPath, 'src', 'pages', '_app.tsx'))).toBe(true);
      
      // Check sample.env
      expect(fs.existsSync(path.join(projectPath, 'sample.env'))).toBe(true);
    });

    test('should apply templates and merge dependencies', async () => {
      const projectPath = path.join(testDir, 'template-project');
      
      // Create a mock template with proper config.json structure
      const templateDir = path.join(testDir, 'mock-template');
      fs.mkdirSync(templateDir, { recursive: true });
      fs.writeFileSync(path.join(templateDir, 'component.tsx'), 'export const Component = () => <div>Hello</div>;');
      
      // Create proper config.json file
      const templateConfig = {
        name: 'mock-template',
        description: 'A mock template for testing',
        packages: [
          { name: 'axios', version: '^1.0.0' }
        ],
        devPackages: [
          { name: 'jest', version: '^29.0.0' }
        ],
        envVars: [
          { name: 'TEMPLATE_VAR', description: 'From template' }
        ],
        files: {
          'component.tsx': 'src/components/Component.tsx'
        }
      };
      fs.writeFileSync(path.join(templateDir, 'config.json'), JSON.stringify(templateConfig, null, 2));
      
      const options = {
        projectName: 'template-test',
        typescript: true,
        envVars: [
          { name: 'MAIN_VAR', description: 'Main variable' }
        ],
        templates: [{ path: templateDir, name: 'mock-template' }]
      };
      
      await scaffoldProject(projectPath, { ...options, installDependencies: false });
      
      // Check template file was copied
      expect(fs.existsSync(path.join(projectPath, 'src', 'components', 'Component.tsx'))).toBe(true);
      
      // Check dependencies were merged
      const packageJson = fs.readJsonSync(path.join(projectPath, 'package.json'));
      expect(packageJson.dependencies).toHaveProperty('axios', '^1.0.0');
      expect(packageJson.devDependencies).toHaveProperty('jest', '^29.0.0');
      
      // Check environment variables were merged (new system generates .env.example)
      const envExample = fs.readFileSync(path.join(projectPath, '.env.example'), 'utf8');
      expect(envExample).toContain('MAIN_VAR=');
      expect(envExample).toContain('TEMPLATE_VAR=');
    });

    test('should use default options when not provided', async () => {
      const projectPath = path.join(testDir, 'default-project');
      
      await scaffoldProject(projectPath, { installDependencies: false });
      
      const packageJson = fs.readJsonSync(path.join(projectPath, 'package.json'));
      expect(packageJson.name).toBe('next-app');
      expect(packageJson.devDependencies).toHaveProperty('typescript');
    });

    test('should handle scaffolding errors gracefully', async () => {
      const projectPath = path.join(testDir, 'error-project');
      
      // Mock createDirectory to throw an error
      const originalCreateDirectory = require('../../../lib/scaffold').createDirectory;
      const mockCreateDirectory = jest.fn().mockRejectedValue(new Error('Creation failed'));
      
      // This is a bit tricky to test since we can't easily mock the imported function
      // Instead, let's test with an invalid path
      const invalidPath = '/invalid/path/that/should/not/exist';
      
      await expect(scaffoldProject(invalidPath, { installDependencies: false })).rejects.toThrow();
    });

    test('should handle silent mode correctly', async () => {
      const projectPath = path.join(testDir, 'silent-project');
      
      const options = {
        projectName: 'silent-test-app',
        typescript: true,
        silent: true,
        templates: []
      };
      
      const result = await scaffoldProject(projectPath, { ...options, installDependencies: false });
      
      // Check that project was created successfully
      expect(fs.existsSync(projectPath)).toBe(true);
      const packageJson = fs.readJsonSync(path.join(projectPath, 'package.json'));
      expect(packageJson.name).toBe('silent-test-app');
      expect(result.success).toBe(true);
      
      // The main test is that the function completes successfully with silent: true
      // The actual silent behavior is tested in the CLI tests
    });

    test('should show progress output when silent is false', async () => {
      const projectPath = path.join(testDir, 'verbose-project');
      
      const options = {
        projectName: 'verbose-test-app',
        typescript: true,
        silent: false,
        templates: []
      };
      
      const result = await scaffoldProject(projectPath, { ...options, installDependencies: false });
      
      // Check that project was created successfully
      expect(fs.existsSync(projectPath)).toBe(true);
      const packageJson = fs.readJsonSync(path.join(projectPath, 'package.json'));
      expect(packageJson.name).toBe('verbose-test-app');
      expect(result.success).toBe(true);
    });

    test('should default to non-silent mode when silent option is not provided', async () => {
      const projectPath = path.join(testDir, 'default-silent-project');
      
      const options = {
        projectName: 'default-silent-test',
        typescript: true,
        templates: []
        // silent option not provided - should default to false
      };
      
      const result = await scaffoldProject(projectPath, { ...options, installDependencies: false });
      
      // Check that project was created successfully
      expect(fs.existsSync(projectPath)).toBe(true);
      expect(result.success).toBe(true);
    });

    test('should handle silent mode with templates correctly', async () => {
      const projectPath = path.join(testDir, 'silent-template-project');
      
      // Create a mock template
      const templateDir = path.join(testDir, 'mock-silent-template');
      fs.mkdirSync(templateDir, { recursive: true });
      fs.writeFileSync(path.join(templateDir, 'component.tsx'), 'export const Component = () => <div>Silent Test</div>;');
      
      const templateConfig = {
        name: 'silent-template',
        description: 'A template for silent mode testing',
        packages: [
          { name: 'axios', version: '^1.0.0' }
        ],
        envVars: [
          { name: 'SILENT_VAR', description: 'Silent mode variable' }
        ],
        files: {
          'component.tsx': 'src/components/SilentComponent.tsx'
        }
      };
      fs.writeFileSync(path.join(templateDir, 'config.json'), JSON.stringify(templateConfig, null, 2));
      
      const options = {
        projectName: 'silent-template-test',
        typescript: true,
        silent: true,
        templates: [{ path: templateDir, name: 'silent-template' }]
      };
      
      const result = await scaffoldProject(projectPath, { ...options, installDependencies: false });
      
      // Check that project was created successfully
      expect(fs.existsSync(projectPath)).toBe(true);
      expect(result.success).toBe(true);
      
      // The main test is that the function completes successfully with silent: true and templates
      // Template file copying is tested in other integration tests
    });

    test('should handle project with custom author and description', async () => {
      const projectPath = path.join(testDir, 'custom-author-project');
      
      const options = {
        projectName: 'custom-author-test',
        author: 'Test Author',
        description: 'A test project with custom author',
        typescript: true,
        templates: []
      };
      
      const result = await scaffoldProject(projectPath, { ...options, installDependencies: false });
      
      expect(fs.existsSync(projectPath)).toBe(true);
      expect(result.success).toBe(true);
      
      // Check that package.json contains the custom author and description
      const packageJson = fs.readJsonSync(path.join(projectPath, 'package.json'));
      expect(packageJson.name).toBe('custom-author-test');
      expect(packageJson.author).toBe('Test Author');
      expect(packageJson.description).toBe('A test project with custom author');
    });

    test('should handle project without TypeScript', async () => {
      const projectPath = path.join(testDir, 'no-typescript-project');
      
      const options = {
        projectName: 'no-typescript-test',
        typescript: false,
        tailwind: true,
        eslint: false,
        templates: []
      };
      
      const result = await scaffoldProject(projectPath, { ...options, installDependencies: false });
      
      expect(fs.existsSync(projectPath)).toBe(true);
      expect(result.success).toBe(true);
      
      // Check that TypeScript files are not created
      expect(fs.existsSync(path.join(projectPath, 'tsconfig.json'))).toBe(false);
      
      // Check that JavaScript files are created instead
      const packageJson = fs.readJsonSync(path.join(projectPath, 'package.json'));
      expect(packageJson.devDependencies?.typescript).toBeUndefined();
      expect(packageJson.devDependencies?.['@types/node']).toBeUndefined();
    });

    test('should handle project without Tailwind', async () => {
      const projectPath = path.join(testDir, 'no-tailwind-project');
      
      const options = {
        projectName: 'no-tailwind-test',
        typescript: true,
        tailwind: false,
        eslint: false,
        templates: []
      };
      
      const result = await scaffoldProject(projectPath, { ...options, installDependencies: false });
      
      expect(fs.existsSync(projectPath)).toBe(true);
      expect(result.success).toBe(true);
      
      // Check that Tailwind config files are not created
      expect(fs.existsSync(path.join(projectPath, 'tailwind.config.js'))).toBe(false);
      expect(fs.existsSync(path.join(projectPath, 'postcss.config.js'))).toBe(false);
    });

    test('should handle project with ESLint enabled', async () => {
      const projectPath = path.join(testDir, 'eslint-project');
      
      const options = {
        projectName: 'eslint-test',
        typescript: true,
        tailwind: true,
        eslint: true,
        templates: []
      };
      
      const result = await scaffoldProject(projectPath, { ...options, installDependencies: false });
      
      expect(fs.existsSync(projectPath)).toBe(true);
      expect(result.success).toBe(true);
      
      // Check that ESLint config is created
      expect(fs.existsSync(path.join(projectPath, '.eslintrc.json'))).toBe(true);
    });

    test('should handle project with environment variables', async () => {
      const projectPath = path.join(testDir, 'env-vars-project');
      
      const envVars = [
        { name: 'CUSTOM_API_KEY', description: 'Custom API key for testing' },
        { name: 'CUSTOM_URL', description: 'Custom URL endpoint' }
      ];
      
      const options = {
        projectName: 'env-vars-test',
        typescript: true,
        envVars: envVars,
        templates: []
      };
      
      const result = await scaffoldProject(projectPath, { ...options, installDependencies: false });
      
      expect(fs.existsSync(projectPath)).toBe(true);
      expect(result.success).toBe(true);
      
      // Check that the project was created successfully with environment variables
      // The .env.example file creation is handled by the generateSampleEnv function
      // which is tested separately
      const packageJson = fs.readJsonSync(path.join(projectPath, 'package.json'));
      expect(packageJson.name).toBe('env-vars-test');
    });
  });

  describe('scaffoldProject - Advanced Integration Tests', () => {
    test('should handle basic project scaffolding without templates', async () => {
      const projectPath = path.join(testDir, 'basic-project');
      
      const options = {
        projectName: 'basic-test',
        typescript: true,
        templates: [],
        installDependencies: false,
        silent: true
      };

      const result = await scaffoldProject(projectPath, options);

      expect(result.success).toBe(true);
      expect(result.projectPath).toBe(projectPath);
      expect(result.templatesProcessed).toBe(0);
      
      // Verify basic files were created
      expect(fs.existsSync(path.join(projectPath, 'package.json'))).toBe(true);
      expect(fs.existsSync(path.join(projectPath, 'next.config.js'))).toBe(true);
      expect(fs.existsSync(path.join(projectPath, 'tsconfig.json'))).toBe(true);
    });

    test('should handle JavaScript projects without TypeScript', async () => {
      const projectPath = path.join(testDir, 'js-project');
      
      const options = {
        projectName: 'js-test',
        typescript: false,
        tailwind: false,
        eslint: false,
        templates: [],
        installDependencies: false,
        silent: true
      };

      const result = await scaffoldProject(projectPath, options);

      expect(result.success).toBe(true);
      expect(result.projectPath).toBe(projectPath);
      expect(result.templatesProcessed).toBe(0);
      
      // Verify TypeScript-specific files are not created
      expect(fs.existsSync(path.join(projectPath, 'package.json'))).toBe(true);
      expect(fs.existsSync(path.join(projectPath, 'tsconfig.json'))).toBe(false);
      
      const packageJson = fs.readJsonSync(path.join(projectPath, 'package.json'));
      expect(packageJson.devDependencies.typescript).toBeUndefined();
    });

    test('should handle projects with Tailwind and ESLint enabled', async () => {
      const projectPath = path.join(testDir, 'full-featured-project');
      
      const options = {
        projectName: 'full-featured-test',
        typescript: true,
        tailwind: true,
        eslint: true,
        templates: [],
        installDependencies: false,
        silent: true
      };

      const result = await scaffoldProject(projectPath, options);

      expect(result.success).toBe(true);
      expect(result.projectPath).toBe(projectPath);
      
      // Verify all configuration files are created
      expect(fs.existsSync(path.join(projectPath, 'package.json'))).toBe(true);
      expect(fs.existsSync(path.join(projectPath, 'tsconfig.json'))).toBe(true);
      expect(fs.existsSync(path.join(projectPath, 'tailwind.config.js'))).toBe(true);
      expect(fs.existsSync(path.join(projectPath, '.eslintrc.json'))).toBe(true);
      
      const packageJson = fs.readJsonSync(path.join(projectPath, 'package.json'));
      expect(packageJson.devDependencies.tailwindcss).toBeDefined();
      expect(packageJson.devDependencies.typescript).toBeDefined();
    });

    test('should generate README.md with proper content for TypeScript projects', async () => {
      const projectPath = path.join(testDir, 'readme-project');
      
      const options = {
        projectName: 'readme-test',
        typescript: true,
        templates: [],
        installDependencies: true,
        envVars: [],
        silent: true
      };

      const result = await scaffoldProject(projectPath, options);

      expect(result.success).toBe(true);
      
      const readmePath = path.join(projectPath, 'README.md');
      expect(fs.existsSync(readmePath)).toBe(true);
      
      const readmeContent = fs.readFileSync(readmePath, 'utf8');
      expect(readmeContent).toContain('# readme-test');
      expect(readmeContent).toContain('Dependencies have been automatically installed');
      expect(readmeContent).toContain('tsconfig.json');
    });

    test('should generate README.md without installation instructions when not installing', async () => {
      const projectPath = path.join(testDir, 'readme-no-install-project');
      
      const options = {
        projectName: 'readme-no-install-test',
        typescript: false,
        templates: [],
        installDependencies: false,
        silent: true
      };

      const result = await scaffoldProject(projectPath, options);

      expect(result.success).toBe(true);
      
      const readmePath = path.join(projectPath, 'README.md');
      expect(fs.existsSync(readmePath)).toBe(true);
      
      const readmeContent = fs.readFileSync(readmePath, 'utf8');
      expect(readmeContent).toContain('Install dependencies:');
      expect(readmeContent).toContain('npm install');
      expect(readmeContent).not.toContain('Dependencies have been automatically installed');
      expect(readmeContent).not.toContain('tsconfig.json: TypeScript config');
      expect(readmeContent).not.toContain('.env.example: Environment variables template');
    });

    test('should handle projects with environment variables', async () => {
      const projectPath = path.join(testDir, 'sample-env-project');
      
      const options = {
        projectName: 'sample-env-test',
        templates: [],
        envVars: [
          { name: 'API_KEY', description: 'Your API key' },
          { name: 'DATABASE_URL', description: 'Database connection string' }
        ],
        installDependencies: false,
        silent: true
      };

      const result = await scaffoldProject(projectPath, options);

      expect(result.success).toBe(true);
      expect(result.templatesProcessed).toBe(0);
      
      // Check if sample.env file was created
      const sampleEnvPath = path.join(projectPath, 'sample.env');
      expect(fs.existsSync(sampleEnvPath)).toBe(true);
      
      const envContent = fs.readFileSync(sampleEnvPath, 'utf8');
      expect(envContent).toContain('API_KEY=');
      expect(envContent).toContain('DATABASE_URL=');
      expect(envContent).toContain('Your API key');
      expect(envContent).toContain('Database connection string');
    });

    test('should handle existing directory structure', async () => {
      // Test that scaffold can handle when project directory already exists (edge case)
      const projectPath = path.join(testDir, 'existing-dir-test');
      
      // Instead of testing directory overwrite, test directory already exists error
      await expect(createDirectory(projectPath)).resolves.not.toThrow();
      await expect(createDirectory(projectPath)).rejects.toThrow('Directory already exists');
    });
  });
});

describe('Scaffold Integration with Template Processing System', () => {
  let tempDir;
  let projectDir;

  beforeEach(async () => {
    // Create temporary directory for testing
    tempDir = path.join(__dirname, 'temp-scaffold-test');
    projectDir = path.join(tempDir, 'test-project');
    
    await fs.ensureDir(tempDir);
  });

  afterEach(async () => {
    // Cleanup async operations
    if (global.cleanupAsyncOperations) {
      global.cleanupAsyncOperations();
    }
    
    if (tempDir && await fs.pathExists(tempDir)) {
      await fs.remove(tempDir);
    }
  });

  afterAll(async () => {
    // Final cleanup
    if (global.cleanupAsyncOperations) {
      global.cleanupAsyncOperations();
    }
  });

  it('should create a basic Next.js project without templates', async () => {
    const result = await scaffoldProject(projectDir, {
      projectName: 'test-app', installDependencies: false,
      typescript: true,
      installDependencies: false
    });

    expect(result.success).toBe(true);
    expect(result.templatesProcessed).toBe(0);
    expect(result.projectPath).toBe(projectDir);

    // Verify basic Next.js structure
    expect(await fs.pathExists(path.join(projectDir, 'package.json'))).toBe(true);
    expect(await fs.pathExists(path.join(projectDir, 'next.config.js'))).toBe(true);
    expect(await fs.pathExists(path.join(projectDir, 'tsconfig.json'))).toBe(true);
    expect(await fs.pathExists(path.join(projectDir, 'src/pages/_app.tsx'))).toBe(true);
    expect(await fs.pathExists(path.join(projectDir, 'src/pages/index.tsx'))).toBe(true);
    expect(await fs.pathExists(path.join(projectDir, 'README.md'))).toBe(true);

    // Verify package.json content
    const pkg = await fs.readJson(path.join(projectDir, 'package.json'));
    expect(pkg.name).toBe('test-app');
    expect(pkg.dependencies.next).toBeDefined();
    expect(pkg.dependencies.react).toBeDefined();
    expect(pkg.devDependencies.typescript).toBeDefined();
  });

  it('should create a project with mock template processing', async () => {
    // Create mock template structure
    const mockTemplateDir = path.join(tempDir, 'mock-template');
    await fs.ensureDir(mockTemplateDir);
    
    // Create mock template config
    const mockConfig = {
      name: 'test-template',
      description: 'A test template',
      packages: [
        { name: 'axios', version: '^1.0.0' }
      ],
      devPackages: [
        { name: 'jest', version: '^29.0.0' }
      ],
      envVars: [
        { name: 'TEST_API_KEY', description: 'Test API key' }
      ],
      files: {
        'test.js': 'src/test.js'
      }
    };
    await fs.writeJson(path.join(mockTemplateDir, 'config.json'), mockConfig);
    
    // Create mock template file
    await fs.writeFile(path.join(mockTemplateDir, 'test.js'), 'console.log("{{projectName}}");');

    // Mock the template processing functions to avoid dependency on actual templates
    const originalReadSelectedTemplateConfigs = require('../../../lib/template-processor').readSelectedTemplateConfigs;
    const originalMergeDependencies = require('../../../lib/template-processor').mergeDependencies;
    const originalCopyTemplateFiles = require('../../../lib/template-processor').copyTemplateFiles;
    const originalGenerateConfigurationFiles = require('../../../lib/template-processor').generateConfigurationFiles;

    // Mock implementations
    require('../../../lib/template-processor').readSelectedTemplateConfigs = jest.fn().mockResolvedValue([{
      ...mockConfig,
      _metadata: { templatePath: mockTemplateDir, sdk: 'test', templateName: 'default' }
    }]);

    require('../../../lib/template-processor').mergeDependencies = jest.fn().mockReturnValue({
      dependencies: { 'axios': '^1.0.0' },
      devDependencies: { 'jest': '^29.0.0' },
      conflicts: []
    });

    require('../../../lib/template-processor').copyTemplateFiles = jest.fn().mockImplementation(async (configs, projectDir, variables) => {
      // Actually create the expected file for the test
      await fs.ensureDir(path.join(projectDir, 'src'));
      await fs.writeFile(path.join(projectDir, 'src/test.js'), 'console.log("test-app-with-templates");');
      
      return {
        summary: { copiedCount: 1, conflictCount: 0 },
        copyLog: [{ source: 'test.js', destination: 'src/test.js' }],
        errors: []
      };
    });

    require('../../../lib/template-processor').generateConfigurationFiles = jest.fn().mockResolvedValue({
      generatedFiles: ['.env.example', 'setup.md'],
      summary: { envVariables: 1, templatesProcessed: 1 },
      errors: []
    });

    try {
      const result = await scaffoldProject(projectDir, {
        projectName: 'test-app-with-templates',
        typescript: true,
        author: 'Test Author',
        description: 'Test project with templates',
        templates: [{ path: mockTemplateDir, name: 'test-template' }],
        installDependencies: false
      });

      expect(result.success).toBe(true);
      expect(result.templatesProcessed).toBe(1);

      // Verify that the new template processing functions were called
      expect(require('../../../lib/template-processor').readSelectedTemplateConfigs).toHaveBeenCalledWith([
        { path: mockTemplateDir, name: 'test-template' }
      ]);
      expect(require('../../../lib/template-processor').mergeDependencies).toHaveBeenCalled();
      expect(require('../../../lib/template-processor').copyTemplateFiles).toHaveBeenCalled();
      expect(require('../../../lib/template-processor').generateConfigurationFiles).toHaveBeenCalled();

      // Verify basic project structure still exists
      expect(await fs.pathExists(path.join(projectDir, 'package.json'))).toBe(true);
      expect(await fs.pathExists(path.join(projectDir, 'src/pages/index.tsx'))).toBe(true);

    } finally {
      // Restore original functions
      require('../../../lib/template-processor').readSelectedTemplateConfigs = originalReadSelectedTemplateConfigs;
      require('../../../lib/template-processor').mergeDependencies = originalMergeDependencies;
      require('../../../lib/template-processor').copyTemplateFiles = originalCopyTemplateFiles;
      require('../../../lib/template-processor').generateConfigurationFiles = originalGenerateConfigurationFiles;
    }
  });

  it('should handle errors gracefully and clean up', async () => {
    // Mock template processing to throw an error
    const originalReadSelectedTemplateConfigs = require('../../../lib/template-processor').readSelectedTemplateConfigs;
    require('../../../lib/template-processor').readSelectedTemplateConfigs = jest.fn().mockRejectedValue(
      new Error('Template processing failed')
    );

    try {
      await expect(scaffoldProject(projectDir, {
        projectName: 'failing-project',
        templates: [{ path: '/nonexistent', name: 'fake' }],
        installDependencies: false
      })).rejects.toThrow('Template processing failed');

      // Verify cleanup - project directory should be removed
      expect(await fs.pathExists(projectDir)).toBe(false);

    } finally {
      // Restore original function
      require('../../../lib/template-processor').readSelectedTemplateConfigs = originalReadSelectedTemplateConfigs;
    }
  });

  it('should generate enhanced README with template information', async () => {
    const result = await scaffoldProject(projectDir, {
      projectName: 'readme-test',
      typescript: true,
      templates: [{ path: '/mock', name: 'mock-template' }], // Will fail but README should still be generated
      installDependencies: false
    });

    // Even if templates fail, basic project should be created
    expect(await fs.pathExists(path.join(projectDir, 'README.md'))).toBe(true);
    
    const readme = await fs.readFile(path.join(projectDir, 'README.md'), 'utf8');
    expect(readme).toContain('readme-test');
    expect(readme).toContain('capx-compose scaffolder');
    expect(readme).toContain('Getting Started');
  });
});

describe('Coverage Enhancement Tests', () => {
  let testDir;
  let originalCwd;

  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'coverage-test-'));
    originalCwd = process.cwd();
    process.chdir(testDir);
  });

  afterEach(() => {
    process.chdir(originalCwd);
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('scaffoldProject - Basic Project Creation', () => {
    test('should create project without templates', async () => {
      const projectDir = path.join(testDir, 'basic-project');
      
      const options = {
        projectName: 'basic-project',
        typescript: true,
        tailwind: true,
        eslint: true,
        installDependencies: false,
        templates: []
      };

      const result = await scaffoldProject(projectDir, options);
      
      expect(result.success).toBe(true);
      expect(result.templatesProcessed).toBe(0);
      expect(fs.existsSync(path.join(projectDir, 'package.json'))).toBe(true);
      expect(fs.existsSync(path.join(projectDir, 'README.md'))).toBe(true);
    });

    test('should create project with TypeScript disabled', async () => {
      const projectDir = path.join(testDir, 'js-project');
      
      const options = {
        projectName: 'js-project',
        typescript: false,
        tailwind: false,
        eslint: false,
        installDependencies: false,
        templates: []
      };

      const result = await scaffoldProject(projectDir, options);
      
      expect(result.success).toBe(true);
      expect(fs.existsSync(path.join(projectDir, 'src/pages/index.jsx'))).toBe(true);
    });

    test('should handle envVars without templates', async () => {
      const projectDir = path.join(testDir, 'envvar-test');
      
      const options = {
        projectName: 'envvar-test',
        installDependencies: false,
        envVars: [
          { name: 'PROJECT_VAR', description: 'Project-specific variable' },
          { name: 'API_KEY', description: 'External API key' }
        ],
        templates: []
      };

      const result = await scaffoldProject(projectDir, options);
      
      expect(result.success).toBe(true);
      expect(result.templatesProcessed).toBe(0);
      
      // Should have generated sample.env from envVars
      const envPath = path.join(projectDir, 'sample.env');
      expect(fs.existsSync(envPath)).toBe(true);
      
      const envContent = fs.readFileSync(envPath, 'utf8');
      expect(envContent).toContain('PROJECT_VAR=');
      expect(envContent).toContain('API_KEY=');
      expect(envContent).toContain('Project-specific variable');
      expect(envContent).toContain('External API key');
    });

    test('should test configuration and structure generation functions directly', async () => {
      const projectDir = path.join(testDir, 'direct-function-test');
      
      // Create directory structure manually
      await fs.ensureDir(projectDir);
      await fs.ensureDir(path.join(projectDir, 'src', 'pages'));
      await fs.ensureDir(path.join(projectDir, 'src', 'styles'));
      await fs.ensureDir(path.join(projectDir, 'public'));
      
      // Create a basic package.json 
      const packageJson = {
        name: 'direct-function-test',
        version: '0.1.0',
        dependencies: { next: '^14.0.0', react: '^18.0.0', 'react-dom': '^18.0.0' },
        devDependencies: {}
      };
      await fs.writeJson(path.join(projectDir, 'package.json'), packageJson);

      // Test the functions directly to improve coverage
      const { generateConfigFiles, createProjectStructure } = require('../../../lib/scaffold');
      
      const configResult = await generateConfigFiles(projectDir, {
        typescript: true,
        tailwind: true,
        eslint: true
      });
      
      expect(configResult.createdFiles).toEqual(expect.any(Array));
      expect(configResult.createdFiles.length).toBeGreaterThan(0);
      
      const structureResult = await createProjectStructure(projectDir, {
        typescript: true,
        tailwind: true
      });
      
      expect(structureResult.createdFiles).toEqual(expect.any(Array));
      expect(structureResult.createdDirectories).toEqual(expect.any(Array));
      expect(structureResult.createdFiles.length).toBeGreaterThan(0);
      expect(structureResult.createdDirectories.length).toBeGreaterThan(0);
    });
  });

  describe('generateSampleEnv - Enhanced Edge Cases', () => {
    test('should handle environment variables with complex descriptions', async () => {
      const projectDir = path.join(testDir, 'complex-env-test');
      fs.mkdirSync(projectDir);
      
      const envVars = [
        {
          name: 'DATABASE_URL',
          description: 'PostgreSQL connection string'
        },
        {
          name: 'JWT_SECRET',
          description: 'Secret key for JWT tokens'
        },
        {
          name: 'REDIS_CONFIG',
          description: 'Redis configuration'
        }
      ];

      const result = await generateSampleEnv(projectDir, envVars);
      
      expect(result).toBe(path.join(projectDir, 'sample.env'));
      expect(fs.existsSync(result)).toBe(true);
      
      const content = fs.readFileSync(result, 'utf8');
      expect(content).toContain('DATABASE_URL=');
      expect(content).toContain('JWT_SECRET=');
      expect(content).toContain('REDIS_CONFIG=');
      expect(content).toContain('PostgreSQL connection string');
      expect(content).toContain('Secret key for JWT tokens');
      expect(content).toContain('Redis configuration');
    });

    test('should handle undefined envVars parameter', async () => {
      const projectDir = path.join(testDir, 'undefined-env-test');
      fs.mkdirSync(projectDir);
      
      const result = await generateSampleEnv(projectDir, undefined);
      
      expect(result).toBe(null);  // generateSampleEnv returns null for empty/undefined envVars
    });

    test('should handle empty envVars array', async () => {
      const projectDir = path.join(testDir, 'empty-env-test');
      fs.mkdirSync(projectDir);
      
      const result = await generateSampleEnv(projectDir, []);
      
      expect(result).toBe(null);  // generateSampleEnv returns null for empty array
    });
  });

  describe('displayPeerDependencyFeedback - Enhanced Coverage', () => {
    let originalConsoleLog;
    let originalConsoleWarn;

    beforeEach(() => {
      // Mock console methods to suppress output during tests
      originalConsoleLog = console.log;
      originalConsoleWarn = console.warn;
      console.log = jest.fn();
      console.warn = jest.fn();
    });

    afterEach(() => {
      // Restore original console methods
      console.log = originalConsoleLog;
      console.warn = originalConsoleWarn;
    });

    test('should return early for null analysis', () => {
      const { displayPeerDependencyFeedback } = require('../../../lib/scaffold');
      
      // Should not throw and return immediately
      expect(() => {
        displayPeerDependencyFeedback(null);
      }).not.toThrow();
      
      expect(() => {
        displayPeerDependencyFeedback(undefined);
      }).not.toThrow();
    });

    test('should handle analysis with no conflicts or resolutions', () => {
      const { displayPeerDependencyFeedback } = require('../../../lib/scaffold');
      
      const analysis = {
        conflicts: [],
        resolutions: [],
        summary: { totalPackages: 5, analysisTime: 100 }
      };

      // Should complete without throwing
      expect(() => {
        displayPeerDependencyFeedback(analysis);
      }).not.toThrow();
    });

    test('should handle complex analysis with all conflict types and resolutions', () => {
      const { displayPeerDependencyFeedback } = require('../../../lib/scaffold');
      
      const analysis = {
        conflicts: [
          {
            package: 'critical-package',
            severity: 'high',
            conflictType: 'major-version-incompatible',
            currentVersion: '1.0.0',
            requiredVersion: '^3.0.0',
            requiredBy: ['dependency-a', 'dependency-b'],
            recommendation: 'Perform major version upgrade with breaking changes'
          },
          {
            package: 'medium-package',
            severity: 'medium',
            currentVersion: '2.1.0',
            requiredVersion: '^2.3.0',
            requiredBy: ['dependency-c']
          },
          {
            package: 'minor-package',
            severity: 'low',
            currentVersion: '1.0.0',
            requiredVersion: '^1.0.2',
            requiredBy: ['dependency-d']
          }
        ],
        resolutions: [
          {
            package: 'added-package',
            action: 'add',
            version: '2.1.0',
            reason: 'Missing peer dependency automatically resolved',
            confidence: 'high'
          },
          {
            package: 'updated-package',
            action: 'update',
            version: '1.8.0',
            reason: 'Version conflict automatically resolved',
            confidence: 'medium'
          }
        ],
        summary: {
          totalPackages: 20,
          analysisTime: 300
        }
      };

      // Should complete without throwing
      expect(() => {
        displayPeerDependencyFeedback(analysis);
      }).not.toThrow();
      
      // Verify that console methods were called (function is working)
      expect(console.log).toHaveBeenCalled();
      expect(console.warn).toHaveBeenCalled();
    });
  });

  describe('createDirectory - Additional Error Scenarios', () => {
    test('should handle file system permission errors', async () => {
      const projectDir = path.join(testDir, 'permission-error-test');
      
      const { createDirectory } = require('../../../lib/scaffold');
      
      // Mock fs.mkdirp to simulate permission error
      const originalMkdirp = fs.mkdirp;
      fs.mkdirp = jest.fn().mockRejectedValue(new Error('EACCES: permission denied'));
      
      await expect(createDirectory(projectDir)).rejects.toThrow('EACCES: permission denied');
      
      // Restore original function
      fs.mkdirp = originalMkdirp;
    });

    test('should handle disk full errors', async () => {
      const projectDir = path.join(testDir, 'disk-full-test');
      
      const { createDirectory } = require('../../../lib/scaffold');
      
      // Mock fs.mkdirp to simulate disk full error
      const originalMkdirp = fs.mkdirp;
      fs.mkdirp = jest.fn().mockRejectedValue(new Error('ENOSPC: no space left on device'));
      
      await expect(createDirectory(projectDir)).rejects.toThrow('ENOSPC: no space left on device');
      
      // Restore original function
      fs.mkdirp = originalMkdirp;
    });
  });
}); 