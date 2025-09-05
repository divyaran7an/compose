#!/usr/bin/env node

/**
 * 🏗️ capx-compose Example Builder
 * 
 * Interactive tool to explore and test all possible template combinations.
 * Perfect for discovering what capx-compose can create and validating functionality.
 * 
 * Usage: 
 *   node examples/example-builder.js           # Simple mode
 *   node examples/example-builder.js --advanced # Advanced mode with detailed feedback
 */

const { execSync } = require('child_process');
const fs = require('fs-extra');
const path = require('path');
const readline = require('readline');

// Parse command line arguments
const args = process.argv.slice(2);
const isAdvancedMode = args.includes('--advanced') || args.includes('-a');

// Console styling utilities
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  bgBlue: '\x1b[44m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
  bgRed: '\x1b[41m',
  bgCyan: '\x1b[46m',
  bgMagenta: '\x1b[45m',
  // Custom color for Capx-AI brand (#8DBC1A)
  capxGreen: '\x1b[38;2;141;188;26m'
};

const style = {
  header: (text) => `${colors.bright}${colors.cyan}${text}${colors.reset}`,
  success: (text) => `${colors.green}✅ ${text}${colors.reset}`,
  error: (text) => `${colors.red}❌ ${text}${colors.reset}`,
  warning: (text) => `${colors.yellow}⚠️  ${text}${colors.reset}`,
  info: (text) => `${colors.blue}ℹ️  ${text}${colors.reset}`,
  highlight: (text) => `${colors.bright}${colors.yellow}${text}${colors.reset}`,
  dim: (text) => `${colors.dim}${text}${colors.reset}`,
  badge: (text, color = 'blue') => `${colors.bright}${colors[color]}${colors.bgBlue} ${text} ${colors.reset}`,
  box: (text) => {
    const lines = text.split('\n');
    const maxLength = Math.max(...lines.map(line => line.length));
    const border = '─'.repeat(maxLength + 4);
    const top = `┌${border}┐`;
    const bottom = `└${border}┘`;
    const content = lines.map(line => `│  ${line.padEnd(maxLength)}  │`).join('\n');
    return `${colors.cyan}${top}\n${content}\n${bottom}${colors.reset}`;
  }
};

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Enhanced template combinations with detailed metadata
const combinations = [
  // �� Single Templates (8 combinations - added 2 new)
  { 
    id: 1,
    name: 'supabase-only', 
    plugins: ['supabase'],
    category: 'Database',
    complexity: 'Simple',
    description: 'Database with authentication and real-time features',
    useCase: 'Perfect for data-driven apps with user management',
    features: ['PostgreSQL Database', 'Authentication', 'Real-time subscriptions', 'Row Level Security'],
    buildTime: '~30s'
  },
  { 
    id: 2,
    name: 'vercel-ai-only', 
    plugins: ['vercel-ai'],
    category: 'AI/ML',
    complexity: 'Simple',
    description: 'AI chat functionality with OpenAI integration',
    useCase: 'Ideal for chatbots and AI-powered interfaces',
    features: ['OpenAI Integration', 'Streaming Responses', 'Chat Interface', 'AI SDK'],
    buildTime: '~25s'
  },
  { 
    id: 3,
    name: 'firebase-only', 
    plugins: ['firebase'],
    category: 'Database',
    complexity: 'Simple',
    description: 'Firebase backend with auth and Firestore',
    useCase: 'Great for rapid prototyping with Google ecosystem',
    features: ['Firestore Database', 'Firebase Auth', 'Real-time Updates', 'Cloud Functions'],
    buildTime: '~35s'
  },
  { 
    id: 4,
    name: 'vercel-kv-only', 
    plugins: ['vercel-kv'],
    category: 'Cache',
    complexity: 'Simple',
    description: 'Redis caching and key-value storage',
    useCase: 'Perfect for high-performance caching solutions',
    features: ['Redis Cache', 'Key-Value Storage', 'Session Management', 'Rate Limiting'],
    buildTime: '~20s'
  },
  { 
    id: 5,
    name: 'solana-only', 
    plugins: ['solana'],
    category: 'Web3',
    complexity: 'Medium',
    description: 'Solana Web3 integration with wallet connectivity',
    useCase: 'Ideal for Solana dApps and DeFi applications',
    features: ['Wallet Integration', 'Transaction Signing', 'Program Interaction', 'Token Operations'],
    buildTime: '~40s'
  },
  { 
    id: 6,
    name: 'evm-only', 
    plugins: ['evm'],
    category: 'Web3',
    complexity: 'Medium',
    description: 'Ethereum/EVM Web3 integration',
    useCase: 'Perfect for Ethereum dApps and smart contracts',
    features: ['MetaMask Integration', 'Smart Contracts', 'Network Switching', 'ERC-20 Tokens'],
    buildTime: '~40s'
  },
  { 
    id: 7,
    name: 'goat-only', 
    plugins: ['goat'],
    category: 'AI Agent',
    complexity: 'Advanced',
    description: 'Multi-chain AI agent supporting EVM and Solana',
    useCase: 'Perfect for cross-chain AI agents and automated trading',
    features: ['Multi-chain Support', 'Natural Language Blockchain', 'Token Operations', 'Cross-chain Swaps'],
    buildTime: '~45s'
  },
  { 
    id: 8,
    name: 'solana-agent-kit-only', 
    plugins: ['solana-agent-kit'],
    category: 'AI Agent',
    complexity: 'Advanced',
    description: 'Advanced Solana AI agent with comprehensive DeFi features',
    useCase: 'Ideal for sophisticated Solana AI applications and DeFi automation',
    features: ['Advanced Solana Integration', 'DeFi Operations', 'Token Management', 'AI-Powered Trading'],
    buildTime: '~50s'
  },
  
  // 🔹 Privy Authentication Combinations (4 new combinations)
  { 
    id: 9,
    name: 'privy-evm', 
    plugins: ['privy', 'evm'],
    category: 'Web3 Auth',
    complexity: 'Medium',
    description: 'Enhanced authentication with Ethereum embedded wallets',
    useCase: 'Perfect for user-friendly Ethereum dApps with seamless onboarding',
    features: ['Email Authentication', 'Embedded Wallets', 'Social Login', 'EVM Integration'],
    buildTime: '~45s'
  },
  { 
    id: 10,
    name: 'privy-solana', 
    plugins: ['privy', 'solana'],
    category: 'Web3 Auth',
    complexity: 'Medium',
    description: 'Enhanced authentication with Solana embedded wallets',
    useCase: 'Ideal for user-friendly Solana dApps with seamless onboarding',
    features: ['Email Authentication', 'Embedded Wallets', 'Social Login', 'Solana Integration'],
    buildTime: '~45s'
  },
  { 
    id: 11,
    name: 'privy-evm-vercel-ai', 
    plugins: ['privy', 'evm', 'vercel-ai'],
    category: 'Web3 AI Auth',
    complexity: 'Advanced',
    description: 'AI-powered Ethereum dApp with enhanced authentication',
    useCase: 'Next-generation Web3 AI applications with seamless user experience',
    features: ['Enhanced Auth', 'AI Chat', 'Embedded Wallets', 'Ethereum Integration'],
    buildTime: '~60s'
  },
  { 
    id: 12,
    name: 'privy-solana-vercel-ai', 
    plugins: ['privy', 'solana', 'vercel-ai'],
    category: 'Web3 AI Auth',
    complexity: 'Advanced',
    description: 'AI-powered Solana dApp with enhanced authentication',
    useCase: 'Revolutionary Solana AI applications with seamless user experience',
    features: ['Enhanced Auth', 'AI Chat', 'Embedded Wallets', 'Solana Integration'],
    buildTime: '~60s'
  },
  
  // 🔹 Popular Dual Combinations (12 combinations)
  { 
    id: 13,
    name: 'supabase-vercel-ai', 
    plugins: ['supabase', 'vercel-ai'],
    category: 'Full-Stack AI',
    complexity: 'Medium',
    description: 'Database + AI chat (most popular combination)',
    useCase: 'Perfect for AI-powered apps with persistent data',
    features: ['Database + AI', 'User Sessions', 'Chat History', 'Real-time AI'],
    buildTime: '~45s'
  },
  { 
    id: 14,
    name: 'firebase-vercel-ai', 
    plugins: ['firebase', 'vercel-ai'],
    category: 'Full-Stack AI',
    complexity: 'Medium',
    description: 'Firebase + AI chat integration',
    useCase: 'Great for AI apps with Google ecosystem integration',
    features: ['Firebase + AI', 'Cloud Functions', 'AI Analytics', 'Scalable Chat'],
    buildTime: '~50s'
  },
  { 
    id: 15,
    name: 'supabase-vercel-kv', 
    plugins: ['supabase', 'vercel-kv'],
    category: 'High-Performance',
    complexity: 'Medium',
    description: 'Database + Redis caching for performance',
    useCase: 'Ideal for high-traffic apps requiring fast data access',
    features: ['Database + Cache', 'Session Storage', 'Query Caching', 'Performance Optimization'],
    buildTime: '~40s'
  },
  { 
    id: 16,
    name: 'firebase-vercel-kv', 
    plugins: ['firebase', 'vercel-kv'],
    category: 'High-Performance',
    complexity: 'Medium',
    description: 'Firebase + Redis caching',
    useCase: 'Perfect for scalable Firebase apps with caching',
    features: ['Firebase + Cache', 'Real-time + Cache', 'Performance Boost', 'Hybrid Storage'],
    buildTime: '~45s'
  },
  { 
    id: 17,
    name: 'solana-vercel-ai', 
    plugins: ['solana', 'vercel-ai'],
    category: 'Web3 AI',
    complexity: 'Advanced',
    description: 'Solana Web3 + AI integration',
    useCase: 'Revolutionary for AI-powered Solana dApps',
    features: ['Web3 + AI', 'Smart AI Trading', 'Wallet AI Assistant', 'DeFi Intelligence'],
    buildTime: '~55s'
  },
  { 
    id: 18,
    name: 'evm-vercel-ai', 
    plugins: ['evm', 'vercel-ai'],
    category: 'Web3 AI',
    complexity: 'Advanced',
    description: 'Ethereum + AI integration',
    useCase: 'Perfect for intelligent Ethereum dApps',
    features: ['Ethereum + AI', 'Smart Contract AI', 'Trading Bots', 'DeFi Analytics'],
    buildTime: '~55s'
  },
  { 
    id: 19,
    name: 'goat-vercel-ai', 
    plugins: ['goat', 'vercel-ai'],
    category: 'AI Agent',
    complexity: 'Expert',
    description: 'Multi-chain AI agent + Enhanced AI chat',
    useCase: 'Next-generation AI agents with conversational interfaces',
    features: ['Multi-chain + AI Chat', 'Conversational Trading', 'Cross-chain Intelligence', 'Advanced AI'],
    buildTime: '~60s'
  },
  { 
    id: 20,
    name: 'solana-agent-kit-vercel-ai', 
    plugins: ['solana-agent-kit', 'vercel-ai'],
    category: 'AI Agent',
    complexity: 'Expert',
    description: 'Advanced Solana AI + Enhanced AI chat',
    useCase: 'Sophisticated Solana AI platforms with conversational UI',
    features: ['Advanced Solana AI + Chat', 'DeFi Conversations', 'AI Trading Interface', 'Intelligent DeFi'],
    buildTime: '~65s'
  },
  { 
    id: 21,
    name: 'solana-vercel-kv', 
    plugins: ['solana', 'vercel-kv'],
    category: 'Web3 Performance',
    complexity: 'Advanced',
    description: 'Solana + Redis for transaction caching',
    useCase: 'Ideal for high-frequency Solana trading apps',
    features: ['Web3 + Cache', 'Transaction Caching', 'Price Feeds', 'Performance Trading'],
    buildTime: '~50s'
  },
  { 
    id: 22,
    name: 'evm-vercel-kv', 
    plugins: ['evm', 'vercel-kv'],
    category: 'Web3 Performance',
    complexity: 'Advanced',
    description: 'Ethereum + Redis for blockchain data caching',
    useCase: 'Perfect for high-performance Ethereum applications',
    features: ['Ethereum + Cache', 'Block Caching', 'Gas Optimization', 'Fast Queries'],
    buildTime: '~50s'
  },
  { 
    id: 23,
    name: 'goat-vercel-kv', 
    plugins: ['goat', 'vercel-kv'],
    category: 'AI Agent',
    complexity: 'Expert',
    description: 'Multi-chain AI agent + High-performance caching',
    useCase: 'High-frequency AI trading with optimal performance',
    features: ['Multi-chain + Cache', 'Fast AI Decisions', 'Cross-chain Caching', 'Performance Trading'],
    buildTime: '~55s'
  },
  { 
    id: 24,
    name: 'solana-agent-kit-vercel-kv', 
    plugins: ['solana-agent-kit', 'vercel-kv'],
    category: 'AI Agent',
    complexity: 'Expert',
    description: 'Advanced Solana AI + High-performance caching',
    useCase: 'Enterprise-grade Solana AI with optimal performance',
    features: ['Advanced Solana + Cache', 'DeFi Performance', 'AI Trading Cache', 'High-Speed Operations'],
    buildTime: '~60s'
  },
  
  // 🔹 Advanced Triple Combinations (8 combinations)
  { 
    id: 25,
    name: 'supabase-vercel-ai-kv', 
    plugins: ['supabase', 'vercel-ai', 'vercel-kv'],
    category: 'Enterprise AI',
    complexity: 'Advanced',
    description: 'Full-stack: Database + AI + Cache',
    useCase: 'Enterprise-grade AI applications with optimal performance',
    features: ['Complete Stack', 'AI + Database + Cache', 'Production Ready', 'Scalable Architecture'],
    buildTime: '~60s'
  },
  { 
    id: 26,
    name: 'firebase-vercel-ai-kv', 
    plugins: ['firebase', 'vercel-ai', 'vercel-kv'],
    category: 'Enterprise AI',
    complexity: 'Advanced',
    description: 'Firebase + AI + Cache integration',
    useCase: 'Google ecosystem AI apps with enterprise performance',
    features: ['Firebase + AI + Cache', 'Cloud Scale', 'Real-time AI', 'Global Performance'],
    buildTime: '~65s'
  },
  { 
    id: 27,
    name: 'solana-vercel-ai-kv', 
    plugins: ['solana', 'vercel-ai', 'vercel-kv'],
    category: 'Web3 Enterprise',
    complexity: 'Expert',
    description: 'Solana + AI + Cache (Web3 + AI platform)',
    useCase: 'Next-generation Web3 AI platforms',
    features: ['Web3 + AI + Cache', 'Intelligent DeFi', 'AI Trading Platform', 'High-Performance Web3'],
    buildTime: '~70s'
  },
  { 
    id: 28,
    name: 'evm-vercel-ai-kv', 
    plugins: ['evm', 'vercel-ai', 'vercel-kv'],
    category: 'Web3 Enterprise',
    complexity: 'Expert',
    description: 'Ethereum + AI + Cache (DeFi + AI platform)',
    useCase: 'Advanced DeFi platforms with AI intelligence',
    features: ['Ethereum + AI + Cache', 'Smart DeFi', 'AI-Powered Trading', 'Enterprise Web3'],
    buildTime: '~70s'
  },
  { 
    id: 29,
    name: 'goat-vercel-ai-kv', 
    plugins: ['goat', 'vercel-ai', 'vercel-kv'],
    category: 'AI Agent',
    complexity: 'Expert',
    description: 'Multi-chain AI agent + AI chat + High-performance cache',
    useCase: 'Ultimate AI trading platform with conversational interface',
    features: ['Multi-chain + AI + Cache', 'Conversational Trading', 'Cross-chain Intelligence', 'Maximum Performance'],
    buildTime: '~75s'
  },
  { 
    id: 30,
    name: 'solana-agent-kit-vercel-ai-kv', 
    plugins: ['solana-agent-kit', 'vercel-ai', 'vercel-kv'],
    category: 'AI Agent',
    complexity: 'Expert',
    description: 'Advanced Solana AI + AI chat + High-performance cache',
    useCase: 'Enterprise Solana AI platform with conversational UI and optimal performance',
    features: ['Advanced Solana + AI + Cache', 'DeFi Conversations', 'AI Trading Interface', 'Enterprise Performance'],
    buildTime: '~80s'
  },
  { 
    id: 31,
    name: 'supabase-goat-vercel-ai', 
    plugins: ['supabase', 'goat', 'vercel-ai'],
    category: 'AI Agent',
    complexity: 'Expert',
    description: 'Database + Multi-chain AI agent + AI chat',
    useCase: 'Full-stack AI agent platform with persistent data and conversational UI',
    features: ['Database + Multi-chain + AI', 'Persistent AI State', 'Cross-chain Data', 'Conversational Interface'],
    buildTime: '~70s'
  },
  { 
    id: 32,
    name: 'supabase-solana-agent-kit-vercel-ai', 
    plugins: ['supabase', 'solana-agent-kit', 'vercel-ai'],
    category: 'AI Agent',
    complexity: 'Expert',
    description: 'Database + Advanced Solana AI + AI chat',
    useCase: 'Enterprise Solana AI platform with full data persistence and conversational UI',
    features: ['Database + Advanced Solana + AI', 'Persistent DeFi State', 'Solana Data Storage', 'AI Chat Interface'],
    buildTime: '~75s'
  }
];

// Enhanced utility functions
function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.trim());
    });
  });
}

function cleanup(projectName) {
  const projectPath = path.join(process.cwd(), projectName);
  if (fs.existsSync(projectPath)) {
    console.log(style.dim(`🧹 Cleaning up ${projectName}...`));
    fs.removeSync(projectPath);
    console.log(style.success(`Cleaned up ${projectName}`));
  }
}

// ASCII Art Header for Capx-AI
function displayCapxHeader() {
  console.log('');
  console.log(colors.capxGreen + '  ██████╗ █████╗ ██████╗ ██╗  ██╗     █████╗ ██╗' + colors.reset);
  console.log(colors.capxGreen + ' ██╔════╝██╔══██╗██╔══██╗╚██╗██╔╝    ██╔══██╗██║' + colors.reset);
  console.log(colors.capxGreen + ' ██║     ███████║██████╔╝ ╚███╔╝     ███████║██║' + colors.reset);
  console.log(colors.capxGreen + ' ██║     ██╔══██║██╔═══╝  ██╔██╗     ██╔══██║██║' + colors.reset);
  console.log(colors.capxGreen + ' ╚██████╗██║  ██║██║     ██╔╝ ██╗    ██║  ██║██║' + colors.reset);
  console.log(colors.capxGreen + '  ╚═════╝╚═╝  ╚═╝╚═╝     ╚═╝  ╚═╝    ╚═╝  ╚═╝╚═╝' + colors.reset);
  console.log('');
}

function displayWelcome() {
  console.clear();
  
  // Display ASCII art header
  displayCapxHeader();
  
  const modeText = isAdvancedMode ? 'ADVANCED MODE' : 'SIMPLE MODE';
  const modeDesc = isAdvancedMode ? 'Full feedback and reporting features enabled' : 'Streamlined experience - use --advanced for detailed feedback';
  
  console.log(style.box(`🏗️  EXAMPLE BUILDER (${modeText})
  
Interactive tool to explore and test template combinations
Perfect for discovering what capx-compose can create!

${modeDesc}`));
  
  console.log(`\n${style.header('📊 AVAILABLE COMBINATIONS OVERVIEW')}\n`);
  
  // Statistics
  const stats = {
    total: combinations.length,
    simple: combinations.filter(c => c.complexity === 'Simple').length,
    medium: combinations.filter(c => c.complexity === 'Medium').length,
    advanced: combinations.filter(c => c.complexity === 'Advanced').length,
    expert: combinations.filter(c => c.complexity === 'Expert').length,
    categories: [...new Set(combinations.map(c => c.category))].length
  };
  
  console.log(`${style.info(`Total Combinations: ${stats.total}`)}  ${style.dim('|')}  ${style.info(`Categories: ${stats.categories}`)}`);
  console.log(`${style.highlight('Complexity:')} Simple(${stats.simple}) Medium(${stats.medium}) Advanced(${stats.advanced}) Expert(${stats.expert})\n`);
}

function displayCombinationsTable() {
  console.log(style.header('📋 TEMPLATE COMBINATIONS TABLE'));
  console.log('');
  
  // Much simpler, cleaner table format
  console.log('┌─────┬─────────────────────────┬─────────────────────────┬─────────────────┬────────────┐');
  console.log(`│ ${colors.bright}${colors.bgCyan}${colors.white} ID  ${colors.reset} │ ${colors.bright}${colors.bgCyan}${colors.white} NAME                    ${colors.reset} │ ${colors.bright}${colors.bgCyan}${colors.white} PLUGINS                 ${colors.reset} │ ${colors.bright}${colors.bgCyan}${colors.white} CATEGORY        ${colors.reset} │ ${colors.bright}${colors.bgCyan}${colors.white} COMPLEXITY ${colors.reset} │`);
  console.log('├─────┼─────────────────────────┼─────────────────────────┼─────────────────┼────────────┤');
  
  // Group by category for better organization
  const categories = [...new Set(combinations.map(c => c.category))];
  
  categories.forEach((category, categoryIndex) => {
    // Category separator
    if (categoryIndex > 0) {
      console.log('├─────┼─────────────────────────┼─────────────────────────┼─────────────────┼────────────┤');
    }
    
    // Category header
    console.log(`│ ${colors.bright}${colors.yellow}🔹${colors.reset}   │ ${colors.bright}${colors.yellow}${category.toUpperCase().padEnd(23)}${colors.reset} │ ${' '.repeat(23)} │ ${' '.repeat(15)} │ ${' '.repeat(10)} │`);
    console.log('├─────┼─────────────────────────┼─────────────────────────┼─────────────────┼────────────┤');
    
    const categoryCombs = combinations.filter(c => c.category === category);
    categoryCombs.forEach((combo) => {
      const id = combo.id.toString().padStart(2).padEnd(3);
      const name = combo.name.length > 23 ? combo.name.substring(0, 20) + '...' : combo.name.padEnd(23);
      const plugins = combo.plugins.join(', ').length > 23 ? combo.plugins.join(', ').substring(0, 20) + '...' : combo.plugins.join(', ').padEnd(23);
      const cat = combo.category.length > 15 ? combo.category.substring(0, 12) + '...' : combo.category.padEnd(15);
      
      // Color-code complexity
      let complexity;
      switch(combo.complexity) {
        case 'Simple': 
          complexity = `${colors.bright}${colors.green}Simple${colors.reset}    `;
          break;
        case 'Medium': 
          complexity = `${colors.bright}${colors.yellow}Medium${colors.reset}    `;
          break;
        case 'Advanced': 
          complexity = `${colors.bright}${colors.magenta}Advanced${colors.reset}  `;
          break;
        case 'Expert': 
          complexity = `${colors.bright}${colors.red}Expert${colors.reset}    `;
          break;
        default: 
          complexity = combo.complexity.padEnd(10);
      }
      
      // Main row
      console.log(`│ ${colors.cyan}${id}${colors.reset} │ ${colors.bright}${name}${colors.reset} │ ${colors.blue}${plugins}${colors.reset} │ ${cat} │ ${complexity} │`);
    });
  });
  
  console.log('└─────┴─────────────────────────┴─────────────────────────┴─────────────────┴────────────┘');
  console.log('');
  
  // Add a legend for complexity colors
  console.log(style.dim('Legend:'));
  console.log(`  ${colors.bright}${colors.green}Simple${colors.reset}   - Basic setup, perfect for beginners`);
  console.log(`  ${colors.bright}${colors.yellow}Medium${colors.reset}   - Requires some configuration`);
  console.log(`  ${colors.bright}${colors.magenta}Advanced${colors.reset} - Complex setup, multiple integrations`);
  console.log(`  ${colors.bright}${colors.red}Expert${colors.reset}   - Advanced configuration required`);
  console.log('');
}

function displayDetailedCombination(combo) {
  console.log(style.box(`🔍 COMBINATION DETAILS: ${combo.name.toUpperCase()}

ID: ${combo.id}
Category: ${combo.category}
Complexity: ${combo.complexity}
Build Time: ${combo.buildTime}

Description: ${combo.description}
Use Case: ${combo.useCase}

Features:
${combo.features.map(f => `  ✨ ${f}`).join('\n')}

Plugins: ${combo.plugins.join(', ')}`));
}

async function selectCombination() {
  console.log(`\n${style.header('🎯 SELECT COMBINATION TO BUILD')}\n`);
  
  console.log(`${style.info('Options:')}`);
  console.log(`  ${style.highlight('1-28')}     - Build specific combination by ID`);
  console.log(`  ${style.highlight('all')}      - Build all combinations sequentially`);
  console.log(`  ${style.highlight('category')} - Build all combinations in a category`);
  console.log(`  ${style.highlight('simple')}   - Build only simple complexity combinations`);
  console.log(`  ${style.highlight('table')}    - Show combinations table again`);
  console.log(`  ${style.highlight('quit')}     - Exit the builder\n`);
  
  const choice = await askQuestion('Enter your choice: ');
  
  if (choice.toLowerCase() === 'quit' || choice.toLowerCase() === 'q') {
    console.log(style.success('Thanks for using capx-compose Example Builder! 👋'));
    process.exit(0);
  }
  
  if (choice.toLowerCase() === 'table') {
    displayCombinationsTable();
    return await selectCombination();
  }
  
  if (choice.toLowerCase() === 'all') {
    return combinations;
  }
  
  if (choice.toLowerCase() === 'category') {
    const categories = [...new Set(combinations.map(c => c.category))];
    console.log(`\n${style.info('Available categories:')}`);
    categories.forEach((cat, index) => {
      console.log(`  ${index + 1}. ${cat}`);
    });
    
    const catChoice = await askQuestion('\nSelect category number: ');
    const selectedCategory = categories[parseInt(catChoice) - 1];
    
    if (selectedCategory) {
      return combinations.filter(c => c.category === selectedCategory);
    } else {
      console.log(style.error('Invalid category selection'));
      return await selectCombination();
    }
  }
  
  if (choice.toLowerCase() === 'simple') {
    return combinations.filter(c => c.complexity === 'Simple');
  }
  
  // Handle specific ID or range
  const id = parseInt(choice);
  if (id >= 1 && id <= combinations.length) {
    const combo = combinations.find(c => c.id === id);
    displayDetailedCombination(combo);
    
    const confirm = await askQuestion(`\n${style.highlight('Build this combination?')} (y/n): `);
    if (confirm.toLowerCase() === 'y' || confirm.toLowerCase() === 'yes') {
      return [combo];
    } else {
      return await selectCombination();
    }
  }
  
  console.log(style.error('Invalid selection. Please try again.'));
  return await selectCombination();
}

async function createProject(combination) {
  const projectName = `example-${combination.name}`;
  
  console.log(`\n${style.header(`🚀 BUILDING: ${combination.name.toUpperCase()}`)}`);
  console.log(style.box(`Project: ${projectName}
Plugins: ${combination.plugins.join(', ')}
Category: ${combination.category}
Complexity: ${combination.complexity}
Estimated Build Time: ${combination.buildTime}

${combination.description}`));
  
  try {
    // Create the project using the CLI
    const command = `node bin/capx-compose.js ${projectName} --plugins "${combination.plugins.join(',')}" --skip-install --yes --silent`;
    console.log(style.dim(`\n💻 Running: ${command}\n`));
    
    execSync(command, { stdio: 'inherit' });
    
    // Ensure clean line separation after CLI output
    console.log(`\n${style.success(`Project ${projectName} created successfully!`)}`);
    console.log(style.info(`📁 Location: ${path.join(process.cwd(), projectName)}`));
    
    return projectName;
  } catch (error) {
    console.log(`\n${style.error(`Failed to create ${projectName}: ${error.message}`)}`);
    return null;
  }
}

async function showProjectGuide(combination, projectName) {
  console.log(`\n${style.header('📋 NEXT STEPS GUIDE')}`);
  
  console.log(style.box(`🎯 QUICK START GUIDE

1. Navigate to project:
   cd ${projectName}

2. Install dependencies:
   npm install

3. Set up environment variables (see below)

4. Start development server:
   npm run dev

5. Open in browser:
   http://localhost:3000`));
  
  // Show required environment variables
  const envVars = getRequiredEnvVars(combination.plugins);
  if (envVars.length > 0) {
    console.log(`\n${style.header('🔑 REQUIRED ENVIRONMENT VARIABLES')}`);
    console.log(style.info('Create a .env file in the project root with:'));
    console.log(style.dim('```'));
    envVars.forEach(env => console.log(style.highlight(env)));
    console.log(style.dim('```'));
  }
  
  // Show what to explore
  console.log(`\n${style.header('✨ FEATURES TO EXPLORE')}`);
  const testItems = getTestItems(combination.plugins);
  testItems.forEach(item => console.log(`   ${item}`));
  
  // Show specific guidance based on complexity
  console.log(`\n${style.header('💡 TESTING GUIDANCE')}`);
  switch(combination.complexity) {
    case 'Simple':
      console.log(style.info('This is a simple setup - perfect for beginners!'));
      console.log('• Focus on basic functionality and UI components');
      console.log('• Test core features without complex integrations');
      break;
    case 'Medium':
      console.log(style.warning('Medium complexity - requires some configuration'));
      console.log('• Set up all required environment variables');
      console.log('• Test integration between different services');
      break;
    case 'Advanced':
      console.log(style.warning('Advanced setup - requires careful configuration'));
      console.log('• Ensure all services are properly configured');
      console.log('• Test complex workflows and edge cases');
      break;
    case 'Expert':
      console.log(style.error('Expert level - requires deep understanding'));
      console.log('• Advanced configuration may be needed');
      console.log('• Test performance and scalability aspects');
      break;
  }
}

async function testCombination(combination, index, total) {
  console.log(`\n${'═'.repeat(100)}`);
  console.log(style.header(`🏗️  BUILDING EXAMPLE ${index + 1}/${total}: ${combination.name.toUpperCase()}`));
  console.log(`${'═'.repeat(100)}`);
  
  const projectName = await createProject(combination);
  
  if (!projectName) {
    console.log(style.error(`Skipping ${combination.name} due to creation failure`));
    return { success: false, error: 'Creation failed', combination: combination.name };
  }
  
  await showProjectGuide(combination, projectName);
  
  // Simple mode: just show success and continue
  if (!isAdvancedMode) {
    console.log(`\n${style.success('✨ Example created successfully! Ready for exploration.')}`);
    console.log(style.info(`📁 Project saved as: ${projectName}`));
    
    return { 
      success: true, 
      status: 'created',
      combination: combination.name,
      category: combination.category,
      complexity: combination.complexity
    };
  }
  
  // Advanced mode: detailed feedback
  console.log(`\n${style.header('📝 FEEDBACK & NEXT ACTIONS')}`);
  const result = await askQuestion(`\n${style.highlight('How was this example?')} (${style.success('good')}/${style.error('issues')}/${style.dim('skip')}) [Enter = good]: `);
  const status = result.toLowerCase() || 'good';
  
  let feedback = '';
  if (status === 'issues') {
    feedback = await askQuestion(style.warning('📝 Describe any issues you found: '));
  }
  
  const shouldCleanup = await askQuestion(`\n${style.highlight('Clean up this project?')} (y/n) [Enter = yes]: `);
  
  if (shouldCleanup.toLowerCase() !== 'n') {
    cleanup(projectName);
  } else {
    console.log(style.info(`📁 Keeping ${projectName} for further exploration`));
  }
  
  return { 
    success: status !== 'issues', 
    status, 
    feedback,
    combination: combination.name,
    category: combination.category,
    complexity: combination.complexity
  };
}

function getRequiredEnvVars(plugins) {
  const envVars = [];
  
  if (plugins.includes('supabase')) {
    envVars.push('NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url');
    envVars.push('NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key');
  }
  
  if (plugins.includes('firebase')) {
    envVars.push('NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key');
    envVars.push('NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com');
    envVars.push('NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id');
    envVars.push('NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com');
    envVars.push('NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id');
    envVars.push('NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id');
  }
  
  if (plugins.includes('vercel-ai')) {
    envVars.push('OPENAI_API_KEY=your_openai_api_key');
  }
  
  if (plugins.includes('vercel-kv')) {
    envVars.push('KV_REST_API_URL=your_kv_rest_api_url');
    envVars.push('KV_REST_API_TOKEN=your_kv_rest_api_token');
  }
  
  if (plugins.includes('solana')) {
    envVars.push('NEXT_PUBLIC_SOLANA_NETWORK=devnet');
    envVars.push('NEXT_PUBLIC_RPC_ENDPOINT=https://api.devnet.solana.com');
  }
  
  if (plugins.includes('evm')) {
    envVars.push('NEXT_PUBLIC_ETHEREUM_NETWORK=sepolia');
    envVars.push('NEXT_PUBLIC_INFURA_PROJECT_ID=your_infura_project_id');
    envVars.push('NEXT_PUBLIC_ALCHEMY_API_KEY=your_alchemy_api_key');
  }
  
  if (plugins.includes('goat')) {
    envVars.push('OPENAI_API_KEY=your_openai_api_key');
    envVars.push('GOAT_CHAIN=evm # or "solana" - choose one');
    envVars.push('RPC_PROVIDER_URL=your_rpc_endpoint_url');
    envVars.push('WALLET_PRIVATE_KEY=your_evm_private_key_if_evm');
    envVars.push('SOLANA_PRIVATE_KEY=your_solana_private_key_if_solana');
  }
  
  if (plugins.includes('solana-agent-kit')) {
    envVars.push('OPENAI_API_KEY=your_openai_api_key');
    envVars.push('RPC_PROVIDER_URL=https://api.devnet.solana.com');
    envVars.push('SOLANA_PRIVATE_KEY=your_solana_private_key_base58');
  }
  
  return envVars;
}

function getTestItems(plugins) {
  const items = [];
  
  if (plugins.includes('supabase')) {
    items.push('🔐 Authentication (sign up, sign in, sign out)');
    items.push('📊 Database operations (create, read, update, delete)');
    items.push('⚡ Real-time subscriptions and live updates');
    items.push('🔒 Row Level Security (RLS) policies');
  }
  
  if (plugins.includes('firebase')) {
    items.push('🔐 Firebase authentication with multiple providers');
    items.push('🗄️ Firestore database operations and queries');
    items.push('📱 Real-time data synchronization');
    items.push('☁️ Cloud Functions integration');
  }
  
  if (plugins.includes('vercel-ai')) {
    items.push('💬 AI chat interface with streaming responses');
    items.push('🤖 OpenAI GPT integration and completions');
    items.push('📡 Real-time AI response streaming');
    items.push('🎯 Custom AI prompts and fine-tuning');
  }
  
  if (plugins.includes('vercel-kv')) {
    items.push('🗃️ Redis cache operations (set, get, delete, expire)');
    items.push('⚡ Performance improvements and response caching');
    items.push('📈 Session management and user data persistence');
    items.push('🔄 Rate limiting and request throttling');
  }
  
  if (plugins.includes('solana')) {
    items.push('👛 Wallet connection (Phantom, Solflare, Backpack)');
    items.push('💰 SOL balance display and token management');
    items.push('📝 Transaction signing and program interaction');
    items.push('🏪 SPL token operations and NFT handling');
  }
  
  if (plugins.includes('evm')) {
    items.push('🦊 MetaMask and WalletConnect integration');
    items.push('🔗 Multi-network support and switching');
    items.push('💸 ETH transactions and smart contract calls');
    items.push('🪙 ERC-20 token operations and DeFi interactions');
  }
  
  if (plugins.includes('goat')) {
    items.push('🐐 Multi-chain AI agent (EVM + Solana support)');
    items.push('🗣️ Natural language blockchain operations');
    items.push('🔄 Cross-chain token transfers and swaps');
    items.push('💡 AI-powered transaction suggestions');
    items.push('⚖️ Balance checks across multiple chains');
    items.push('🎯 Intelligent transaction routing');
  }
  
  if (plugins.includes('solana-agent-kit')) {
    items.push('🤖 Advanced Solana AI agent with DeFi capabilities');
    items.push('💱 AI-powered token swaps and trading');
    items.push('🏦 DeFi protocol interactions (lending, staking)');
    items.push('📊 Automated portfolio management');
    items.push('🎯 AI trading strategies and analytics');
    items.push('🔮 Market intelligence and price predictions');
  }
  
  return items;
}

async function generateReport(results) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const reportPath = `example-builder-report-${timestamp}.md`;
  
  let report = `# 🏗️ capx-compose Example Builder Report\n\n`;
  report += `**Generated:** ${new Date().toLocaleString()}\n`;
  report += `**Total Examples Tested:** ${results.length}\n`;
  report += `**Successful:** ${results.filter(r => r.status === 'good' || r.status === 'created').length} ✅\n`;
  report += `**Issues Found:** ${results.filter(r => r.status === 'issues').length} ❌\n`;
  report += `**Skipped:** ${results.filter(r => r.status === 'skip').length} ⏭️\n\n`;
  
  // Summary by category
  const categories = [...new Set(results.map(r => r.category))];
  report += `## 📊 Results by Category\n\n`;
  categories.forEach(category => {
    const categoryResults = results.filter(r => r.category === category);
    const good = categoryResults.filter(r => r.status === 'good' || r.status === 'created').length;
    const total = categoryResults.length;
    report += `- **${category}**: ${good}/${total} successful\n`;
  });
  
  // Summary by complexity
  report += `\n## 🎯 Results by Complexity\n\n`;
  const complexities = [...new Set(results.map(r => r.complexity))];
  complexities.forEach(complexity => {
    const complexityResults = results.filter(r => r.complexity === complexity);
    const good = complexityResults.filter(r => r.status === 'good' || r.status === 'created').length;
    const total = complexityResults.length;
    report += `- **${complexity}**: ${good}/${total} successful\n`;
  });
  
  report += `\n## 📋 Detailed Results\n\n`;
  
  results.forEach((result, index) => {
    const status = (result.status === 'good' || result.status === 'created') ? '✅' : result.status === 'issues' ? '❌' : '⏭️';
    report += `### ${index + 1}. ${result.combination} ${status}\n\n`;
    report += `- **Category:** ${result.category}\n`;
    report += `- **Complexity:** ${result.complexity}\n`;
    report += `- **Status:** ${result.status}\n`;
    if (result.feedback) {
      report += `- **Feedback:** ${result.feedback}\n`;
    }
    report += '\n';
  });
  
  report += `\n---\n\n`;
  report += `*Generated by capx-compose Example Builder*\n`;
  
  fs.writeFileSync(reportPath, report);
  console.log(`\n${style.success(`Example builder report generated: ${reportPath}`)}`);
}

async function main() {
  displayWelcome();
  displayCombinationsTable();
  
  const selectedCombinations = await selectCombination();
  
  console.log(`\n${style.header(`🎯 BUILDING ${selectedCombinations.length} COMBINATION(S)`)}\n`);
  
  const results = [];
  
  for (let i = 0; i < selectedCombinations.length; i++) {
    const result = await testCombination(selectedCombinations[i], i, selectedCombinations.length);
    results.push(result);
    
    // Ask if user wants to continue (except for last item)
    if (i < selectedCombinations.length - 1) {
      const continueChoice = await askQuestion(`\n${style.highlight('Continue to next combination?')} (y/n) [Enter = yes]: `);
      if (continueChoice.toLowerCase() === 'n') {
        console.log(style.info('Stopping at user request'));
        break;
      }
    }
  }
  
  console.log(`\n${style.success('🎉 Example building session complete!')}`);
  
  // Show summary only in advanced mode
  if (isAdvancedMode) {
    const successful = results.filter(r => r.success).length;
    const total = results.length;
    console.log(`\n${style.header('📊 SESSION SUMMARY')}`);
    console.log(`${style.success(`Successful: ${successful}/${total}`)} ${style.dim('|')} ${style.error(`Issues: ${total - successful}/${total}`)}`);
    
    const shouldGenerateReport = await askQuestion(`\n${style.highlight('Generate detailed report?')} (y/n) [Enter = yes]: `);
    if (shouldGenerateReport.toLowerCase() !== 'n') {
      await generateReport(results);
    }
  } else {
    console.log(`\n${style.info(`📁 Created ${results.length} example project(s) successfully!`)}`);
    console.log(style.dim('💡 Use --advanced flag for detailed feedback and reporting features'));
  }
  
  console.log(`\n${style.success('Thank you for exploring capx-compose template combinations! 🚀')}`);
  rl.close();
}

// Handle cleanup on exit
process.on('SIGINT', () => {
  console.log('\n\n🛑 Testing interrupted. Cleaning up...');
  // Clean up any test projects
  combinations.forEach(combo => {
    cleanup(`example-${combo.name}`);
  });
  process.exit(0);
});

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { combinations, getRequiredEnvVars, getTestItems }; 