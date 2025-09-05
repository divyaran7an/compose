const inquirer = require('inquirer');
const { 
  colors, 
  icons, 
  createProgressBar, 
  createSection, 
  createCard,
  createComparisonTable,
  applySemanticColors,
  createStatus,
  createDivider 
} = require('./prompt-helpers');
const { 
  generateConfigurationSummary, 
  formatConfigurationSummary,
  getPluginDisplayName 
} = require('./configuration-optimizer');
const { smartClear } = require('./terminal-utils');
const { getState, resetState } = require('./terminal-state');

/**
 * Enhanced prompt system for improved CLI experience
 * Provides categorized, visual, and intelligent prompting
 */

// Project type definitions with detailed information
const PROJECT_TYPES = {
  web2: {
    name: 'Web2 - Traditional Web Application',
    value: 'web2',
    icon: icons.web2,
    description: 'Build modern web applications with traditional architecture, databases, and cloud services. Perfect for SaaS, e-commerce, and content platforms.',
    features: [
      'Database integration (Supabase/Firebase)',
      'AI/ML capabilities (Vercel AI)',
      'Authentication & user management',
      'Optional caching layer (Vercel KV)',
      'Serverless architecture ready'
    ],
    techStack: ['Next.js', 'TypeScript', 'Tailwind CSS', 'React'],
    complexity: 'Beginner to Intermediate',
    estimatedTime: '5-15 minutes',
    recommended: true,
    useCase: 'Ideal for: SaaS platforms, e-commerce sites, content management systems, business applications',
    benefits: 'Faster development, proven architecture, extensive ecosystem, easier deployment'
  },
  web3: {
    name: 'Web3 - Blockchain/DeFi Application',
    value: 'web3',
    icon: icons.web3,
    description: 'Create decentralized applications with blockchain integration, smart contracts, and Web3 wallets. Build the future of finance and ownership.',
    features: [
      'Multi-chain blockchain support (EVM/Solana/SUI)',
      'Wallet integration & management',
      'Smart contract interaction',
      'DeFi protocols & trading',
      'NFT marketplace capabilities'
    ],
    techStack: ['Next.js', 'TypeScript', 'Web3 Libraries', 'Blockchain SDKs'],
    complexity: 'Intermediate to Advanced',
    estimatedTime: '10-30 minutes',
    recommended: false,
    useCase: 'Ideal for: DeFi platforms, NFT marketplaces, DAOs, trading applications, blockchain games',
    benefits: 'Decentralized architecture, ownership transparency, global accessibility, innovative monetization'
  }
};

// Blockchain options for Web3 projects
const BLOCKCHAIN_OPTIONS = {
  evm: {
    name: 'EVM (Ethereum Virtual Machine)',
    value: 'evm',
    icon: icons.blockchain,
    category: 'EVM',
    description: 'Build on Ethereum-compatible networks including Base, Ethereum mainnet, Arbitrum, Optimism, and Polygon.',
    networks: ['Base (Coinbase)', 'Ethereum', 'Arbitrum', 'Optimism', 'Polygon'],
    gasFeesRange: 'Low to High (depends on network)',
    ecosystemHighlights: [
      'Largest DeFi ecosystem',
      'Extensive tooling & libraries',
      'Smart contract standards (ERC-20, ERC-721)',
      'Layer 2 scaling solutions'
    ],
    supportedWallets: ['MetaMask', 'WalletConnect', 'Coinbase Wallet'],
    complexity: 'Intermediate',
    recommended: true
  },
  solana: {
    name: 'Solana',
    value: 'solana',
    icon: icons.blockchain,
    category: 'Solana',
    description: 'Build on Solana\'s high-performance blockchain with low fees and fast transactions.',
    networks: ['Solana Mainnet', 'Solana Devnet'],
    gasFeesRange: 'Very Low (typically $0.00025)',
    ecosystemHighlights: [
      'High throughput (65k TPS)',
      'Low transaction costs',
      'Growing DeFi & NFT ecosystem',
      'Rust-based smart contracts'
    ],
    supportedWallets: ['Phantom', 'Solflare', 'Backpack'],
    complexity: 'Intermediate to Advanced',
    recommended: false
  },
  sui: {
    name: 'SUI',
    value: 'sui',
    icon: icons.blockchain,
    category: 'SUI',
    description: 'Build on SUI\'s object-centric blockchain with instant finality and horizontal scaling.',
    networks: ['SUI Mainnet', 'SUI Testnet', 'SUI Devnet'],
    gasFeesRange: 'Very Low (sub-cent transactions)',
    ecosystemHighlights: [
      'Ultra-high throughput (120k+ TPS)',
      'Object-centric data model',
      'Move programming language',
      'Instant transaction finality'
    ],
    supportedWallets: ['Sui Wallet', 'Suiet', 'Martian', 'Surf'],
    complexity: 'Intermediate',
    recommended: false
  }
};

// Plugin categories for better organization
const PLUGIN_CATEGORIES = {
  'AI & Machine Learning': {
    icon: icons.ai,
    plugins: ['vercel-ai'],
    description: 'Add AI capabilities to your application'
  },
  'Database': {
    icon: icons.database,
    plugins: ['supabase', 'firebase'],
    description: 'Primary data storage and management solutions'
  },
  'Caching & Performance': {
    icon: icons.performance || '🚀',
    plugins: ['vercel-kv'],
    description: 'Optional caching layer for enhanced performance'
  },
  'Blockchain Wallets': {
    icon: icons.blockchain,
    plugins: ['evm', 'solana', 'sui'],
    description: 'Blockchain wallet integration (auto-included based on selection)'
  },
  'Enhanced Auth': {
    icon: icons.auth || '🔐',
    plugins: ['privy'],
    description: 'Enhanced authentication with embedded wallets (requires blockchain)'
  },
  'AI Agents': {
    icon: icons.gear,
    plugins: ['goat', 'solana-agent-kit'],
    description: 'Advanced AI agents for blockchain interactions'
  }
};

/**
 * Enhanced project type selection with detailed cards and descriptions
 * @returns {Promise<string>} Selected project type
 */
async function projectTypeSelection() {
  console.log(createSection(
    '🚀 Project Type Selection',
    'Choose the type of application you want to build'
  ));
  
  // Display detailed cards for each project type
  console.log('\n' + colors.bold('Available Project Types:'));
  console.log('');
  
  Object.values(PROJECT_TYPES).forEach(type => {
    const card = createCard({
      title: type.name,
      description: type.description,
      icon: type.icon,
      features: type.features,
      complexity: type.complexity,
      time: type.estimatedTime,
      recommended: type.recommended
    });
    console.log(card);
    console.log('');
    
    // Additional details
    console.log(colors.info('  ' + type.useCase));
    console.log(colors.muted('  ' + type.benefits));
    console.log('');
  });
  
  const { projectType } = await inquirer.prompt([
    {
      type: 'list',
      name: 'projectType',
      message: colors.bold('Select your project type:'),
      choices: Object.values(PROJECT_TYPES).map(type => ({
        name: `${type.icon}${type.icon === '⛓️' ? '  ' : ' '}${type.name}${type.recommended ? ' (Recommended)' : ''}`,
        value: type.value,
        short: type.name
      })),
      default: 'web2',
      validate: (input) => !!input || 'You must select a project type.'
    }
  ]);
  
  // Show selection confirmation
  const selectedType = PROJECT_TYPES[projectType];
  console.log('\n' + createStatus('success', `Selected: ${selectedType.name}`));
  console.log(colors.muted(`  ${selectedType.description}`));
  
  return projectType;
}

/**
 * Conditional blockchain selection for Web3 projects
 * @returns {Promise<string|null>} Selected blockchain or null for Web2
 */
async function blockchainSelection() {
  console.log(createSection(
    '⛓️ Blockchain Selection',
    'Choose the blockchain network for your Web3 application'
  ));
  
  // Display blockchain comparison
  console.log('\n' + colors.bold('Blockchain Network Comparison:'));
  console.log('');
  
  const comparisonData = Object.values(BLOCKCHAIN_OPTIONS);
  const comparisonTable = createComparisonTable(comparisonData, [
    { header: 'Network', key: 'name' },
    { header: 'Category', key: 'category' },
    { header: 'Gas Fees', key: 'gasFeesRange' },
    { header: 'Complexity', key: 'complexity' }
  ]);
  
  console.log(comparisonTable);
  console.log('');
  
  // Display detailed cards for each blockchain
  Object.values(BLOCKCHAIN_OPTIONS).forEach(blockchain => {
    const card = createCard({
      title: blockchain.name,
      description: blockchain.description,
      icon: blockchain.icon,
      features: blockchain.ecosystemHighlights,
      complexity: blockchain.complexity,
      recommended: blockchain.recommended
    });
    console.log(card);
    console.log('');
    
    // Additional network details
    console.log(colors.info(`  Networks: ${blockchain.networks.join(', ')}`));
    console.log(colors.info(`  Wallets: ${blockchain.supportedWallets.join(', ')}`));
    console.log('');
  });
  
  const { blockchain } = await inquirer.prompt([
    {
      type: 'list',
      name: 'blockchain',
      message: colors.bold('Select your blockchain network:'),
      choices: Object.values(BLOCKCHAIN_OPTIONS).map(bc => ({
        name: `${bc.icon} ${bc.name}${bc.recommended ? ' (Recommended)' : ''}`,
        value: bc.value,
        short: bc.name
      })),
      default: 'evm',
      validate: (input) => !!input || 'You must select a blockchain network.'
    }
  ]);
  
  // Show selection confirmation
  const selectedBlockchain = BLOCKCHAIN_OPTIONS[blockchain];
  console.log('\n' + createStatus('success', `Selected: ${selectedBlockchain.name}`));
  console.log(colors.muted(`  ${selectedBlockchain.description}`));
  
  return blockchain;
}

/**
 * Enhanced plugin selection interface with unified selection
 * @param {Array} availablePlugins - Array of available plugin objects
 * @param {Array} autoIncluded - Array of auto-included plugin keys
 * @returns {Promise<Array>} Array of selected plugin keys
 */
async function enhancedPluginSelection(availablePlugins, autoIncluded) {
  if (availablePlugins.length === 0) {
    return [];
  }

  // Group plugins by category for display
  const pluginsByCategory = {};
  availablePlugins.forEach(plugin => {
    if (!pluginsByCategory[plugin.category]) {
      pluginsByCategory[plugin.category] = [];
    }
    pluginsByCategory[plugin.category].push(plugin);
  });

  // Create choices with category separators
  const choices = [];
  
  Object.entries(pluginsByCategory).forEach(([categoryName, categoryPlugins]) => {
    // Add category header as separator
    let categoryLabel = `${getCategoryIcon(categoryName)} ${categoryName}`;
    
    if (categoryName === 'Database & Storage') {
      categoryLabel += ' (max 1 database)';
    } else if (categoryName === 'AI Agents') {
      categoryLabel += ' (choose 1)';
    }
    
    choices.push(new inquirer.Separator(categoryLabel));
    
    // Add plugins in this category
    categoryPlugins.forEach(plugin => {
      choices.push({
        name: plugin.name,
        value: plugin.value,
        short: plugin.name
      });
    });
    
    // Add spacing between categories
    choices.push(new inquirer.Separator(' '));
  });

  // Single unified selection prompt
  const { selectedPlugins } = await inquirer.prompt([
    {
      type: 'checkbox',
      name: 'selectedPlugins',
      message: 'Select additional plugins for your project:',
      choices: choices,
      validate: (input) => {
        const validation = validatePluginSelection(input, autoIncluded);
        return validation.isValid ? true : validation.errors[0];
      },
      pageSize: 15
    }
  ]);

  return selectedPlugins;
}

/**
 * Validate plugin selection against rules
 * @param {Array} selectedPlugins - Array of selected plugin keys
 * @param {Array} autoIncluded - Array of auto-included plugin keys
 * @returns {Object} Validation result with isValid, errors, and warnings
 */
function validatePluginSelection(selectedPlugins, autoIncluded) {
  const errors = [];
  const warnings = [];
  
  // Ensure inputs are arrays
  selectedPlugins = selectedPlugins || [];
  autoIncluded = autoIncluded || [];
  
  const totalPlugins = selectedPlugins.length + autoIncluded.length;
  
  if (totalPlugins > 6) {
    errors.push(`Maximum 6 plugins total. Currently selected: ${totalPlugins}`);
  }
  
  // Validate database selection (max 1 primary database)
  const databases = selectedPlugins.filter(p => ['supabase', 'firebase'].includes(p));
  if (databases.length > 1) {
    errors.push('Only one primary database can be selected (Supabase OR Firebase).');
  }
  
  // Note: vercel-kv is now in Caching category and doesn't need validation - it's fully optional
  
  // Validate AI agents (max 1)
  const aiAgents = selectedPlugins.filter(p => ['goat', 'solana-agent-kit'].includes(p));
  if (aiAgents.length > 1) {
    errors.push('Only one AI agent plugin can be selected (GOAT OR Solana Agent Kit).');
  }
  
  // Validate privy requirements
  const allPlugins = [...selectedPlugins, ...autoIncluded];
  if (allPlugins.includes('privy')) {
    const blockchainPlugins = allPlugins.filter(p => ['evm', 'solana', 'sui', 'goat', 'solana-agent-kit'].includes(p));
    if (blockchainPlugins.length === 0) {
      errors.push('Privy requires at least one blockchain plugin (EVM, Solana, SUI, GOAT, or Solana Agent Kit).');
    }
  }
  
  // Check for empty selection
  if (selectedPlugins.length === 0 && autoIncluded.length === 0) {
    warnings.push('No plugins selected. Consider adding at least one plugin for enhanced functionality.');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    hasWarnings: warnings.length > 0
  };
}

/**
 * Enhanced plugin selection with categories and auto-inclusion logic
 * @param {string} projectType - The selected project type
 * @param {string|null} blockchain - The selected blockchain (if Web3)
 * @returns {Promise<Array>} Selected plugins
 */
async function pluginSelection(projectType, blockchain = null) {
  console.log(createSection(
    '🔧 Plugin Selection',
    'Choose additional features and integrations for your project'
  ));
  
  // Build available plugins based on project type
  const availablePlugins = [];
  const autoIncluded = [];
  
  // Auto-include blockchain wallet based on selection
  if (projectType === 'web3' && blockchain) {
    autoIncluded.push(blockchain);
    console.log(createStatus('info', `Auto-including ${blockchain.toUpperCase()} wallet integration`));
    console.log('');
  }
  
  // Build available plugins list
  Object.entries(PLUGIN_CATEGORIES).forEach(([categoryName, category]) => {
    category.plugins.forEach(pluginKey => {
      // Skip blockchain wallets if already auto-included
      if (autoIncluded.includes(pluginKey)) {
        return;
      }
      
      // Skip blockchain plugins for Web2
      if (projectType === 'web2' && isBlockchainPlugin(pluginKey)) {
        return;
      }
      
      // Skip privy if no blockchain is selected (since it requires blockchain)
      if (pluginKey === 'privy' && !blockchain) {
        return;
      }
      
      // Skip plugins incompatible with selected blockchain for Web3
      if (projectType === 'web3' && !isPluginCompatibleWithBlockchain(pluginKey, blockchain)) {
        return;
      }
      
      availablePlugins.push({
        name: getPluginDisplayName(pluginKey),
        value: pluginKey,
        category: categoryName
      });
    });
  });
  
  // Enhanced plugin selection interface
  let selectedPlugins = [];
  if (availablePlugins.length > 0) {
    selectedPlugins = await enhancedPluginSelection(availablePlugins, autoIncluded);
  } else {
    console.log(colors.muted('No additional plugins available for selection.'));
  }
  
  // Combine auto-included and selected plugins
  const finalPlugins = [...autoIncluded, ...selectedPlugins];
  
  // Show selection summary
  if (selectedPlugins.length > 0) {
    console.log('\n' + createStatus('success', 'Plugin Selection Complete'));
    finalPlugins.forEach(plugin => {
      const isAuto = autoIncluded.includes(plugin);
      const status = isAuto ? 'Auto-included' : 'Selected';
      console.log(colors.muted(`  • ${getPluginDisplayName(plugin)} (${status})`));
    });
  } else if (autoIncluded.length > 0) {
    console.log('\n' + createStatus('success', 'Using auto-included plugins only'));
    autoIncluded.forEach(plugin => {
      console.log(colors.muted(`  • ${getPluginDisplayName(plugin)} (Auto-included)`));
    });
  }
  
  return finalPlugins;
}

/**
 * Main enhanced prompt function
 * @returns {Promise<Object>} Complete configuration object
 */
async function enhancedPromptUser() {
  // Initialize terminal state management
  const state = resetState();
  
  try {
    return await runConfigurationFlow(state);
  } catch (error) {
    // Check if this is a user cancellation
    if (error.message === 'Configuration cancelled by user') {
      console.log('\n' + createStatus('info', 'Configuration cancelled. Restarting...'));
      console.log('');
      // Restart the configuration process
      return await enhancedPromptUser();
    }
    
    state.addError('Enhanced prompt failed', { error: error.message });
    console.error(colors.error('Prompt error:'), error);
    throw error;
  }
}

/**
 * Run the complete configuration flow
 * @param {Object} state - Terminal state management object
 * @returns {Promise<Object>} Complete configuration object
 */
async function runConfigurationFlow(state) {
  // Step 1: Project Type Selection
  smartClear();
  console.log(state.getProgressBar());
  const projectType = await projectTypeSelection();
  state.updateSelection('projectType', projectType);
  state.nextStep();
  
  // Step 2: Conditional Blockchain Selection (only for Web3)
  let blockchain = null;
  if (projectType === 'web3') {
    smartClear(state.getPreservedInfo());
    console.log(state.getProgressBar());
    blockchain = await blockchainSelection();
    state.updateSelection('blockchain', blockchain);
  }
  state.nextStep();
  
  // Step 3: Plugin Selection
  smartClear(state.getPreservedInfo());
  console.log(state.getProgressBar());
  console.log(''); // Add spacing after progress bar
  const plugins = await pluginSelection(projectType, blockchain);
  state.updateSelection('plugins', plugins);
  state.nextStep();
  
  // Step 4: Auto-configure GOAT chain if GOAT is selected
  let goatChain = null;
  if (plugins.includes('goat')) {
    smartClear(state.getPreservedInfo());
    console.log(state.getProgressBar());
    goatChain = blockchain; // Use the selected blockchain for GOAT
    console.log(createStatus('success', `GOAT configured for ${blockchain.toUpperCase()} network`));
  }
  state.nextStep();
  
  // Step 5: Configuration Options
  smartClear(state.getPreservedInfo());
  console.log(state.getProgressBar());
  
  // Configuration options
  const { eslint } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'eslint',
      message: colors.bold('Would you like to set up ESLint? (optional)'),
      default: false
    }
  ]);
  state.updateSelection('eslint', eslint);
  
  // Dependency installation
  const { installDependencies } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'installDependencies',
      message: colors.bold('Would you like to automatically install dependencies?'),
      default: true
    }
  ]);
  state.updateSelection('installDependencies', installDependencies);
  
  let packageManager = null;
  if (installDependencies) {
    const { pm } = await inquirer.prompt([
      {
        type: 'list',
        name: 'pm',
        message: colors.bold('Which package manager would you like to use?'),
        choices: [
          { name: 'Auto-detect (recommended)', value: null },
          { name: 'npm', value: 'npm' },
          { name: 'yarn', value: 'yarn' },
          { name: 'pnpm', value: 'pnpm' }
        ],
        default: null
      }
    ]);
    packageManager = pm;
    state.updateSelection('packageManager', packageManager);
  }
  state.nextStep();
  
  // Step 6: Configuration Summary and Final Confirmation
  smartClear(state.getPreservedInfo());
  console.log(state.getProgressBar());
  
  // Build final configuration
  const config = {
    projectType,
    plugins,
    typescript: true,
    tailwind: true,
    eslint,
    installDependencies,
    packageManager
  };
  
  if (goatChain) {
    config.goatChain = goatChain;
  }
  
  // Enhanced validation
  const validation = enhancedValidation(config);
  if (!validation.isValid) {
    console.log('\n' + colors.error('❌ Configuration validation failed:'));
    validation.errors.forEach(error => console.log(colors.error(`  • ${error}`)));
    state.addError('Configuration validation failed', { errors: validation.errors });
    return null;
  }
  
  // Display warnings if any
  if (validation.hasWarnings) {
    console.log('\n' + colors.warning('⚠️  Configuration warnings:'));
    validation.warnings.forEach(warning => console.log(colors.warning(`  • ${warning}`)));
  }
  
  // Combined configuration summary and confirmation
  const confirmed = await configurationSummary(config);
  
  if (!confirmed) {
    throw new Error('Configuration cancelled by user');
  }
  
  return config;
}

// Helper functions

function getCategoryIcon(categoryName) {
  return PLUGIN_CATEGORIES[categoryName]?.icon || '•';
}

function isBlockchainPlugin(pluginKey) {
  return ['evm', 'solana', 'sui', 'goat', 'solana-agent-kit', 'privy'].includes(pluginKey);
}

/**
 * Check if a plugin is compatible with the selected blockchain
 * @param {string} pluginKey - The plugin key to check
 * @param {string|null} blockchain - The selected blockchain (evm/solana)
 * @returns {boolean} True if compatible or universal
 */
function isPluginCompatibleWithBlockchain(pluginKey, blockchain) {
  if (!blockchain) return true; // No blockchain selected, all plugins available
  
  // Define blockchain-specific plugins
  const evmSpecificPlugins = ['evm'];
  const solanaSpecificPlugins = ['solana', 'solana-agent-kit'];
  const suiSpecificPlugins = ['sui'];
  const universalPlugins = ['supabase', 'firebase', 'vercel-ai', 'vercel-kv']; // Available for both Web2 and Web3
  const web3UniversalPlugins = ['privy']; // Available for all blockchains, but NOT Web2
  const goatCompatibleChains = ['evm', 'solana']; // GOAT only works with EVM and Solana
  
  // Check compatibility
  if (blockchain === 'evm') {
    return evmSpecificPlugins.includes(pluginKey) || universalPlugins.includes(pluginKey) || web3UniversalPlugins.includes(pluginKey) || (pluginKey === 'goat');
  } else if (blockchain === 'solana') {
    return solanaSpecificPlugins.includes(pluginKey) || universalPlugins.includes(pluginKey) || web3UniversalPlugins.includes(pluginKey) || (pluginKey === 'goat');
  } else if (blockchain === 'sui') {
    // GOAT is not compatible with SUI
    return suiSpecificPlugins.includes(pluginKey) || universalPlugins.includes(pluginKey) || web3UniversalPlugins.includes(pluginKey);
  }
  
  return true; // Default to allowing plugin
}

/**
 * Display configuration summary and get user confirmation
 * @param {Object} config - Complete configuration object
 * @returns {Promise<boolean>} User confirmation
 */
async function configurationSummary(config) {
  console.log(createSection(
    '📋 Project Configuration Summary',
    'Review your complete project setup and confirm to proceed'
  ));
  
  // Generate intelligent analysis
  const analysis = generateConfigurationSummary(config);
  
  // Display core summary (project overview, time, complexity, conflicts, complementary suggestions)
  console.log(formatConfigurationSummary(analysis));
  
  // Display detailed component breakdown
  if (analysis && analysis.selectedComponents && Object.keys(analysis.selectedComponents).length > 0) {
    console.log(colors.bold(colors.primary('📦 Selected Components:\n')));
    
    Object.entries(analysis.selectedComponents).forEach(([category, components]) => {
      console.log(colors.bold(`${getCategoryIcon(category)} ${category.toUpperCase()}:`));
      components.forEach(component => {
        console.log(colors.muted(`  • ${component.name}`));
        if (component.features && component.features.length > 0) {
          console.log(colors.dim(`    ${component.features.slice(0, 2).join(', ')}${component.features.length > 2 ? '...' : ''}`));
        }
      });
      console.log('');
    });
  }
  
  // Display recommended next steps
  if (analysis && analysis.recommendedNextSteps && analysis.recommendedNextSteps.length > 0) {
    console.log(colors.bold(colors.primary('🎯 Recommended Next Steps:\n')));
    analysis.recommendedNextSteps.slice(0, 3).forEach((step, index) => {
      console.log(colors.info(`  ${index + 1}. ${step}`));
    });
    console.log('');
  }
  
  // Display optimization suggestions (only if present and not too many)
  if (analysis && analysis.optimizationSuggestions && analysis.optimizationSuggestions.length > 0) {
    console.log(colors.bold(colors.warning('💡 Quick Recommendations:\n')));
    analysis.optimizationSuggestions.slice(0, 2).forEach(suggestion => {
      console.log(colors.warning(`  ${suggestion.type.toUpperCase()}: ${suggestion.title}`));
    });
    console.log('');
  }
  
  console.log(colors.dim('─'.repeat(60)));
  console.log('');
  
  // Final confirmation prompt
  const { confirmed } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirmed',
      message: colors.bold('Does this configuration look correct? Proceed with project generation?'),
      default: true
    }
  ]);
  
  return confirmed;
}

/**
 * Enhanced validation with detailed feedback
 * @param {Object} config - Configuration to validate
 * @returns {Object} Validation result with errors and warnings
 */
function enhancedValidation(config) {
  const { projectType, plugins = [], packageManager, eslint } = config;
  const errors = [];
  const warnings = [];
  
  // Project type validation
  if (!projectType || !['web2', 'web3'].includes(projectType)) {
    errors.push('Invalid project type. Must be either "web2" or "web3".');
  }
  
  // Plugin validation
  if (plugins.length === 0) {
    warnings.push('No plugins selected. Consider adding at least one plugin for enhanced functionality.');
  }
  
  if (plugins.length > 6) {
    errors.push('Too many plugins selected. Maximum of 6 plugins allowed.');
  }
  
  // Database validation
  const databasePlugins = plugins.filter(p => ['supabase', 'firebase'].includes(p));
  if (databasePlugins.length > 1) {
    errors.push('Only one database plugin can be selected (Supabase OR Firebase).');
  }
  
  // AI Agent validation
  const aiAgentPlugins = plugins.filter(p => ['goat', 'solana-agent-kit'].includes(p));
  if (aiAgentPlugins.length > 1) {
    errors.push('Only one AI agent plugin can be selected (GOAT OR Solana Agent Kit).');
  }
  
  // Web3 specific validation
  if (projectType === 'web3') {
    const blockchainPlugins = plugins.filter(p => ['evm', 'solana', 'sui'].includes(p));
    if (blockchainPlugins.length === 0) {
      errors.push('Web3 projects require at least one blockchain integration (EVM, Solana, or SUI).');
    }
    if (blockchainPlugins.length > 1) {
      errors.push('Only one blockchain integration can be selected (EVM, Solana, OR SUI).');
    }
    
    // GOAT compatibility - requires either EVM or Solana
    if (plugins.includes('goat') && !plugins.includes('evm') && !plugins.includes('solana')) {
      errors.push('GOAT AI Agent requires either EVM or Solana blockchain integration.');
    }
    if (plugins.includes('solana-agent-kit') && !plugins.includes('solana')) {
      errors.push('Solana Agent Kit requires Solana blockchain integration.');
    }
  }
  
  // Privy specific validation
  if (plugins.includes('privy')) {
    if (projectType === 'web2') {
      errors.push('Privy is only available for Web3 projects.');
    }
    const blockchainPlugins = plugins.filter(p => ['evm', 'solana', 'sui', 'goat', 'solana-agent-kit'].includes(p));
    if (blockchainPlugins.length === 0) {
      errors.push('Privy requires at least one blockchain plugin (EVM, Solana, SUI, GOAT, or Solana Agent Kit).');
    }
  }
  
  // Web2 specific validation
  if (projectType === 'web2') {
    const blockchainPlugins = plugins.filter(p => ['evm', 'solana', 'goat', 'solana-agent-kit', 'privy'].includes(p));
    if (blockchainPlugins.length > 0) {
      errors.push('Web2 projects cannot include blockchain or AI agent plugins.');
    }
  }
  
  // Package manager validation
  if (packageManager && !['npm', 'yarn', 'pnpm', 'bun'].includes(packageManager)) {
    errors.push('Invalid package manager. Must be npm, yarn, pnpm, or bun.');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    hasWarnings: warnings.length > 0
  };
}

module.exports = { 
  enhancedPromptUser,
  projectTypeSelection,
  blockchainSelection,
  pluginSelection,
  enhancedPluginSelection,
  validatePluginSelection,
  runConfigurationFlow,
  configurationSummary,
  enhancedValidation,
  getCategoryIcon,
  isBlockchainPlugin,
  isPluginCompatibleWithBlockchain
}; 