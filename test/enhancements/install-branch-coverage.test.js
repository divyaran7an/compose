const fs = require('fs-extra');
const path = require('path');
const os = require('os');
const { spawn } = require('child_process');

// Mock child_process and other dependencies
jest.mock('child_process');
jest.mock('ora');

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
  restorePackageJsonBackup,
  installProjectDependencies,
  InstallationProgressUI,
  PackageInstallationExecutor,
  InstallationResult,
  ErrorHandler,
  PACKAGE_MANAGERS,
  createProgressUI,
  simulateInstallation
} = require('../../lib/install');

const ora = require('ora');

describe('Install.js Branch Coverage Enhancement', () => {
  let tempDir;
  let mockSpinner;
  let consoleLogSpy;
  let consoleWarnSpy;
  let consoleErrorSpy;
  let consoleInfoSpy;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'install-branch-test-'));
    
    // Mock spinner
    mockSpinner = {
      start: jest.fn().mockReturnThis(),
      stop: jest.fn().mockReturnThis(),
      succeed: jest.fn().mockReturnThis(),
      fail: jest.fn().mockReturnThis(),
      warn: jest.fn().mockReturnThis(),
      info: jest.fn().mockReturnThis(),
      text: ''
    };
    ora.mockReturnValue(mockSpinner);

    // Spy on console methods
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    consoleInfoSpy = jest.spyOn(console, 'info').mockImplementation();

    jest.clearAllMocks();
  });

  afterEach(async () => {
    // Cleanup
    if (tempDir && await fs.pathExists(tempDir)) {
      await fs.remove(tempDir);
    }
    
    // Restore console methods
    consoleLogSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    consoleInfoSpy.mockRestore();
    
    jest.clearAllMocks();
  });

  describe('InstallationProgressUI Branch Coverage', () => {
    test('should handle silent mode in all UI methods', () => {
      const progressUI = new InstallationProgressUI(PACKAGE_MANAGERS.npm, { silent: true });
      
      // All these methods should handle silent mode
      progressUI.start('test message');
      progressUI.updatePhase('DOWNLOADING');
      progressUI.updateMessage('custom message');
      progressUI.succeed('success message');
      progressUI.fail('error message');
      progressUI.warn('warning message');
      progressUI.info('info message');
      progressUI.verbose('verbose message');
      
      // Should not create spinner in silent mode
      expect(ora).not.toHaveBeenCalled();
    });

    test('should handle silent=false but no spinner scenario', () => {
      const progressUI = new InstallationProgressUI(PACKAGE_MANAGERS.npm, { silent: false });
      
      // Methods called without starting spinner first (spinner is null)
      progressUI.updatePhase('DOWNLOADING');
      progressUI.updateMessage('custom message');
      progressUI.succeed('success message');
      progressUI.fail('error message');
      progressUI.warn('warning message');
      progressUI.info('info message');
      
      // Should log to console instead of using spinner
      expect(consoleLogSpy).toHaveBeenCalledWith('success message');
      expect(consoleErrorSpy).toHaveBeenCalledWith('error message');
      expect(consoleWarnSpy).toHaveBeenCalledWith('warning message');
      expect(consoleInfoSpy).toHaveBeenCalledWith('info message');
    });

    test('should handle elapsed time formatting branches', () => {
      const progressUI = new InstallationProgressUI(PACKAGE_MANAGERS.npm, { silent: false });
      
      // Test when startTime is null
      const elapsedNoStart = progressUI.getElapsedTime();
      expect(elapsedNoStart).toBe('');
      
      // Test seconds formatting (< 60 seconds)
      progressUI.startTime = Date.now() - 30000; // 30 seconds ago
      const elapsedSeconds = progressUI.getElapsedTime();
      expect(elapsedSeconds).toMatch(/\(\d+s\)/);
      
      // Test minutes formatting (>= 60 seconds)
      progressUI.startTime = Date.now() - 150000; // 2.5 minutes ago
      const elapsedMinutes = progressUI.getElapsedTime();
      expect(elapsedMinutes).toMatch(/\(\d+m \d+s\)/);
    });

    test('should handle verbose mode branches', () => {
      const progressUIVerbose = new InstallationProgressUI(PACKAGE_MANAGERS.npm, { verbose: true, silent: false });
      const progressUINotVerbose = new InstallationProgressUI(PACKAGE_MANAGERS.npm, { verbose: false, silent: false });
      
      progressUIVerbose.verbose('verbose message');
      progressUINotVerbose.verbose('verbose message');
      
      expect(consoleLogSpy).toHaveBeenCalledWith('[VERBOSE] verbose message');
      expect(consoleLogSpy).toHaveBeenCalledTimes(1); // Only verbose true should log
    });

    test('should handle cleanup and interruption', () => {
      const progressUI = new InstallationProgressUI(PACKAGE_MANAGERS.npm, { silent: false });
      progressUI.start();
      
      // Test interruption handling
      progressUI.handleInterruption();
      expect(mockSpinner.fail).toHaveBeenCalledWith('Installation interrupted by user');
      
      // Test cleanup
      progressUI.cleanup();
      expect(progressUI.spinner).toBeNull();
      expect(progressUI.startTime).toBeNull();
      expect(progressUI.currentPhase).toBeNull();
    });
  });

  describe('Package Manager Detection Branch Coverage', () => {
    test('should handle unknown package manager in isPackageManagerAvailable', async () => {
      const result = await isPackageManagerAvailable('unknown-manager');
      expect(result).toBe(false);
    });

    test('should handle spawn errors in isPackageManagerAvailable', async () => {
      spawn.mockImplementation(() => {
        const mockProcess = {
          stdout: { on: jest.fn() },
          stderr: { on: jest.fn() },
          on: jest.fn()
        };
        
        // Simulate error event
        setTimeout(() => {
          mockProcess.on.mock.calls.find(call => call[0] === 'error')[1](new Error('spawn error'));
        }, 10);
        
        return mockProcess;
      });

      const result = await isPackageManagerAvailable('npm');
      expect(result).toBe(false);
    });

    test('should handle getPackageManager with no available managers', async () => {
      // Mock spawn to fail for all package managers
      spawn.mockImplementation(() => {
        const mockProcess = {
          stdout: { on: jest.fn() },
          stderr: { on: jest.fn() },
          on: jest.fn()
        };
        
        setTimeout(() => {
          mockProcess.on.mock.calls.find(call => call[0] === 'close')[1](1);
        }, 10);
        
        return mockProcess;
      });

      await expect(getPackageManager()).rejects.toThrow('No package manager found');
    });

    test('should handle getPackageManager with preferred but not available', async () => {
      // Mock to simulate yarn not available
      spawn.mockImplementation((command) => {
        const mockProcess = {
          stdout: { on: jest.fn() },
          stderr: { on: jest.fn() },
          on: jest.fn()
        };
        
        const exitCode = command === 'npm' ? 0 : 1;
        setTimeout(() => {
          mockProcess.on.mock.calls.find(call => call[0] === 'close')[1](exitCode);
        }, 10);
        
        return mockProcess;
      });

      // Test with allowFallback = false
      await expect(getPackageManager({ 
        preferredManager: 'yarn', 
        allowFallback: false 
      })).rejects.toThrow("Preferred package manager 'yarn' is not available");

      // Test with allowFallback = true (should fallback)
      const result = await getPackageManager({ 
        preferredManager: 'yarn', 
        allowFallback: true 
      });
      expect(result.name).toBe('npm'); // Should fallback to npm
    });
  });

  describe('Package.json Handling Branch Coverage', () => {
    test('should handle JSON parse errors in readPackageJson', async () => {
      const invalidJsonPath = path.join(tempDir, 'package.json');
      await fs.writeFile(invalidJsonPath, 'invalid json content');
      
      const result = await readPackageJson(tempDir);
      
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Warning: Could not read package.json')
      );
      expect(result.name).toBe(path.basename(tempDir));
    });

    test('should validate invalid package.json structures', () => {
      // Test null input
      const result1 = validatePackageJson(null);
      expect(result1.isValid).toBe(false);
      expect(result1.errors).toContain('Package.json must be a valid object');

      // Test string input
      const result2 = validatePackageJson('string');
      expect(result2.isValid).toBe(false);
      expect(result2.errors).toContain('Package.json must be a valid object');

      // Test empty object
      const result3 = validatePackageJson({});
      expect(result3.isValid).toBe(false);
      expect(result3.errors).toContain('Package name is required and must be a string');
      expect(result3.errors).toContain('Package version is required and must be a string');

      // Test invalid dependency field types
      const result4 = validatePackageJson({
        name: 'test',
        version: '1.0.0',
        dependencies: 'invalid',
        peerDependencies: 'invalid'
      });
      expect(result4.isValid).toBe(false);
      expect(result4.errors).toContain('dependencies must be an object');
      expect(result4.errors).toContain('peerDependencies must be an object');
    });

    test('should handle mergeDependencies with conflicts and options', () => {
      const baseDeps = { 'react': '^18.0.0', 'lodash': '^4.0.0' };
      const newDeps = { 'react': '^18.2.0', 'axios': '^1.0.0' };
      
      // Test overwrite = true
      const mergedOverwrite = mergeDependencies(baseDeps, newDeps, { overwrite: true });
      expect(mergedOverwrite.react).toBe('^18.2.0');
      
      // Test preferNewer with conflict (should warn and keep existing)
      const mergedPreferNewer = mergeDependencies(baseDeps, newDeps, { preferNewer: true });
      expect(mergedPreferNewer.react).toBe('^18.0.0'); // Keep existing
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Version conflict for react')
      );
    });

    test('should handle updatePackageJson with backup and validation errors', async () => {
      // Test with invalid existing package.json
      const invalidPackageJson = { name: '' }; // Invalid
      await fs.writeJson(path.join(tempDir, 'package.json'), invalidPackageJson);
      
      await expect(updatePackageJson(tempDir, {
        dependencies: { 'react': '^18.0.0' }
      })).rejects.toThrow('Invalid package.json');
      
      // Test with backup = false
      const validPackageJson = { name: 'test', version: '1.0.0', dependencies: {} };
      await fs.writeJson(path.join(tempDir, 'package.json'), validPackageJson);
      
      await updatePackageJson(tempDir, {
        dependencies: { 'react': '^18.0.0' }
      }, { backup: false });
      
      // Backup file should not exist
      expect(await fs.pathExists(path.join(tempDir, 'package.json.backup'))).toBe(false);
    });
  });

  describe('InstallationResult Branch Coverage', () => {
    test('should create success and failure results', () => {
      const successResult = InstallationResult.success({ data: 'test' }, ['warning1']);
      expect(successResult.success).toBe(true);
      expect(successResult.data).toEqual({ data: 'test' });
      expect(successResult.warnings).toEqual(['warning1']);
      
      const failureResult = InstallationResult.failure(new Error('test error'), { some: 'data' });
      expect(failureResult.success).toBe(false);
      expect(failureResult.error).toBe('test error'); // The implementation stores error message, not object
      expect(failureResult.data).toEqual({ some: 'data' });
    });
  });

  describe('ErrorHandler Branch Coverage', () => {
    test('should classify different error types', () => {
      const networkError = new Error('ENOTFOUND registry.npmjs.org');
      expect(ErrorHandler.classifyError(networkError)).toBe('network');
      
      const permissionError = new Error('EACCES permission denied');
      expect(ErrorHandler.classifyError(permissionError)).toBe('permission');
      
      const diskSpaceError = new Error('ENOSPC no space left on device');
      expect(ErrorHandler.classifyError(diskSpaceError)).toBe('disk_space');
      
      const genericError = new Error('Some other error');
      expect(ErrorHandler.classifyError(genericError)).toBe('unknown');
    });

    test('should format error messages with different options', () => {
      const error = new Error('Test error');
      
      const briefMessage = ErrorHandler.formatErrorMessage(error, { includeRecovery: false, includeDocLinks: false });
      expect(briefMessage).toContain('Test error');
      
      const verboseMessage = ErrorHandler.formatErrorMessage(error, { includeRecovery: true, includeDocLinks: true });
      expect(verboseMessage).toContain('Test error');
      // Verbose should include more details
      expect(verboseMessage.length).toBeGreaterThan(briefMessage.length);
    });
  });

  describe('Preparation and Dependency Functions', () => {
    test('should handle prepareDependencies with template configs', () => {
      const selectedPackages = ['package1', 'package2'];
      const templateConfigs = {
        package1: {
          dependencies: {
            dependencies: { 'lodash': '^4.0.0' },
            devDependencies: { 'jest': '^29.0.0' }
          }
        },
        package2: {
          dependencies: {
            dependencies: { 'axios': '^1.0.0' }
          }
        }
      };
      
      const result = prepareDependencies(selectedPackages, templateConfigs);
      expect(result.dependencies).toHaveProperty('lodash');
      expect(result.dependencies).toHaveProperty('axios');
      expect(result.devDependencies).toHaveProperty('jest');
    });

    test('should handle restorePackageJsonBackup with missing backup', async () => {
      // No backup file exists
      const result = await restorePackageJsonBackup(tempDir);
      expect(result).toBe(false);
      
      // Create backup and test restore
      const originalPackageJson = { name: 'test', version: '1.0.0' };
      const backupPath = path.join(tempDir, 'package.json.backup');
      await fs.writeJson(backupPath, originalPackageJson);
      
      const restoreResult = await restorePackageJsonBackup(tempDir);
      expect(restoreResult).toBe(true);
      
      const restored = await fs.readJson(path.join(tempDir, 'package.json'));
      expect(restored.name).toBe('test');
    });
  });

  describe('Process Signal Handling', () => {
    test('should handle process interruption in createProgressUI', () => {
      const originalProcess = process;
      const mockProcess = {
        on: jest.fn(),
        exit: jest.fn()
      };
      global.process = mockProcess;
      
      const progressUI = createProgressUI(PACKAGE_MANAGERS.npm, {});
      
      expect(mockProcess.on).toHaveBeenCalledWith('SIGINT', expect.any(Function));
      expect(mockProcess.on).toHaveBeenCalledWith('SIGTERM', expect.any(Function));
      
      // Restore original process
      global.process = originalProcess;
    });
  });

  describe('Edge Cases and Error Conditions', () => {
    test('should handle empty or undefined inputs', () => {
      // Test mergeDependencies with undefined inputs
      const result1 = mergeDependencies(undefined, undefined);
      expect(result1).toEqual({});
      
      const result2 = mergeDependencies({ 'react': '^18.0.0' }, undefined);
      expect(result2).toEqual({ 'react': '^18.0.0' });
      
      // Test prepareDependencies with empty inputs - it should still include defaults
      const result3 = prepareDependencies([], {});
      expect(result3).toHaveProperty('dependencies');
      expect(result3).toHaveProperty('devDependencies');
      // It will include default Next.js dependencies
      expect(result3.dependencies).toHaveProperty('next');
      expect(result3.dependencies).toHaveProperty('react');
    });

    test('should handle file system errors gracefully', async () => {
      // Mock fs.writeJson to throw error
      const originalWriteJson = fs.writeJson;
      fs.writeJson = jest.fn().mockRejectedValue(new Error('Write error'));
      
      await expect(writePackageJson(tempDir, { name: 'test' })).rejects.toThrow('Cannot write invalid package.json');
      
      // Restore original function
      fs.writeJson = originalWriteJson;
    });
  });
}); 