const fs = require("fs-extra");
const path = require('path');

// Import modules to test
const {
  validatePluginCombination,
  getValidCombinations
} = require('../../lib/templateDiscovery');

describe('Coverage Enhancement Tests', () => {
  let tempDir;

  beforeEach(async () => {
    tempDir = path.join(__dirname, `temp-coverage-${Date.now()}`);
    await fs.ensureDir(tempDir);
  });

  afterEach(async () => {
    if (tempDir && await fs.pathExists(tempDir)) {
      await fs.remove(tempDir);
    }
  });

  describe('Template Discovery Coverage', () => {
    describe('validatePluginCombination', () => {
      test('should validate empty plugin array', () => {
        const result = validatePluginCombination([]);
        expect(result.valid).toBe(false);
        expect(result.message).toContain('At least 1 plugin is required');
      });

      test('should validate too many plugins', () => {
        const result = validatePluginCombination(['supabase', 'firebase', 'vercel-ai', 'vercel-kv', 'evm', 'solana', 'privy']);
        expect(result.valid).toBe(false);
        expect(result.message).toContain('Maximum 6 plugins allowed');
      });

      test('should validate invalid plugin names', () => {
        const result = validatePluginCombination(['invalid-plugin', 'another-invalid']);
        expect(result.valid).toBe(false);
        expect(result.message).toContain('Invalid plugins');
      });

      test('should validate multiple databases', () => {
        const result = validatePluginCombination(['supabase', 'firebase']);
        expect(result.valid).toBe(false);
        expect(result.message).toContain('You can only select one database');
      });

      test('should validate multiple blockchains for web3', () => {
        const result = validatePluginCombination(['evm', 'solana'], 'web3');
        expect(result.valid).toBe(false);
        expect(result.message).toContain('You can only select one blockchain');
      });

      test('should validate blockchains for web2', () => {
        const result = validatePluginCombination(['evm'], 'web2');
        expect(result.valid).toBe(false);
        expect(result.message).toContain('Blockchain/agent plugins (evm/solana/sui/goat/solana-agent-kit) are only available for Web3 projects');
      });

      test('should validate valid combinations', () => {
        expect(validatePluginCombination(['supabase']).valid).toBe(true);
        expect(validatePluginCombination(['supabase', 'vercel-ai']).valid).toBe(true);
        expect(validatePluginCombination(['evm'], 'web3').valid).toBe(true);
        expect(validatePluginCombination(['supabase', 'evm'], 'web3').valid).toBe(true);
      });

      test('should handle non-array input', () => {
        const result = validatePluginCombination('not-an-array');
        expect(result.valid).toBe(false);
        expect(result.message).toContain('Plugins must be an array');
      });
    });

    describe('getValidCombinations', () => {
      test('should return valid combinations structure', () => {
        const combinations = getValidCombinations();
        
        expect(combinations).toHaveProperty('individual');
        expect(combinations).toHaveProperty('web2');
        expect(combinations).toHaveProperty('web3');
        
        expect(Array.isArray(combinations.individual)).toBe(true);
        expect(Array.isArray(combinations.web2)).toBe(true);
        expect(Array.isArray(combinations.web3)).toBe(true);
        
        // Verify individual combinations
        expect(combinations.individual).toContainEqual(['supabase']);
        expect(combinations.individual).toContainEqual(['firebase']);
        expect(combinations.individual).toContainEqual(['vercel-ai']);
        expect(combinations.individual).toContainEqual(['evm']);
        expect(combinations.individual).toContainEqual(['solana']);
      });
    });
  });
});
