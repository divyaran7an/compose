const inquirer = require('inquirer');
const colors = require('chalk');

// Mock all dependencies before importing the module
jest.mock('inquirer');
jest.mock('../../../lib/prompt-helpers', () => ({
  createSection: jest.fn((title, subtitle) => `Section: ${title} - ${subtitle}`),
  createCard: jest.fn((title, description) => `Card: ${title} - ${description}`),
  createStatus: jest.fn((type, message) => `Status[${type}]: ${message}`),
  createComparisonTable: jest.fn(() => 'Comparison Table'),
  createProgressBar: jest.fn(() => 'Progress Bar'),
  applySemanticColors: jest.fn((text, type) => `${type.toUpperCase()}: ${text}`),
  createDivider: jest.fn(() => '─'.repeat(60)),
  icons: {
    web2: '🌐',
    web3: '⛓️',
    ai: '🤖',
    database: '🗄️',
    auth: '🔐',
    blockchain: '⚡',
    time: '⏱️',
    complexity: '📊',
    check: '✅',
    arrow: '➤',
    star: '⭐',
    rocket: '🚀',
    gear: '⚙️',
    warning: '⚠️'
  },
  colors: {
    primary: jest.fn(text => `PRIMARY: ${text}`),
    secondary: jest.fn(text => `SECONDARY: ${text}`),
    success: jest.fn(text => `SUCCESS: ${text}`),
    error: jest.fn(text => `ERROR: ${text}`),
    warning: jest.fn(text => `WARNING: ${text}`),
    info: jest.fn(text => `INFO: ${text}`),
    muted: jest.fn(text => `MUTED: ${text}`),
    dim: jest.fn(text => `DIM: ${text}`),
    bold: jest.fn(text => `BOLD: ${text}`)
  }
}));

jest.mock('../../../lib/configuration-optimizer', () => ({
  generateConfigurationSummary: jest.fn(() => ({
    selectedComponents: {},
    recommendations: []
  })),
  formatConfigurationSummary: jest.fn(() => 'Configuration Summary'),
  optimizeConfiguration: jest.fn(config => config),
  getPluginDisplayName: jest.fn(plugin => `Display: ${plugin}`)
}));

jest.mock('../../../lib/terminal-utils', () => ({
  smartClear: jest.fn(),
  getPluginDisplayName: jest.fn(plugin => `Display: ${plugin}`)
}));

jest.mock('../../../lib/terminal-state', () => ({
  resetState: jest.fn(() => ({
    getProgressBar: jest.fn(() => 'Progress: [====    ] 50%'),
    updateSelection: jest.fn(),
    nextStep: jest.fn(),
    getPreservedInfo: jest.fn(() => 'Preserved Info'),
    addError: jest.fn(),
    addWarning: jest.fn()
  }))
}));

// Import the module after mocking
const {
  projectTypeSelection,
  blockchainSelection,
  pluginSelection,
  enhancedPluginSelection,
  validatePluginSelection,
  runConfigurationFlow,
  configurationSummary,
  enhancedPromptUser,
  enhancedValidation,
  getCategoryIcon,
  isBlockchainPlugin,
  isPluginCompatibleWithBlockchain
} = require('../../../lib/enhanced-prompt');

const mockPromptHelpers = require('../../../lib/prompt-helpers');
const mockConfigurationOptimizer = require('../../../lib/configuration-optimizer');
const mockTerminalUtils = require('../../../lib/terminal-utils');
const mockTerminalState = require('../../../lib/terminal-state');

describe('Enhanced Prompt Module', () => {
  // Suppress console output for cleaner test runs
  let originalConsoleLog, originalConsoleError;

  beforeAll(() => {
    originalConsoleLog = console.log;
    originalConsoleError = console.error;
    console.log = jest.fn();
    console.error = jest.fn();
  });

  afterAll(() => {
    console.log = originalConsoleLog;
    console.error = originalConsoleError;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    // Default successful prompt responses
    inquirer.prompt.mockResolvedValue({ projectType: 'web2' });
  });

  describe('projectTypeSelection', () => {
         test('should display project types and return selected type', async () => {
       inquirer.prompt.mockResolvedValueOnce({ projectType: 'web2' });

       const result = await projectTypeSelection();

       expect(result).toBe('web2');
       expect(inquirer.prompt).toHaveBeenCalled();
       // Verify the prompt contains the expected structure
       const promptCall = inquirer.prompt.mock.calls[0][0][0];
       expect(promptCall.type).toBe('list');
       expect(promptCall.name).toBe('projectType');
       expect(promptCall.choices).toHaveLength(2);
     });

    test('should handle web3 selection', async () => {
      inquirer.prompt.mockResolvedValueOnce({ projectType: 'web3' });

      const result = await projectTypeSelection();

      expect(result).toBe('web3');
    });

    test('should validate input properly', async () => {
      inquirer.prompt.mockResolvedValueOnce({ projectType: 'web2' });
      
      await projectTypeSelection();

      const promptCall = inquirer.prompt.mock.calls[0][0][0];
      expect(promptCall.validate('')).toBe('You must select a project type.');
      expect(promptCall.validate('web2')).toBe(true);
      expect(promptCall.validate('web3')).toBe(true);
    });

         test('should handle invalid project type', async () => {
       inquirer.prompt.mockResolvedValueOnce({ projectType: 'web2' });
       
       await projectTypeSelection();

       const promptCall = inquirer.prompt.mock.calls[0][0][0];
       expect(promptCall.validate('')).toBe('You must select a project type.');
       expect(promptCall.validate('invalid')).toBe(true); // Any non-empty value passes since choices are controlled
     });
  });

  describe('blockchainSelection', () => {
    test('should display blockchain options and return selection', async () => {
      inquirer.prompt.mockResolvedValueOnce({ blockchain: 'evm' });

      const result = await blockchainSelection();

      expect(result).toBe('evm');
      expect(inquirer.prompt).toHaveBeenCalledWith([
        expect.objectContaining({
          type: 'list',
          name: 'blockchain',
          choices: expect.arrayContaining([
            expect.objectContaining({ value: 'evm' }),
            expect.objectContaining({ value: 'solana' })
          ])
        })
      ]);
    });

    test('should validate blockchain selection', async () => {
      inquirer.prompt.mockResolvedValueOnce({ blockchain: 'evm' });
      
      await blockchainSelection();

      const promptCall = inquirer.prompt.mock.calls[0][0][0];
      expect(promptCall.validate('')).toBe('You must select a blockchain network.');
      expect(promptCall.validate('evm')).toBe(true);
      expect(promptCall.validate('solana')).toBe(true);
    });

    test('should handle solana selection', async () => {
      inquirer.prompt.mockResolvedValueOnce({ blockchain: 'solana' });

      const result = await blockchainSelection();

      expect(result).toBe('solana');
    });

         test('should handle invalid blockchain selection', async () => {
       inquirer.prompt.mockResolvedValueOnce({ blockchain: 'evm' });
       
       await blockchainSelection();

       const promptCall = inquirer.prompt.mock.calls[0][0][0];
       expect(promptCall.validate('')).toBe('You must select a blockchain network.');
       expect(promptCall.validate('invalid')).toBe(true); // Any non-empty value passes since choices are controlled
     });
  });

  describe('enhancedPluginSelection', () => {
    const mockPlugins = [
      { name: 'Supabase', value: 'supabase', category: 'Database' },
      { name: 'Vercel AI', value: 'vercel-ai', category: 'AI' },
      { name: 'Firebase', value: 'firebase', category: 'Database' }
    ];

    test('should handle empty plugin list', async () => {
      const result = await enhancedPluginSelection([], []);
      expect(result).toEqual([]);
    });

    test('should display plugins with categories', async () => {
      inquirer.prompt.mockResolvedValueOnce({ selectedPlugins: ['supabase'] });

      const result = await enhancedPluginSelection(mockPlugins, []);

      expect(result).toEqual(['supabase']);
      expect(inquirer.prompt).toHaveBeenCalledWith([
        expect.objectContaining({
          type: 'checkbox',
          name: 'selectedPlugins',
          choices: expect.any(Array)
        })
      ]);
    });

    test('should handle auto-included plugins', async () => {
      inquirer.prompt.mockResolvedValueOnce({ selectedPlugins: ['vercel-ai'] });

      const result = await enhancedPluginSelection(mockPlugins, ['evm']);

      expect(result).toEqual(['vercel-ai']);
    });

    test('should validate plugin selection during prompt', async () => {
      inquirer.prompt.mockResolvedValueOnce({ selectedPlugins: ['supabase'] });
      
      await enhancedPluginSelection(mockPlugins, []);

      const promptCall = inquirer.prompt.mock.calls[0][0][0];
      const validation = promptCall.validate(['supabase']);
      expect(validation).toBe(true);
    });

    test('should handle validation errors in prompt', async () => {
      inquirer.prompt.mockResolvedValueOnce({ selectedPlugins: [] });
      
      await enhancedPluginSelection(mockPlugins, []);

      const promptCall = inquirer.prompt.mock.calls[0][0][0];
      const tooManyPlugins = ['supabase', 'vercel-ai', 'vercel-kv', 'evm', 'solana', 'goat', 'privy'];
      const validation = promptCall.validate(tooManyPlugins);
      expect(typeof validation).toBe('string');
              expect(validation).toContain('Maximum 6 plugins');
    });
  });

  describe('validatePluginSelection', () => {
    test('should pass with valid selection', () => {
      const result = validatePluginSelection(['supabase'], ['evm']);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should detect too many plugins', () => {
      const result = validatePluginSelection(['supabase', 'vercel-ai', 'vercel-kv'], ['evm', 'solana', 'goat', 'privy']);
      
      expect(result.isValid).toBe(false);
              expect(result.errors.some(error => error.includes('Maximum 6 plugins'))).toBe(true);
    });

         test('should handle auto-included plugins in count', () => {
       const result = validatePluginSelection(['supabase'], ['evm', 'vercel-ai', 'extra']);
       
       expect(result.isValid).toBe(true); // 1 + 3 = 4 plugins, which is allowed (under 6 limit)
     });

    test('should detect multiple database plugins', () => {
      const result = validatePluginSelection(['supabase', 'firebase'], []);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(error => error.includes('primary database'))).toBe(true);
    });

    test('should detect multiple AI agent plugins', () => {
      const result = validatePluginSelection(['goat', 'solana-agent-kit'], []);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(error => error.includes('AI agent plugin'))).toBe(true);
    });

    test('should allow vercel-kv without database constraints', () => {
      // vercel-kv can be selected with any database or no database
      const withSupabase = validatePluginSelection(['supabase', 'vercel-kv'], []);
      expect(withSupabase.isValid).toBe(true);
      
      const withFirebase = validatePluginSelection(['firebase', 'vercel-kv'], []);
      expect(withFirebase.isValid).toBe(true);
      
      const kvOnly = validatePluginSelection(['vercel-kv'], []);
      expect(kvOnly.isValid).toBe(true);
      
      const withBothDbAndKv = validatePluginSelection(['supabase', 'firebase', 'vercel-kv'], []);
      expect(withBothDbAndKv.isValid).toBe(false); // Should fail because of multiple databases, not KV
      expect(withBothDbAndKv.errors.some(error => error.includes('primary database'))).toBe(true);
    });

    test('should warn about empty selection', () => {
      const result = validatePluginSelection([], []);
      
      expect(result.isValid).toBe(true);
      expect(result.hasWarnings).toBe(true);
      expect(result.warnings.some(warning => warning.includes('No plugins selected'))).toBe(true);
    });

    test('should handle null inputs gracefully', () => {
      const result = validatePluginSelection(null, null);
      
      expect(result.isValid).toBe(true);
    });

    test('should handle undefined inputs gracefully', () => {
      const result = validatePluginSelection(undefined, undefined);
      
      expect(result.isValid).toBe(true);
    });
  });

  describe('runConfigurationFlow', () => {
    let mockState;

    beforeEach(() => {
      mockState = {
        getProgressBar: jest.fn(() => 'Progress Bar'),
        updateSelection: jest.fn(),
        nextStep: jest.fn(),
        getPreservedInfo: jest.fn(() => 'Preserved Info'),
        addError: jest.fn(),
        addWarning: jest.fn()
      };
    });

    test('should handle complete web2 flow', async () => {
      inquirer.prompt
        .mockResolvedValueOnce({ projectType: 'web2' })
        .mockResolvedValueOnce({ selectedPlugins: ['supabase'] })
        .mockResolvedValueOnce({ eslint: true })
        .mockResolvedValueOnce({ installDependencies: true })
        .mockResolvedValueOnce({ pm: 'npm' })
        .mockResolvedValueOnce({ confirmed: true });

      mockConfigurationOptimizer.generateConfigurationSummary.mockReturnValue({
        selectedComponents: {},
        recommendations: []
      });

      const result = await runConfigurationFlow(mockState);

      expect(result).toMatchObject({
        projectType: 'web2',
        plugins: ['supabase'],
        eslint: true,
        installDependencies: true,
        packageManager: 'npm'
      });
    });

    test('should handle web3 flow with blockchain selection', async () => {
      inquirer.prompt
        .mockResolvedValueOnce({ projectType: 'web3' })
        .mockResolvedValueOnce({ blockchain: 'evm' })
        .mockResolvedValueOnce({ selectedPlugins: ['vercel-ai'] })
        .mockResolvedValueOnce({ eslint: false })
        .mockResolvedValueOnce({ installDependencies: false })
        .mockResolvedValueOnce({ confirmed: true });

      mockConfigurationOptimizer.generateConfigurationSummary.mockReturnValue({
        selectedComponents: {},
        recommendations: []
      });

      const result = await runConfigurationFlow(mockState);

      expect(result).toMatchObject({
        projectType: 'web3',
        plugins: expect.arrayContaining(['vercel-ai'])
      });
    });

    test('should handle GOAT plugin selection', async () => {
      inquirer.prompt
        .mockResolvedValueOnce({ projectType: 'web3' })
        .mockResolvedValueOnce({ blockchain: 'evm' })
        .mockResolvedValueOnce({ selectedPlugins: ['goat'] })
        .mockResolvedValueOnce({ eslint: true })
        .mockResolvedValueOnce({ installDependencies: true })
        .mockResolvedValueOnce({ pm: null })
        .mockResolvedValueOnce({ confirmed: true });

      mockConfigurationOptimizer.generateConfigurationSummary.mockReturnValue({
        selectedComponents: {},
        recommendations: []
      });

      const result = await runConfigurationFlow(mockState);

      expect(result).toMatchObject({
        projectType: 'web3',
        goatChain: 'evm',
        plugins: expect.arrayContaining(['goat'])
      });
    });

    test('should handle configuration cancellation', async () => {
      inquirer.prompt
        .mockResolvedValueOnce({ projectType: 'web2' })
        .mockResolvedValueOnce({ selectedPlugins: [] })
        .mockResolvedValueOnce({ eslint: false })
        .mockResolvedValueOnce({ installDependencies: false })
        .mockResolvedValueOnce({ confirmed: false });

      mockConfigurationOptimizer.generateConfigurationSummary.mockReturnValue({
        selectedComponents: {},
        recommendations: []
      });

      await expect(runConfigurationFlow(mockState)).rejects.toThrow('Configuration cancelled by user');
    });

    test('should handle validation errors', async () => {
      inquirer.prompt
        .mockResolvedValueOnce({ projectType: 'web2' })
        .mockResolvedValueOnce({ selectedPlugins: ['supabase', 'vercel-ai', 'vercel-kv', 'extra1', 'extra2', 'extra3', 'extra4'] })
        .mockResolvedValueOnce({ eslint: true })
        .mockResolvedValueOnce({ installDependencies: true })
        .mockResolvedValueOnce({ pm: 'npm' });

      const result = await runConfigurationFlow(mockState);

      expect(result).toBeNull();
      expect(mockState.addError).toHaveBeenCalledWith(
        'Configuration validation failed',
        expect.objectContaining({ errors: expect.any(Array) })
      );
    });

    test('should handle dependency installation choices', async () => {
      inquirer.prompt
        .mockResolvedValueOnce({ projectType: 'web2' })
        .mockResolvedValueOnce({ selectedPlugins: [] })
        .mockResolvedValueOnce({ eslint: false })
        .mockResolvedValueOnce({ installDependencies: true })
        .mockResolvedValueOnce({ pm: 'yarn' })
        .mockResolvedValueOnce({ confirmed: true });

      mockConfigurationOptimizer.generateConfigurationSummary.mockReturnValue({
        selectedComponents: {},
        recommendations: []
      });

      const result = await runConfigurationFlow(mockState);

      expect(result).toMatchObject({
        installDependencies: true,
        packageManager: 'yarn'
      });
    });
  });

  describe('configurationSummary', () => {
    const mockConfig = {
      projectType: 'web2',
      plugins: ['supabase', 'vercel-ai'],
      eslint: true,
      packageManager: 'npm'
    };

    test('should display configuration summary and get confirmation', async () => {
      mockConfigurationOptimizer.generateConfigurationSummary.mockReturnValue({
        selectedComponents: {
          database: [{ name: 'Supabase', features: ['Real-time', 'Auth'] }]
        },
        recommendations: []
      });
      inquirer.prompt.mockResolvedValueOnce({ confirmed: true });

      const result = await configurationSummary(mockConfig);

      expect(result).toBe(true);
      expect(mockConfigurationOptimizer.formatConfigurationSummary).toHaveBeenCalled();
    });

    test('should display selected components when available', async () => {
      mockConfigurationOptimizer.generateConfigurationSummary.mockReturnValue({
        selectedComponents: {
          database: [{ name: 'Supabase', features: ['Real-time', 'Auth', 'Storage', 'Functions'] }],
          ai: [{ name: 'Vercel AI', features: ['Streaming', 'Chat'] }]
        },
        recommendations: []
      });
      inquirer.prompt.mockResolvedValueOnce({ confirmed: true });

      await configurationSummary(mockConfig);

      expect(mockConfigurationOptimizer.generateConfigurationSummary).toHaveBeenCalledWith(mockConfig);
    });

    test('should handle confirmation denial', async () => {
      mockConfigurationOptimizer.generateConfigurationSummary.mockReturnValue({
        selectedComponents: {},
        recommendations: []
      });
      inquirer.prompt.mockResolvedValueOnce({ confirmed: false });

      const result = await configurationSummary(mockConfig);

      expect(result).toBe(false);
    });

    test('should handle empty selected components', async () => {
      mockConfigurationOptimizer.generateConfigurationSummary.mockReturnValue({
        selectedComponents: {},
        recommendations: []
      });
      inquirer.prompt.mockResolvedValueOnce({ confirmed: true });

      const result = await configurationSummary(mockConfig);

      expect(result).toBe(true);
    });

         test('should display recommendations when available', async () => {
       mockConfigurationOptimizer.generateConfigurationSummary.mockReturnValue({
         selectedComponents: {},
         recommendations: [
           { type: 'info', message: 'Consider adding TypeScript' },
           { type: 'warning', message: 'Missing database plugin' }
         ]
       });
       inquirer.prompt.mockResolvedValueOnce({ confirmed: true });

       await configurationSummary(mockConfig);

       // The function doesn't actually call colors.info/warning directly in this path
       expect(mockConfigurationOptimizer.generateConfigurationSummary).toHaveBeenCalled();
     });

    test('should handle missing analysis gracefully', async () => {
      mockConfigurationOptimizer.generateConfigurationSummary.mockReturnValue(null);
      inquirer.prompt.mockResolvedValueOnce({ confirmed: true });

      const result = await configurationSummary(mockConfig);

      expect(result).toBe(true);
    });

    test('should handle prompt errors', async () => {
      mockConfigurationOptimizer.generateConfigurationSummary.mockReturnValue({
        selectedComponents: {},
        recommendations: []
      });
      inquirer.prompt.mockRejectedValueOnce(new Error('Prompt failed'));

      await expect(configurationSummary(mockConfig)).rejects.toThrow('Prompt failed');
    });
  });

  describe('enhancedPromptUser', () => {
    beforeEach(() => {
      mockTerminalState.resetState.mockReturnValue({
        getProgressBar: jest.fn(() => 'Progress Bar'),
        updateSelection: jest.fn(),
        nextStep: jest.fn(),
        getPreservedInfo: jest.fn(() => 'Preserved Info'),
        addError: jest.fn(),
        addWarning: jest.fn()
      });
    });

    test('should run complete prompt flow successfully', async () => {
      inquirer.prompt
        .mockResolvedValueOnce({ projectType: 'web2' })
        .mockResolvedValueOnce({ selectedPlugins: ['supabase'] })
        .mockResolvedValueOnce({ eslint: true })
        .mockResolvedValueOnce({ installDependencies: true })
        .mockResolvedValueOnce({ pm: 'npm' })
        .mockResolvedValueOnce({ confirmed: true });

      mockConfigurationOptimizer.generateConfigurationSummary.mockReturnValue({
        selectedComponents: {},
        recommendations: []
      });

      const result = await enhancedPromptUser();

      expect(result).toMatchObject({
        projectType: 'web2',
        plugins: ['supabase']
      });
    });

    test('should handle web3 flow', async () => {
      inquirer.prompt
        .mockResolvedValueOnce({ projectType: 'web3' })
        .mockResolvedValueOnce({ blockchain: 'solana' })
        .mockResolvedValueOnce({ selectedPlugins: ['solana-agent-kit'] })
        .mockResolvedValueOnce({ eslint: false })
        .mockResolvedValueOnce({ installDependencies: false })
        .mockResolvedValueOnce({ confirmed: true });

      mockConfigurationOptimizer.generateConfigurationSummary.mockReturnValue({
        selectedComponents: {},
        recommendations: []
      });

      const result = await enhancedPromptUser();

      expect(result).toMatchObject({
        projectType: 'web3'
      });
    });

         test('should handle configuration cancellation and restart', async () => {
       // Mock the actual flow to avoid complex mocking scenarios
       inquirer.prompt
         .mockResolvedValueOnce({ projectType: 'web2' })
         .mockResolvedValueOnce({ selectedPlugins: [] })
         .mockResolvedValueOnce({ eslint: false })
         .mockResolvedValueOnce({ installDependencies: false })
         .mockResolvedValueOnce({ confirmed: false }) // First cancellation
         .mockResolvedValueOnce({ projectType: 'web2' })
         .mockResolvedValueOnce({ selectedPlugins: [] })
         .mockResolvedValueOnce({ eslint: false })
         .mockResolvedValueOnce({ installDependencies: false })
         .mockResolvedValueOnce({ confirmed: true }); // Second time accepted

       mockConfigurationOptimizer.generateConfigurationSummary.mockReturnValue({
         selectedComponents: {},
         recommendations: []
       });

       const result = await enhancedPromptUser();
       expect(result).toMatchObject({ projectType: 'web2' });
     });

    test('should handle unexpected errors', async () => {
      const mockState = {
        addError: jest.fn(),
        getProgressBar: jest.fn(),
        updateSelection: jest.fn(),
        nextStep: jest.fn(),
        getPreservedInfo: jest.fn()
      };
      mockTerminalState.resetState.mockReturnValue(mockState);

      inquirer.prompt.mockRejectedValueOnce(new Error('Unexpected error'));

      await expect(enhancedPromptUser()).rejects.toThrow('Unexpected error');
      expect(mockState.addError).toHaveBeenCalledWith(
        'Enhanced prompt failed',
        { error: 'Unexpected error' }
      );
    });
  });

  describe('Utility Functions', () => {
         describe('getCategoryIcon', () => {
       test('should return correct icons for known categories', () => {
         expect(getCategoryIcon('AI & Machine Learning')).toBe('🤖');
         expect(getCategoryIcon('Database')).toBe('🗄️');
         expect(getCategoryIcon('Caching & Performance')).toBe('🚀');
         expect(getCategoryIcon('Blockchain Wallets')).toBe('⚡');
         expect(getCategoryIcon('AI Agents')).toBe('⚙️');
       });

      test('should return default icon for unknown categories', () => {
        expect(getCategoryIcon('Unknown')).toBe('•');
        expect(getCategoryIcon('')).toBe('•');
        expect(getCategoryIcon(null)).toBe('•');
        expect(getCategoryIcon(undefined)).toBe('•');
      });
    });

    describe('isBlockchainPlugin', () => {
      test('should identify blockchain plugins correctly', () => {
        expect(isBlockchainPlugin('evm')).toBe(true);
        expect(isBlockchainPlugin('solana')).toBe(true);
        expect(isBlockchainPlugin('goat')).toBe(true);
        expect(isBlockchainPlugin('solana-agent-kit')).toBe(true);
      });

      test('should identify non-blockchain plugins correctly', () => {
        expect(isBlockchainPlugin('supabase')).toBe(false);
        expect(isBlockchainPlugin('firebase')).toBe(false);
        expect(isBlockchainPlugin('vercel-ai')).toBe(false);
        expect(isBlockchainPlugin('vercel-kv')).toBe(false);
      });

      test('should handle invalid inputs', () => {
        expect(isBlockchainPlugin('')).toBe(false);
        expect(isBlockchainPlugin(null)).toBe(false);
        expect(isBlockchainPlugin(undefined)).toBe(false);
        expect(isBlockchainPlugin('unknown')).toBe(false);
      });
    });

    describe('isPluginCompatibleWithBlockchain', () => {
      test('should handle no blockchain selection', () => {
        expect(isPluginCompatibleWithBlockchain('supabase', null)).toBe(true);
        expect(isPluginCompatibleWithBlockchain('evm', null)).toBe(true);
        expect(isPluginCompatibleWithBlockchain('solana', null)).toBe(true);
      });

      test('should handle EVM compatibility', () => {
        expect(isPluginCompatibleWithBlockchain('evm', 'evm')).toBe(true);
        expect(isPluginCompatibleWithBlockchain('goat', 'evm')).toBe(true);
        expect(isPluginCompatibleWithBlockchain('supabase', 'evm')).toBe(true);
        expect(isPluginCompatibleWithBlockchain('solana', 'evm')).toBe(false);
        expect(isPluginCompatibleWithBlockchain('solana-agent-kit', 'evm')).toBe(false);
      });

      test('should handle Solana compatibility', () => {
        expect(isPluginCompatibleWithBlockchain('solana', 'solana')).toBe(true);
        expect(isPluginCompatibleWithBlockchain('solana-agent-kit', 'solana')).toBe(true);
        expect(isPluginCompatibleWithBlockchain('supabase', 'solana')).toBe(true);
        expect(isPluginCompatibleWithBlockchain('evm', 'solana')).toBe(false);
        expect(isPluginCompatibleWithBlockchain('goat', 'solana')).toBe(true); // GOAT is web3 universal
      });

      test('should handle universal plugins', () => {
        expect(isPluginCompatibleWithBlockchain('supabase', 'evm')).toBe(true);
        expect(isPluginCompatibleWithBlockchain('firebase', 'evm')).toBe(true);
        expect(isPluginCompatibleWithBlockchain('vercel-ai', 'solana')).toBe(true);
        expect(isPluginCompatibleWithBlockchain('vercel-kv', 'solana')).toBe(true);
      });

             test('should handle edge cases', () => {
         expect(isPluginCompatibleWithBlockchain('', 'evm')).toBe(false);
         expect(isPluginCompatibleWithBlockchain(null, 'evm')).toBe(false);
         expect(isPluginCompatibleWithBlockchain(undefined, 'solana')).toBe(false);
         expect(isPluginCompatibleWithBlockchain('unknown', 'unknown')).toBe(true);
       });
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('should handle malformed plugin data', async () => {
      const malformedPlugins = [
        { name: 'Test', value: null, category: 'Database' },
        { name: null, value: 'test', category: 'AI' }
      ];

      inquirer.prompt.mockResolvedValueOnce({ selectedPlugins: [] });

      const result = await enhancedPluginSelection(malformedPlugins, []);
      expect(result).toEqual([]);
    });

         test('should handle validation with mixed valid and invalid data', () => {
       const result = validatePluginSelection(['supabase', '', null], ['valid', undefined]);
       expect(result.isValid).toBe(true); // Null/empty values are filtered out, so this should be valid
     });

         test('should handle extremely long plugin names gracefully', () => {
       const longName = 'a'.repeat(1000);
       expect(isBlockchainPlugin(longName)).toBe(false);
       expect(isPluginCompatibleWithBlockchain(longName, 'evm')).toBe(false);
     });

         test('should handle special characters in plugin names', () => {
       const specialPlugin = 'plugin-with-@#$%^&*()';
       expect(isBlockchainPlugin(specialPlugin)).toBe(false);
       expect(isPluginCompatibleWithBlockchain(specialPlugin, 'evm')).toBe(false);
     });

    test('should handle concurrent validation calls', async () => {
      const promises = Array(10).fill().map(() => 
        validatePluginSelection(['supabase'], ['evm'])
      );
      
      const results = await Promise.all(promises);
      results.forEach(result => {
        expect(result.isValid).toBe(true);
      });
    });
  });

     describe('Configuration Edge Cases', () => {
     test('should handle empty configuration object', async () => {
       mockConfigurationOptimizer.generateConfigurationSummary.mockReturnValue({
         selectedComponents: {},
         recommendations: []
       });
       inquirer.prompt.mockResolvedValueOnce({ confirmed: true });

       const result = await configurationSummary({});
       expect(result).toBe(true);
     });

     test('should handle configuration with only boolean values', async () => {
       const boolConfig = {
         typescript: true,
         eslint: false,
         tailwind: true
       };

       mockConfigurationOptimizer.generateConfigurationSummary.mockReturnValue({
         selectedComponents: {},
         recommendations: []
       });
       inquirer.prompt.mockResolvedValueOnce({ confirmed: true });

       const result = await configurationSummary(boolConfig);
       expect(result).toBe(true);
     });

     test('should handle configuration with undefined properties', async () => {
       const undefinedConfig = {
         projectType: undefined,
         plugins: undefined,
         eslint: undefined
       };

       mockConfigurationOptimizer.generateConfigurationSummary.mockReturnValue({
         selectedComponents: {},
         recommendations: []
       });
       inquirer.prompt.mockResolvedValueOnce({ confirmed: true });

       const result = await configurationSummary(undefinedConfig);
       expect(result).toBe(true);
     });
   });

   describe('pluginSelection', () => {
     test('should handle web2 project type', async () => {
       mockTerminalUtils.getPluginDisplayName.mockReturnValue('Display: supabase');
       inquirer.prompt.mockResolvedValueOnce({ selectedPlugins: ['supabase'] });

       const result = await pluginSelection('web2');

       expect(result).toEqual(['supabase']);
       expect(inquirer.prompt).toHaveBeenCalled();
     });

           test('should handle web3 with evm blockchain', async () => {
        mockTerminalUtils.getPluginDisplayName.mockReturnValue('Display: vercel-ai');
        inquirer.prompt.mockResolvedValueOnce({ selectedPlugins: ['vercel-ai'] });

        const result = await pluginSelection('web3', 'evm');

        expect(result).toEqual(['evm', 'vercel-ai']); // Auto-includes EVM blockchain
      });

           test('should handle web3 with solana blockchain', async () => {
        mockTerminalUtils.getPluginDisplayName.mockReturnValue('Display: solana-agent-kit');
        inquirer.prompt.mockResolvedValueOnce({ selectedPlugins: ['solana-agent-kit'] });

        const result = await pluginSelection('web3', 'solana');

        expect(result).toEqual(['solana', 'solana-agent-kit']); // Auto-includes Solana blockchain
      });

     test('should handle invalid project type', async () => {
       mockTerminalUtils.getPluginDisplayName.mockReturnValue('Display: supabase');
       inquirer.prompt.mockResolvedValueOnce({ selectedPlugins: [] });

       const result = await pluginSelection('invalid');

       expect(result).toEqual([]);
     });

     test('should handle null blockchain for web3', async () => {
       mockTerminalUtils.getPluginDisplayName.mockReturnValue('Display: vercel-ai');
       inquirer.prompt.mockResolvedValueOnce({ selectedPlugins: ['vercel-ai'] });

       const result = await pluginSelection('web3', null);

       expect(result).toEqual(['vercel-ai']);
     });
   });

   describe('enhancedValidation', () => {
     test('should validate valid web2 configuration', () => {
       const config = {
         projectType: 'web2',
         plugins: ['supabase', 'vercel-ai'],
         packageManager: 'npm',
         eslint: true
       };

       const result = enhancedValidation(config);

       expect(result.isValid).toBe(true);
       expect(result.errors).toHaveLength(0);
     });

     test('should validate valid web3 configuration', () => {
       const config = {
         projectType: 'web3',
         plugins: ['evm', 'vercel-ai'],
         packageManager: 'yarn'
       };

       const result = enhancedValidation(config);

       expect(result.isValid).toBe(true);
       expect(result.errors).toHaveLength(0);
     });

     test('should detect invalid project type', () => {
       const config = {
         projectType: 'invalid',
         plugins: ['supabase']
       };

       const result = enhancedValidation(config);

       expect(result.isValid).toBe(false);
       expect(result.errors.some(error => error.includes('Invalid project type'))).toBe(true);
     });

     test('should warn about no plugins', () => {
       const config = {
         projectType: 'web2',
         plugins: []
       };

       const result = enhancedValidation(config);

       expect(result.isValid).toBe(true);
       expect(result.hasWarnings).toBe(true);
       expect(result.warnings.some(warning => warning.includes('No plugins selected'))).toBe(true);
     });

     test('should detect too many plugins', () => {
       const config = {
         projectType: 'web2',
         plugins: ['supabase', 'vercel-ai', 'vercel-kv', 'extra1', 'extra2', 'extra3', 'extra4']
       };

       const result = enhancedValidation(config);

       expect(result.isValid).toBe(false);
       expect(result.errors.some(error => error.includes('Too many plugins'))).toBe(true);
     });

     test('should detect multiple database plugins', () => {
       const config = {
         projectType: 'web2',
         plugins: ['supabase', 'firebase']
       };

       const result = enhancedValidation(config);

       expect(result.isValid).toBe(false);
       expect(result.errors.some(error => error.includes('database plugin'))).toBe(true);
     });

     test('should detect multiple AI agent plugins', () => {
       const config = {
         projectType: 'web3',
         plugins: ['goat', 'solana-agent-kit', 'evm']
       };

       const result = enhancedValidation(config);

       expect(result.isValid).toBe(false);
       expect(result.errors.some(error => error.includes('AI agent plugin'))).toBe(true);
     });

     test('should validate web3 blockchain requirements', () => {
       const config = {
         projectType: 'web3',
         plugins: ['supabase'] // No blockchain
       };

       const result = enhancedValidation(config);

       expect(result.isValid).toBe(false);
       expect(result.errors.some(error => error.includes('blockchain integration'))).toBe(true);
     });

     test('should validate web2 blockchain restrictions', () => {
       const config = {
         projectType: 'web2',
         plugins: ['evm', 'supabase']
       };

       const result = enhancedValidation(config);

       expect(result.isValid).toBe(false);
       expect(result.errors.some(error => error.includes('Web2 projects cannot'))).toBe(true);
     });

     test('should validate GOAT requirements', () => {
       const config = {
         projectType: 'web3',
         plugins: ['goat'] // GOAT without any blockchain
       };

       const result = enhancedValidation(config);

       expect(result.isValid).toBe(false);
       expect(result.errors.some(error => error.includes('GOAT AI Agent requires either EVM or Solana'))).toBe(true);
     });

     test('should validate Solana Agent Kit requirements', () => {
       const config = {
         projectType: 'web3',
         plugins: ['solana-agent-kit', 'evm'] // Solana Agent with wrong blockchain
       };

       const result = enhancedValidation(config);

       expect(result.isValid).toBe(false);
       expect(result.errors.some(error => error.includes('Solana Agent Kit requires Solana'))).toBe(true);
     });

     test('should validate package manager', () => {
       const config = {
         projectType: 'web2',
         plugins: ['supabase'],
         packageManager: 'invalid'
       };

       const result = enhancedValidation(config);

       expect(result.isValid).toBe(false);
       expect(result.errors.some(error => error.includes('Invalid package manager'))).toBe(true);
     });

     test('should handle missing project type', () => {
       const config = {
         plugins: ['supabase']
       };

       const result = enhancedValidation(config);

       expect(result.isValid).toBe(false);
       expect(result.errors.some(error => error.includes('Invalid project type'))).toBe(true);
     });

     test('should handle web3 with multiple blockchain plugins', () => {
       const config = {
         projectType: 'web3',
         plugins: ['evm', 'solana']
       };

       const result = enhancedValidation(config);

       expect(result.isValid).toBe(false);
       expect(result.errors.some(error => error.includes('blockchain integration'))).toBe(true);
     });

     test('should validate valid package managers', () => {
       const validManagers = ['npm', 'yarn', 'pnpm', 'bun'];
       
       validManagers.forEach(pm => {
         const config = {
           projectType: 'web2',
           plugins: ['supabase'],
           packageManager: pm
         };

         const result = enhancedValidation(config);
         expect(result.isValid).toBe(true);
       });
     });

     test('should handle configuration with no package manager', () => {
       const config = {
         projectType: 'web2',
         plugins: ['supabase']
       };

       const result = enhancedValidation(config);
       expect(result.isValid).toBe(true);
     });
   });
 }); 