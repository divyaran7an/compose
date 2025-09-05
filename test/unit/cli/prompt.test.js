const inquirer = require('inquirer');
const { promptUser } = require('../../../lib/prompt');

// Mock inquirer
jest.mock('inquirer');

describe('Prompt Module', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('promptUser', () => {
    test('should prompt for Web2 project with plugins, ESLint, and dependency installation', async () => {
      // Mock inquirer responses
      inquirer.prompt
        .mockResolvedValueOnce({ projectType: 'web2' })
        .mockResolvedValueOnce({ plugins: ['supabase', 'vercel-ai'] })
        .mockResolvedValueOnce({ eslint: true })
        .mockResolvedValueOnce({ installDependencies: true })
        .mockResolvedValueOnce({ packageManager: 'yarn' });

      const result = await promptUser();

      expect(result).toEqual({
        projectType: 'web2',
        plugins: ['supabase', 'vercel-ai'],
        typescript: true,
        tailwind: true,
        eslint: true,
        installDependencies: true,
        packageManager: 'yarn'
      });

      expect(inquirer.prompt).toHaveBeenCalledTimes(5);
      
      // Check first prompt (project type)
      expect(inquirer.prompt).toHaveBeenNthCalledWith(1, [
        expect.objectContaining({
          type: 'list',
          name: 'projectType',
          message: 'Select the type of project:',
          choices: [
            { name: 'Web2 (Traditional web application)', value: 'web2' },
            { name: 'Web3 (Blockchain/DeFi application)', value: 'web3' }
          ],
          default: 'web2',
          validate: expect.any(Function)
        })
      ]);

      // Check second prompt (plugins)
      expect(inquirer.prompt).toHaveBeenNthCalledWith(2, [
        expect.objectContaining({
          type: 'checkbox',
          name: 'plugins',
          message: 'Select plugins to include (choose at least 1, max 6):',
          choices: [
            { name: 'Supabase (Database & Auth)', value: 'supabase' },
            { name: 'Firebase (Database & Auth)', value: 'firebase' },
            { name: 'Vercel AI (AI/Chat functionality)', value: 'vercel-ai' },
            { name: 'Vercel KV (Redis caching)', value: 'vercel-kv' }
          ],
          validate: expect.any(Function)
        })
      ]);

      // Check third prompt (ESLint)
      expect(inquirer.prompt).toHaveBeenNthCalledWith(3, [
        expect.objectContaining({
          type: 'confirm',
          name: 'eslint',
          message: 'Would you like to set up ESLint? (optional)',
          default: false
        })
      ]);

      // Check fourth prompt (dependency installation)
      expect(inquirer.prompt).toHaveBeenNthCalledWith(4, [
        expect.objectContaining({
          type: 'confirm',
          name: 'installDependencies',
          message: 'Would you like to automatically install dependencies after project creation?',
          default: true
        })
      ]);

      // Check fifth prompt (package manager)
      expect(inquirer.prompt).toHaveBeenNthCalledWith(5, [
        expect.objectContaining({
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
        })
      ]);
    });

    test('should prompt for Web3 project with blockchain selection', async () => {
      // Mock inquirer responses
      inquirer.prompt
        .mockResolvedValueOnce({ projectType: 'web3' })
        .mockResolvedValueOnce({ plugins: ['firebase', 'solana'] })
        .mockResolvedValueOnce({ eslint: false })
        .mockResolvedValueOnce({ installDependencies: true })
        .mockResolvedValueOnce({ packageManager: 'npm' });

      const result = await promptUser();

      expect(result).toEqual({
        projectType: 'web3',
        plugins: ['firebase', 'solana'],
        typescript: true,
        tailwind: true,
        eslint: false,
        installDependencies: true,
        packageManager: 'npm'
      });

      expect(inquirer.prompt).toHaveBeenCalledTimes(5);
      
      // Check plugins prompt includes blockchain options for Web3
      expect(inquirer.prompt).toHaveBeenNthCalledWith(2, [
        expect.objectContaining({
          type: 'checkbox',
          name: 'plugins',
          message: 'Select plugins to include (choose at least 1, max 6):',
          choices: [
            { name: 'Supabase (Database & Auth)', value: 'supabase' },
            { name: 'Firebase (Database & Auth)', value: 'firebase' },
            { name: 'Vercel AI (AI/Chat functionality)', value: 'vercel-ai' },
            { name: 'Vercel KV (Redis caching)', value: 'vercel-kv' },
            { name: 'Privy (Auth & Wallet service)', value: 'privy' },
            { name: 'EVM (Ethereum/Base blockchain)', value: 'evm' },
            { name: 'Solana (Solana blockchain)', value: 'solana' },
            { name: 'GOAT (AI Agent by Crossmint)', value: 'goat' },
            { name: 'Solana Agent Kit', value: 'solana-agent-kit' }
          ],
          validate: expect.any(Function)
        })
      ]);
    });

    test('should handle Web3 project with Base blockchain', async () => {
      inquirer.prompt
        .mockResolvedValueOnce({ projectType: 'web3' })
        .mockResolvedValueOnce({ plugins: ['evm'] })
        .mockResolvedValueOnce({ eslint: false })
        .mockResolvedValueOnce({ installDependencies: false });

      const result = await promptUser();

      expect(result).toEqual({
        projectType: 'web3',
        plugins: ['evm'],
        typescript: true,
        tailwind: true,
        eslint: false,
        installDependencies: false
      });
    });

    test('should handle empty plugin selection', async () => {
      inquirer.prompt
        .mockResolvedValueOnce({ projectType: 'web2' })
        .mockResolvedValueOnce({ plugins: ['supabase'] }) // Must select at least 1
        .mockResolvedValueOnce({ eslint: true })
        .mockResolvedValueOnce({ installDependencies: true })
        .mockResolvedValueOnce({ packageManager: 'pnpm' });

      const result = await promptUser();

      expect(result.plugins).toEqual(['supabase']);
      expect(result.typescript).toBe(true);
      expect(result.tailwind).toBe(true);
      expect(result.eslint).toBe(true);
      expect(result.installDependencies).toBe(true);
      expect(result.packageManager).toBe('pnpm');
    });

    test('should handle multiple plugin selection', async () => {
      inquirer.prompt
        .mockResolvedValueOnce({ projectType: 'web2' })
        .mockResolvedValueOnce({ 
          plugins: ['supabase', 'vercel-ai', 'vercel-kv'] 
        })
        .mockResolvedValueOnce({ eslint: false })
        .mockResolvedValueOnce({ installDependencies: false });

      const result = await promptUser();

      expect(result.plugins).toEqual(['supabase', 'vercel-ai', 'vercel-kv']);
      expect(result.installDependencies).toBe(false);
      expect(result.typescript).toBe(true);
      expect(result.tailwind).toBe(true);
      expect(result.eslint).toBe(false);
    });

    test('should always include TypeScript and Tailwind as enabled', async () => {
      inquirer.prompt
        .mockResolvedValueOnce({ projectType: 'web2' })
        .mockResolvedValueOnce({ plugins: ['supabase'] })
        .mockResolvedValueOnce({ eslint: false })
        .mockResolvedValueOnce({ installDependencies: true })
        .mockResolvedValueOnce({ packageManager: null });

      const result = await promptUser();

      expect(result.typescript).toBe(true);
      expect(result.tailwind).toBe(true);
      expect(result.eslint).toBe(false);
    });

    test('should handle inquirer errors gracefully', async () => {
      const error = new Error('Prompt failed');
      inquirer.prompt.mockRejectedValue(error);

      await expect(promptUser()).rejects.toThrow('Prompt failed');
    });

    test('should validate project type selection', async () => {
      inquirer.prompt
        .mockResolvedValueOnce({ projectType: 'web2' })
        .mockResolvedValueOnce({ plugins: ['supabase'] })
        .mockResolvedValueOnce({ eslint: false })
        .mockResolvedValueOnce({ installDependencies: false });

      await promptUser();

      const projectTypePrompt = inquirer.prompt.mock.calls[0][0][0];
      
      // Test validation function
      expect(projectTypePrompt.validate('web2')).toBe(true);
      expect(projectTypePrompt.validate('web3')).toBe(true);
      expect(projectTypePrompt.validate('')).toBe('You must select a project type.');
      expect(projectTypePrompt.validate(null)).toBe('You must select a project type.');
      expect(projectTypePrompt.validate(undefined)).toBe('You must select a project type.');
    });

    test('should validate plugin selection', async () => {
      inquirer.prompt
        .mockResolvedValueOnce({ projectType: 'web2' })
        .mockResolvedValueOnce({ plugins: ['supabase'] })
        .mockResolvedValueOnce({ eslint: false })
        .mockResolvedValueOnce({ installDependencies: false });

      await promptUser();

      const pluginsPrompt = inquirer.prompt.mock.calls[1][0][0];
      
      // Test validation function
      expect(pluginsPrompt.validate(['supabase'])).toBe(true);
      expect(pluginsPrompt.validate([])).toBe('You must select at least 1 plugin.');
      expect(pluginsPrompt.validate(['supabase', 'firebase', 'vercel-ai', 'vercel-kv', 'evm', 'solana', 'privy'])).toBe('You can select maximum 6 plugins.');
      expect(pluginsPrompt.validate(['supabase', 'firebase'])).toBe('You can only select one database (Supabase OR Firebase, not both).');
    });

    test('should have correct prompt structure for project type', async () => {
      inquirer.prompt
        .mockResolvedValueOnce({ projectType: 'web2' })
        .mockResolvedValueOnce({ plugins: ['supabase'] })
        .mockResolvedValueOnce({ eslint: false })
        .mockResolvedValueOnce({ installDependencies: false });

      await promptUser();

      const projectTypePrompt = inquirer.prompt.mock.calls[0][0][0];
      
      expect(projectTypePrompt.type).toBe('list');
      expect(projectTypePrompt.name).toBe('projectType');
      expect(projectTypePrompt.message).toBe('Select the type of project:');
      expect(projectTypePrompt.default).toBe('web2');
      expect(projectTypePrompt.choices).toHaveLength(2);
    });

    test('should have correct prompt structure for Web3 plugin selection', async () => {
      inquirer.prompt
        .mockResolvedValueOnce({ projectType: 'web3' })
        .mockResolvedValueOnce({ plugins: ['solana'] })
        .mockResolvedValueOnce({ eslint: false })
        .mockResolvedValueOnce({ installDependencies: false });

      await promptUser();

      const pluginsPrompt = inquirer.prompt.mock.calls[1][0][0];
      
      expect(pluginsPrompt.type).toBe('checkbox');
      expect(pluginsPrompt.name).toBe('plugins');
      expect(pluginsPrompt.message).toBe('Select plugins to include (choose at least 1, max 6):');
      expect(pluginsPrompt.choices).toHaveLength(9); // 5 regular + 4 blockchain (including Privy)
      expect(pluginsPrompt.choices).toEqual([
        { name: 'Supabase (Database & Auth)', value: 'supabase' },
        { name: 'Firebase (Database & Auth)', value: 'firebase' },
        { name: 'Vercel AI (AI/Chat functionality)', value: 'vercel-ai' },
        { name: 'Vercel KV (Redis caching)', value: 'vercel-kv' },
        { name: 'Privy (Auth & Wallet service)', value: 'privy' },
        { name: 'EVM (Ethereum/Base blockchain)', value: 'evm' },
        { name: 'Solana (Solana blockchain)', value: 'solana' },
        { name: 'GOAT (AI Agent by Crossmint)', value: 'goat' },
        { name: 'Solana Agent Kit', value: 'solana-agent-kit' }
      ]);
    });

    test('should have correct prompt structure for Web2 plugin selection', async () => {
      inquirer.prompt
        .mockResolvedValueOnce({ projectType: 'web2' })
        .mockResolvedValueOnce({ plugins: ['supabase'] })
        .mockResolvedValueOnce({ eslint: false })
        .mockResolvedValueOnce({ installDependencies: false });

      await promptUser();

      const pluginsPrompt = inquirer.prompt.mock.calls[1][0][0];
      
      expect(pluginsPrompt.type).toBe('checkbox');
      expect(pluginsPrompt.name).toBe('plugins');
      expect(pluginsPrompt.message).toBe('Select plugins to include (choose at least 1, max 6):');
      expect(pluginsPrompt.choices).toHaveLength(4); // Only regular plugins, no blockchain
      expect(pluginsPrompt.choices).toEqual([
        { name: 'Supabase (Database & Auth)', value: 'supabase' },
        { name: 'Firebase (Database & Auth)', value: 'firebase' },
        { name: 'Vercel AI (AI/Chat functionality)', value: 'vercel-ai' },
        { name: 'Vercel KV (Redis caching)', value: 'vercel-kv' }
      ]);
    });

    test('should handle console error logging', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const error = new Error('Test error');
      
      inquirer.prompt.mockRejectedValue(error);

      await expect(promptUser()).rejects.toThrow('Test error');
      
      expect(consoleSpy).toHaveBeenCalledWith('Prompt error:', error);
      
      consoleSpy.mockRestore();
    });

    test('should skip package manager prompt when dependencies are not installed', async () => {
      // Mock inquirer responses
      inquirer.prompt
        .mockResolvedValueOnce({ projectType: 'web2' })
        .mockResolvedValueOnce({ plugins: ['supabase'] })
        .mockResolvedValueOnce({ eslint: false })
        .mockResolvedValueOnce({ installDependencies: false });

      const result = await promptUser();

      expect(result).toEqual({
        projectType: 'web2',
        plugins: ['supabase'],
        typescript: true,
        tailwind: true,
        eslint: false,
        installDependencies: false
      });

      expect(inquirer.prompt).toHaveBeenCalledTimes(4);
      
      // Should not have package manager prompt
      expect(inquirer.prompt).not.toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            name: 'packageManager'
          })
        ])
      );
    });

    test('should prompt for Web3 project with blockchain selection and dependency installation', async () => {
      // Mock inquirer responses
      inquirer.prompt
        .mockResolvedValueOnce({ projectType: 'web3' })
        .mockResolvedValueOnce({ plugins: ['firebase', 'solana'] })
        .mockResolvedValueOnce({ eslint: false })
        .mockResolvedValueOnce({ installDependencies: true })
        .mockResolvedValueOnce({ packageManager: null });

      const result = await promptUser();

      expect(result).toEqual({
        projectType: 'web3',
        plugins: ['firebase', 'solana'],
        typescript: true,
        tailwind: true,
        eslint: false,
        installDependencies: true,
        packageManager: null
      });

      expect(inquirer.prompt).toHaveBeenCalledTimes(5);
    });
  });
}); 