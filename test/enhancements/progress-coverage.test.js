const {
  createSpinner,
  ProgressTracker,
  FileProgressTracker,
  InstallationProgressTracker
} = require('../../lib/progress');

describe('Progress Module Coverage Tests', () => {
  describe('createSpinner', () => {
    test('should create spinner with default options', () => {
      const spinner = createSpinner();
      expect(spinner).toBeDefined();
      expect(typeof spinner.start).toBe('function');
      expect(typeof spinner.stop).toBe('function');
      expect(typeof spinner.updateText).toBe('function');
    });

    test('should create spinner with custom options', () => {
      const spinner = createSpinner('Custom text', { color: 'red', spinner: 'line' });
      expect(spinner).toBeDefined();
      expect(spinner.text).toBe('Custom text');
    });

    test('should support all spinner methods', () => {
      const spinner = createSpinner('Test');
      
      // Test method chaining
      const result = spinner.start();
      expect(result).toBe(spinner);
      
      spinner.updateText('Updated text');
      expect(spinner.text).toBe('Updated text');
      
      spinner.stop();
      spinner.clear();
    });

    test('should support completion methods', () => {
      const spinner = createSpinner('Test');
      
      // Test completion methods (these won't actually display in test environment)
      spinner.succeed('Success message');
      spinner.fail('Error message');
      spinner.warn('Warning message');
      spinner.info('Info message');
    });

    test('should handle text getter and setter', () => {
      const spinner = createSpinner('Initial text');
      expect(spinner.text).toBe('Initial text');
      
      spinner.text = 'New text';
      expect(spinner.text).toBe('New text');
    });
  });

  describe('ProgressTracker', () => {
    test('should create progress tracker with default options', () => {
      const tracker = new ProgressTracker(5);
      expect(tracker.totalSteps).toBe(5);
      expect(tracker.currentStep).toBe(0);
      expect(tracker.options.silent).toBe(true); // Should be true in test environment
    });

    test('should create progress tracker with custom options', () => {
      const tracker = new ProgressTracker(10, {
        showPercentage: false,
        showStepCount: false,
        silent: false
      });
      expect(tracker.totalSteps).toBe(10);
      expect(tracker.options.showPercentage).toBe(false);
      expect(tracker.options.showStepCount).toBe(false);
    });

    test('should handle progress tracking in silent mode', () => {
      const tracker = new ProgressTracker(3, { silent: true });
      
      tracker.start('Starting process');
      expect(tracker.isActive).toBe(true);
      
      tracker.nextStep('Step 1');
      expect(tracker.currentStep).toBe(1);
      
      tracker.setStep(2, 'Step 2');
      expect(tracker.currentStep).toBe(2);
      
      tracker.succeed('Completed');
      expect(tracker.isActive).toBe(false);
    });

    test('should handle progress tracking in non-silent mode', () => {
      const tracker = new ProgressTracker(3, { silent: false });
      
      tracker.start('Starting process');
      tracker.nextStep('Step 1');
      tracker.setStep(2, 'Step 2');
      tracker.fail('Failed');
      tracker.warn('Warning');
      tracker.stop();
    });

    test('should handle edge cases', () => {
      const tracker = new ProgressTracker(3);
      
      // Test operations when not active
      tracker.nextStep('Should not crash');
      tracker.setStep(1, 'Should not crash');
      tracker.succeed('Should not crash');
      tracker.fail('Should not crash');
      tracker.warn('Should not crash');
      tracker.stop();
      
      // Test step bounds
      tracker.start();
      tracker.setStep(-1, 'Negative step');
      expect(tracker.currentStep).toBe(0);
      
      tracker.setStep(10, 'Exceeds total');
      expect(tracker.currentStep).toBe(3);
    });

    test('should format text correctly', () => {
      const tracker = new ProgressTracker(5, { 
        showPercentage: true, 
        showStepCount: true,
        silent: true 
      });
      
      tracker.start();
      tracker.setStep(2, 'Processing');
      
      // Test the internal _formatText method indirectly
      expect(tracker.currentStep).toBe(2);
      expect(tracker.totalSteps).toBe(5);
    });
  });

  describe('FileProgressTracker', () => {
    test('should create file progress tracker', () => {
      const tracker = new FileProgressTracker(5);
      expect(tracker.totalFiles).toBe(5);
      expect(tracker.processedFiles).toBe(0);
    });

    test('should create file progress tracker with options', () => {
      const tracker = new FileProgressTracker(10, { 
        showFileCount: false,
        silent: true 
      });
      expect(tracker.totalFiles).toBe(10);
      expect(tracker.options.showFileCount).toBe(false);
      expect(tracker.options.silent).toBe(true);
    });

    test('should handle file progress tracking', () => {
      const tracker = new FileProgressTracker(3, { silent: true });
      
      tracker.start('Processing files');
      expect(tracker.isActive).toBe(true);
      
      tracker.nextFile('file1.js', 'Copying');
      expect(tracker.processedFiles).toBe(1);
      
      tracker.nextFile('file2.js', 'Processing');
      expect(tracker.processedFiles).toBe(2);
      
      tracker.succeed('All files processed');
      expect(tracker.isActive).toBe(false);
      
      tracker.fail('Processing failed');
      tracker.stop();
    });

    test('should handle file progress in non-silent mode', () => {
      const tracker = new FileProgressTracker(2, { silent: false });
      
      tracker.start('Processing');
      tracker.nextFile('test.js');
      tracker.succeed('Done');
    });

    test('should handle operations when not active', () => {
      const tracker = new FileProgressTracker(3);
      
      // Test operations when not active
      tracker.nextFile('file.js');
      tracker.succeed('Should not crash');
      tracker.fail('Should not crash');
      tracker.stop();
    });
  });

  describe('InstallationProgressTracker', () => {
    test('should create installation progress tracker', () => {
      const packages = ['react', 'next', 'typescript'];
      const tracker = new InstallationProgressTracker(packages);
      expect(tracker.packages).toEqual(packages);
      expect(tracker.installedPackages).toBe(0);
      expect(tracker.totalPackages).toBe(3);
    });

    test('should create installation progress tracker with options', () => {
      const packages = ['react'];
      const tracker = new InstallationProgressTracker(packages, { 
        showPackageCount: false,
        silent: true 
      });
      expect(tracker.packages).toEqual(packages);
      expect(tracker.options.showPackageCount).toBe(false);
      expect(tracker.options.silent).toBe(true);
    });

    test('should handle installation progress', () => {
      const packages = ['react', 'next'];
      const tracker = new InstallationProgressTracker(packages, { silent: true });
      
      tracker.start('npm');
      expect(tracker.isActive).toBe(true);
      
      tracker.installPackage('react', 'npm');
      expect(tracker.installedPackages).toBe(1);
      
      tracker.updateMessage('Installing dependencies', 'npm');
      tracker.succeed('Installation complete');
      expect(tracker.isActive).toBe(false);
      
      tracker.fail('Installation failed');
      tracker.stop();
    });

    test('should handle installation progress in non-silent mode', () => {
      const packages = ['react'];
      const tracker = new InstallationProgressTracker(packages, { silent: false });
      
      tracker.start('yarn');
      tracker.installPackage('react', 'yarn');
      tracker.updateMessage('Installing', 'yarn');
      tracker.succeed('Done');
    });

    test('should handle operations when not active', () => {
      const packages = ['react'];
      const tracker = new InstallationProgressTracker(packages);
      
      // Test operations when not active
      tracker.installPackage('react');
      tracker.updateMessage('Installing');
      tracker.succeed('Should not crash');
      tracker.fail('Should not crash');
      tracker.stop();
    });

    test('should handle empty packages array', () => {
      const tracker = new InstallationProgressTracker([]);
      expect(tracker.packages).toEqual([]);
      expect(tracker.installedPackages).toBe(0);
      expect(tracker.totalPackages).toBe(0);
      
      tracker.start();
      tracker.installPackage('react');
      tracker.succeed();
    });
  });
}); 