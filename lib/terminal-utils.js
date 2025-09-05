const os = require('os');

/**
 * Terminal utilities for cross-platform terminal management
 * Provides screen clearing, cursor control, and terminal capability detection
 */

/**
 * Detect terminal capabilities and environment
 * @returns {Object} Terminal capability information
 */
function detectTerminalCapabilities() {
  const platform = os.platform();
  const term = process.env.TERM || '';
  const colorterm = process.env.COLORTERM || '';
  const isTTY = process.stdout.isTTY;
  
  // Check if we're in a CI environment
  const isCI = !!(
    process.env.CI ||
    process.env.CONTINUOUS_INTEGRATION ||
    process.env.BUILD_NUMBER ||
    process.env.GITHUB_ACTIONS ||
    process.env.TRAVIS ||
    process.env.CIRCLECI
  );
  
  // Terminal type detection
  const isWindows = platform === 'win32';
  const isWindowsTerminal = process.env.WT_SESSION;
  const isPowerShell = process.env.PSModulePath;
  const isCmd = isWindows && !isWindowsTerminal && !isPowerShell;
  const isConEmu = process.env.ConEmuPID;
  const isITerm = term.includes('iterm') || process.env.TERM_PROGRAM === 'iTerm.app';
  const isTerminalApp = process.env.TERM_PROGRAM === 'Apple_Terminal';
  const isVSCode = process.env.TERM_PROGRAM === 'vscode';
  
  // Feature support detection
  const supportsAnsi = !!(isTTY && !isCI && (
    !isWindows || isWindowsTerminal || isConEmu || isPowerShell
  ));
  
  const supportsColors = !!(supportsAnsi && (
    colorterm === 'truecolor' ||
    term.includes('256color') ||
    term.includes('color') ||
    isITerm ||
    isTerminalApp ||
    isWindowsTerminal
  ));
  
  const supportsCursor = supportsAnsi;
  const supportsScreenClear = supportsAnsi;
  
  return {
    platform,
    isTTY,
    isCI,
    isWindows,
    isWindowsTerminal,
    isPowerShell,
    isCmd,
    isConEmu,
    isITerm,
    isTerminalApp,
    isVSCode,
    supportsAnsi,
    supportsColors,
    supportsCursor,
    supportsScreenClear,
    terminalType: term,
    colorTerminal: colorterm
  };
}

/**
 * Clear the terminal screen using the most appropriate method
 * @param {Object} options - Clearing options
 * @param {boolean} options.preserveScrollback - Whether to preserve scrollback buffer
 * @param {boolean} options.resetCursor - Whether to reset cursor to top-left
 * @returns {boolean} Success status
 */
function clearScreen(options = {}) {
  const { preserveScrollback = false, resetCursor = true } = options;
  const capabilities = detectTerminalCapabilities();
  
  // Don't clear in CI environments or non-TTY
  if (capabilities.isCI || !capabilities.isTTY) {
    return false;
  }
  
  try {
    if (capabilities.supportsScreenClear) {
      if (preserveScrollback) {
        // Clear visible area only, preserve scrollback
        if (resetCursor) {
          process.stdout.write('\x1B[H\x1B[2J'); // Move to home + clear screen
        } else {
          process.stdout.write('\x1B[2J'); // Clear screen only
        }
      } else {
        // Full clear including scrollback buffer
        process.stdout.write('\x1Bc'); // Full reset
      }
      return true;
    } else if (capabilities.isCmd) {
      // Windows CMD fallback
      const { execSync } = require('child_process');
      execSync('cls', { stdio: 'inherit' });
      return true;
    } else {
      // Fallback: multiple newlines
      process.stdout.write('\n'.repeat(process.stdout.rows || 50));
      return true;
    }
  } catch (error) {
    // Silent fallback to newlines
    process.stdout.write('\n'.repeat(10));
    return false;
  }
}

/**
 * Clear only the current line
 * @param {number} direction - 0: entire line, 1: from cursor to end, 2: from start to cursor
 */
function clearLine(direction = 0) {
  const capabilities = detectTerminalCapabilities();
  
  if (capabilities.supportsCursor) {
    process.stdout.write(`\x1B[${direction}K`);
  }
}

/**
 * Move cursor to specific position
 * @param {number} row - Row position (1-based)
 * @param {number} col - Column position (1-based)
 */
function moveCursor(row, col) {
  const capabilities = detectTerminalCapabilities();
  
  if (capabilities.supportsCursor) {
    process.stdout.write(`\x1B[${row};${col}H`);
  }
}

/**
 * Move cursor up by specified lines
 * @param {number} lines - Number of lines to move up
 */
function moveCursorUp(lines = 1) {
  const capabilities = detectTerminalCapabilities();
  
  if (capabilities.supportsCursor && lines > 0) {
    process.stdout.write(`\x1B[${lines}A`);
  }
}

/**
 * Move cursor down by specified lines
 * @param {number} lines - Number of lines to move down
 */
function moveCursorDown(lines = 1) {
  const capabilities = detectTerminalCapabilities();
  
  if (capabilities.supportsCursor && lines > 0) {
    process.stdout.write(`\x1B[${lines}B`);
  }
}

/**
 * Hide the cursor
 */
function hideCursor() {
  const capabilities = detectTerminalCapabilities();
  
  if (capabilities.supportsCursor) {
    process.stdout.write('\x1B[?25l');
  }
}

/**
 * Show the cursor
 */
function showCursor() {
  const capabilities = detectTerminalCapabilities();
  
  if (capabilities.supportsCursor) {
    process.stdout.write('\x1B[?25h');
  }
}

/**
 * Get terminal dimensions
 * @returns {Object} Width and height of terminal
 */
function getTerminalSize() {
  return {
    width: process.stdout.columns || 80,
    height: process.stdout.rows || 24
  };
}

/**
 * Smart clear that preserves important information
 * Clears screen but shows the Capx logo and previous selections
 * @param {Object} preservedInfo - Information to preserve at top
 */
function smartClear(preservedInfo = {}) {
  const capabilities = detectTerminalCapabilities();
  
  if (!capabilities.isTTY || capabilities.isCI) {
    // Just add some spacing in non-interactive environments
    console.log('\n');
    return;
  }
  
  // Clear the screen
  clearScreen({ preserveScrollback: true });
  
  // Always redisplay the Capx logo after clearing
  const { logCapxHeader } = require('./console');
  logCapxHeader();
  console.log('  🚀 capx-compose - AI Application Generator  ');
  console.log('');
  
  // Show preserved information if provided
  if (Object.keys(preservedInfo).length > 0) {
    const { colors } = require('./prompt-helpers');
    
    // More prominent header with previous selections
    console.log(colors.primary('═'.repeat(64)));
    
    if (preservedInfo.projectType) {
      console.log(colors.bold(`📋 Project Type: ${colors.primary(preservedInfo.projectType)}`));
    }
    
    if (preservedInfo.blockchain) {
      console.log(colors.bold(`⛓️  Blockchain: ${colors.primary(preservedInfo.blockchain)}`));
    }
    
    if (preservedInfo.plugins && preservedInfo.plugins.length > 0) {
      console.log(colors.bold(`🔧 Plugins: ${colors.primary(preservedInfo.plugins.join(', '))}`));
    }
    
    if (preservedInfo.step) {
      console.log(colors.bold(`🎯 Current Step: ${colors.primary(preservedInfo.step)}`));
    }
    
    console.log(colors.primary('═'.repeat(64)));
    console.log('');
  }
}

/**
 * Cleanup function to restore terminal state on exit
 */
function cleanup() {
  showCursor();
}

// Ensure cursor is shown on process exit
process.on('exit', cleanup);
process.on('SIGINT', () => {
  cleanup();
  process.exit(0);
});
process.on('SIGTERM', () => {
  cleanup();
  process.exit(0);
});

module.exports = {
  detectTerminalCapabilities,
  clearScreen,
  clearLine,
  moveCursor,
  moveCursorUp,
  moveCursorDown,
  hideCursor,
  showCursor,
  getTerminalSize,
  smartClear,
  cleanup
}; 