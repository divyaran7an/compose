const { colors, icons, createCard, createStatus } = require('./prompt-helpers');

/**
 * Configuration optimizer for smart configuration summaries and recommendations
 * Analyzes selected options and provides intelligent insights
 */

// Plugin metadata for analysis
const PLUGIN_METADATA = {
  'supabase': {
    category: 'database',
    complexity: 2,
    setupTime: 10,
    features: ['Authentication', 'PostgreSQL Database', 'Real-time subscriptions', 'File storage'],
    complementary: ['vercel-ai', 'vercel-kv'],
    conflicts: ['firebase'],
    description: 'Full-stack platform with auth and database'
  },
  'firebase': {
    category: 'database',
    complexity: 2,
    setupTime: 8,
    features: ['Authentication', 'Firestore NoSQL', 'Cloud Functions', 'Hosting'],
    complementary: ['vercel-ai', 'vercel-kv'],
    conflicts: ['supabase'],
    description: 'Google\'s full-stack platform'
  },
  'vercel-ai': {
    category: 'ai',
    complexity: 1,
    setupTime: 5,
    features: ['AI chat interface', 'Streaming responses', 'Multiple AI providers', 'Edge runtime'],
    complementary: ['supabase', 'firebase', 'vercel-kv'],
    conflicts: [],
    description: 'AI-powered chat and completion features'
  },
  'vercel-kv': {
    category: 'caching',
    complexity: 1,
    setupTime: 3,
    features: ['Redis caching', 'Edge caching', 'Session storage', 'Real-time data'],
    complementary: ['supabase', 'firebase', 'vercel-ai'],
    conflicts: [],
    description: 'Optional high-performance Redis caching layer'
  },
  'evm': {
    category: 'blockchain',
    complexity: 3,
    setupTime: 15,
    features: ['Multi-network support', 'MetaMask integration', 'Smart contracts', 'DeFi protocols'],
    complementary: ['goat'],
    conflicts: ['solana', 'solana-agent-kit'],
    description: 'Ethereum Virtual Machine blockchain integration'
  },
  'solana': {
    category: 'blockchain',
    complexity: 3,
    setupTime: 12,
    features: ['High throughput', 'Low fees', 'Phantom wallet', 'SPL tokens'],
    complementary: ['solana-agent-kit'],
    conflicts: ['evm', 'goat'],
    description: 'Solana blockchain integration'
  },
  'goat': {
    category: 'ai-agent',
    complexity: 4,
    setupTime: 20,
    features: ['Multi-chain AI agent', 'Crossmint integration', 'Automated trading', 'DeFi operations'],
    complementary: ['evm'],
    conflicts: ['solana-agent-kit'],
    description: 'Advanced AI agent for blockchain automation'
  },
  'solana-agent-kit': {
    category: 'ai-agent',
    complexity: 4,
    setupTime: 18,
    features: ['Solana-specific AI agent', 'Token operations', 'NFT management', 'DeFi automation'],
    complementary: ['solana'],
    conflicts: ['goat'],
    description: 'Specialized AI agent for Solana ecosystem'
  },
  'privy': {
    category: 'auth',
    complexity: 2,
    setupTime: 8,
    features: ['Social authentication', 'Embedded wallets', 'Multi-chain support', 'Account linking'],
    complementary: ['evm', 'solana'],
    conflicts: [],
    description: 'Authentication & embedded wallet infrastructure'
  },
  'sui': {
    category: 'blockchain',
    complexity: 3,
    setupTime: 10,
    features: ['120k TPS performance', 'Move smart contracts', 'Object-centric model', 'Instant finality'],
    complementary: ['supabase', 'vercel-ai'],
    conflicts: ['evm', 'solana'],
    description: 'High-performance Layer 1 blockchain'
  }
};

// Project type metadata
const PROJECT_TYPE_METADATA = {
  'web2': {
    baseComplexity: 1,
    baseSetupTime: 5,
    recommendedPlugins: ['supabase', 'vercel-ai'],
    description: 'Traditional web application with modern features'
  },
  'web3': {
    baseComplexity: 2,
    baseSetupTime: 10,
    recommendedPlugins: ['evm', 'supabase'],
    description: 'Blockchain-integrated decentralized application'
  }
};

/**
 * Generate intelligent configuration summary with recommendations
 * @param {Object} config - Configuration object
 * @returns {Object} Analysis results with summary and recommendations
 */
function generateConfigurationSummary(config) {
  // Ensure config is an object
  if (!config || typeof config !== 'object') {
    config = {};
  }
  
  const { projectType = 'web2', plugins = [], eslint, installDependencies, packageManager, goatChain } = config;
  
  const analysis = {
    projectOverview: generateProjectOverview(projectType, plugins),
    selectedComponents: analyzeSelectedComponents(plugins),
    estimatedSetupTime: calculateSetupTime(projectType, plugins),
    complexityScore: calculateComplexityScore(projectType, plugins),
    recommendedNextSteps: generateNextSteps(config),
    potentialConflicts: detectConflicts(plugins),
    complementaryAddons: suggestComplementaryAddons(plugins),
    optimizationSuggestions: generateOptimizationSuggestions(config)
  };
  
  return analysis;
}

/**
 * Generate project overview description
 * @param {string} projectType - Type of project
 * @param {Array} plugins - Selected plugins
 * @returns {Object} Project overview
 */
function generateProjectOverview(projectType, plugins) {
  // Handle null/undefined inputs
  if (!projectType || typeof projectType !== 'string') {
    projectType = 'web2';
  }
  if (!Array.isArray(plugins)) {
    plugins = [];
  }
  
  const typeData = PROJECT_TYPE_METADATA[projectType] || PROJECT_TYPE_METADATA['web2'];
  const categories = categorizePlugins(plugins);
  
  let architecture = 'Next.js + TypeScript + Tailwind CSS';
  if (categories.database.length > 0) {
    architecture += ` + ${categories.database.map(p => PLUGIN_METADATA[p]?.description || p).join(', ')}`;
  }
  if (categories.blockchain.length > 0) {
    architecture += ` + ${categories.blockchain.map(p => PLUGIN_METADATA[p]?.description || p).join(', ')}`;
  }
  
  return {
    type: projectType.toUpperCase(),
    description: typeData.description,
    architecture,
    pluginCount: plugins.length,
    categories: Object.keys(categories).filter(cat => categories[cat].length > 0)
  };
}

/**
 * Analyze selected components
 * @param {Array} plugins - Selected plugins
 * @returns {Object} Component analysis
 */
function analyzeSelectedComponents(plugins) {
  if (!Array.isArray(plugins)) {
    plugins = [];
  }
  
  const categories = categorizePlugins(plugins);
  const components = {};
  
  Object.entries(categories).forEach(([category, pluginList]) => {
    if (pluginList.length > 0) {
      components[category] = pluginList.map(plugin => {
        const metadata = PLUGIN_METADATA[plugin];
        return {
          name: plugin,
          description: metadata?.description || plugin,
          features: metadata?.features || [],
          complexity: metadata?.complexity || 1
        };
      });
    }
  });
  
  return components;
}

/**
 * Calculate estimated setup time
 * @param {string} projectType - Type of project
 * @param {Array} plugins - Selected plugins
 * @returns {Object} Time estimation
 */
function calculateSetupTime(projectType, plugins) {
  // Handle null/undefined inputs
  if (!projectType || typeof projectType !== 'string') {
    projectType = 'web2';
  }
  if (!Array.isArray(plugins)) {
    plugins = [];
  }
  
  const typeData = PROJECT_TYPE_METADATA[projectType];
  const baseTime = typeData ? typeData.baseSetupTime : 0;
  const pluginTime = plugins.reduce((total, plugin) => {
    return total + (PLUGIN_METADATA[plugin]?.setupTime || 0);
  }, 0);
  
  const totalMinutes = baseTime + pluginTime;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  
  return {
    totalMinutes,
    formatted: hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`,
    breakdown: {
      base: baseTime,
      plugins: pluginTime
    }
  };
}

/**
 * Calculate complexity score (1-10)
 * @param {string} projectType - Type of project
 * @param {Array} plugins - Selected plugins
 * @returns {Object} Complexity assessment
 */
function calculateComplexityScore(projectType, plugins) {
  // Handle null/undefined inputs
  if (!projectType || typeof projectType !== 'string') {
    projectType = 'web2';
  }
  if (!Array.isArray(plugins)) {
    plugins = [];
  }
  
  const typeData = PROJECT_TYPE_METADATA[projectType];
  const baseComplexity = typeData ? typeData.baseComplexity : 1;
  const pluginComplexity = plugins.reduce((total, plugin) => {
    return total + (PLUGIN_METADATA[plugin]?.complexity || 0);
  }, 0);
  
  const score = Math.min(10, baseComplexity + pluginComplexity);
  
  let level = 'Beginner';
  if (score >= 6) level = 'Advanced';
  else if (score >= 4) level = 'Intermediate';
  
  return { score, level };
}

/**
 * Generate recommended next steps
 * @param {Object} config - Configuration object
 * @returns {Array} Next steps
 */
function generateNextSteps(config) {
  // Ensure config is an object
  if (!config || typeof config !== 'object') {
    config = {};
  }
  
  const { projectType = 'web2', plugins = [], eslint, installDependencies, packageManager, goatChain } = config;
  const steps = [];
  
  // Ensure plugins is an array (could be null from destructuring)
  const safePlugins = Array.isArray(plugins) ? plugins : [];
  
  // Basic setup steps
  steps.push('Initialize your project with the generated template');
  
  // Plugin-specific steps
  if (safePlugins.includes('supabase')) {
    steps.push('Create a Supabase project and configure environment variables');
  }
  if (safePlugins.includes('firebase')) {
    steps.push('Set up Firebase project and configure authentication');
  }
  if (safePlugins.includes('vercel-ai')) {
    steps.push('Configure AI provider API keys (OpenAI, Anthropic, etc.)');
  }
  if (safePlugins.includes('vercel-kv')) {
    steps.push('Set up Vercel KV database for caching');
  }
  if (safePlugins.includes('evm')) {
    steps.push('Configure Web3 provider and wallet connection');
  }
  if (safePlugins.includes('solana')) {
    steps.push('Set up Solana RPC endpoint and wallet adapter');
  }
  if (safePlugins.includes('goat')) {
    steps.push(`Configure GOAT agent with ${goatChain || 'base'} network settings`);
  }
  if (safePlugins.includes('solana-agent-kit')) {
    steps.push('Set up Solana Agent Kit with RPC and private key');
  }
  
  // Configuration steps
  if (eslint) {
    steps.push('Review and customize ESLint configuration');
  }
  
  if (installDependencies) {
    steps.push(`Run ${packageManager || 'npm'} install to install dependencies`);
  }
  
  steps.push('Start development server and begin building your application');
  
  return steps;
}

/**
 * Detect potential conflicts between plugins
 * @param {Array} plugins - Selected plugins
 * @returns {Array} Conflict warnings
 */
function detectConflicts(plugins) {
  if (!Array.isArray(plugins)) {
    plugins = [];
  }
  
  const conflicts = [];
  
  plugins.forEach(plugin => {
    const metadata = PLUGIN_METADATA[plugin];
    if (metadata && metadata.conflicts) {
      metadata.conflicts.forEach(conflictingPlugin => {
        if (plugins.includes(conflictingPlugin)) {
          conflicts.push({
            plugin1: plugin,
            plugin2: conflictingPlugin,
            message: `${plugin} and ${conflictingPlugin} may conflict - both provide similar functionality`
          });
        }
      });
    }
  });
  
  return conflicts;
}

/**
 * Suggest complementary addons based on selected plugins
 * @param {Array} plugins - Selected plugins
 * @returns {Array} Addon suggestions
 */
function suggestComplementaryAddons(plugins) {
  if (!Array.isArray(plugins)) {
    plugins = [];
  }
  
  const suggestions = [];
  const selectedSet = new Set(plugins);
  
  plugins.forEach(plugin => {
    const metadata = PLUGIN_METADATA[plugin];
    if (metadata && metadata.complementary) {
      metadata.complementary.forEach(complementaryPlugin => {
        if (!selectedSet.has(complementaryPlugin) && plugins.length < 4) {
          const suggestion = {
            plugin: complementaryPlugin,
            reason: `Works well with ${plugin}`,
            description: PLUGIN_METADATA[complementaryPlugin]?.description || '',
            features: PLUGIN_METADATA[complementaryPlugin]?.features || []
          };
          
          // Avoid duplicates
          if (!suggestions.find(s => s.plugin === complementaryPlugin)) {
            suggestions.push(suggestion);
          }
        }
      });
    }
  });
  
  return suggestions.slice(0, 3); // Limit to top 3 suggestions
}

/**
 * Generate optimization suggestions
 * @param {Object} config - Configuration object
 * @returns {Array} Optimization suggestions
 */
function generateOptimizationSuggestions(config) {
  // Ensure config is an object
  if (!config || typeof config !== 'object') {
    config = {};
  }
  
  const { projectType = 'web2', plugins = [] } = config;
  const suggestions = [];
  
  // Ensure plugins is an array
  if (!Array.isArray(plugins)) {
    return suggestions;
  }
  
  // Architecture suggestions
  if (projectType === 'web3' && !plugins.some(p => ['supabase', 'firebase'].includes(p))) {
    suggestions.push({
      type: 'architecture',
      title: 'Add database for user management',
      description: 'Web3 apps often need traditional databases for user profiles and app data',
      impact: 'High'
    });
  }
  
  // Security suggestions
  if (plugins.some(p => ['goat', 'solana-agent-kit'].includes(p))) {
    suggestions.push({
      type: 'security',
      title: 'Implement proper key management',
      description: 'AI agents require secure storage of private keys and API credentials',
      impact: 'High'
    });
  }
  
  return suggestions;
}

/**
 * Categorize plugins by type
 * @param {Array} plugins - Plugin list
 * @returns {Object} Categorized plugins
 */
function categorizePlugins(plugins) {
  if (!Array.isArray(plugins)) {
    plugins = [];
  }
  
  const categories = {
    database: [],
    ai: [],
    cache: [],
    blockchain: [],
    'ai-agent': [],
    auth: []
  };
  
  plugins.forEach(plugin => {
    const metadata = PLUGIN_METADATA[plugin];
    if (metadata && categories[metadata.category]) {
      categories[metadata.category].push(plugin);
    }
  });
  
  return categories;
}

/**
 * Generate plugin choices for inquirer prompts
 * @param {string} projectType - Project type (web2/web3)
 * @returns {Array} Plugin choices array
 */
function generatePluginChoices(projectType = 'web2') {
  // Handle null/undefined input
  if (!projectType || typeof projectType !== 'string') {
    projectType = 'web2';
  }
  
  const choices = [];
  
  // Always include core plugins
  choices.push(
    { name: 'Supabase (Database & Auth)', value: 'supabase' },
    { name: 'Firebase (Database & Auth)', value: 'firebase' },
    { name: 'Vercel AI (AI/Chat functionality)', value: 'vercel-ai' },
    { name: 'Vercel KV (Redis caching)', value: 'vercel-kv' }
  );
  
  // Add blockchain plugins only for Web3 projects
  if (projectType === 'web3') {
    choices.push(
      { name: 'Privy (Auth & Wallet service)', value: 'privy' },
      { name: 'EVM (Ethereum/Base blockchain)', value: 'evm' },
      { name: 'Solana (Solana blockchain)', value: 'solana' },
      { name: 'GOAT (AI Agent by Crossmint)', value: 'goat' },
      { name: 'Solana Agent Kit', value: 'solana-agent-kit' }
    );
  }
  
  return choices;
}

/**
 * Get plugin display name from metadata
 * @param {string} pluginKey - Plugin key
 * @returns {string} Display name
 */
function getPluginDisplayName(pluginKey) {
  // Handle null/undefined input
  if (!pluginKey || typeof pluginKey !== 'string') {
    return 'Unknown Plugin';
  }
  
  const metadata = PLUGIN_METADATA[pluginKey];
  if (!metadata) return pluginKey;
  
  const categoryMap = {
    'database': 'Database & Auth',
    'ai': 'AI/Chat functionality',
    'cache': 'Redis caching',
    'blockchain': metadata.description,
    'ai-agent': metadata.description
  };
  
  const categoryLabel = categoryMap[metadata.category] || metadata.description;
  return `${pluginKey.charAt(0).toUpperCase() + pluginKey.slice(1)} (${categoryLabel})`;
}

/**
 * Format configuration summary for display
 * @param {Object} analysis - Analysis results
 * @returns {string} Formatted summary
 */
function formatConfigurationSummary(analysis) {
  // Ensure analysis is an object
  if (!analysis || typeof analysis !== 'object') {
    return 'No configuration analysis available';
  }
  
  const { 
    projectOverview = {}, 
    estimatedSetupTime = {}, 
    complexityScore = {}, 
    potentialConflicts = [], 
    complementaryAddons = [] 
  } = analysis;
  
  let output = '';
  
  // Project overview
  output += colors.bold(colors.primary(`\n🚀 Project Configuration Summary\n`));
  output += colors.muted('─'.repeat(50)) + '\n\n';
  
  output += colors.bold(`Project Type: `) + colors.info(projectOverview.type || 'Unknown') + '\n';
  output += colors.bold(`Architecture: `) + colors.muted(projectOverview.architecture || 'Not specified') + '\n';
  output += colors.bold(`Components: `) + colors.info(`${projectOverview.pluginCount || 0} plugins selected`) + '\n\n';
  
  // Time and complexity
  output += colors.bold(`⏱️  Setup Time: `) + colors.info(estimatedSetupTime.formatted || 'Unknown') + '\n';
  output += colors.bold(`📊 Complexity: `) + colors.info(`${complexityScore.score || 0}/10 (${complexityScore.level || 'Unknown'})`) + '\n\n';
  
  // Conflicts
  if (potentialConflicts.length > 0) {
    output += colors.warning(`⚠️  Potential Conflicts:\n`);
    potentialConflicts.forEach(conflict => {
      output += colors.muted(`  • ${conflict.message || 'Unknown conflict'}\n`);
    });
    output += '\n';
  }
  
  // Suggestions
  if (complementaryAddons.length > 0) {
    output += colors.info(`💡 Suggested Additions:\n`);
    complementaryAddons.forEach(addon => {
      output += colors.muted(`  • ${addon.plugin || 'Unknown'}: ${addon.reason || 'No reason provided'}\n`);
    });
    output += '\n';
  }
  
  return output;
}

module.exports = {
  generateConfigurationSummary,
  formatConfigurationSummary,
  calculateSetupTime,
  calculateComplexityScore,
  detectConflicts,
  suggestComplementaryAddons,
  generatePluginChoices,
  getPluginDisplayName,
  PLUGIN_METADATA,
  PROJECT_TYPE_METADATA
}; 