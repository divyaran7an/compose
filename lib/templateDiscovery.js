const fs = require('fs');
const path = require('path');
const { validateTemplateConfig } = require('./templateConfigSchema');
const { PLUGIN_METADATA } = require('./configuration-optimizer');

const TEMPLATES_ROOT = path.join(__dirname, '../templates');

function scanTemplates(dir = TEMPLATES_ROOT) {
  const results = [];
  const errors = [];

  function walk(currentPath, sdk = null, template = null) {
    const entries = fs.readdirSync(currentPath, { withFileTypes: true });
    for (const entry of entries) {
      const entryPath = path.join(currentPath, entry.name);
      if (entry.isDirectory()) {
        if (!sdk) {
          // First level: SDK directory (e.g., 'supabase', 'vercel-ai')
          walk(entryPath, entry.name, null);
        } else if (!template) {
          // Second level: template directory (for multi-template support, e.g., 'basic')
          walk(entryPath, sdk, entry.name);
        } else {
          // Deeper levels ignored
        }
      } else if (entry.isFile() && entry.name === 'config.json' && sdk) {
        // Found a config.json in a template directory (flat or nested)
        try {
          const configRaw = fs.readFileSync(entryPath, 'utf-8');
          const config = JSON.parse(configRaw);
          const { valid, errors: validationErrors } = validateTemplateConfig(config);
          if (valid) {
            results.push({
              sdk, // always use directory name for sdk
              template: template || 'default',
              path: path.dirname(entryPath),
              config
            });
          } else {
            errors.push({
              sdk,
              template: template || 'default',
              path: path.dirname(entryPath),
              errors: validationErrors
            });
          }
        } catch (err) {
          errors.push({
            sdk,
            template: template || 'default',
            path: path.dirname(entryPath),
            errors: [err.message]
          });
        }
      }
    }
  }

  walk(dir);
  return { templates: results, errors };
}

let _cache = null;
function getRegistry() {
  // Always clear cache for fresh discovery
  _cache = scanTemplates();
  return _cache;
}

function listTemplates({ showHidden = false } = {}) {
  return getRegistry().templates.filter(t => showHidden || t.config.visible !== false);
}

function getTemplatesBySDK(sdkName, { showHidden = false } = {}) {
  return listTemplates({ showHidden }).filter(t => t.sdk === sdkName);
}

function findTemplate(sdkName, templateName, { showHidden = false } = {}) {
  return listTemplates({ showHidden }).find(t => t.sdk === sdkName && t.template === templateName);
}

function getDiscoveryErrors() {
  return getRegistry().errors;
}

function validatePluginCombination(plugins, projectType = 'web2') {
  if (!Array.isArray(plugins)) {
    return { valid: false, message: 'Plugins must be an array.' };
  }
  
  // Check plugin count
  if (plugins.length === 0) {
    return { valid: false, message: 'At least 1 plugin is required.' };
  }
  if (plugins.length > 6) {
    return { valid: false, message: 'Maximum 6 plugins allowed.' };
  }
  
  // Validate individual plugin names
  const validPlugins = Object.keys(PLUGIN_METADATA);
  const invalidPlugins = plugins.filter(p => !validPlugins.includes(p));
  if (invalidPlugins.length > 0) {
    return { valid: false, message: `Invalid plugins: ${invalidPlugins.join(', ')}. Valid options: ${validPlugins.join(', ')}` };
  }
  
  // Validate database selection (max 1)
  const databases = plugins.filter(p => ['supabase', 'firebase'].includes(p));
  if (databases.length > 1) {
    return { valid: false, message: 'You can only select one database (supabase OR firebase, not both).' };
  }
  
  // Validate blockchain selection based on project type
  const blockchains = plugins.filter(p => ['evm', 'solana', 'sui'].includes(p));
  const aiAgents = plugins.filter(p => ['goat', 'solana-agent-kit'].includes(p));
  
  // Validate Privy requirements
  if (plugins.includes('privy')) {
    if (projectType === 'web2') {
      return { valid: false, message: 'Privy is only available for Web3 projects.' };
    }
    if (blockchains.length === 0 && aiAgents.length === 0) {
      return { valid: false, message: 'Privy requires at least one blockchain plugin (evm, solana, sui, goat, or solana-agent-kit).' };
    }
  }
  
  if (projectType === 'web3') {
    // For Web3: max 1 blockchain
    if (blockchains.length > 1) {
      return { valid: false, message: 'You can only select one blockchain (evm, solana, OR sui - not multiple).' };
    }
    
    // For Web3: max 1 AI agent
    if (aiAgents.length > 1) {
      return { valid: false, message: 'You can only select one AI agent (goat OR solana-agent-kit, not both).' };
    }
    
    // Validate AI agent compatibility with blockchains
    if (plugins.includes('solana-agent-kit') && !plugins.includes('solana')) {
      return { valid: false, message: 'Solana Agent Kit requires Solana blockchain integration.' };
    }
  } else if (projectType === 'web2') {
    // For Web2: no blockchains or AI agents allowed
    if (blockchains.length > 0 || aiAgents.length > 0) {
      return { valid: false, message: 'Blockchain/agent plugins (evm/solana/sui/goat/solana-agent-kit) are only available for Web3 projects.' };
    }
  }
  
  return { valid: true };
}

function getValidCombinations() {
  return {
    individual: [
      ['supabase'],
      ['firebase'],
      ['vercel-ai'],
      ['vercel-kv'],
      ['evm'],
      ['solana'],
      ['goat'],
      ['solana-agent-kit']
    ],
    web2: [
      ['supabase', 'vercel-ai'],
      ['supabase', 'vercel-kv'],
      ['supabase', 'vercel-ai', 'vercel-kv'],
      ['firebase', 'vercel-ai'],
      ['firebase', 'vercel-kv'],
      ['firebase', 'vercel-ai', 'vercel-kv'],
      ['vercel-ai', 'vercel-kv']
    ],
    web3: [
      // Database + Blockchain combinations
      ['supabase', 'evm'],
      ['supabase', 'evm', 'vercel-ai'],
      ['supabase', 'evm', 'vercel-kv'],
      ['supabase', 'evm', 'vercel-ai', 'vercel-kv'],
      ['supabase', 'solana'],
      ['supabase', 'solana', 'vercel-ai'],
      ['supabase', 'solana', 'vercel-kv'],
      ['supabase', 'solana', 'vercel-ai', 'vercel-kv'],
      ['supabase', 'goat'],
      ['supabase', 'goat', 'vercel-ai'],
      ['supabase', 'goat', 'vercel-kv'],
      ['supabase', 'goat', 'vercel-ai', 'vercel-kv'],
      ['supabase', 'solana-agent-kit'],
      ['supabase', 'solana-agent-kit', 'vercel-ai'],
      ['supabase', 'solana-agent-kit', 'vercel-kv'],
      ['supabase', 'solana-agent-kit', 'vercel-ai', 'vercel-kv'],
      ['firebase', 'evm'],
      ['firebase', 'evm', 'vercel-ai'],
      ['firebase', 'evm', 'vercel-kv'],
      ['firebase', 'evm', 'vercel-ai', 'vercel-kv'],
      ['firebase', 'solana'],
      ['firebase', 'solana', 'vercel-ai'],
      ['firebase', 'solana', 'vercel-kv'],
      ['firebase', 'solana', 'vercel-ai', 'vercel-kv'],
      ['firebase', 'goat'],
      ['firebase', 'goat', 'vercel-ai'],
      ['firebase', 'goat', 'vercel-kv'],
      ['firebase', 'goat', 'vercel-ai', 'vercel-kv'],
      ['firebase', 'solana-agent-kit'],
      ['firebase', 'solana-agent-kit', 'vercel-ai'],
      ['firebase', 'solana-agent-kit', 'vercel-kv'],
      ['firebase', 'solana-agent-kit', 'vercel-ai', 'vercel-kv'],
      // Blockchain + AI/Cache combinations (no database)
      ['evm', 'vercel-ai'],
      ['evm', 'vercel-kv'],
      ['evm', 'vercel-ai', 'vercel-kv'],
      ['solana', 'vercel-ai'],
      ['solana', 'vercel-kv'],
      ['solana', 'vercel-ai', 'vercel-kv'],
      ['goat', 'vercel-ai'],
      ['goat', 'vercel-kv'],
      ['goat', 'vercel-ai', 'vercel-kv'],
      ['solana-agent-kit', 'vercel-ai'],
      ['solana-agent-kit', 'vercel-kv'],
      ['solana-agent-kit', 'vercel-ai', 'vercel-kv'],
      // Privy combinations for Web3
      ['privy', 'evm'],
      ['privy', 'evm', 'vercel-ai'],
      ['privy', 'evm', 'vercel-kv'],
      ['privy', 'evm', 'vercel-ai', 'vercel-kv'],
      ['privy', 'solana'],
      ['privy', 'solana', 'vercel-ai'],
      ['privy', 'solana', 'vercel-kv'],
      ['privy', 'solana', 'vercel-ai', 'vercel-kv'],
      // Privy + Database + Blockchain combinations
      ['supabase', 'privy', 'evm'],
      ['supabase', 'privy', 'solana'],
      ['firebase', 'privy', 'evm'],
      ['firebase', 'privy', 'solana']
    ]
  };
}

module.exports = {
  listTemplates,
  getTemplatesBySDK,
  findTemplate,
  getDiscoveryErrors,
  validatePluginCombination,
  getValidCombinations
}; 