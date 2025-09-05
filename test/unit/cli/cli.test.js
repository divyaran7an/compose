const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const os = require('os');

// Mock heavy operations for faster testing
jest.mock('../../../lib/install', () => ({
  ...jest.requireActual('../lib/install'),
  installProjectDependencies: jest.fn().mockResolvedValue({
    success: true,
    data: { packageManager: 'npm' },
    warnings: []
  })
}));

jest.mock('../../../lib/template-processor', () => ({
  ...jest.requireActual('../lib/template-processor'),
  DependencyMerger: jest.fn().mockImplementation(() => ({
    mergeDependencies: jest.fn().mockResolvedValue({
      dependencies: { 'next': '^14.0.0', 'react': '^18.0.0' },
      devDependencies: { 'typescript': '^5.0.0' }
    })
  }))
}));

describe('CLI Scaffolding', () => {
  let testDir;
  let originalCwd;
  let originalNodeEnv;

  beforeEach(() => {
    // Create a temporary directory for each test
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'capx-compose-test-'));
    originalCwd = process.cwd();
    originalNodeEnv = process.env.NODE_ENV;
    
    // Set test environment to speed up operations
    process.env.NODE_ENV = 'test';
    process.chdir(testDir);
    
    // Cleanup async operations
    if (global.cleanupAsyncOperations) {
      global.cleanupAsyncOperations();
    }
  });

  afterEach(() => {
    // Cleanup async operations
    if (global.cleanupAsyncOperations) {
      global.cleanupAsyncOperations();
    }
    
    // Clean up
    process.chdir(originalCwd);
    process.env.NODE_ENV = originalNodeEnv;
    
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('project name validation', () => {
    test('should reject invalid project names', () => {
      const invalidNames = [
        'UPPERCASE',
        'with spaces',
        'with.dots',
        'with_underscores',
        '_leading-underscore',
        '.leading-dot',
        'node_modules',
        'package.json',
        'a'.repeat(215), // too long
      ];

      invalidNames.forEach(name => {
        expect(() => {
          execSync(`node ${path.join(originalCwd, 'bin/capx-compose.js')} "${name}" --yes --skip-install`, {
            stdio: 'pipe',
            cwd: originalCwd,
            timeout: 10000 // 10 second timeout
          });
        }).toThrow();
      });
    });

    test('should accept valid project names', () => {
      const validNames = [
        'my-app',
        'myapp',
        'my-app-123',
      ];

      validNames.forEach(name => {
        expect(() => {
          execSync(`node ${path.join(originalCwd, 'bin/capx-compose.js')} "${name}" --yes --skip-install`, {
            stdio: 'pipe',
            cwd: testDir,
            timeout: 10000 // 10 second timeout
          });
        }).not.toThrow();
        
        // Clean up created project
        const projectPath = path.join(testDir, name);
        if (fs.existsSync(projectPath)) {
          fs.rmSync(projectPath, { recursive: true, force: true });
        }
      });
    });
  });

  describe('basic scaffolding', () => {
    test('should scaffold supabase project correctly', () => {
      const projectName = 'test-supabase';
      
      execSync(`node ${path.join(originalCwd, 'bin/capx-compose.js')} ${projectName} --yes --plugins=supabase --skip-install`, {
        stdio: 'pipe',
        cwd: testDir,
        timeout: 30000 // 30 second timeout
      });

      const projectPath = path.join(testDir, projectName);
      
      // Check basic project structure
      expect(fs.existsSync(projectPath)).toBe(true);
      expect(fs.existsSync(path.join(projectPath, 'package.json'))).toBe(true);
      expect(fs.existsSync(path.join(projectPath, 'README.md'))).toBe(true);
      
      // Check supabase-specific files
      expect(fs.existsSync(path.join(projectPath, 'src/pages/supabase.tsx'))).toBe(true);
      expect(fs.existsSync(path.join(projectPath, 'src/pages/supabase-auth.tsx'))).toBe(true);
      expect(fs.existsSync(path.join(projectPath, 'schema.sql'))).toBe(true);
      
      // Check package.json contains supabase dependencies
      const packageJson = JSON.parse(fs.readFileSync(path.join(projectPath, 'package.json'), 'utf8'));
      expect(packageJson.dependencies).toHaveProperty('@supabase/supabase-js');
      expect(packageJson.dependencies).toHaveProperty('next');
      expect(packageJson.dependencies).toHaveProperty('react');
      expect(packageJson.dependencies).toHaveProperty('react-dom');
    });

    test('should scaffold vercel-ai project correctly', () => {
      const projectName = 'test-vercel-ai';
      
      execSync(`node ${path.join(originalCwd, 'bin/capx-compose.js')} ${projectName} --yes --plugins=vercel-ai --skip-install`, {
        stdio: 'pipe',
        cwd: testDir,
        timeout: 30000 // 30 second timeout
      });

      const projectPath = path.join(testDir, projectName);
      
      // Check basic project structure
      expect(fs.existsSync(projectPath)).toBe(true);
      expect(fs.existsSync(path.join(projectPath, 'package.json'))).toBe(true);
      expect(fs.existsSync(path.join(projectPath, 'README.md'))).toBe(true);
      
      // Check vercel-ai specific files
      expect(fs.existsSync(path.join(projectPath, 'src/pages/vercel-ai.tsx'))).toBe(true);
      expect(fs.existsSync(path.join(projectPath, 'src/pages/api/chat.ts'))).toBe(true);
      
      // Check package.json contains vercel-ai dependencies
      const packageJson = JSON.parse(fs.readFileSync(path.join(projectPath, 'package.json'), 'utf8'));
      expect(packageJson.dependencies).toHaveProperty('ai');
      expect(packageJson.dependencies).toHaveProperty('@ai-sdk/openai');
      expect(packageJson.dependencies).toHaveProperty('next');
      expect(packageJson.dependencies).toHaveProperty('react');
      expect(packageJson.dependencies).toHaveProperty('react-dom');
    });
  });

  describe('error handling', () => {
    test('should reject non-existent plugin with validation error', () => {
      const projectName = 'test-invalid';
      
      // Should throw validation error for invalid plugin
      expect(() => {
        execSync(`node ${path.join(originalCwd, 'bin/capx-compose.js')} ${projectName} --yes --plugins=non-existent --skip-install`, {
          stdio: 'pipe',
          cwd: testDir,
          encoding: 'utf8',
          timeout: 10000
        });
      }).toThrow();

      // Project should not be created
      const projectPath = path.join(testDir, projectName);
      expect(fs.existsSync(projectPath)).toBe(false);
    });

    test('should reject invalid plugin combinations', () => {
      const projectName = 'test-invalid-combo';
      
      // Should throw validation error for multiple databases
      expect(() => {
        execSync(`node ${path.join(originalCwd, 'bin/capx-compose.js')} ${projectName} --yes --plugins=supabase,firebase --skip-install`, {
          stdio: 'pipe',
          cwd: testDir,
          encoding: 'utf8',
          timeout: 10000
        });
      }).toThrow();

      // Project should not be created
      const projectPath = path.join(testDir, projectName);
      expect(fs.existsSync(projectPath)).toBe(false);
    });

    test('should reject too many plugins', () => {
      const projectName = 'test-too-many';
      
      // Should throw validation error for more than 4 plugins
      expect(() => {
        execSync(`node ${path.join(originalCwd, 'bin/capx-compose.js')} ${projectName} --yes --plugins=supabase,evm,vercel-ai,vercel-kv,firebase --skip-install`, {
          stdio: 'pipe',
          cwd: testDir,
          encoding: 'utf8',
          timeout: 10000
        });
      }).toThrow();

      // Project should not be created
      const projectPath = path.join(testDir, projectName);
      expect(fs.existsSync(projectPath)).toBe(false);
    });
  });

  describe('CLI options', () => {
    test('should handle --yes flag correctly', () => {
      const projectName = 'test-yes-flag';
      
      // Should complete without user interaction
      execSync(`node ${path.join(originalCwd, 'bin/capx-compose.js')} ${projectName} --yes --skip-install`, {
        stdio: 'pipe',
        cwd: testDir,
        timeout: 20000
      });

      const projectPath = path.join(testDir, projectName);
      expect(fs.existsSync(projectPath)).toBe(true);
    });

    test('should handle --plugins flag correctly', () => {
      const projectName = 'test-plugins-flag';
      
      execSync(`node ${path.join(originalCwd, 'bin/capx-compose.js')} ${projectName} --yes --plugins=supabase --skip-install`, {
        stdio: 'pipe',
        cwd: testDir,
        timeout: 20000
      });

      const projectPath = path.join(testDir, projectName);
      expect(fs.existsSync(projectPath)).toBe(true);
      expect(fs.existsSync(path.join(projectPath, 'src/pages/supabase.tsx'))).toBe(true);
    });

    test('should handle Web3 combinations correctly', () => {
      const projectName = 'test-web3-combo';
      
      execSync(`node ${path.join(originalCwd, 'bin/capx-compose.js')} ${projectName} --yes --plugins=supabase,evm,vercel-ai --skip-install`, {
        stdio: 'pipe',
        cwd: testDir,
        timeout: 30000
      });

      const projectPath = path.join(testDir, projectName);
      expect(fs.existsSync(projectPath)).toBe(true);
      expect(fs.existsSync(path.join(projectPath, 'src/pages/supabase.tsx'))).toBe(true);
      expect(fs.existsSync(path.join(projectPath, 'src/pages/evm.tsx'))).toBe(true);
      expect(fs.existsSync(path.join(projectPath, 'src/pages/vercel-ai.tsx'))).toBe(true);
    });

    test('should handle individual templates correctly', () => {
      const projectName = 'test-individual';
      
      execSync(`node ${path.join(originalCwd, 'bin/capx-compose.js')} ${projectName} --yes --plugins=vercel-ai --skip-install`, {
        stdio: 'pipe',
        cwd: testDir,
        timeout: 20000
      });

      const projectPath = path.join(testDir, projectName);
      expect(fs.existsSync(projectPath)).toBe(true);
      expect(fs.existsSync(path.join(projectPath, 'src/pages/vercel-ai.tsx'))).toBe(true);
    });

    test('should handle --silent flag correctly', () => {
      const projectName = 'test-silent-flag';
      
      // Capture output to verify silent mode
      const output = execSync(`node ${path.join(originalCwd, 'bin/capx-compose.js')} ${projectName} --yes --plugins=supabase --silent --skip-install`, {
        encoding: 'utf8',
        cwd: testDir,
        timeout: 20000
      });

      const projectPath = path.join(testDir, projectName);
      expect(fs.existsSync(projectPath)).toBe(true);
      expect(fs.existsSync(path.join(projectPath, 'package.json'))).toBe(true);
      
      // Verify silent mode suppresses enhanced output
      expect(output).not.toContain('📋 NEXT STEPS GUIDE');
      expect(output).not.toContain('🔑 REQUIRED ENVIRONMENT VARIABLES');
      expect(output).not.toContain('✨ FEATURES TO EXPLORE');
      expect(output).not.toContain('💡 TESTING GUIDANCE');
      expect(output).not.toContain('Happy coding! 🎉');
      
      // Should still contain essential creation info
      expect(output).toContain('Creating project:');
      expect(output).toContain('Plugins: supabase');
    });

    test('should show enhanced output without --silent flag', () => {
      const projectName = 'test-enhanced-output';
      
      // Capture output to verify enhanced mode
      const output = execSync(`node ${path.join(originalCwd, 'bin/capx-compose.js')} ${projectName} --yes --plugins=supabase --skip-install`, {
        encoding: 'utf8',
        cwd: testDir,
        timeout: 20000
      });

      const projectPath = path.join(testDir, projectName);
      expect(fs.existsSync(projectPath)).toBe(true);
      
      // Verify enhanced output is shown
      expect(output).toContain('📋 NEXT STEPS GUIDE');
      expect(output).toContain('🔑 REQUIRED ENVIRONMENT VARIABLES');
      expect(output).toContain('✨ FEATURES TO EXPLORE');
      expect(output).toContain('💡 TESTING GUIDANCE');
      expect(output).toContain('Happy coding! 🎉');
      
      // Should also contain essential creation info
      expect(output).toContain('Creating project:');
      expect(output).toContain('Plugins: supabase');
    });

    test('should handle --silent flag with enhanced output suppression', () => {
      const projectName = 'test-silent-enhanced';
      
      // Capture output to verify silent mode suppresses enhanced output
      const output = execSync(`node ${path.join(originalCwd, 'bin/capx-compose.js')} ${projectName} --yes --plugins=supabase --silent --skip-install`, {
        encoding: 'utf8',
        cwd: testDir,
        timeout: 20000
      });

      const projectPath = path.join(testDir, projectName);
      expect(fs.existsSync(projectPath)).toBe(true);
      expect(fs.existsSync(path.join(projectPath, 'package.json'))).toBe(true);
      
      // Verify silent mode suppresses enhanced output
      expect(output).not.toContain('📋 NEXT STEPS GUIDE');
      expect(output).not.toContain('🔑 REQUIRED ENVIRONMENT VARIABLES');
      expect(output).not.toContain('✨ FEATURES TO EXPLORE');
      expect(output).not.toContain('💡 TESTING GUIDANCE');
      expect(output).not.toContain('Happy coding! 🎉');
      
      // Should contain basic project creation info
      expect(output).toContain('Creating project:');
      expect(output).toContain('Plugins: supabase');
    });

    test('should handle --silent flag with multiple plugins', () => {
      const projectName = 'test-silent-multi';
      
      const output = execSync(`node ${path.join(originalCwd, 'bin/capx-compose.js')} ${projectName} --yes --plugins=supabase,vercel-ai --silent --skip-install`, {
        encoding: 'utf8',
        cwd: testDir,
        timeout: 20000
      });

      const projectPath = path.join(testDir, projectName);
      expect(fs.existsSync(projectPath)).toBe(true);
      
      // Verify silent mode works with multiple plugins
      expect(output).not.toContain('📋 NEXT STEPS GUIDE');
      expect(output).toContain('Creating project:');
      expect(output).toContain('Plugins: supabase, vercel-ai');
    });

    test('should show enhanced output when silent flag is not used', () => {
      const projectName = 'test-verbose-output';
      
      const output = execSync(`node ${path.join(originalCwd, 'bin/capx-compose.js')} ${projectName} --yes --plugins=supabase --skip-install`, {
        encoding: 'utf8',
        cwd: testDir,
        timeout: 20000
      });

      const projectPath = path.join(testDir, projectName);
      expect(fs.existsSync(projectPath)).toBe(true);
      
      // Verify enhanced output is shown when not silent
      expect(output).toContain('📋 NEXT STEPS GUIDE');
      expect(output).toContain('🔑 REQUIRED ENVIRONMENT VARIABLES');
      expect(output).toContain('✨ FEATURES TO EXPLORE');
      expect(output).toContain('💡 TESTING GUIDANCE');
      expect(output).toContain('Happy coding! 🎉');
    });

    test('should handle dependency strategy option', () => {
      const projectName = 'test-dependency-strategy';
      
      const output = execSync(`node ${path.join(originalCwd, 'bin/capx-compose.js')} ${projectName} --yes --plugins=supabase --dependency-strategy=highest --silent --skip-install`, {
        encoding: 'utf8',
        cwd: testDir,
        timeout: 20000
      });

      const projectPath = path.join(testDir, projectName);
      expect(fs.existsSync(projectPath)).toBe(true);
      expect(output).toContain('Creating project:');
      expect(output).toContain('Plugins: supabase');
    });
  });
}); 