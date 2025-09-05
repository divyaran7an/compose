const fs = require('fs-extra');
const path = require('path');
const os = require('os');
const {
  CleanupTracker,
  createCleanupTracker,
  cleanupDirectory,
  cleanupFile,
  cleanupPaths,
  handleErrorWithCleanup,
  withCleanup
} = require('../../../lib/cleanup');

// Mock console functions
jest.mock('../../../lib/console', () => ({
  logInfo: jest.fn(),
  logWarning: jest.fn(),
  logError: jest.fn(),
  logSuccess: jest.fn()
}));

const { logInfo, logWarning, logError } = require('../../../lib/console');

describe('Cleanup System', () => {
  let tempDir;
  let testFiles;
  let testDirs;

  beforeEach(async () => {
    jest.clearAllMocks();
    
    // Create a temporary directory for testing
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'cleanup-test-'));
    
    // Define test files and directories
    testFiles = [
      path.join(tempDir, 'test1.txt'),
      path.join(tempDir, 'subdir', 'test2.txt'),
      path.join(tempDir, 'subdir', 'nested', 'test3.txt')
    ];
    
    testDirs = [
      path.join(tempDir, 'subdir'),
      path.join(tempDir, 'subdir', 'nested'),
      path.join(tempDir, 'emptydir')
    ];
  });

  afterEach(async () => {
    // Clean up temp directory
    try {
      await fs.remove(tempDir);
    } catch (error) {
      // Ignore cleanup errors in tests
    }
  });

  describe('CleanupTracker', () => {
    test('should initialize with default options', () => {
      const tracker = new CleanupTracker();
      
      expect(tracker.isActive).toBe(true);
      expect(tracker.options.autoCleanup).toBe(true);
      expect(tracker.options.preserveExisting).toBe(true);
      expect(tracker.getTrackedPaths()).toHaveLength(0);
    });

    test('should initialize with custom options', () => {
      const tracker = new CleanupTracker({
        autoCleanup: false,
        confirmBeforeCleanup: true
      });
      
      expect(tracker.options.autoCleanup).toBe(false);
      expect(tracker.options.confirmBeforeCleanup).toBe(true);
    });

    test('should track file paths', () => {
      const tracker = new CleanupTracker();
      const filePath = '/test/file.txt';
      
      tracker.track(filePath, 'file');
      
      const tracked = tracker.getTrackedPaths();
      expect(tracked).toHaveLength(1);
      expect(tracked[0].path).toBe(path.resolve(filePath));
      expect(tracked[0].type).toBe('file');
      expect(tracked[0].timestamp).toBeDefined();
    });

    test('should track multiple paths', () => {
      const tracker = new CleanupTracker();
      const paths = ['/test/file1.txt', '/test/file2.txt'];
      
      tracker.trackMultiple(paths, 'file');
      
      expect(tracker.getTrackedPaths()).toHaveLength(2);
    });

    test('should check if path is tracked', () => {
      const tracker = new CleanupTracker();
      const filePath = '/test/file.txt';
      
      expect(tracker.isTracked(filePath)).toBe(false);
      
      tracker.track(filePath, 'file');
      
      expect(tracker.isTracked(filePath)).toBe(true);
    });

    test('should untrack paths', () => {
      const tracker = new CleanupTracker();
      const filePath = '/test/file.txt';
      
      tracker.track(filePath, 'file');
      expect(tracker.isTracked(filePath)).toBe(true);
      
      tracker.untrack(filePath);
      expect(tracker.isTracked(filePath)).toBe(false);
    });

    test('should clear all tracked paths', () => {
      const tracker = new CleanupTracker();
      
      tracker.track('/test/file1.txt', 'file');
      tracker.track('/test/file2.txt', 'file');
      expect(tracker.getTrackedPaths()).toHaveLength(2);
      
      tracker.clear();
      expect(tracker.getTrackedPaths()).toHaveLength(0);
    });

    test('should disable tracking', () => {
      const tracker = new CleanupTracker();
      
      tracker.track('/test/file1.txt', 'file');
      expect(tracker.getTrackedPaths()).toHaveLength(1);
      
      tracker.disable();
      tracker.track('/test/file2.txt', 'file');
      expect(tracker.getTrackedPaths()).toHaveLength(1); // Should not track new files
    });

    test('should handle cleanup with no tracked paths', async () => {
      const tracker = new CleanupTracker();
      
      const result = await tracker.cleanup();
      
      expect(result.success).toBe(true);
      expect(result.cleanedPaths).toHaveLength(0);
      expect(logInfo).toHaveBeenCalledWith('No paths to clean up');
    });

    test('should cleanup tracked files', async () => {
      const tracker = new CleanupTracker();
      
      // Create test files
      await fs.ensureDir(path.dirname(testFiles[0]));
      await fs.writeFile(testFiles[0], 'test content');
      
      // Track the file
      tracker.track(testFiles[0], 'file');
      
      // Verify file exists
      expect(await fs.pathExists(testFiles[0])).toBe(true);
      
      // Cleanup with preserveExisting disabled for testing
      const result = await tracker.cleanup({ preserveExisting: false });
      
      expect(result.success).toBe(true);
      expect(result.cleanedPaths).toContain(testFiles[0]);
      expect(await fs.pathExists(testFiles[0])).toBe(false);
    });

    test('should cleanup tracked directories', async () => {
      const tracker = new CleanupTracker();
      
      // Create test directory
      await fs.ensureDir(testDirs[2]); // emptydir
      
      // Track the directory
      tracker.track(testDirs[2], 'directory');
      
      // Verify directory exists
      expect(await fs.pathExists(testDirs[2])).toBe(true);
      
      // Cleanup
      const result = await tracker.cleanup();
      
      expect(result.success).toBe(true);
      expect(result.cleanedPaths).toContain(testDirs[2]);
      expect(await fs.pathExists(testDirs[2])).toBe(false);
    });

    test('should handle cleanup errors gracefully', async () => {
      const tracker = new CleanupTracker();
      
      // Track a non-existent file
      tracker.track('/non/existent/file.txt', 'file');
      
      const result = await tracker.cleanup();
      
      expect(result.success).toBe(true);
      expect(result.skippedPaths).toHaveLength(1);
      expect(result.skippedPaths[0].reason).toBe('Path does not exist');
    });

    test('should sort cleanup order correctly', async () => {
      const tracker = new CleanupTracker();
      
      // Create nested structure
      await fs.ensureDir(path.dirname(testFiles[2])); // Creates nested dirs
      await fs.writeFile(testFiles[2], 'test content');
      
      // Track in random order
      tracker.track(testDirs[0], 'directory'); // subdir
      tracker.track(testFiles[2], 'file'); // nested file
      tracker.track(testDirs[1], 'directory'); // nested dir
      
      const result = await tracker.cleanup();
      
      expect(result.success).toBe(true);
      expect(result.cleanedPaths).toHaveLength(3);
      
      // Files should be cleaned before directories
      // Deeper paths should be cleaned before shallow ones
      const fileIndex = result.cleanedPaths.indexOf(testFiles[2]);
      const nestedDirIndex = result.cleanedPaths.indexOf(testDirs[1]);
      const parentDirIndex = result.cleanedPaths.indexOf(testDirs[0]);
      
      expect(fileIndex).toBeLessThan(nestedDirIndex);
      expect(nestedDirIndex).toBeLessThan(parentDirIndex);
    });
  });

  describe('createCleanupTracker', () => {
    test('should create a new CleanupTracker instance', () => {
      const tracker = createCleanupTracker();
      
      expect(tracker).toBeInstanceOf(CleanupTracker);
      expect(tracker.isActive).toBe(true);
    });

    test('should pass options to CleanupTracker', () => {
      const tracker = createCleanupTracker({ autoCleanup: false });
      
      expect(tracker.options.autoCleanup).toBe(false);
    });
  });

  describe('cleanupDirectory', () => {
    test('should remove empty directory', async () => {
      await fs.ensureDir(testDirs[2]);
      
      const result = await cleanupDirectory(testDirs[2]);
      
      expect(result.success).toBe(true);
      expect(await fs.pathExists(testDirs[2])).toBe(false);
    });

    test('should handle non-existent directory', async () => {
      const result = await cleanupDirectory('/non/existent/dir');
      
      expect(result.success).toBe(true);
      expect(result.message).toBe('Directory does not exist');
    });

    test('should refuse to remove non-empty directory without force', async () => {
      await fs.ensureDir(testDirs[0]);
      await fs.writeFile(testFiles[1], 'content');
      
      const result = await cleanupDirectory(testDirs[0]);
      
      expect(result.success).toBe(false);
      expect(result.message).toContain('Directory is not empty');
    });

    test('should remove non-empty directory with force', async () => {
      await fs.ensureDir(testDirs[0]);
      await fs.writeFile(testFiles[1], 'content');
      
      const result = await cleanupDirectory(testDirs[0], { force: true });
      
      expect(result.success).toBe(true);
      expect(await fs.pathExists(testDirs[0])).toBe(false);
    });

    test('should handle file path error', async () => {
      await fs.writeFile(testFiles[0], 'content');
      
      const result = await cleanupDirectory(testFiles[0]);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Path is not a directory');
    });
  });

  describe('cleanupFile', () => {
    test('should remove file', async () => {
      await fs.writeFile(testFiles[0], 'content');
      
      const result = await cleanupFile(testFiles[0]);
      
      expect(result.success).toBe(true);
      expect(await fs.pathExists(testFiles[0])).toBe(false);
    });

    test('should handle non-existent file', async () => {
      const result = await cleanupFile('/non/existent/file.txt');
      
      expect(result.success).toBe(true);
      expect(result.message).toBe('File does not exist');
    });

    test('should handle directory path error', async () => {
      await fs.ensureDir(testDirs[2]);
      
      const result = await cleanupFile(testDirs[2]);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Path is not a file');
    });
  });

  describe('cleanupPaths', () => {
    test('should cleanup multiple paths', async () => {
      // Create test files
      await fs.ensureDir(path.dirname(testFiles[1]));
      await fs.writeFile(testFiles[0], 'content1');
      await fs.writeFile(testFiles[1], 'content2');
      
      const result = await cleanupPaths([testFiles[0], testFiles[1]]);
      
      expect(result.success).toBe(true);
      expect(result.cleanedPaths).toHaveLength(2);
      expect(await fs.pathExists(testFiles[0])).toBe(false);
      expect(await fs.pathExists(testFiles[1])).toBe(false);
    });

    test('should handle mixed success and failure', async () => {
      await fs.writeFile(testFiles[0], 'content');
      
      const result = await cleanupPaths([
        testFiles[0], // exists
        '/non/existent/file.txt' // doesn't exist
      ]);
      
      expect(result.success).toBe(true);
      expect(result.cleanedPaths).toHaveLength(1);
      expect(result.errors).toHaveLength(0); // Non-existent files don't cause errors
    });
  });

  describe('handleErrorWithCleanup', () => {
    test('should handle error and perform cleanup', async () => {
      const tracker = new CleanupTracker();
      await fs.writeFile(testFiles[0], 'content');
      tracker.track(testFiles[0], 'file');
      
      const error = new Error('Test error');
      
      await expect(
        handleErrorWithCleanup(error, tracker)
      ).rejects.toThrow('Test error');
      
      expect(logError).toHaveBeenCalledWith('Operation failed:', 'Test error');
      expect(await fs.pathExists(testFiles[0])).toBe(false);
    });

    test('should handle error without cleanup', async () => {
      const tracker = new CleanupTracker();
      await fs.writeFile(testFiles[0], 'content');
      tracker.track(testFiles[0], 'file');
      
      const error = new Error('Test error');
      
      await expect(
        handleErrorWithCleanup(error, tracker, { performCleanup: false })
      ).rejects.toThrow('Test error');
      
      expect(await fs.pathExists(testFiles[0])).toBe(true); // File should still exist
    });

    test('should not rethrow error when configured', async () => {
      const tracker = new CleanupTracker();
      const error = new Error('Test error');
      
      const result = await handleErrorWithCleanup(error, tracker, { rethrow: false });
      
      expect(result.error).toBe(error);
      expect(result.cleanupPerformed).toBe(true);
    });
  });

  describe('withCleanup', () => {
    test('should execute operation successfully and disable cleanup', async () => {
      const tracker = new CleanupTracker();
      await fs.writeFile(testFiles[0], 'content');
      tracker.track(testFiles[0], 'file');
      
      const operation = jest.fn().mockResolvedValue('success');
      
      const result = await withCleanup(operation, tracker);
      
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledWith(tracker);
      expect(tracker.isActive).toBe(false);
      expect(await fs.pathExists(testFiles[0])).toBe(true); // File should remain
    });

    test('should handle operation failure and perform cleanup', async () => {
      const tracker = new CleanupTracker();
      await fs.writeFile(testFiles[0], 'content');
      tracker.track(testFiles[0], 'file');
      
      const operation = jest.fn().mockRejectedValue(new Error('Operation failed'));
      
      await expect(
        withCleanup(operation, tracker)
      ).rejects.toThrow('Operation failed');
      
      expect(await fs.pathExists(testFiles[0])).toBe(false); // File should be cleaned up
    });
  });
}); 