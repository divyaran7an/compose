// Mock dependencies before requiring the module
const mockOs = {
  platform: jest.fn()
};

const mockExecSync = jest.fn();
const mockChildProcess = {
  execSync: mockExecSync
};

const mockConsole = {
  log: jest.fn()
};

const mockPromptHelpers = {
  colors: {
    primary: jest.fn(text => text),
    bold: jest.fn(text => text)
  }
};

const mockConsoleMethods = {
  logCapxHeader: jest.fn()
};

jest.mock('os', () => mockOs);
jest.mock('child_process', () => mockChildProcess);
jest.mock('../../../lib/console', () => mockConsoleMethods);
jest.mock('../../../lib/prompt-helpers', () => mockPromptHelpers);

// Mock stdout
const mockStdout = {
  write: jest.fn(),
  isTTY: true,
  columns: 80,
  rows: 24
};

Object.defineProperty(process, 'stdout', {
  value: mockStdout
});

const terminalUtils = require('../../../lib/terminal-utils');

describe('Terminal Utils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockStdout.isTTY = true;
    mockStdout.columns = 80;
    mockStdout.rows = 24;
    // Reset environment variables
    delete process.env.CI;
    delete process.env.TERM;
    delete process.env.WT_SESSION;
    delete process.env.PSModulePath;
    delete process.env.ConEmuPID;
    
    // Replace console methods
    global.console = mockConsole;
  });

  describe('detectTerminalCapabilities', () => {
    test('should detect Linux terminal capabilities', () => {
      mockOs.platform.mockReturnValue('linux');
      process.env.TERM = 'xterm-256color';
      
      const capabilities = terminalUtils.detectTerminalCapabilities();
      
      expect(capabilities.platform).toBe('linux');
      expect(capabilities.isWindows).toBe(false);
      expect(capabilities.isTTY).toBe(true);
      expect(capabilities.supportsAnsi).toBe(true);
    });

    test('should detect Windows capabilities', () => {
      mockOs.platform.mockReturnValue('win32');
      process.env.WT_SESSION = 'abc123';
      
      const capabilities = terminalUtils.detectTerminalCapabilities();
      
      expect(capabilities.platform).toBe('win32');
      expect(capabilities.isWindows).toBe(true);
      expect(capabilities.isWindowsTerminal).toBe('abc123');
    });

    test('should detect CI environment', () => {
      mockOs.platform.mockReturnValue('linux');
      process.env.CI = 'true';
      
      const capabilities = terminalUtils.detectTerminalCapabilities();
      
      expect(capabilities.isCI).toBe(true);
    });
  });

  describe('clearScreen', () => {
    test('should clear screen on supported terminal', () => {
      mockOs.platform.mockReturnValue('linux');
      
      const result = terminalUtils.clearScreen();
      
      expect(mockStdout.write).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    test('should skip clearing in CI environment', () => {
      process.env.CI = 'true';
      
      const result = terminalUtils.clearScreen();
      
      expect(result).toBe(false);
    });

    test('should use CMD fallback on Windows', () => {
      mockOs.platform.mockReturnValue('win32');
      // Mock as old CMD without ANSI support
      delete process.env.WT_SESSION;
      delete process.env.PSModulePath;
      delete process.env.ConEmuPID;
      
      terminalUtils.clearScreen();
      
      expect(mockExecSync).toHaveBeenCalledWith('cls', { stdio: 'inherit' });
    });
  });

  describe('cursor functions', () => {
    beforeEach(() => {
      mockOs.platform.mockReturnValue('linux');
    });

    test('should move cursor to position', () => {
      terminalUtils.moveCursor(5, 10);
      
      expect(mockStdout.write).toHaveBeenCalledWith('\x1B[5;10H');
    });

    test('should move cursor up', () => {
      terminalUtils.moveCursorUp(3);
      
      expect(mockStdout.write).toHaveBeenCalledWith('\x1B[3A');
    });

    test('should move cursor down', () => {
      terminalUtils.moveCursorDown(2);
      
      expect(mockStdout.write).toHaveBeenCalledWith('\x1B[2B');
    });

    test('should hide cursor', () => {
      terminalUtils.hideCursor();
      
      expect(mockStdout.write).toHaveBeenCalledWith('\x1B[?25l');
    });

    test('should show cursor', () => {
      terminalUtils.showCursor();
      
      expect(mockStdout.write).toHaveBeenCalledWith('\x1B[?25h');
    });

    test('should not move cursor up with zero lines', () => {
      terminalUtils.moveCursorUp(0);
      
      expect(mockStdout.write).not.toHaveBeenCalledWith('\x1B[0A');
    });

    test('should not move cursor down with zero lines', () => {
      terminalUtils.moveCursorDown(0);
      
      expect(mockStdout.write).not.toHaveBeenCalledWith('\x1B[0B');
    });
  });

  describe('clearLine', () => {
    beforeEach(() => {
      mockOs.platform.mockReturnValue('linux');
    });

    test('should clear entire line', () => {
      terminalUtils.clearLine(0);
      
      expect(mockStdout.write).toHaveBeenCalledWith('\x1B[0K');
    });

    test('should clear from cursor to end', () => {
      terminalUtils.clearLine(1);
      
      expect(mockStdout.write).toHaveBeenCalledWith('\x1B[1K');
    });
  });

  describe('getTerminalSize', () => {
    test('should return terminal dimensions', () => {
      const size = terminalUtils.getTerminalSize();
      
      expect(size.width).toBe(80);
      expect(size.height).toBe(24);
    });

    test('should use defaults when columns/rows not available', () => {
      mockStdout.columns = undefined;
      mockStdout.rows = undefined;
      
      const size = terminalUtils.getTerminalSize();
      
      expect(size.width).toBe(80);
      expect(size.height).toBe(24);
    });
  });

  describe('smartClear', () => {
    beforeEach(() => {
      mockOs.platform.mockReturnValue('linux');
    });

    test('should display preserved info', () => {
      const preservedInfo = {
        projectType: 'WEB3',
        blockchain: 'ethereum',
        plugins: ['supabase', 'prisma']
      };
      
      terminalUtils.smartClear(preservedInfo);
      
      expect(mockConsoleMethods.logCapxHeader).toHaveBeenCalled();
      expect(mockConsole.log).toHaveBeenCalled();
      
      // Just check that smartClear was called with preserved info
      // The specific formatting is handled by the colors module
      expect(mockPromptHelpers.colors.primary).toHaveBeenCalled();
      expect(mockPromptHelpers.colors.bold).toHaveBeenCalled();
    });

    test('should handle CI environment', () => {
      process.env.CI = 'true';
      
      terminalUtils.smartClear({ projectType: 'WEB3' });
      
      expect(mockConsole.log).toHaveBeenCalledWith('\n');
      expect(mockStdout.write).not.toHaveBeenCalled();
    });
  });

  describe('cleanup', () => {
    test('should show cursor on cleanup', () => {
      mockOs.platform.mockReturnValue('linux');
      
      terminalUtils.cleanup();
      
      expect(mockStdout.write).toHaveBeenCalledWith('\x1B[?25h');
    });
  });

  describe('edge cases', () => {
    test('should handle non-TTY environment', () => {
      mockStdout.isTTY = false;
      
      const result = terminalUtils.clearScreen();
      
      expect(result).toBe(false);
    });

    test('should handle clearScreen errors gracefully', () => {
      mockOs.platform.mockReturnValue('linux');
      mockStdout.write.mockImplementationOnce(() => {
        throw new Error('Mock error');
      });
      
      // Should not throw and should return false
      expect(() => {
        const result = terminalUtils.clearScreen();
        expect(result).toBe(false);
      }).not.toThrow();
    });

    test('should handle various terminal types', () => {
      const testCases = [
        { platform: 'darwin', expected: { isWindows: false } },
        { platform: 'freebsd', expected: { isWindows: false } },
        { platform: 'linux', expected: { isWindows: false } },
        { platform: 'win32', expected: { isWindows: true } }
      ];

      testCases.forEach(({ platform, expected }) => {
        mockOs.platform.mockReturnValue(platform);
        
        const capabilities = terminalUtils.detectTerminalCapabilities();
        
        expect(capabilities.platform).toBe(platform);
        expect(capabilities.isWindows).toBe(expected.isWindows);
      });
    });
  });
}); 