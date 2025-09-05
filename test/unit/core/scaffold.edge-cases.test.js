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
  generateDynamicIndexPage,
  displayPeerDependencyFeedback
} = require('../../../lib/scaffold');

// Mock external dependencies
jest.mock('../../../lib/console', () => ({
  logSuccess: jest.fn(),
  logInfo: jest.fn(),
  logWarning: jest.fn(),
  logDim: jest.fn()
}));

jest.mock('../../../lib/progress', () => ({
  ProgressTracker: jest.fn().mockImplementation(() => ({
    start: jest.fn(),
    nextStep: jest.fn(),
    succeed: jest.fn(),
    spinner: { clear: jest.fn() },
    options: { silent: false },
    _formatText: jest.fn(text => text)
  })),
  FileProgressTracker: jest.fn(),
  createSpinner: jest.fn().mockReturnValue({
    start: jest.fn(),
    clear: jest.fn()
  })
}));

jest.mock('../../../lib/cleanup', () => ({
  createCleanupTracker: jest.fn().mockReturnValue({
    track: jest.fn(),
    trackMultiple: jest.fn()
  }),
  withCleanup: jest.fn().mockImplementation(async (fn, cleanup, options) => {
    const tracker = {
      track: jest.fn(),
      trackMultiple: jest.fn()
    };
    return await fn(tracker);
  })
}));

describe('Scaffold Edge Cases and Coverage Enhancement', () => {
  let testDir;
  let originalCwd;
  const { logSuccess, logInfo, logWarning, logDim } = require('../../../lib/console');

  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'scaffold-edge-test-'));
    originalCwd = process.cwd();
    process.chdir(testDir);
    
    // Clear mock calls
    jest.clearAllMocks();
  });

  afterEach(() => {
    process.chdir(originalCwd);
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('displayPeerDependencyFeedback', () => {
    test('should handle null/undefined analysis', () => {
      displayPeerDependencyFeedback(null);
      displayPeerDependencyFeedback(undefined);
      
      // Should not throw and should not call any logging functions
      expect(logSuccess).not.toHaveBeenCalled();
      expect(logWarning).not.toHaveBeenCalled();
    });

    test('should display success message when no conflicts', () => {
      const analysis = {
        conflicts: [],
        resolutions: [],
        summary: { totalPackages: 5, analysisTime: 150 }
      };
      
      displayPeerDependencyFeedback(analysis);
      
      expect(logSuccess).toHaveBeenCalledWith('🔍 Peer dependency analysis completed - no conflicts detected');
    });

    test('should display high severity conflicts with warnings', () => {
      const analysis = {
        conflicts: [
          {
            package: 'react',
            severity: 'high',
            conflictType: 'version_mismatch',
            currentVersion: '16.14.0',
            requiredVersion: '^18.0.0',
            requiredBy: ['next', '@types/react'],
            recommendation: 'Update React to version 18.x for compatibility'
          },
          {
            package: 'typescript',
            severity: 'high',
            conflictType: 'missing_peer',
            currentVersion: 'not installed',
            requiredVersion: '^5.0.0',
            requiredBy: ['@types/node'],
            recommendation: 'Install TypeScript as a peer dependency'
          }
        ],
        resolutions: [],
        summary: { totalPackages: 10, analysisTime: 250 }
      };
      
      displayPeerDependencyFeedback(analysis);
      
      expect(logInfo).toHaveBeenCalledWith('🔍 Peer Dependency Analysis Results:');
      expect(logDim).toHaveBeenCalledWith('   Analyzed 10 packages in 250ms');
      expect(logWarning).toHaveBeenCalledWith('⚠️  Critical peer dependency issues (2):');
      expect(logWarning).toHaveBeenCalledWith('   react: version_mismatch');
      expect(logDim).toHaveBeenCalledWith('     Current: 16.14.0');
      expect(logDim).toHaveBeenCalledWith('     Required: ^18.0.0 (by next, @types/react)');
      expect(logDim).toHaveBeenCalledWith('     Update React to version 18.x for compatibility');
    });

    test('should display medium severity conflicts', () => {
      const analysis = {
        conflicts: [
          {
            package: 'eslint',
            severity: 'medium',
            currentVersion: '7.32.0',
            requiredVersion: '^8.0.0'
          },
          {
            package: 'jest',
            severity: 'medium',
            currentVersion: '27.5.1',
            requiredVersion: '^29.0.0'
          }
        ],
        resolutions: [],
        summary: { totalPackages: 8, analysisTime: 180 }
      };
      
      displayPeerDependencyFeedback(analysis);
      
      expect(logInfo).toHaveBeenCalledWith('🔄 Peer dependency warnings (2):');
      expect(logDim).toHaveBeenCalledWith('   eslint: 7.32.0 → Required: ^8.0.0');
      expect(logDim).toHaveBeenCalledWith('   jest: 27.5.1 → Required: ^29.0.0');
    });

    test('should display low severity conflicts with minimal info', () => {
      const analysis = {
        conflicts: [
          { package: 'lodash', severity: 'low' },
          { package: 'axios', severity: 'low' },
          { package: 'moment', severity: 'low' }
        ],
        resolutions: [],
        summary: { totalPackages: 15, analysisTime: 320 }
      };
      
      displayPeerDependencyFeedback(analysis);
      
      expect(logDim).toHaveBeenCalledWith('ℹ️  Minor peer dependency notes: 3 items');
    });

    test('should display automatic resolutions with different actions', () => {
      const analysis = {
        conflicts: [],
        resolutions: [
          {
            package: 'react',
            action: 'add',
            version: '18.2.0',
            reason: 'Missing peer dependency',
            confidence: 'high'
          },
          {
            package: 'typescript',
            action: 'update',
            version: '5.1.6',
            reason: 'Version compatibility',
            confidence: 'medium'
          }
        ],
        summary: { totalPackages: 12, analysisTime: 280 }
      };
      
      displayPeerDependencyFeedback(analysis);
      
      expect(logDim).toHaveBeenCalledWith('   Analyzed 12 packages in 280ms');
      expect(logSuccess).toHaveBeenCalledWith('🔧 Automatic resolutions applied (2):');
      expect(logSuccess).toHaveBeenCalledWith('   ➕ react: add 18.2.0');
      expect(logDim).toHaveBeenCalledWith('     Missing peer dependency (confidence: high)');
      expect(logSuccess).toHaveBeenCalledWith('   🔄 typescript: update 5.1.6');
      expect(logDim).toHaveBeenCalledWith('     Version compatibility (confidence: medium)');
    });

    test('should handle mixed conflicts and resolutions', () => {
      const analysis = {
        conflicts: [
          {
            package: 'react',
            severity: 'high',
            conflictType: 'version_mismatch',
            currentVersion: '17.0.2',
            requiredVersion: '^18.0.0',
            requiredBy: ['next'],
            recommendation: 'Upgrade React to version 18'
          }
        ],
        resolutions: [
          {
            package: 'react-dom',
            action: 'add',
            version: '18.2.0',
            reason: 'Missing peer dependency',
            confidence: 'high'
          }
        ],
        summary: { totalPackages: 8, analysisTime: 200 }
      };
      
      displayPeerDependencyFeedback(analysis);
      
      expect(logInfo).toHaveBeenCalledWith('🔍 Peer Dependency Analysis Results:');
      expect(logWarning).toHaveBeenCalledWith('⚠️  Critical peer dependency issues (1):');
      expect(logSuccess).toHaveBeenCalledWith('🔧 Automatic resolutions applied (1):');
    });

    test('should handle empty summary object', () => {
      const analysis = {
        conflicts: [],
        resolutions: [],
        summary: {}
      };
      
      displayPeerDependencyFeedback(analysis);
      
      expect(logSuccess).toHaveBeenCalledWith('🔍 Peer dependency analysis completed - no conflicts detected');
      // This test verifies the function doesn't crash with undefined summary properties
    });

    test('should handle resolutions with no reason', () => {
      const analysis = {
        conflicts: [],
        resolutions: [
          {
            package: 'lodash',
            action: 'update',
            version: '4.17.21'
            // No reason provided
          }
        ],
        summary: { totalPackages: 5, analysisTime: 100 }
      };
      
      displayPeerDependencyFeedback(analysis);
      
      expect(logDim).toHaveBeenCalledWith('   Analyzed 5 packages in 100ms');
      expect(logSuccess).toHaveBeenCalledWith('🔧 Automatic resolutions applied (1):');
      expect(logSuccess).toHaveBeenCalledWith('   🔄 lodash: update 4.17.21');
      expect(logDim).toHaveBeenCalledWith('     undefined (confidence: undefined)');
    });

    test('should handle conflicts without recommendation', () => {
      const analysis = {
        conflicts: [
          {
            package: 'react',
            severity: 'high',
            conflictType: 'version_mismatch',
            currentVersion: '16.14.0',
            requiredVersion: '^18.0.0',
            requiredBy: ['next']
            // No recommendation provided
          }
        ],
        resolutions: [],
        summary: { totalPackages: 3, analysisTime: 50 }
      };
      
      displayPeerDependencyFeedback(analysis);
      
      expect(logWarning).toHaveBeenCalledWith('⚠️  Critical peer dependency issues (1):');
      expect(logWarning).toHaveBeenCalledWith('   react: version_mismatch');
      expect(logDim).toHaveBeenCalledWith('     Current: 16.14.0');
      expect(logDim).toHaveBeenCalledWith('     Required: ^18.0.0 (by next)');
      // Should not try to log undefined recommendation
    });
  });

  describe('Additional Helper Function Tests', () => {
    test('should handle generateSampleEnv with no environment variables', async () => {
      const projectDir = path.join(testDir, 'no-env-project');
      fs.mkdirSync(projectDir);
      
      const result = await generateSampleEnv(projectDir, []);
      
      expect(result).toBeNull();
    });

    test('should handle generateSampleEnv with empty description', async () => {
      const projectDir = path.join(testDir, 'empty-desc-project');
      fs.mkdirSync(projectDir);
      
      const envVars = [
        { name: 'API_KEY' }, // No description
        { name: 'DATABASE_URL', description: 'Database connection' }
      ];
      
      const result = await generateSampleEnv(projectDir, envVars);
      
      expect(result).toBe(path.join(projectDir, 'sample.env'));
      expect(fs.existsSync(result)).toBe(true);
      
      const content = fs.readFileSync(result, 'utf8');
      expect(content).toContain('API_KEY=');
      expect(content).toContain('# Database connection');
    });

    test('should handle generatePackageJson with all dependencies disabled', async () => {
      const projectDir = path.join(testDir, 'minimal-deps-project');
      fs.mkdirSync(projectDir);
      
      const result = await generatePackageJson(projectDir, {
        projectName: 'minimal-app',
        typescript: false,
        tailwind: false,
        eslint: false
      });
      
      const packageJson = fs.readJsonSync(result);
      expect(packageJson.name).toBe('minimal-app');
      expect(packageJson.devDependencies).toEqual({});
      expect(packageJson.dependencies).toHaveProperty('next');
      expect(packageJson.dependencies).toHaveProperty('react');
    });
  });

  describe('generateConfigFiles edge cases', () => {
    test('should generate ESLint config for TypeScript when enabled', async () => {
      const projectDir = path.join(testDir, 'eslint-ts-project');
      fs.mkdirSync(projectDir);
      
      const result = await generateConfigFiles(projectDir, { 
        typescript: true, 
        tailwind: true, 
        eslint: true 
      });
      
      expect(fs.existsSync(path.join(projectDir, '.eslintrc.json'))).toBe(true);
      expect(fs.existsSync(path.join(projectDir, 'tailwind.config.js'))).toBe(true);
      expect(fs.existsSync(path.join(projectDir, 'postcss.config.js'))).toBe(true);
      
      const eslintConfig = fs.readJsonSync(path.join(projectDir, '.eslintrc.json'));
      expect(eslintConfig.extends).toContain('next/core-web-vitals');
      expect(eslintConfig.extends).toContain('@typescript-eslint/recommended');
      expect(eslintConfig.parser).toBe('@typescript-eslint/parser');
      expect(eslintConfig.plugins).toContain('@typescript-eslint');
      
      expect(result.createdFiles).toContain(path.join(projectDir, '.eslintrc.json'));
      expect(result.createdFiles).toContain(path.join(projectDir, 'tailwind.config.js'));
      expect(result.createdFiles).toContain(path.join(projectDir, 'postcss.config.js'));
    });

    test('should generate ESLint config for JavaScript when TypeScript disabled', async () => {
      const projectDir = path.join(testDir, 'eslint-js-project');
      fs.mkdirSync(projectDir);
      
      await generateConfigFiles(projectDir, { 
        typescript: false, 
        tailwind: false, 
        eslint: true 
      });
      
      expect(fs.existsSync(path.join(projectDir, '.eslintrc.json'))).toBe(true);
      expect(fs.existsSync(path.join(projectDir, 'tailwind.config.js'))).toBe(false);
      expect(fs.existsSync(path.join(projectDir, 'postcss.config.js'))).toBe(false);
      
      const eslintConfig = fs.readJsonSync(path.join(projectDir, '.eslintrc.json'));
      expect(eslintConfig.extends).toEqual(['next/core-web-vitals']);
      expect(eslintConfig.rules).toHaveProperty('no-unused-vars', 'error');
      expect(eslintConfig.parser).toBeUndefined();
      expect(eslintConfig.plugins).toBeUndefined();
    });

    test('should handle file write errors gracefully', async () => {
      const projectDir = path.join(testDir, 'error-project');
      fs.mkdirSync(projectDir);
      
      // Mock fs.writeFile to throw error for specific file
      const originalWriteFile = fs.writeFile;
      fs.writeFile = jest.fn().mockImplementation((filePath, content) => {
        if (filePath.includes('next.config.js')) {
          throw new Error('Write permission denied');
        }
        return originalWriteFile(filePath, content);
      });
      
      await expect(generateConfigFiles(projectDir)).rejects.toThrow('Write permission denied');
      
      fs.writeFile = originalWriteFile;
    });
  });

  describe('createProjectStructure edge cases', () => {
    test('should create structure with Tailwind disabled', async () => {
      const projectDir = path.join(testDir, 'no-tailwind-project');
      fs.mkdirSync(projectDir);
      
      const result = await createProjectStructure(projectDir, { 
        typescript: true, 
        tailwind: false 
      });
      
      expect(fs.existsSync(path.join(projectDir, 'src', 'pages', '_app.tsx'))).toBe(true);
      expect(fs.existsSync(path.join(projectDir, 'src', 'styles', 'globals.css'))).toBe(true);
      
      // Check that globals.css doesn't contain Tailwind directives
      const globalsCss = fs.readFileSync(path.join(projectDir, 'src', 'styles', 'globals.css'), 'utf8');
      expect(globalsCss).not.toContain('@tailwind base');
      expect(globalsCss).not.toContain('@tailwind components');
      expect(globalsCss).not.toContain('@tailwind utilities');
      expect(globalsCss).toContain('font-family: -apple-system');
      
      expect(result.createdFiles).toContain(path.join(projectDir, 'src', 'pages', '_app.tsx'));
      expect(result.createdFiles).toContain(path.join(projectDir, 'src', 'styles', 'globals.css'));
      expect(result.createdDirectories).toContain(path.join(projectDir, 'src'));
      expect(result.createdDirectories).toContain(path.join(projectDir, 'src', 'pages'));
      expect(result.createdDirectories).toContain(path.join(projectDir, 'public'));
    });

    test('should create JavaScript structure with Tailwind', async () => {
      const projectDir = path.join(testDir, 'js-tailwind-project');
      fs.mkdirSync(projectDir);
      
      await createProjectStructure(projectDir, { 
        typescript: false, 
        tailwind: true 
      });
      
      expect(fs.existsSync(path.join(projectDir, 'src', 'pages', '_app.jsx'))).toBe(true);
      
      // Check JavaScript _app content
      const appContent = fs.readFileSync(path.join(projectDir, 'src', 'pages', '_app.jsx'), 'utf8');
      expect(appContent).toContain("import React from 'react';");
      expect(appContent).toContain("import '../styles/globals.css';");
      expect(appContent).toContain('export default function App({ Component, pageProps })');
      expect(appContent).not.toContain('AppProps'); // TypeScript type should not be present
      
      // Check that globals.css contains Tailwind directives
      const globalsCss = fs.readFileSync(path.join(projectDir, 'src', 'styles', 'globals.css'), 'utf8');
      expect(globalsCss).toContain('@tailwind base');
      expect(globalsCss).toContain('@tailwind components');
      expect(globalsCss).toContain('@tailwind utilities');
    });

    test('should handle directory creation errors', async () => {
      const projectDir = path.join(testDir, 'permission-error-project');
      fs.mkdirSync(projectDir);
      
      // Mock fs.mkdirp to throw error
      const originalMkdirp = fs.mkdirp;
      fs.mkdirp = jest.fn().mockRejectedValue(new Error('Permission denied for directory creation'));
      
      await expect(createProjectStructure(projectDir)).rejects.toThrow('Permission denied for directory creation');
      
      fs.mkdirp = originalMkdirp;
    });
  });

  describe('generatePackageJson with all options', () => {
    test('should generate package.json with all features enabled', async () => {
      const projectDir = path.join(testDir, 'full-features-project');
      fs.mkdirSync(projectDir);
      
      const packageJsonPath = await generatePackageJson(projectDir, {
        projectName: 'full-features-app',
        description: 'A comprehensive test app',
        author: 'Test Developer <test@example.com>',
        typescript: true,
        tailwind: true,
        eslint: true,
        templates: ['vercel-ai', 'supabase']
      });
      
      expect(packageJsonPath).toBe(path.join(projectDir, 'package.json'));
      
      const packageJson = fs.readJsonSync(packageJsonPath);
      expect(packageJson.name).toBe('full-features-app');
      expect(packageJson.description).toBe('A comprehensive test app');
      expect(packageJson.author).toBe('Test Developer <test@example.com>');
      
      // Check TypeScript dependencies
      expect(packageJson.devDependencies).toHaveProperty('typescript', '^5.0.0');
      expect(packageJson.devDependencies).toHaveProperty('@types/node', '^20.0.0');
      expect(packageJson.devDependencies).toHaveProperty('@types/react', '^18.0.0');
      expect(packageJson.devDependencies).toHaveProperty('@types/react-dom', '^18.0.0');
      
      // Check Tailwind dependencies
      expect(packageJson.devDependencies).toHaveProperty('tailwindcss', '^3.3.0');
      expect(packageJson.devDependencies).toHaveProperty('autoprefixer', '^10.4.16');
      expect(packageJson.devDependencies).toHaveProperty('postcss', '^8.4.31');
      
      // Check ESLint dependencies
      expect(packageJson.devDependencies).toHaveProperty('eslint', '^8.0.0');
      expect(packageJson.devDependencies).toHaveProperty('eslint-config-next', '^14.0.0');
    });

    test('should use default description when not provided', async () => {
      const projectDir = path.join(testDir, 'default-desc-project');
      fs.mkdirSync(projectDir);
      
      await generatePackageJson(projectDir, {
        projectName: 'test-app',
        // description not provided
        author: 'Test Author'
      });
      
      const packageJson = fs.readJsonSync(path.join(projectDir, 'package.json'));
      expect(packageJson.description).toBe('A Next.js application created with capx-compose');
      expect(packageJson.author).toBe('Test Author');
    });

    test('should handle minimal configuration', async () => {
      const projectDir = path.join(testDir, 'minimal-project');
      fs.mkdirSync(projectDir);
      
      await generatePackageJson(projectDir, {
        typescript: false,
        tailwind: false,
        eslint: false
      });
      
      const packageJson = fs.readJsonSync(path.join(projectDir, 'package.json'));
      expect(packageJson.name).toBe('next-app'); // default name
      expect(packageJson.author).toBe(''); // default empty author
      expect(packageJson.devDependencies).toEqual({}); // no dev dependencies
      expect(packageJson.dependencies).toHaveProperty('next');
      expect(packageJson.dependencies).toHaveProperty('react');
      expect(packageJson.dependencies).toHaveProperty('react-dom');
    });
  });

  describe('generateDynamicIndexPage', () => {
    test('should generate default index page when no templates provided', async () => {
      const projectDir = path.join(testDir, 'default-index-project');
      const srcPagesDir = path.join(projectDir, 'src', 'pages');
      fs.mkdirSync(srcPagesDir, { recursive: true });
      
      const indexPath = await generateDynamicIndexPage(projectDir, [], { typescript: true });
      
      expect(indexPath).toBe(path.join(srcPagesDir, 'index.tsx'));
      expect(fs.existsSync(indexPath)).toBe(true);
      
      const content = fs.readFileSync(indexPath, 'utf8');
      expect(content).toContain("import React from 'react';");
      expect(content).toContain('export default function Home()');
      expect(content).toContain('<h1>Welcome to Next.js!</h1>');
    });

    test('should generate JavaScript index page when TypeScript disabled', async () => {
      const projectDir = path.join(testDir, 'js-index-project');
      const srcPagesDir = path.join(projectDir, 'src', 'pages');
      fs.mkdirSync(srcPagesDir, { recursive: true });
      
      const indexPath = await generateDynamicIndexPage(projectDir, [], { typescript: false });
      
      expect(indexPath).toBe(path.join(srcPagesDir, 'index.jsx'));
      expect(fs.existsSync(indexPath)).toBe(true);
    });

    test('should generate dynamic index page with template navigation', async () => {
      const projectDir = path.join(testDir, 'template-index-project');
      const srcPagesDir = path.join(projectDir, 'src', 'pages');
      fs.mkdirSync(srcPagesDir, { recursive: true });
      
      const templates = [
        {
          config: {
            name: 'vercel-ai',
            displayName: 'Vercel AI',
            description: 'AI-powered chat interface',
            route: '/vercel-ai'
          }
        },
        {
          config: {
            name: 'supabase',
            description: 'Database integration with authentication'
          }
        }
      ];
      
      const indexPath = await generateDynamicIndexPage(projectDir, templates, { typescript: true });
      
      const content = fs.readFileSync(indexPath, 'utf8');
      expect(content).toContain("import Link from 'next/link'");
      expect(content).toContain('Welcome to Your AI-Powered App!');
      expect(content).toContain('🚀 Vercel AI');
      expect(content).toContain('AI-powered chat interface');
      expect(content).toContain('href="/vercel-ai"');
      expect(content).toContain('🚀 Supabase');
      expect(content).toContain('Database integration with authentication');
      expect(content).toContain('Available Templates');
      expect(content).toContain('Getting Started');
      expect(content).toContain('📦 Install Dependencies');
      expect(content).toContain('🔧 Configure Environment');
      expect(content).toContain('🚀 Start Development');
    });

    test('should handle templates with missing config gracefully', async () => {
      const projectDir = path.join(testDir, 'broken-template-project');
      const srcPagesDir = path.join(projectDir, 'src', 'pages');
      fs.mkdirSync(srcPagesDir, { recursive: true });
      
      const templates = [
        { config: null }, // Invalid config
        { config: { name: 'valid-template', description: 'Valid template' } },
        { config: {} }, // Empty config
        { config: { name: 'another-valid', displayName: 'Another Valid' } }
      ];
      
      const indexPath = await generateDynamicIndexPage(projectDir, templates, { typescript: true });
      
      const content = fs.readFileSync(indexPath, 'utf8');
      // Should only include valid templates
      expect(content).toContain('🚀 Valid-template'); // auto-capitalized
      expect(content).toContain('Valid template');
      expect(content).toContain('🚀 Another Valid');
      expect(content).toContain('Another Valid integration template'); // default description
      // Should not contain content for invalid configs
      expect(content).not.toContain('null');
      expect(content).not.toContain('undefined');
    });
  });

  describe('generateSampleEnv edge cases', () => {
    test('should return null when no environment variables provided', async () => {
      const projectDir = path.join(testDir, 'no-env-project');
      fs.mkdirSync(projectDir);
      
      const result = await generateSampleEnv(projectDir, []);
      
      expect(result).toBeNull();
      expect(fs.existsSync(path.join(projectDir, 'sample.env'))).toBe(false);
    });

    test('should return null when envVars is undefined', async () => {
      const projectDir = path.join(testDir, 'undefined-env-project');
      fs.mkdirSync(projectDir);
      
      const result = await generateSampleEnv(projectDir);
      
      expect(result).toBeNull();
    });

    test('should generate file with mixed environment variables', async () => {
      const projectDir = path.join(testDir, 'mixed-env-project');
      fs.mkdirSync(projectDir);
      
      const envVars = [
        { name: 'API_KEY', description: 'Your API key' },
        { name: 'NO_DESCRIPTION_VAR' }, // No description property
        { name: 'ANOTHER_KEY', description: 'Another key with description' },
        { name: 'EMPTY_DESC', description: '' } // Empty description
      ];
      
      const envPath = await generateSampleEnv(projectDir, envVars);
      
      expect(envPath).toBe(path.join(projectDir, 'sample.env'));
      
      const content = fs.readFileSync(envPath, 'utf8');
      expect(content).toContain('# Your API key\nAPI_KEY=');
      expect(content).toContain('NO_DESCRIPTION_VAR='); // No comment line
      expect(content).toContain('# Another key with description\nANOTHER_KEY=');
      expect(content).toContain('EMPTY_DESC='); // Empty description should not add comment
      expect(content).not.toContain('#  \n'); // No empty comment lines
    });
  });
}); 