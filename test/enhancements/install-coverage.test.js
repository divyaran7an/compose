const fs = require('fs-extra');
const path = require('path');
const { spawn } = require('child_process');

// Import install module functions
const {
  isPackageManagerAvailable,
  detectAvailablePackageManagers,
  detectPreferredPackageManager,
  getPackageManager,
  readPackageJson,
  validatePackageJson,
  mergeDependencies,
  updatePackageJson,
  writePackageJson,
  prepareDependencies,
  installProjectDependencies
} = require('../../lib/install');

describe('Install Module Coverage Tests', () => {
  let tempDir;

  beforeEach(async () => {
    tempDir = path.join(__dirname, `temp-install-${Date.now()}`);
    await fs.ensureDir(tempDir);
  });

  afterEach(async () => {
    if (tempDir && await fs.pathExists(tempDir)) {
      await fs.remove(tempDir);
    }
  });

  describe('Package Manager Detection', () => {
    test('should check npm availability', async () => {
      const npmConfig = {
        name: 'npm',
        command: 'npm',
        checkCommand: ['--version']
      };
      
      const isAvailable = await isPackageManagerAvailable(npmConfig);
      expect(typeof isAvailable).toBe('boolean');
    });

    test('should handle non-existent package manager', async () => {
      const fakeConfig = {
        name: 'fake-pm',
        command: 'fake-package-manager-that-does-not-exist',
        checkCommand: ['--version']
      };
      
      const isAvailable = await isPackageManagerAvailable(fakeConfig);
      expect(isAvailable).toBe(false);
    });

    test('should detect available package managers', async () => {
      const managers = await detectAvailablePackageManagers();
      expect(Array.isArray(managers)).toBe(true);
      // At least one package manager should be available
      expect(managers.length).toBeGreaterThan(0);
    });

    test('should detect preferred package manager from lock files', async () => {
      // Create a test project with package-lock.json
      const testProjectDir = path.join(tempDir, 'test-project');
      await fs.ensureDir(testProjectDir);
      await fs.writeFile(path.join(testProjectDir, 'package-lock.json'), '{}');
      
      const preferred = await detectPreferredPackageManager(testProjectDir);
      expect(preferred).toBe('npm'); // Returns string, not object
    });

    test('should handle directory without lock files', async () => {
      const testProjectDir = path.join(tempDir, 'no-lock-project');
      await fs.ensureDir(testProjectDir);
      
      const preferred = await detectPreferredPackageManager(testProjectDir);
      expect(preferred).toBeNull(); // Returns null when no lock files found
    });

    test('should get package manager with default options', async () => {
      const pm = await getPackageManager();
      expect(pm).toBeDefined();
      expect(pm.name).toBeDefined();
      expect(pm.command).toBeDefined();
    });

    test('should get specific package manager', async () => {
      const pm = await getPackageManager({ preferred: 'npm' });
      expect(pm.name).toBe('npm');
    });

    test('should handle invalid package manager preference', async () => {
      const pm = await getPackageManager({ preferred: 'invalid-pm' });
      expect(pm).toBeDefined(); // Should fallback to available manager
    });
  });

  describe('Package.json Operations', () => {
    test('should read existing package.json', async () => {
      const testProjectDir = path.join(tempDir, 'read-test');
      await fs.ensureDir(testProjectDir);
      
      const testPackageJson = {
        name: 'test-project',
        version: '1.0.0',
        dependencies: { react: '^18.0.0' }
      };
      
      await fs.writeJson(path.join(testProjectDir, 'package.json'), testPackageJson);
      
      const result = await readPackageJson(testProjectDir);
      expect(result.name).toBe('test-project');
      expect(result.dependencies.react).toBe('^18.0.0');
    });

    test('should handle missing package.json', async () => {
      const testProjectDir = path.join(tempDir, 'missing-package');
      await fs.ensureDir(testProjectDir);
      
      const result = await readPackageJson(testProjectDir);
      // readPackageJson returns a default package.json structure when file doesn't exist
      expect(result).toBeDefined();
      expect(result.name).toBe('missing-package');
      expect(result.version).toBe('0.1.0');
    });

    test('should handle invalid JSON', async () => {
      const testProjectDir = path.join(tempDir, 'invalid-json');
      await fs.ensureDir(testProjectDir);
      
      await fs.writeFile(path.join(testProjectDir, 'package.json'), 'invalid json content');
      
      // readPackageJson handles invalid JSON gracefully and returns default structure
      const result = await readPackageJson(testProjectDir);
      expect(result).toBeDefined();
      expect(result.name).toBe('invalid-json');
    });

    test('should validate valid package.json', () => {
      const validPackageJson = {
        name: 'test-project',
        version: '1.0.0',
        scripts: { dev: 'next dev' },
        dependencies: { react: '^18.0.0' }
      };
      
      const result = validatePackageJson(validPackageJson);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should validate invalid package.json', () => {
      const invalidPackageJson = {
        // Missing required fields
        description: 'A test project'
      };
      
      const result = validatePackageJson(invalidPackageJson);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    test('should handle null input', () => {
      const result = validatePackageJson(null);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Package.json must be a valid object');
    });

    test('should write package.json to disk', async () => {
      const testProjectDir = path.join(tempDir, 'write-test');
      await fs.ensureDir(testProjectDir);
      
      const packageJson = {
        name: 'test-project',
        version: '1.0.0',
        dependencies: { react: '^18.0.0' }
      };
      
      await writePackageJson(testProjectDir, packageJson);
      
      const written = await fs.readJson(path.join(testProjectDir, 'package.json'));
      expect(written.name).toBe('test-project');
      expect(written.dependencies.react).toBe('^18.0.0');
    });
  });

  describe('Dependency Management', () => {
    test('should merge dependencies correctly', () => {
      const baseDeps = { react: '^18.0.0', lodash: '^4.0.0' };
      const newDeps = { react: '^18.2.0', axios: '^1.0.0' };
      
      const result = mergeDependencies(baseDeps, newDeps);
      
      // mergeDependencies keeps existing versions by default
      expect(result.react).toBe('^18.0.0'); // Should keep existing
      expect(result.lodash).toBe('^4.0.0'); // Should keep existing
      expect(result.axios).toBe('^1.0.0'); // Should add new
    });

    test('should handle empty dependencies', () => {
      const result = mergeDependencies({}, { react: '^18.0.0' });
      expect(result.react).toBe('^18.0.0');
    });

    test('should handle undefined dependencies', () => {
      const result = mergeDependencies(undefined, { react: '^18.0.0' });
      expect(result.react).toBe('^18.0.0');
    });

    test('should handle merge options', () => {
      const baseDeps = { react: '^18.0.0' };
      const newDeps = { react: '^17.0.0' };
      
      const result = mergeDependencies(baseDeps, newDeps, { overwrite: true });
      expect(result.react).toBe('^17.0.0'); // Should overwrite when option is set
    });

    test('should prepare dependencies from template configs', () => {
      const selectedPackages = ['supabase', 'vercel-ai'];
      const templateConfigs = {
        supabase: {
          dependencies: {
            dependencies: { '@supabase/supabase-js': '^2.0.0' }
          }
        },
        'vercel-ai': {
          dependencies: {
            dependencies: { 'ai': '^3.0.0' },
            devDependencies: { '@types/node': '^20.0.0' }
          }
        }
      };
      
      const result = prepareDependencies(selectedPackages, templateConfigs);
      
      // prepareDependencies includes default Next.js dependencies
      expect(result.dependencies.next).toBe('^14.0.0');
      expect(result.dependencies.react).toBe('^18.0.0');
      expect(result.dependencies['@supabase/supabase-js']).toBe('^2.0.0');
      expect(result.dependencies.ai).toBe('^3.0.0');
    });

    test('should handle empty inputs', () => {
      const result = prepareDependencies([], {});
      // prepareDependencies always includes default Next.js dependencies
      expect(result.dependencies.next).toBe('^14.0.0');
      expect(result.dependencies.react).toBe('^18.0.0');
      expect(result.devDependencies.typescript).toBe('^5.0.0');
    });

    test('should update package.json with new dependencies', async () => {
      const testProjectDir = path.join(tempDir, 'update-test');
      await fs.ensureDir(testProjectDir);
      
      const initialPackageJson = {
        name: 'test-project',
        version: '1.0.0',
        dependencies: { react: '^18.0.0' }
      };
      
      await fs.writeJson(path.join(testProjectDir, 'package.json'), initialPackageJson);
      
      const newDependencies = {
        dependencies: { axios: '^1.0.0' },
        devDependencies: { jest: '^29.0.0' }
      };
      
      const result = await updatePackageJson(testProjectDir, newDependencies);
      
      expect(result.dependencies.react).toBe('^18.0.0'); // Existing should remain
      expect(result.dependencies.axios).toBe('^1.0.0'); // New should be added
      expect(result.devDependencies.jest).toBe('^29.0.0'); // DevDeps should be added
    });

    test('should create package.json if it does not exist', async () => {
      const testProjectDir = path.join(tempDir, 'create-test');
      await fs.ensureDir(testProjectDir);
      
      const newDependencies = {
        dependencies: { react: '^18.0.0' }
      };
      
      const result = await updatePackageJson(testProjectDir, newDependencies, {
        projectName: 'new-project'
      });
      
      // updatePackageJson uses directory name when no existing package.json
      expect(result.name).toBe('create-test');
      expect(result.dependencies.react).toBe('^18.0.0');
    });
  });

  describe('Installation Process', () => {
    test('should handle installation process', async () => {
      const testProjectDir = path.join(tempDir, 'install-test');
      await fs.ensureDir(testProjectDir);
      
      const packageJson = {
        name: 'test-project',
        version: '1.0.0',
        dependencies: { react: '^18.0.0' }
      };
      
      await fs.writeJson(path.join(testProjectDir, 'package.json'), packageJson);
      
      // Test with silent mode and short timeout to avoid actual installation
      const result = await installProjectDependencies(
        testProjectDir,
        [],
        {},
        { silent: true, timeout: 100 } // Very short timeout to fail quickly
      );
      
      // The function will either succeed (if no packages to install) or fail due to timeout
      expect(result).toBeDefined();
      expect(typeof result.success).toBe('boolean');
    }, 5000);
  });

  describe('Error Handling', () => {
    test('should handle file system errors gracefully', async () => {
      // Test with non-existent directory
      const nonExistentDir = path.join(tempDir, 'non-existent', 'deeply', 'nested');
      
      const result = await readPackageJson(nonExistentDir);
      // readPackageJson returns default structure even for non-existent directories
      expect(result).toBeDefined();
      expect(result.name).toBe('nested');
    });

    test('should handle permission errors', async () => {
      // This test might not work on all systems, so we'll make it conditional
      if (process.platform !== 'win32') {
        const restrictedDir = path.join(tempDir, 'restricted');
        await fs.ensureDir(restrictedDir);
        
        // Create a file and remove read permissions
        const packageJsonPath = path.join(restrictedDir, 'package.json');
        await fs.writeJson(packageJsonPath, { name: 'test' });
        
        try {
          await fs.chmod(packageJsonPath, 0o000);
          
          // readPackageJson handles permission errors gracefully
          const result = await readPackageJson(restrictedDir);
          expect(result).toBeDefined();
          expect(result.name).toBe('restricted');
          
          // Restore permissions for cleanup
          await fs.chmod(packageJsonPath, 0o644);
        } catch (error) {
          // If chmod fails, skip this test
          console.log('Skipping permission test due to filesystem limitations');
        }
      }
    });
  });
}); 