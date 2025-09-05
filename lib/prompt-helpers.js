const chalk = require('chalk');

/**
 * Prompt helpers for enhanced CLI experience
 * Provides formatting utilities for the improved interactive flow
 */

// Enhanced color scheme
const colors = {
  primary: chalk.hex('#8DBC1A'),      // Capx brand color
  secondary: chalk.cyan,
  success: chalk.green,
  error: chalk.red,
  warning: chalk.yellow,
  info: chalk.blue,
  muted: chalk.gray,
  bold: chalk.bold,
  dim: chalk.dim
};

// Enhanced icons
const icons = {
  web2: '🌐',
  web3: '⛓️',
  ai: '🤖',
  database: '🗄️',
  auth: '🔐',
  blockchain: '⚡',
  performance: '🚀',
  cache: '💨',
  time: '⏱️',
  complexity: '📊',
  check: '✅',
  arrow: '➤',
  star: '⭐',
  rocket: '🚀',
  gear: '⚙️',
  warning: '⚠️'
};

/**
 * Create a progress bar for multi-step processes
 * @param {number} current - Current step (1-based)
 * @param {number} total - Total steps
 * @param {string} label - Optional label for current step
 * @returns {string} Formatted progress bar
 */
function createProgressBar(current, total, label = '') {
  const percentage = Math.round((current / total) * 100);
  const barLength = 20;
  const filledLength = Math.round((current / total) * barLength);
  const emptyLength = barLength - filledLength;
  
  const filled = colors.primary('█'.repeat(filledLength));
  const empty = colors.muted('░'.repeat(emptyLength));
  const bar = `[${filled}${empty}]`;
  
  const stepInfo = colors.bold(`Step ${current}/${total}`);
  const percentInfo = colors.muted(`(${percentage}%)`);
  const labelInfo = label ? colors.info(` - ${label}`) : '';
  
  return `${stepInfo} ${bar} ${percentInfo}${labelInfo}`;
}

/**
 * Create a formatted section header
 * @param {string} title - Section title
 * @param {string} subtitle - Optional subtitle
 * @returns {string} Formatted section
 */
function createSection(title, subtitle = '') {
  const divider = colors.muted('─'.repeat(60));
  const titleLine = colors.bold(colors.primary(title));
  const subtitleLine = subtitle ? colors.muted(subtitle) : '';
  
  return `\n${divider}\n${titleLine}${subtitleLine ? '\n' + subtitleLine : ''}\n${divider}`;
}

/**
 * Create a formatted card for project types or options
 * @param {Object} options - Card configuration
 * @param {string} options.title - Card title
 * @param {string} options.description - Card description
 * @param {string} options.icon - Card icon
 * @param {Array} options.features - Array of features
 * @param {string} options.complexity - Complexity level
 * @param {string} options.time - Estimated time
 * @param {boolean} options.recommended - Whether this option is recommended
 * @returns {string} Formatted card
 */
function createCard({
  title,
  description,
  icon = '',
  features = [],
  complexity = '',
  time = '',
  recommended = false
}) {
  const width = 50;
  const border = colors.muted('┌' + '─'.repeat(width - 2) + '┐');
  const borderBottom = colors.muted('└' + '─'.repeat(width - 2) + '┘');
  
  // Title line with icon and recommendation badge
  let titleLine = `${icon} ${colors.bold(title)}`;
  if (recommended) {
    titleLine += ` ${colors.success('(Recommended)')}`;
  }
  
  // Description
  const descLines = wrapText(description, width - 4);
  
  // Features
  const featureLines = features.map(feature => 
    `  ${colors.success('•')} ${feature}`
  );
  
  // Metadata
  const metadata = [];
  if (complexity) metadata.push(`${icons.complexity} ${complexity}`);
  if (time) metadata.push(`${icons.time} ${time}`);
  
  const lines = [
    border,
    padLine(titleLine, width),
    padLine('', width),
    ...descLines.map(line => padLine(line, width)),
    padLine('', width),
    ...featureLines.map(line => padLine(line, width)),
    ...(metadata.length > 0 ? [
      padLine('', width),
      padLine(colors.muted(metadata.join(' • ')), width)
    ] : []),
    borderBottom
  ];
  
  return lines.join('\n');
}

/**
 * Create a comparison table for options
 * @param {Array} items - Array of items to compare
 * @param {Array} columns - Column definitions
 * @returns {string} Formatted table
 */
function createComparisonTable(items, columns) {
  if (!items.length || !columns.length) return '';
  
  // Calculate column widths
  const widths = columns.map(col => {
    const headerWidth = col.header.length;
    const maxContentWidth = Math.max(
      ...items.map(item => String(item[col.key] || '').length)
    );
    return Math.max(headerWidth, maxContentWidth) + 2;
  });
  
  // Create header
  const headerRow = columns.map((col, i) => 
    colors.bold(col.header.padEnd(widths[i]))
  ).join('│');
  
  const separator = widths.map(w => '─'.repeat(w)).join('┼');
  
  // Create data rows
  const dataRows = items.map(item => 
    columns.map((col, i) => {
      let value = String(item[col.key] || '');
      if (col.format) {
        const formatted = col.format(value);
        value = String(formatted || ''); // Handle null/undefined returns from format function
      }
      return value.padEnd(widths[i]);
    }).join('│')
  );
  
  return [
    colors.muted('┌' + separator.replace(/┼/g, '┬') + '┐'),
    '│' + headerRow + '│',
    colors.muted('├' + separator + '┤'),
    ...dataRows.map(row => '│' + row + '│'),
    colors.muted('└' + separator.replace(/┼/g, '┴') + '┘')
  ].join('\n');
}

/**
 * Apply semantic colors to text based on type
 * @param {string} text - Text to color
 * @param {string} type - Color type (success, error, warning, info, etc.)
 * @returns {string} Colored text
 */
function applySemanticColors(text, type) {
  const colorFn = colors[type] || colors.info;
  return colorFn(text);
}

/**
 * Create a status indicator
 * @param {string} status - Status type
 * @param {string} text - Status text
 * @returns {string} Formatted status
 */
function createStatus(status, text) {
  const statusIcons = {
    success: colors.success('✓'),
    error: colors.error('✗'),
    warning: colors.warning('!'),
    info: colors.info('i'),
    pending: colors.muted('○'),
    progress: colors.primary('●')
  };
  
  const icon = statusIcons[status] || statusIcons.info;
  return `${icon} ${text}`;
}

/**
 * Create a divider line
 * @param {string} char - Character to use for divider
 * @param {number} length - Length of divider
 * @returns {string} Formatted divider
 */
function createDivider(char = '─', length = 60) {
  // Ensure length is not negative
  const safeLength = Math.max(0, length);
  return colors.muted(char.repeat(safeLength));
}

// Helper functions
function wrapText(text, width) {
  if (text == null) text = '';
  if (text === '') return ['']; // Handle empty string case
  
  const words = text.split(' ');
  const lines = [];
  let currentLine = '';
  
  for (const word of words) {
    if ((currentLine + word).length <= width - 4) {
      currentLine += (currentLine ? ' ' : '') + word;
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  }
  
  if (currentLine) lines.push(currentLine);
  return lines;
}

function padLine(text, width) {
  if (text == null) text = '';
  const cleanText = String(text).replace(/\u001b\[[0-9;]*m/g, ''); // Remove ANSI codes for length calculation
  const padding = Math.max(0, width - cleanText.length - 2);
  return colors.muted('│') + text + ' '.repeat(padding) + colors.muted('│');
}

module.exports = {
  colors,
  icons,
  createProgressBar,
  createSection,
  createCard,
  createComparisonTable,
  applySemanticColors,
  createStatus,
  createDivider,
  wrapText,
  padLine
}; 