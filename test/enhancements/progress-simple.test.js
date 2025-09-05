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

const { 
  createSpinner, 
  ProgressTracker, 
  FileProgressTracker,
  InstallationProgressTracker
} = require('../../lib/progress');

describe('Progress Coverage Tests', () => {
  
  describe('ProgressTracker class coverage', () => {
    it('should handle warn method', () => {
      const tracker = new ProgressTracker(3, { silent: false });
      tracker.start('Starting');
      tracker.warn('Warning message');
      expect(tracker.isActive).toBe(false);
    });

    it('should handle stop method', () => {
      const tracker = new ProgressTracker(3, { silent: false });
      tracker.start('Starting');
      tracker.stop();
      expect(tracker.isActive).toBe(false);
    });

    it('should format text without percentage', () => {
      const tracker = new ProgressTracker(4, { 
        showPercentage: false, 
        showStepCount: true,
        silent: false 
      });
      const text = tracker._formatText('Processing');
      expect(text).toContain('Processing');
      expect(text).toContain('[0/4]');
      expect(text).not.toContain('%');
    });

    it('should format text without step count', () => {
      const tracker = new ProgressTracker(4, { 
        showPercentage: true, 
        showStepCount: false,
        silent: false 
      });
      const text = tracker._formatText('Processing');
      expect(text).toContain('Processing');
      expect(text).toContain('(0%');
      expect(text).not.toContain('[');
    });

    it('should format text with neither percentage nor step count', () => {
      const tracker = new ProgressTracker(4, { 
        showPercentage: false, 
        showStepCount: false,
        silent: false 
      });
      const text = tracker._formatText('Processing');
      expect(text).toBe('Processing');
    });
  });

  describe('FileProgressTracker class coverage', () => {
    it('should handle all lifecycle methods', () => {
      const tracker = new FileProgressTracker(3, { silent: false });
      tracker.start('Processing');
      tracker.nextFile('file1.js', 'Compiling');
      expect(tracker.processedFiles).toBe(1);
      
      tracker.fail('Error occurred');
      expect(tracker.isActive).toBe(false);
    });

    it('should handle stop method', () => {
      const tracker = new FileProgressTracker(3, { silent: false });
      tracker.start('Processing');
      tracker.stop();
      expect(tracker.isActive).toBe(false);
    });

    it('should format file text correctly', () => {
      const tracker = new FileProgressTracker(5, { silent: false });
      tracker.processedFiles = 3;
      const text = tracker._formatText('Copying', 'test.js');
      expect(text).toContain('Copying');
      expect(text).toContain('test.js');
      expect(text).toContain('(3/5)');
    });

    it('should format file text without current file', () => {
      const tracker = new FileProgressTracker(5, { 
        showFileCount: true,
        showCurrentFile: false,
        silent: false 
      });
      tracker.processedFiles = 2;
      const text = tracker._formatText('Processing', 'file.js');
      expect(text).toBe('Processing (2/5)');
    });

    it('should format file text without file count', () => {
      const tracker = new FileProgressTracker(5, { 
        showFileCount: false,
        showCurrentFile: true,
        silent: false 
      });
      const text = tracker._formatText('Copying', 'test.js');
      expect(text).toBe('Copying: test.js');
    });
  });

  describe('InstallationProgressTracker class coverage', () => {
    it('should handle package installation flow', () => {
      const packages = ['react', 'vue', 'angular'];
      const tracker = new InstallationProgressTracker(packages, { silent: false });
      
      tracker.start('npm');
      tracker.installPackage('react', 'yarn');
      expect(tracker.installedPackages).toBe(1);
      
      tracker.updateMessage('Installing dependencies...', 'npm');
      tracker.fail('Installation failed');
      expect(tracker.isActive).toBe(false);
    });

    it('should handle stop method', () => {
      const tracker = new InstallationProgressTracker(['react'], { silent: false });
      tracker.start('npm');
      tracker.stop();
      expect(tracker.isActive).toBe(false);
    });

    it('should format installation text with package manager', () => {
      const packages = ['react', 'vue'];
      const tracker = new InstallationProgressTracker(packages, { silent: false });
      tracker.installedPackages = 1;
      const text = tracker._formatText('yarn', 'Installing react');
      expect(text).toContain('yarn');
      expect(text).toContain('Installing react');
      expect(text).toContain('(1/2)');
    });

    it('should format text without package count', () => {
      const packages = ['react', 'vue'];
      const tracker = new InstallationProgressTracker(packages, { 
        showPackageCount: false,
        showCurrentPackage: true,
        silent: false 
      });
      const text = tracker._formatText('npm', 'Installing react');
      expect(text).toBe('Installing with npm: Installing react');
    });

    it('should format text without current package', () => {
      const packages = ['react', 'vue'];
      const tracker = new InstallationProgressTracker(packages, { 
        showPackageCount: true,
        showCurrentPackage: false,
        silent: false 
      });
      tracker.installedPackages = 1;
      const text = tracker._formatText('npm', 'Installing react');
      expect(text).toBe('Installing with npm (1/2)');
    });
  });

  describe('createSpinner coverage', () => {
    it('should handle text setter when _spinner exists', () => {
      const spinner = createSpinner('Test');
      spinner.text = 'Updated text';
      expect(spinner.text).toBe('Updated text');
    });

    it('should chain all methods correctly', () => {
      const spinner = createSpinner('Test');
      const result = spinner
        .start()
        .updateText('New text')
        .warn('Warning')
        .info('Info')
        .clear();
      expect(result).toBe(spinner);
    });
  });
});
