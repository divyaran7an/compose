const console = require('../../../lib/console');
const chalk = require('chalk');

// Mock console methods to capture output
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;
const originalStdoutWrite = process.stdout.write;

let capturedOutput = [];
let capturedErrors = [];
let capturedWarnings = [];
let capturedStdout = [];

describe('Console Utility Module', () => {
  beforeEach(() => {
    // Reset captured output
    capturedOutput = [];
    capturedErrors = [];
    capturedWarnings = [];
    capturedStdout = [];
    
    // Mock console methods
    global.console.log = jest.fn((...args) => {
      capturedOutput.push(args.join(' '));
    });
    
    global.console.error = jest.fn((...args) => {
      capturedErrors.push(args.join(' '));
    });
    
    global.console.warn = jest.fn((...args) => {
      capturedWarnings.push(args.join(' '));
    });
    
    process.stdout.write = jest.fn((data) => {
      capturedStdout.push(data);
    });
  });

  afterEach(() => {
    // Restore original console methods
    global.console.log = originalConsoleLog;
    global.console.error = originalConsoleError;
    global.console.warn = originalConsoleWarn;
    process.stdout.write = originalStdoutWrite;
  });

  describe('Basic Logging Functions', () => {
    test('logSuccess should output green text with success icon', () => {
      console.logSuccess('Test success message');
      
      expect(global.console.log).toHaveBeenCalledTimes(1);
      expect(capturedOutput[0]).toContain('✅');
      expect(capturedOutput[0]).toContain('Test success message');
    });

    test('logSuccess without icon should output green text without icon', () => {
      console.logSuccess('Test success message', false);
      
      expect(global.console.log).toHaveBeenCalledTimes(1);
      expect(capturedOutput[0]).not.toContain('✅');
      expect(capturedOutput[0]).toContain('Test success message');
    });

    test('logError should output red text with error icon', () => {
      console.logError('Test error message');
      
      expect(global.console.error).toHaveBeenCalledTimes(1);
      expect(capturedErrors[0]).toContain('❌');
      expect(capturedErrors[0]).toContain('Test error message');
    });

    test('logError without icon should output red text without icon', () => {
      console.logError('Test error message', false);
      
      expect(global.console.error).toHaveBeenCalledTimes(1);
      expect(capturedErrors[0]).not.toContain('❌');
      expect(capturedErrors[0]).toContain('Test error message');
    });

    test('logWarning should output yellow text with warning icon', () => {
      console.logWarning('Test warning message');
      
      expect(global.console.warn).toHaveBeenCalledTimes(1);
      expect(capturedWarnings[0]).toContain('⚠️');
      expect(capturedWarnings[0]).toContain('Test warning message');
    });

    test('logInfo should output blue text with info icon', () => {
      console.logInfo('Test info message');
      
      expect(global.console.log).toHaveBeenCalledTimes(1);
      expect(capturedOutput[0]).toContain('ℹ️');
      expect(capturedOutput[0]).toContain('Test info message');
    });

    test('logHighlight should output cyan text', () => {
      console.logHighlight('Test highlight message');
      
      expect(global.console.log).toHaveBeenCalledTimes(1);
      expect(capturedOutput[0]).toContain('Test highlight message');
    });

    test('logDim should output gray text', () => {
      console.logDim('Test dim message');
      
      expect(global.console.log).toHaveBeenCalledTimes(1);
      expect(capturedOutput[0]).toContain('Test dim message');
    });

    test('logBold should output bold text', () => {
      console.logBold('Test bold message');
      
      expect(global.console.log).toHaveBeenCalledTimes(1);
      expect(capturedOutput[0]).toContain('Test bold message');
    });
  });

  describe('Structured Logging Functions', () => {
    test('logStep should output step with number', () => {
      console.logStep(1, 'First step');
      
      expect(global.console.log).toHaveBeenCalledTimes(1);
      expect(capturedOutput[0]).toContain('[1]');
      expect(capturedOutput[0]).toContain('First step');
    });

    test('logStep with total should output step with fraction', () => {
      console.logStep(2, 'Second step', 5);
      
      expect(global.console.log).toHaveBeenCalledTimes(1);
      expect(capturedOutput[0]).toContain('[2/5]');
      expect(capturedOutput[0]).toContain('Second step');
    });

    test('logHeader should output formatted header', () => {
      console.logHeader('Test Header');
      
      expect(global.console.log).toHaveBeenCalledTimes(5); // Empty line, top border, header, bottom border, empty line
      expect(capturedOutput.some(line => line.includes('Test Header'))).toBe(true);
      expect(capturedOutput.some(line => line.includes('='))).toBe(true);
    });

    test('logSection should output section separator', () => {
      console.logSection('Test Section');
      
      expect(global.console.log).toHaveBeenCalledTimes(2); // Empty line + section
      expect(capturedOutput.some(line => line.includes('--- Test Section ---'))).toBe(true);
    });

    test('logListItem should output bullet point with default type', () => {
      console.logListItem('Test item');
      
      expect(global.console.log).toHaveBeenCalledTimes(1);
      expect(capturedOutput[0]).toContain('•');
      expect(capturedOutput[0]).toContain('Test item');
    });

    test('logListItem should output different bullets for different types', () => {
      console.logListItem('Success item', 'success');
      console.logListItem('Error item', 'error');
      console.logListItem('Warning item', 'warning');
      
      expect(capturedOutput[0]).toContain('✓');
      expect(capturedOutput[1]).toContain('✗');
      expect(capturedOutput[2]).toContain('!');
    });

    test('logCommand should output formatted command', () => {
      console.logCommand('npm install');
      
      expect(global.console.log).toHaveBeenCalledTimes(1);
      expect(capturedOutput[0]).toContain('$');
      expect(capturedOutput[0]).toContain('npm install');
    });
  });

  describe('Utility Functions', () => {
    test('clearLine should write clear sequence to stdout', () => {
      console.clearLine();
      
      expect(process.stdout.write).toHaveBeenCalledTimes(1);
      expect(capturedStdout[0]).toBe('\r\x1b[K');
    });

    test('logInline should write to stdout without newline', () => {
      console.logInline('Inline message');
      
      expect(process.stdout.write).toHaveBeenCalledTimes(1);
      expect(capturedStdout[0]).toBe('Inline message');
    });

    test('logDivider should output horizontal line', () => {
      console.logDivider();
      
      expect(global.console.log).toHaveBeenCalledTimes(1);
      expect(capturedOutput[0]).toContain('─');
    });
  });

  describe('Project-specific Functions', () => {
    test('logProjectStart should output project creation header', () => {
      console.logProjectStart('my-app');
      
      expect(global.console.log).toHaveBeenCalled();
      expect(capturedOutput.some(line => line.includes('Creating my-app'))).toBe(true);
      expect(capturedOutput.some(line => line.includes('🚀'))).toBe(true);
    });

    test('logProjectComplete should output completion message with next steps', () => {
      console.logProjectComplete('my-app', '/path/to/my-app');
      
      expect(global.console.log).toHaveBeenCalled();
      expect(capturedOutput.some(line => line.includes('created successfully'))).toBe(true);
      expect(capturedOutput.some(line => line.includes('/path/to/my-app'))).toBe(true);
      expect(capturedOutput.some(line => line.includes('cd my-app'))).toBe(true);
      expect(capturedOutput.some(line => line.includes('npm run dev'))).toBe(true);
    });
  });

  describe('Module Exports', () => {
    test('should export all required functions', () => {
      expect(typeof console.logSuccess).toBe('function');
      expect(typeof console.logError).toBe('function');
      expect(typeof console.logWarning).toBe('function');
      expect(typeof console.logInfo).toBe('function');
      expect(typeof console.logHighlight).toBe('function');
      expect(typeof console.logDim).toBe('function');
      expect(typeof console.logBold).toBe('function');
      expect(typeof console.logStep).toBe('function');
      expect(typeof console.logHeader).toBe('function');
      expect(typeof console.logSection).toBe('function');
      expect(typeof console.logListItem).toBe('function');
      expect(typeof console.logCommand).toBe('function');
      expect(typeof console.clearLine).toBe('function');
      expect(typeof console.logInline).toBe('function');
      expect(typeof console.logDivider).toBe('function');
      expect(typeof console.logProjectStart).toBe('function');
      expect(typeof console.logProjectComplete).toBe('function');
    });

    test('should export colors and icons objects', () => {
      expect(typeof console.colors).toBe('object');
      expect(typeof console.icons).toBe('object');
      expect(console.colors.success).toBeDefined();
      expect(console.colors.error).toBeDefined();
      expect(console.icons.success).toBe('✅');
      expect(console.icons.error).toBe('❌');
    });
  });
}); 