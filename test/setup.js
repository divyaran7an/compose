/**
 * Jest setup file
 * This file runs before all tests to configure the test environment
 */

// Set NODE_ENV to test to disable peer dependency analysis during tests
process.env.NODE_ENV = 'test';

// Disable console output during tests for cleaner test output
// (individual tests can override this if they need to test console output)
const originalConsoleLog = console.log;
const originalConsoleWarn = console.warn;
const originalConsoleError = console.error;
const originalConsoleInfo = console.info;

// Only suppress console output if not explicitly testing it
global.suppressConsole = () => {
  console.log = jest.fn();
  console.warn = jest.fn();
  console.error = jest.fn();
  console.info = jest.fn();
};

global.restoreConsole = () => {
  console.log = originalConsoleLog;
  console.warn = originalConsoleWarn;
  console.error = originalConsoleError;
  console.info = originalConsoleInfo;
};

// Set default test timeout to 30 seconds for complex operations
jest.setTimeout(30000);

// Global cleanup utilities
global.activeTimeouts = new Set();
global.activeIntervals = new Set();
global.activeSpinners = new Set();

// Override setTimeout to track active timeouts
const originalSetTimeout = global.setTimeout;
global.setTimeout = (fn, delay, ...args) => {
  const timeoutId = originalSetTimeout(fn, delay, ...args);
  global.activeTimeouts.add(timeoutId);
  
  // Auto-remove from tracking when it completes
  const wrappedFn = (...fnArgs) => {
    global.activeTimeouts.delete(timeoutId);
    return fn(...fnArgs);
  };
  
  return timeoutId;
};

// Override setInterval to track active intervals
const originalSetInterval = global.setInterval;
global.setInterval = (fn, delay, ...args) => {
  const intervalId = originalSetInterval(fn, delay, ...args);
  global.activeIntervals.add(intervalId);
  return intervalId;
};

// Override clearTimeout to remove from tracking
const originalClearTimeout = global.clearTimeout;
global.clearTimeout = (timeoutId) => {
  global.activeTimeouts.delete(timeoutId);
  return originalClearTimeout(timeoutId);
};

// Override clearInterval to remove from tracking
const originalClearInterval = global.clearInterval;
global.clearInterval = (intervalId) => {
  global.activeIntervals.delete(intervalId);
  return originalClearInterval(intervalId);
};

// Global cleanup function
global.cleanupAsyncOperations = () => {
  // Clear all active timeouts
  for (const timeoutId of global.activeTimeouts) {
    clearTimeout(timeoutId);
  }
  global.activeTimeouts.clear();
  
  // Clear all active intervals
  for (const intervalId of global.activeIntervals) {
    clearInterval(intervalId);
  }
  global.activeIntervals.clear();
  
  // Stop all active spinners
  for (const spinner of global.activeSpinners) {
    if (spinner && typeof spinner.stop === 'function') {
      spinner.stop();
    }
  }
  global.activeSpinners.clear();
};

// Comprehensive console suppression for tests
// Suppress console.error for known test patterns while preserving intentional outputs
console.error = (...args) => {
  const message = args.join(' ');
  
  // Suppress specific error patterns that are expected during tests
  const suppressPatterns = [
    /Error: Test error/,
    /Error: Operation failed/,
    /❌.*Operation failed/,
    /❌.*Installation failed/,
    /at Object\.<anonymous> \(.*test.*\.js:/,
    /at handleErrorWithCleanup/,
    /at Object\.handleErrorWithCleanup/,
    /❌ Installation failed:/,
    /💡 Suggested solutions:/,
    /📚 For more help:/,
    /npm documentation:/,
    /yarn documentation:/,
    /pnpm documentation:/,
    /🔄 Attempting to recover/,
    /✅ Package\.json restored/,
    /Cannot read properties of undefined/,
    /Invalid package\.json:/,
    /Failed to restore package\.json backup:/,
    /❌ Recovery failed:/,
    /Debug information:/,
    /Error type:/,
    /Timestamp:/,
    /Stack trace:/,
    /Prompt error:/
  ];
  
  const shouldSuppress = suppressPatterns.some(pattern => pattern.test(message));
  
  if (!shouldSuppress) {
    originalConsoleError(...args);
  }
};

// Suppress console.warn for test patterns
console.warn = (...args) => {
  const message = args.join(' ');
  
  const suppressPatterns = [
    /Warning: Could not read package\.json/,
    /Version conflict for/,
    /Cleanup completed with.*error/,
    /⚠️.*Peer dependency analysis failed/,
    /\[TemplateConfigReader\].*template\(s\) failed to load:/,
    /- .*\/.*: Failed to read template config/,
    /- .*\/.*: Template configuration not found/,
    /Failed to fetch package info for/,
    /⚠️.*Installation completed with warnings/,
    /⚠️.*Could not restore package\.json backup/
  ];
  
  const shouldSuppress = suppressPatterns.some(pattern => pattern.test(message));
  
  if (!shouldSuppress) {
    originalConsoleWarn(...args);
  }
};

// Suppress console.log for test patterns  
console.log = (...args) => {
  const message = args.join(' ');
  
  const suppressPatterns = [
    /🔄 Attempting to recover/,
    /✅ Package\.json restored/,
    /🔍 Peer dependency analysis/,
    /Analyzed.*packages in.*ms/,
    /✅ Installation completed successfully!/,
    /Installing dependencies for TypeScript validation\.\.\./,
    /Running TypeScript type checking\.\.\./,
    /Main module logic will go here\./,
    /\[PeerDependencyAnalyzer\]/,
    /\[VERBOSE\]/,
    /Template Validation Summary:/,
    /Template Validation Report/,
    /-------------------------/,
    /📦 Dependency Resolution Summary:/,
    /⚠️.*High-risk resolutions/,
    /🔄 Version conflicts resolved/,
    /✅ Compatible versions merged/,
    /⚠️.*Compatibility Warnings:/,
    /⚠️.*Installation warnings:/,
    /ℹ️ Performing automatic cleanup\.\.\./,
    /ℹ️ No paths to clean up/,
    /ℹ️ Starting cleanup of.*path\(s\)\.\.\./,
    /ℹ️ Cleanup completed/,
    /ℹ️.*files? cleaned up/,
    /ℹ️.*directories? cleaned up/,
    /ℹ️ Cleaned up: .*/, // Specific cleanup file messages
    /Project scaffolding completed in \d+ms/,
    /Multi-template scaffolding completed in \d+ms/,
    /Counted \d+ files in \d+ms/,
    /Memory increase: -?\d+(\.\d+)?MB/,
    /^$/  // Empty lines
  ];
  
  const shouldSuppress = suppressPatterns.some(pattern => pattern.test(message));
  
  if (!shouldSuppress) {
    originalConsoleLog(...args);
  }
};

// Suppress console.info for test patterns
console.info = (...args) => {
  const message = args.join(' ');
  
  const suppressPatterns = [
    /ℹ️.*Installation information/,
    /📦 Dependency Resolution Summary:/
  ];
  
  const shouldSuppress = suppressPatterns.some(pattern => pattern.test(message));
  
  if (!shouldSuppress) {
    originalConsoleInfo(...args);
  }
};

// Cleanup after each test
afterEach(() => {
  if (global.cleanupAsyncOperations) {
    global.cleanupAsyncOperations();
  }
}); 