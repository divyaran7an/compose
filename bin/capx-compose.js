#!/usr/bin/env node

const { Command } = require('commander');
const pkg = require('../package.json');
const { promptUser } = require('../lib/prompt');
const { enhancedPromptUser } = require('../lib/enhanced-prompt');
const { scaffoldProject } = require('../lib/scaffold');
const { listTemplates, validatePluginCombination } = require('../lib/templateDiscovery');
const { PLUGIN_METADATA } = require('../lib/configuration-optimizer');
const chalk = require('chalk');
const TemplateManager = require('../lib/TemplateManager');
const path = require('path');
const { logSuccess, logError, logInfo, logWarning, logHeader, logHighlight, logDim, colors, icons } = require('../lib/console');

function validateProjectName(name) {
  // npm package name rules: lowercase, numbers, hyphens, no leading dot/underscore, not empty, not reserved
  const reserved = [
    'node_modules', 'favicon.ico', 'package.json', 'index.js', 'test', 'lib', 'bin', 'src', 'dist', 'public', 'next', 'react', 'react-dom', 'npm', 'npx'
  ];
  if (!name || typeof name !== 'string') {
    return { valid: false, message: 'Project name is required.' };
  }
  if (name.length > 214) {
    return { valid: false, message: 'Project name must be less than 214 characters.' };
  }
  if (/^\.|^_/.test(name)) {
    return { valid: false, message: 'Project name cannot start with a dot or underscore.' };
  }
  if (!/^[a-z0-9\-]+$/.test(name)) {
    return { valid: false, message: 'Project name must use only lowercase letters, numbers, and hyphens.' };
  }
  if (reserved.includes(name)) {
    return { valid: false, message: `Project name '${name}' is a reserved or invalid npm name.` };
  }
  return { valid: true };
}



function getValidCombinationExamples() {
  return [
    'capx-compose my-app --plugins=supabase',
    'capx-compose my-app --plugins=vercel-ai',
    'capx-compose my-app --plugins=supabase,vercel-ai',
    'capx-compose my-app --plugins=firebase,vercel-kv',
    'capx-compose my-app --plugins=supabase,evm,vercel-ai',
    'capx-compose my-app --plugins=firebase,solana,vercel-kv',
    'capx-compose my-app --plugins=goat',
    'capx-compose my-app --plugins=evm,goat',
    'capx-compose my-app --plugins=solana,goat,vercel-ai',
    'capx-compose my-app --plugins=solana-agent-kit',
    'capx-compose my-app --plugins=solana,solana-agent-kit',
    'capx-compose my-app --plugins=privy,evm',
    'capx-compose my-app --plugins=privy,solana',
    'capx-compose my-app --plugins=sui',
    'capx-compose my-app --plugins=sui,vercel-ai',
    'capx-compose my-app --plugins=supabase,sui'
  ];
}

function getValidCombinations() {
  return [
    { plugins: ['supabase'], description: 'Database & Auth only' },
    { plugins: ['firebase'], description: 'Firebase services only' },
    { plugins: ['vercel-ai'], description: 'AI/Chat functionality only' },
    { plugins: ['vercel-kv'], description: 'Key-value storage only' },
    { plugins: ['supabase', 'vercel-ai'], description: 'Database + AI' },
    { plugins: ['firebase', 'vercel-ai'], description: 'Firebase + AI' },
    { plugins: ['supabase', 'vercel-kv'], description: 'Database + Cache' },
    { plugins: ['firebase', 'vercel-kv'], description: 'Firebase + Cache' },
    { plugins: ['supabase', 'evm'], description: 'Database + Ethereum (Web3)' },
    { plugins: ['firebase', 'solana'], description: 'Firebase + Solana (Web3)' },
    { plugins: ['supabase', 'evm', 'vercel-ai'], description: 'Full-stack Web3 + AI' },
    { plugins: ['firebase', 'solana', 'vercel-kv'], description: 'Firebase + Solana + Cache' },
    { plugins: ['goat'], description: 'GOAT AI Agent (Web3)' },
    { plugins: ['evm', 'goat'], description: 'Wallet Adapter + GOAT Agent (Web3)' },
    { plugins: ['solana', 'goat'], description: 'Wallet Adapter + GOAT Agent (Web3)' },
    { plugins: ['supabase', 'goat'], description: 'Database + GOAT AI Agent' },
    { plugins: ['solana-agent-kit'], description: 'Solana AI Agent (Web3)' },
    { plugins: ['solana', 'solana-agent-kit'], description: 'Solana Wallet + AI Agent (Web3)' },
    { plugins: ['supabase', 'solana-agent-kit'], description: 'Database + Solana AI Agent' },
    { plugins: ['privy', 'evm'], description: 'Privy auth + Ethereum wallets' },
    { plugins: ['privy', 'solana'], description: 'Privy auth + Solana wallets' },
    { plugins: ['sui'], description: 'SUI Blockchain (Web3)' },
    { plugins: ['sui', 'vercel-ai'], description: 'SUI + AI Chat (Web3)' },
    { plugins: ['supabase', 'sui'], description: 'Database + SUI (Web3)' }
  ];
}

function showNextStepsGuide(projectName, config, installDependencies) {
  logHeader('📋 NEXT STEPS GUIDE');
  
  // Calculate dynamic width based on content
  const maxWidth = Math.max(
    47,
    `     cd ${projectName}`.length + 10,
    `     http://localhost:3000`.length + 10
  );
  const border = '─'.repeat(maxWidth);
  
  const padLine = (text, width = maxWidth) => {
    const padding = width - text.length - 2;
    return text + ' '.repeat(Math.max(0, padding));
  };
  
  console.log(chalk.cyan('┌' + border + '┐'));
  console.log(chalk.cyan('│') + chalk.bold(padLine('  🎯 QUICK START GUIDE')) + chalk.cyan('│'));
  console.log(chalk.cyan('│' + padLine('') + '│'));
  console.log(chalk.cyan('│') + padLine('  1. Navigate to project:') + chalk.cyan('│'));
  console.log(chalk.cyan('│') + chalk.dim(padLine(`     cd ${projectName}`)) + chalk.cyan('│'));
  console.log(chalk.cyan('│' + padLine('') + '│'));
  
  if (!installDependencies) {
    console.log(chalk.cyan('│') + padLine('  2. Install dependencies:') + chalk.cyan('│'));
    console.log(chalk.cyan('│') + chalk.dim(padLine('     npm install')) + chalk.cyan('│'));
    console.log(chalk.cyan('│' + padLine('') + '│'));
    console.log(chalk.cyan('│') + padLine('  3. Set up environment variables (see below)') + chalk.cyan('│'));
    console.log(chalk.cyan('│' + padLine('') + '│'));
    console.log(chalk.cyan('│') + padLine('  4. Start development server:') + chalk.cyan('│'));
    console.log(chalk.cyan('│') + chalk.dim(padLine('     npm run dev')) + chalk.cyan('│'));
    console.log(chalk.cyan('│' + padLine('') + '│'));
    console.log(chalk.cyan('│') + padLine('  5. Open in browser:') + chalk.cyan('│'));
    console.log(chalk.cyan('│') + chalk.dim(padLine('     http://localhost:3000')) + chalk.cyan('│'));
  } else {
    console.log(chalk.cyan('│') + padLine('  2. Set up environment variables (see below)') + chalk.cyan('│'));
    console.log(chalk.cyan('│' + padLine('') + '│'));
    console.log(chalk.cyan('│') + padLine('  3. Start development server:') + chalk.cyan('│'));
    console.log(chalk.cyan('│') + chalk.dim(padLine('     npm run dev')) + chalk.cyan('│'));
    console.log(chalk.cyan('│' + padLine('') + '│'));
    console.log(chalk.cyan('│') + padLine('  4. Open in browser:') + chalk.cyan('│'));
    console.log(chalk.cyan('│') + chalk.dim(padLine('     http://localhost:3000')) + chalk.cyan('│'));
  }
  console.log(chalk.cyan('└' + border + '┘'));
  console.log('');
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
    // Check if OPENAI_API_KEY already exists before adding
    if (!envVars.some(env => env.startsWith('OPENAI_API_KEY='))) {
      envVars.push('OPENAI_API_KEY=your_openai_api_key');
    }
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
    // Check if OPENAI_API_KEY already exists before adding
    if (!envVars.some(env => env.startsWith('OPENAI_API_KEY='))) {
      envVars.push('OPENAI_API_KEY=your_openai_api_key');
    }
    envVars.push('GOAT_CHAIN=evm # (or solana)');
    // Check if RPC_PROVIDER_URL already exists before adding
    if (!envVars.some(env => env.startsWith('RPC_PROVIDER_URL='))) {
      envVars.push('RPC_PROVIDER_URL=https://sepolia.base.org # (your RPC endpoint)');
    }
    envVars.push('WALLET_PRIVATE_KEY=0x123... # (for EVM chains)');
    // Check if SOLANA_PRIVATE_KEY already exists before adding
    if (!envVars.some(env => env.startsWith('SOLANA_PRIVATE_KEY='))) {
      envVars.push('SOLANA_PRIVATE_KEY=base58... # (for Solana)');
    }
  }
  
  if (plugins.includes('solana-agent-kit')) {
    // Check if OPENAI_API_KEY already exists before adding
    if (!envVars.some(env => env.startsWith('OPENAI_API_KEY='))) {
      envVars.push('OPENAI_API_KEY=your_openai_api_key');
    }
    // Check if RPC_PROVIDER_URL already exists before adding
    if (!envVars.some(env => env.startsWith('RPC_PROVIDER_URL='))) {
      envVars.push('RPC_PROVIDER_URL=https://api.devnet.solana.com');
    }
    // Check if SOLANA_PRIVATE_KEY already exists before adding
    if (!envVars.some(env => env.startsWith('SOLANA_PRIVATE_KEY='))) {
      envVars.push('SOLANA_PRIVATE_KEY=base58_encoded_private_key');
    }
  }
  
  if (plugins.includes('privy')) {
    envVars.push('NEXT_PUBLIC_PRIVY_APP_ID=your_privy_app_id');
  }
  
  if (plugins.includes('sui')) {
    envVars.push('NEXT_PUBLIC_SUI_NETWORK=testnet # (mainnet, testnet, devnet)');
    envVars.push('NEXT_PUBLIC_SUI_RPC_URL=https://fullnode.testnet.sui.io # (optional custom RPC)');
  }
  
  return envVars;
}

function showEnvironmentVariables(plugins) {
  const envVars = getRequiredEnvVars(plugins);
  if (envVars.length === 0) return;
  
  logHeader('🔑 REQUIRED ENVIRONMENT VARIABLES');
  logInfo('Create a .env file in the project root with:');
  console.log(chalk.dim('```'));
  envVars.forEach(env => console.log(chalk.yellow(env)));
  console.log(chalk.dim('```'));
  console.log('');
}

function getFeaturesToExplore(plugins) {
  const features = [];
  
  if (plugins.includes('supabase')) {
    features.push('🔐 Authentication (sign up, sign in, sign out)');
    features.push('📊 Database operations (create, read, update, delete)');
    features.push('⚡ Real-time subscriptions and live updates');
    features.push('🔒 Row Level Security (RLS) policies');
  }
  
  if (plugins.includes('firebase')) {
    features.push('🔐 Firebase authentication with multiple providers');
    features.push('🗄️ Firestore database operations and queries');
    features.push('📱 Real-time data synchronization');
    features.push('☁️ Cloud Functions integration');
  }
  
  if (plugins.includes('vercel-ai')) {
    features.push('💬 AI chat interface with streaming responses');
    features.push('🤖 OpenAI GPT integration and completions');
    features.push('📡 Real-time AI response streaming');
    features.push('🎯 Custom AI prompts and fine-tuning');
  }
  
  if (plugins.includes('vercel-kv')) {
    features.push('🗃️ Redis cache operations (set, get, delete, expire)');
    features.push('⚡ Performance improvements and response caching');
    features.push('📈 Session management and user data persistence');
    features.push('🔄 Rate limiting and request throttling');
  }
  
  if (plugins.includes('solana')) {
    features.push('🔗 Solana wallet integration (Phantom, Solflare)');
    features.push('💰 Token operations and balance checking');
    features.push('📝 Transaction signing and program interaction');
    features.push('🏪 NFT minting and marketplace functionality');
  }
  
  if (plugins.includes('evm')) {
    features.push('🦊 MetaMask wallet integration');
    features.push('⛓️ Multi-network support (Ethereum, Base, Polygon)');
    features.push('📄 Smart contract interaction and deployment');
    features.push('🪙 ERC-20 token operations and transfers');
  }
  
  if (plugins.includes('goat')) {
    features.push('🐐 AI agent with autonomous wallet management');
    features.push('💬 Natural language blockchain operations');
    features.push('🔄 Automated token swaps and transfers');
    features.push('📊 Real-time balance monitoring and reporting');
  }
  
  if (plugins.includes('solana-agent-kit')) {
    features.push('⚡ Advanced Solana AI agent with 60+ operations');
    features.push('🔄 Jupiter DEX integration for token swaps');
    features.push('💰 SOL and SPL token management');
    features.push('📈 Real-time price data and market analytics');
  }
  
  if (plugins.includes('privy')) {
    features.push('🔐 Email authentication with verification codes');
    features.push('👛 Embedded wallet creation and management');
    features.push('💸 Send ETH transactions and sign messages');
    features.push('🔑 Secure private key export (optional)');
  }
  
  if (plugins.includes('sui')) {
    features.push('🌊 SUI wallet integration (Sui Wallet, Suiet, Martian)');
    features.push('💎 SUI token operations and balance checking');
    features.push('🚀 Move smart contract interactions');
    features.push('⚡ High-performance transactions (120k TPS)');
  }
  
  return features;
}

function showFeaturesToExplore(plugins) {
  const features = getFeaturesToExplore(plugins);
  if (features.length === 0) return;
  
  logHeader('✨ FEATURES TO EXPLORE');
  features.forEach(feature => console.log(`   ${feature}`));
  console.log('');
}

function getProjectComplexity(plugins) {
  const hasBlockchain = plugins.some(p => ['evm', 'solana', 'sui', 'privy'].includes(p));
  const hasMultipleServices = plugins.length >= 3;
  const hasAI = plugins.includes('vercel-ai') || plugins.includes('goat');
  
  if (hasBlockchain && hasMultipleServices && hasAI) {
    return 'Expert';
  } else if (hasBlockchain && hasMultipleServices) {
    return 'Advanced';
  } else if (hasBlockchain || hasMultipleServices) {
    return 'Medium';
  } else {
    return 'Simple';
  }
}

function showTestingGuidance(plugins) {
  const complexity = getProjectComplexity(plugins);
  
  logHeader('💡 TESTING GUIDANCE');
  
  switch(complexity) {
    case 'Simple':
      logInfo('This is a simple setup - perfect for beginners!');
      console.log('• Focus on basic functionality and UI components');
      console.log('• Test core features without complex integrations');
      break;
    case 'Medium':
      logInfo('Medium complexity - requires some configuration');
      console.log('• Set up all required environment variables');
      console.log('• Test integration between different services');
      break;
    case 'Advanced':
      logInfo('Advanced setup - requires careful configuration');
      console.log('• Ensure all services are properly configured');
      console.log('• Test complex workflows and edge cases');
      break;
    case 'Expert':
      logInfo('Expert level - requires deep understanding');
      console.log('• Advanced configuration may be needed');
      console.log('• Test performance and scalability aspects');
      break;
  }
  console.log('');
}

const program = new Command();

program
  .name('capx-compose')
  .version(pkg.version)
  .description('Scaffold a production-ready Next.js AI application')
  .arguments('<project-name>')
  .option('--use-pnpm', 'Use pnpm as package manager')
  .option('--use-yarn', 'Use yarn as package manager')
  .option('--skip-install', 'Skip automatic dependency installation')
  .option('--eslint', 'Include ESLint configuration')
  .option('--no-eslint', 'Skip ESLint configuration')
  .option('-y, --yes', 'Answer yes to all prompts')
  .option('--plugins <list>', `Plugins: 1-4 from [${Object.keys(PLUGIN_METADATA).join(',')}]`)
  .option('--dependency-strategy <strategy>', 'Dependency conflict resolution strategy (smart, highest, lowest, compatible)', 'smart')
  .option('--silent', 'Suppress enhanced output (useful for programmatic usage)')
  .addHelpText('after', `
Examples:
  ${getValidCombinationExamples().join('\n  ')}`)
  .action(async (projectName, options) => {
    try {
      // Clear screen and show header
      console.clear();
      logHeader('🚀 capx-compose - AI Application Generator', true);
      
      const validation = validateProjectName(projectName);
      if (!validation.valid) {
        logError(validation.message);
        process.exit(1);
      }
      
      logHighlight(`Creating project: ${colors.bold(projectName)}`);
      console.log('');
      
      let config;
      
      // Parse and validate plugins if provided via CLI
      let cliPlugins = null;
      if (options.plugins) {
        cliPlugins = options.plugins.split(/[,\s]+/).filter(Boolean);
        
        // Auto-detect project type based on plugins
        const hasBlockchain = cliPlugins.some(p => ['evm', 'solana', 'sui', 'goat', 'solana-agent-kit', 'privy'].includes(p));
        const detectedProjectType = hasBlockchain ? 'web3' : 'web2';
        
        // Validate plugin combination
        const validation = validatePluginCombination(cliPlugins, detectedProjectType);
        if (!validation.valid) {
          logError(validation.message);
          console.log('');
          logInfo('Valid examples:');
          getValidCombinationExamples().forEach(example => logDim(`  ${example}`));
          process.exit(1);
        }
      }
      
      if (options.yes) {
        // Auto-detect project type based on plugins
        const hasBlockchain = cliPlugins && cliPlugins.some(p => ['evm', 'solana', 'sui', 'goat', 'solana-agent-kit', 'privy'].includes(p));
        const projectType = hasBlockchain ? 'web3' : 'web2';
        
        config = {
          projectType,
          plugins: cliPlugins || ['vercel-ai'], // Default to vercel-ai if no plugins specified
          typescript: true, // Always enabled
          tailwind: true,   // Always enabled
          eslint: false,    // Default to false for --yes mode
          installDependencies: true, // Default to installing dependencies
          packageManager: null, // Default to auto-detect
          goatChain: cliPlugins && cliPlugins.includes('goat') ? 'evm' : undefined // Default GOAT to EVM
        };
        
        logInfo(`Using default configuration (${projectType.toUpperCase()})`);
        logDim(`Plugins: ${config.plugins.join(', ')}`);
            } else {
        logInfo('Starting interactive setup...');
        
        // Use enhanced prompt system by default, fallback to original if needed
        try {
          config = await enhancedPromptUser();
        } catch (error) {
          logWarning('Enhanced prompt failed, falling back to basic prompt...');
          config = await promptUser();
        }
        
        // If --plugins is provided, override plugins from prompt
        if (cliPlugins) {
          config.plugins = cliPlugins;
          // Update project type if needed
          const hasBlockchain = cliPlugins.some(p => ['evm', 'solana', 'sui', 'goat', 'solana-agent-kit', 'privy'].includes(p));
          config.projectType = hasBlockchain ? 'web3' : 'web2';
        }

        // Clear screen and show Capx-branded success message with preserved context
        console.clear();
        logHeader('🚀 capx-compose - Configuration Complete', true);
        
        logSuccess('Configuration confirmed! Starting project generation...');
        console.log('');
        
        // Show preserved context
        logInfo(`📋 Project Type: ${config.projectType.toUpperCase()}`);
        
        // Detect blockchain from selected plugins
        if (config.projectType === 'web3') {
          const selectedBlockchain = config.plugins.includes('evm') ? 'EVM' : 
                                   config.plugins.includes('solana') ? 'SOLANA' : 
                                   config.plugins.includes('sui') ? 'SUI' : null;
          if (selectedBlockchain) {
            logInfo(`⛓️  Blockchain: ${selectedBlockchain}`);
          }
        }
        
        logInfo(`🔧 Plugins: ${config.plugins.join(', ')}`);
        console.log('');
      }

      // Handle ESLint CLI flags (override prompt/default)
      if (options.eslint) {
        config.eslint = true;
      } else if (options.noEslint) {
        config.eslint = false;
      }

      // Get templates
      const templates = listTemplates({ showHidden: false });
      let selectedTemplates = [];
      
      // Add all selected plugin templates (unified approach for web2 and web3)
      for (const plugin of config.plugins || []) {
        const t = templates.find(t => t.sdk === plugin);
        if (t) {
          selectedTemplates.push(t);
        } else {
          logError(`No template found for plugin '${plugin}'`);
        }
      }
      if (selectedTemplates.length === 0) {
        logError('No matching templates found for your selection.');
        process.exit(1);
      }
      
      console.log('');
      logInfo(`Initializing with ${selectedTemplates.length} template${selectedTemplates.length > 1 ? 's' : ''}...`);
      
      // Determine package manager preference
      let packageManager = null;
      if (options.usePnpm) {
        packageManager = 'pnpm';
      } else if (options.useYarn) {
        packageManager = 'yarn';
      } else if (config.packageManager) {
        // Use package manager from prompt if no CLI flag specified
        packageManager = config.packageManager;
      }
      
      // Determine if dependencies should be installed
      // CLI flags take precedence over prompt configuration
      let installDependencies;
      if (options.skipInstall) {
        installDependencies = false;
      } else if (config.hasOwnProperty('installDependencies')) {
        // Use prompt configuration if available
        installDependencies = config.installDependencies;
      } else {
        // Default to true if neither CLI flag nor prompt specified
        installDependencies = true;
      }
      
      await scaffoldProject(projectName, { 
        ...config, 
        projectName,
        templates: selectedTemplates,
        installDependencies,
        packageManager,
        dependencyStrategy: options.dependencyStrategy || 'smart',
        silent: options.silent || false
      });
      
      // Enhanced success message with detailed guidance (only if not silent)
      if (!options.silent) {
        console.log('');
        logSuccess(`Project "${projectName}" created successfully! ${icons.rocket}`);
        console.log('');
        
        // Show project location
        const projectPath = path.resolve(projectName);
        logInfo(`📁 Location: ${colors.dim(projectPath)}`);
        console.log('');
        
        // Show detailed next steps guide
        showNextStepsGuide(projectName, config, installDependencies);
        
        // Show environment variables if needed
        showEnvironmentVariables(config.plugins);
        
        // Show features to explore
        showFeaturesToExplore(config.plugins);
        
        // Show testing guidance based on complexity
        showTestingGuidance(config.plugins);
        
        console.log('');
        logHighlight('Happy coding! 🎉');
      }
      
    } catch (error) {
      console.log('');
      logError('An unexpected error occurred:');
      logDim(error.message);
      process.exit(1);
    }
  });

// Template management subcommands
const plugins = new Command('plugins')
  .description('Plugin system operations and debugging tools');

// plugins list
plugins
  .command('list')
  .description('List available plugins')
  .option('--all', 'Show hidden plugins')
  .option('--invalid', 'Show invalid plugins as well')
  .action(async (opts) => {
    try {
      await TemplateManager.initialize();
      const showHidden = !!opts.all;
      const onlyValid = !opts.invalid;
      const templates = await TemplateManager.listTemplates({ showHidden, onlyValid });
      if (!templates.length) {
        console.log(chalk.yellow('No plugins found.'));
        return;
      }
      console.log(chalk.bold('\nAvailable Plugins:'));
      for (const t of templates) {
        const label = `${t.sdk}`;
        console.log(chalk.green('✔️'), chalk.cyan(label), '-', chalk.gray(t.config.description));
      }
      console.log();
    } catch (error) {
      console.error(chalk.red('Error listing plugins:'), error.message);
      process.exit(1);
    }
  });

// plugins validate
plugins
  .command('validate')
  .description('Validate all plugins and print a report')
  .option('--json', 'Output as JSON')
  .action(async (opts) => {
    try {
      await TemplateManager.initialize();
      if (opts.json) {
        const report = await TemplateManager.validateAll({ json: true });
        console.log(JSON.stringify(report, null, 2));
      } else {
        await TemplateManager.validateAll({ json: false });
      }
    } catch (error) {
      console.error(chalk.red('Error validating plugins:'), error.message);
      process.exit(1);
    }
  });

// plugins show <plugin>
plugins
  .command('show <plugin>')
  .description('Show details for a specific plugin')
  .action(async (plugin) => {
    try {
      await TemplateManager.initialize();
      const t = await TemplateManager.findTemplate(plugin, 'default', { showHidden: true, onlyValid: false });
      if (!t) {
        console.log(chalk.red('Plugin not found.'));
        return;
      }
      console.log(chalk.bold(`\n${t.sdk} Plugin`));
      console.log(chalk.gray(t.config.description));
      console.log(chalk.bold('Path:'), t.path);
      console.log(chalk.bold('Packages:'), (t.config.packages || []).map(p => p.name).join(', ') || 'None');
      if (t.config.devPackages) {
        console.log(chalk.bold('Dev Packages:'), t.config.devPackages.map(p => p.name).join(', ') || 'None');
      }
      console.log(chalk.bold('Files:'));
      for (const [src, dest] of Object.entries(t.config.files || {})) {
        console.log(' ', chalk.cyan(src), '→', chalk.magenta(dest));
      }
      if (t.config.envVars && t.config.envVars.length) {
        console.log(chalk.bold('Environment Variables:'));
        for (const v of t.config.envVars) {
          console.log(' ', chalk.yellow(v.name), '-', v.description, v.required ? chalk.red('(required)') : '');
        }
      }
      if (t.config.tags) {
        console.log(chalk.bold('Tags:'), t.config.tags.join(', '));
      }
      if (t.config.visible === false) {
        console.log(chalk.redBright('This plugin is hidden.'));
      }
      console.log();
    } catch (error) {
      console.error(chalk.red('Error showing plugin:'), error.message);
      process.exit(1);
    }
  });

// plugins invalidate-cache
plugins
  .command('invalidate-cache')
  .description('Clear the plugin cache (for development)')
  .action(() => {
    try {
      TemplateManager.invalidateCache();
      console.log(chalk.green('Plugin cache invalidated.'));
    } catch (error) {
      console.error(chalk.red('Error invalidating cache:'), error.message);
      process.exit(1);
    }
  });

program.addCommand(plugins);

program.parse(process.argv);

if (!process.argv.slice(2).length) {
  program.outputHelp();
} 