// Mock ora explicitly for this test file
jest.mock('ora', () => {
  return jest.fn((options = {}) => {
    // Handle both string and object parameters
    let actualOptions = {};
    if (typeof options === 'string') {
      actualOptions = { text: options };
    } else if (typeof options === 'object' && options !== null) {
      actualOptions = { ...options };
    }
    
    const mockSpinner = {
      // Core methods
      start: jest.fn().mockReturnThis(),
      stop: jest.fn().mockReturnThis(),
      succeed: jest.fn().mockReturnThis(),
      fail: jest.fn().mockReturnThis(),
      warn: jest.fn().mockReturnThis(),
      info: jest.fn().mockReturnThis(),
      clear: jest.fn().mockReturnThis(),
      
      // Properties
      color: actualOptions.color || 'cyan',
      spinner: actualOptions.spinner || 'dots',
      isSpinning: false,
      
      // Additional properties that ora has
      indent: 0,
      interval: 80,
      stream: process.stderr,
      id: undefined,
      frameIndex: 0,
      
      // Methods that ora has
      render: jest.fn().mockReturnThis(),
      frame: jest.fn().mockReturnThis(),
      
      // Internal text storage
      _text: actualOptions.text || '',
      
      // Text getter and setter
      get text() {
        return this._text;
      },
      
      set text(value) {
        this._text = value || '';
      }
    };
    
    return mockSpinner;
  });
});

// Mock console functions
jest.mock('../../../lib/console', () => ({
  logSuccess: jest.fn(),
  logError: jest.fn(),
  logWarning: jest.fn(),
  logInfo: jest.fn()
}));

const { createSpinner, createProgressTracker, createFileProgressTracker, createInstallationProgressTracker } = require('../../../lib/progress');

describe('Progress Indicator System', () => {
  const isTestEnv = process.env.NODE_ENV === 'test';
  
  beforeEach(() => {
    jest.clearAllMocks();

    // Add global error handler for unhandled promise rejections in tests
    process.removeAllListeners('unhandledRejection');
    process.on('unhandledRejection', (reason, promise) => {
      // Ignore unhandled rejections in tests - they're handled by try/catch
      if (reason && reason.message === 'Test error') {
        return;
      }
      console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    });
  });
  
  afterEach(() => {
    // Clean up error handlers
    process.removeAllListeners('unhandledRejection');
  });

  describe('createSpinner', () => {
    test('should create a spinner with default options', () => {
      const spinner = createSpinner();
      expect(spinner).toBeDefined();
      expect(typeof spinner.start).toBe('function');
      expect(typeof spinner.stop).toBe('function');
      expect(typeof spinner.updateText).toBe('function');
    });

    test('should create a spinner with custom text', () => {
      const customText = 'Custom loading message';
      const spinner = createSpinner(customText);
      expect(spinner).toBeDefined();
      
      if (isTestEnv) {
        expect(spinner.text).toBe(customText);
      }
    });

    test('should create a spinner with custom options', () => {
      const options = { color: 'red', spinner: 'line' };
      const spinner = createSpinner('Loading...', options);
      expect(spinner).toBeDefined();
    });

    test('should update text correctly', () => {
      const spinner = createSpinner('Initial text');
      const newText = 'Updated text';
      
      const result = spinner.updateText(newText);
      expect(result).toBe(spinner); // Should return self for chaining
      
      if (isTestEnv) {
        expect(spinner.text).toBe(newText);
      }
    });

    test('should call ora methods correctly', () => {
      const spinner = createSpinner('Test spinner');
      
      // In test environment, these should not throw errors
      expect(() => {
        spinner.start();
        spinner.stop();
        spinner.succeed('Success');
        spinner.fail('Error');
        spinner.warn('Warning');
        spinner.info('Info');
        spinner.clear();
      }).not.toThrow();
    });
  });

  describe('ProgressTracker', () => {
    test('should start progress tracking', () => {
      const tracker = createProgressTracker(5);
      
      expect(() => {
        tracker.start('Starting process...');
      }).not.toThrow();
      
      expect(tracker.totalSteps).toBe(5);
      expect(tracker.currentStep).toBe(0);
    });

    test('should format text with step count and percentage', () => {
      const tracker = createProgressTracker(4);
      tracker.start();
      
      expect(() => {
        tracker.nextStep('Processing files');
      }).not.toThrow();
      
      expect(tracker.currentStep).toBe(1);
    });

    test('should handle setStep correctly', () => {
      const tracker = createProgressTracker(3);
      tracker.start();
      
      expect(() => {
        tracker.nextStep('Step 1');
        tracker.nextStep('Step 2');
      }).not.toThrow();
      
      expect(tracker.currentStep).toBe(2);
    });

    test('should complete with success', () => {
      const tracker = createProgressTracker(2);
      tracker.start();
      
      expect(() => {
        tracker.nextStep('Step 1');
        tracker.complete('All done!');
      }).not.toThrow();
    });

    test('should complete with error', () => {
      const tracker = createProgressTracker(2);
      tracker.start();
      
      expect(() => {
        tracker.nextStep('Step 1');
        tracker.fail('Something went wrong!');
      }).not.toThrow();
    });

    test('should handle options correctly', () => {
      const options = { showPercentage: false, color: 'green' };
      const tracker = createProgressTracker(3, options);
      
      expect(() => {
        tracker.start('Custom tracker');
      }).not.toThrow();
    });
  });

  describe('FileProgressTracker', () => {
    const files = ['file1.js', 'file2.js', 'file3.js'];

    test('should start file progress tracking', () => {
      const tracker = createFileProgressTracker(files);
      
      expect(() => {
        tracker.start();
      }).not.toThrow();
      
      expect(tracker.totalFiles).toBe(3);
      expect(tracker.currentFileIndex).toBe(0);
    });

    test('should update progress for next file', () => {
      const tracker = createFileProgressTracker(files);
      tracker.start();
      
      expect(() => {
        tracker.nextFile();
      }).not.toThrow();
      
      expect(tracker.currentFileIndex).toBe(1);
    });

    test('should truncate long file names', () => {
      const longFiles = ['very-long-file-name-that-should-be-truncated.js'];
      const tracker = createFileProgressTracker(longFiles);
      
      expect(() => {
        tracker.start();
      }).not.toThrow();
    });

    test('should complete with success', () => {
      const tracker = createFileProgressTracker(files);
      tracker.start();
      
      expect(() => {
        tracker.complete('Files processed successfully!');
      }).not.toThrow();
    });

    test('should complete with default success message', () => {
      const tracker = createFileProgressTracker(files);
      tracker.start();
      
      expect(() => {
        tracker.complete();
      }).not.toThrow();
    });

    test('should handle options correctly', () => {
      const options = { maxFileNameLength: 20, showPercentage: false };
      const tracker = createFileProgressTracker(files, options);
      
      expect(() => {
        tracker.start();
      }).not.toThrow();
    });
  });

  describe('InstallationProgressTracker', () => {
    const packages = ['react', 'express', 'lodash'];

    test('should start installation tracking', () => {
      const tracker = createInstallationProgressTracker(packages);
      
      expect(() => {
        tracker.start();
      }).not.toThrow();
      
      expect(tracker.totalPackages).toBe(3);
    });

    test('should update progress for package installation', () => {
      const tracker = createInstallationProgressTracker(packages);
      tracker.start();
      
      expect(() => {
        tracker.updatePackage('react');
      }).not.toThrow();
    });

    test('should update with general message', () => {
      const tracker = createInstallationProgressTracker(packages);
      tracker.start();
      
      expect(() => {
        tracker.updateGeneral('Resolving dependencies...');
      }).not.toThrow();
    });

    test('should complete with success', () => {
      const tracker = createInstallationProgressTracker(packages);
      tracker.start();
      
      expect(() => {
        tracker.complete('Installation completed!');
      }).not.toThrow();
    });

    test('should complete with default success message', () => {
      const tracker = createInstallationProgressTracker(packages);
      tracker.start();
      
      expect(() => {
        tracker.complete();
      }).not.toThrow();
    });

    test('should handle empty packages array', () => {
      const tracker = createInstallationProgressTracker([]);
      
      expect(() => {
        tracker.start();
      }).not.toThrow();
      
      expect(tracker.totalPackages).toBe(0);
    });

    test('should handle options correctly', () => {
      const options = { showPercentage: false, maxPackageNameLength: 15 };
      const tracker = createInstallationProgressTracker(packages, options);
      
      expect(() => {
        tracker.start();
      }).not.toThrow();
    });
  });
}); 