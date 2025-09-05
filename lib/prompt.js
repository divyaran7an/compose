const inquirer = require('inquirer');
const { generatePluginChoices } = require('./configuration-optimizer');

async function promptUser() {
  try {
    const config = {};
    
    // Project type selection
    const { projectType } = await inquirer.prompt([
      {
        type: 'list',
        name: 'projectType',
        message: 'Select the type of project:',
        choices: [
          { name: 'Web2 (Traditional web application)', value: 'web2' },
          { name: 'Web3 (Blockchain/DeFi application)', value: 'web3' }
        ],
        default: 'web2',
        validate: (input) => !!input || 'You must select a project type.'
      }
    ]);
    config.projectType = projectType;

    // Build plugin choices based on project type
    const pluginChoices = generatePluginChoices(projectType);

    // Plugin selection with validation
    const { plugins } = await inquirer.prompt([
      {
        type: 'checkbox',
        name: 'plugins',
        message: 'Select plugins to include (choose at least 1, max 6):',
        choices: pluginChoices,
        validate: (input) => {
          if (input.length === 0) {
            return 'You must select at least 1 plugin.';
          }
              if (input.length > 6) {
      return 'You can select maximum 6 plugins.';
          }
          
          // Validate database selection (max 1)
          const databases = input.filter(p => ['supabase', 'firebase'].includes(p));
          if (databases.length > 1) {
            return 'You can only select one database (Supabase OR Firebase, not both).';
          }
          
          // Validate blockchain selection for Web3 (max 1)
          if (projectType === 'web3') {
            const blockchains = input.filter(p => ['evm', 'solana', 'sui'].includes(p));
            if (blockchains.length > 1) {
              return 'You can only select one blockchain (EVM, Solana, OR SUI - not multiple).';
            }
          }
          
          // Validate blockchain selection for Web2 (should be 0)
          if (projectType === 'web2') {
            const blockchains = input.filter(p => ['evm', 'solana', 'sui', 'goat', 'solana-agent-kit'].includes(p));
            if (blockchains.length > 0) {
              return 'Blockchain plugins (EVM/Solana/SUI/GOAT/Solana Agent Kit) are only available for Web3 projects.';
            }
          }
          
          
          
          return true;
        }
      }
    ]);
    config.plugins = plugins;

    // GOAT blockchain auto-configuration (no prompt needed)
    if (plugins.includes('goat')) {
      // Auto-configure GOAT based on selected blockchain plugins
      const hasEvm = plugins.includes('evm');
      const hasSolana = plugins.includes('solana');
      
      if (hasEvm) {
        config.goatChain = 'evm';
      } else if (hasSolana) {
        config.goatChain = 'solana';
      } else {
        // Default to EVM if no blockchain is explicitly selected
        config.goatChain = 'evm';
      }
    }

    // Configuration options - only ESLint is optional
    const { eslint } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'eslint',
        message: 'Would you like to set up ESLint? (optional)',
        default: false
      }
    ]);
    
    // Set configuration options - TypeScript and Tailwind are always included
    config.typescript = true;
    config.tailwind = true;
    config.eslint = eslint;

    // Dependency installation preference
    const { installDependencies } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'installDependencies',
        message: 'Would you like to automatically install dependencies after project creation?',
        default: true
      }
    ]);
    config.installDependencies = installDependencies;

    // Package manager preference (only if installing dependencies)
    if (installDependencies) {
      const { packageManager } = await inquirer.prompt([
        {
          type: 'list',
          name: 'packageManager',
          message: 'Which package manager would you like to use?',
          choices: [
            { name: 'Auto-detect (recommended)', value: null },
            { name: 'npm', value: 'npm' },
            { name: 'yarn', value: 'yarn' },
            { name: 'pnpm', value: 'pnpm' }
          ],
          default: null
        }
      ]);
      config.packageManager = packageManager;
    }

    return config;
  } catch (error) {
    console.error('Prompt error:', error);
    throw error;
  }
}

module.exports = { promptUser }; 