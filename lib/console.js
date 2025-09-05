const chalk = require('chalk');

/**
 * Console utility module for colored and formatted output
 * Provides consistent styling across the CLI application
 */

// Color scheme configuration
const colors = {
  success: chalk.green,
  error: chalk.red,
  warning: chalk.yellow,
  info: chalk.blue,
  highlight: chalk.cyan,
  dim: chalk.gray,
  bold: chalk.bold
};

// Icons for different message types
const icons = {
  success: '✅',
  error: '❌',
  warning: '⚠️',
  info: 'ℹ️',
  progress: '🔄',
  rocket: '🚀'
};

/**
 * Log a success message with green color and checkmark icon
 * @param {string} message - The message to display
 * @param {boolean} withIcon - Whether to include the success icon
 */
function logSuccess(message, withIcon = true) {
  const prefix = withIcon ? `${icons.success} ` : '';
  console.log(colors.success(`${prefix}${message}`));
}

/**
 * Log an error message with red color and error icon
 * @param {string} message - The message to display
 * @param {boolean} withIcon - Whether to include the error icon
 */
function logError(message, withIcon = true) {
  const prefix = withIcon ? `${icons.error} ` : '';
  console.error(colors.error(`${prefix}${message}`));
}

/**
 * Log a warning message with yellow color and warning icon
 * @param {string} message - The message to display
 * @param {boolean} withIcon - Whether to include the warning icon
 */
function logWarning(message, withIcon = true) {
  const prefix = withIcon ? `${icons.warning} ` : '';
  console.warn(colors.warning(`${prefix}${message}`));
}

/**
 * Log an info message with blue color and info icon
 * @param {string} message - The message to display
 * @param {boolean} withIcon - Whether to include the info icon
 */
function logInfo(message, withIcon = true) {
  const prefix = withIcon ? `${icons.info} ` : '';
  console.log(colors.info(`${prefix}${message}`));
}

/**
 * Log a highlighted message with cyan color
 * @param {string} message - The message to display
 */
function logHighlight(message) {
  console.log(colors.highlight(message));
}

/**
 * Log a dimmed/secondary message with gray color
 * @param {string} message - The message to display
 */
function logDim(message) {
  console.log(colors.dim(message));
}

/**
 * Log a bold message
 * @param {string} message - The message to display
 */
function logBold(message) {
  console.log(colors.bold(message));
}

/**
 * Log a step in a process with numbering
 * @param {number} step - The step number
 * @param {string} message - The step description
 * @param {number} total - Total number of steps (optional)
 */
function logStep(step, message, total = null) {
  const stepText = total ? `[${step}/${total}]` : `[${step}]`;
  console.log(colors.highlight(stepText) + ' ' + message);
}

/**
 * Log ASCII art header for Capx-AI with specific brand color
 */
function logCapxHeader() {
  // Custom color #8DBC1A (lime green)
  const capxColor = chalk.hex('#8DBC1A');
  
  console.log('');
  console.log(capxColor('  ██████╗ █████╗ ██████╗ ██╗  ██╗     █████╗ ██╗'));
  console.log(capxColor(' ██╔════╝██╔══██╗██╔══██╗╚██╗██╔╝    ██╔══██╗██║'));
  console.log(capxColor(' ██║     ███████║██████╔╝ ╚███╔╝     ███████║██║'));
  console.log(capxColor(' ██║     ██╔══██║██╔═══╝  ██╔██╗     ██╔══██║██║'));
  console.log(capxColor(' ╚██████╗██║  ██║██║     ██╔╝ ██╗    ██║  ██║██║'));
  console.log(capxColor('  ╚═════╝╚═╝  ╚═╝╚═╝     ╚═╝  ╚═╝    ╚═╝  ╚═╝╚═╝'));
  console.log('');
}

/**
 * Log a header with decorative formatting
 * @param {string} message - The header message
 * @param {boolean} useCapxHeader - Whether to use the ASCII art header for Capx-AI
 */
function logHeader(message, useCapxHeader = false) {
  if (useCapxHeader && (message.includes('Capx') || message.includes('ADK'))) {
    logCapxHeader();
    console.log(colors.bold(colors.highlight(`  ${message}  `)));
    console.log('');
  } else {
    console.log('');
    console.log(colors.bold(colors.highlight('='.repeat(message.length + 4))));
    console.log(colors.bold(colors.highlight(`  ${message}  `)));
    console.log(colors.bold(colors.highlight('='.repeat(message.length + 4))));
    console.log('');
  }
}

/**
 * Log a section separator
 * @param {string} message - The section title
 */
function logSection(message) {
  console.log('');
  console.log(colors.bold(colors.info(`--- ${message} ---`)));
}

/**
 * Create a formatted list item
 * @param {string} message - The list item message
 * @param {string} type - The type of bullet (success, error, warning, info)
 */
function logListItem(message, type = 'info') {
  const bullet = type === 'success' ? '✓' : 
                 type === 'error' ? '✗' : 
                 type === 'warning' ? '!' : 
                 '•';
  const color = colors[type] || colors.info;
  console.log(`  ${color(bullet)} ${message}`);
}

/**
 * Log a command or code snippet with special formatting
 * @param {string} command - The command to display
 */
function logCommand(command) {
  console.log(colors.dim('$ ') + colors.highlight(command));
}

/**
 * Clear the current line (useful for progress updates)
 */
function clearLine() {
  process.stdout.write('\r\x1b[K');
}

/**
 * Log without newline (useful for progress indicators)
 * @param {string} message - The message to display
 */
function logInline(message) {
  process.stdout.write(message);
}

/**
 * Create a divider line
 */
function logDivider() {
  console.log(colors.dim('─'.repeat(50)));
}

/**
 * Log project creation start message
 * @param {string} projectName - Name of the project being created
 */
function logProjectStart(projectName) {
  logHeader(`Creating ${projectName}`);
  logInfo(`${icons.rocket} Starting project generation...`);
}

/**
 * Log project creation completion message
 * @param {string} projectName - Name of the project that was created
 * @param {string} projectPath - Path where the project was created
 */
function logProjectComplete(projectName, projectPath) {
  console.log('');
  logSuccess(`Project "${projectName}" created successfully!`);
  logDim(`Location: ${projectPath}`);
  console.log('');
  logSection('Next Steps');
  logListItem(`cd ${projectName}`, 'info');
  logListItem('npm run dev', 'info');
  console.log('');
  logSuccess('Happy coding! 🎉');
}

module.exports = {
  // Basic logging functions
  logSuccess,
  logError,
  logWarning,
  logInfo,
  logHighlight,
  logDim,
  logBold,
  
  // Structured logging
  logStep,
  logHeader,
  logCapxHeader,
  logSection,
  logListItem,
  logCommand,
  
  // Utility functions
  clearLine,
  logInline,
  logDivider,
  
  // Project-specific functions
  logProjectStart,
  logProjectComplete,
  
  // Direct access to colors and icons
  colors,
  icons
}; 