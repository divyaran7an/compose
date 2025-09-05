const TemplateManager = require('../../../lib/TemplateManager');
const { listTemplates } = require('../../../lib/templateDiscovery');
const { validateAllTemplates } = require('../../../lib/templateValidator');

// Mock dependencies
jest.mock('../../../lib/templateDiscovery');
jest.mock('../../../lib/templateValidator');

describe('TemplateManager', () => {
  beforeEach(() => {
    // Reset the singleton instance state
    TemplateManager.invalidateCache();
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    test('should initialize with discovered templates', async () => {
      const mockTemplates = [
        {
          sdk: 'supabase',
          template: 'default',
          config: { name: 'supabase', visible: true }
        },
        {
          sdk: 'vercel-ai',
          template: 'default',
          config: { name: 'Vercel AI Basic', visible: true }
        }
      ];

      listTemplates.mockReturnValue(mockTemplates);

      await TemplateManager.initialize();

      expect(listTemplates).toHaveBeenCalledWith({ showHidden: true });
      expect(TemplateManager._initialized).toBe(true);
    });

    test('should handle initialization errors gracefully', async () => {
      listTemplates.mockImplementation(() => {
        throw new Error('Discovery failed');
      });

      await expect(TemplateManager.initialize()).rejects.toThrow('Discovery failed');
    });
  });

  describe('listTemplates', () => {
    beforeEach(async () => {
      const mockTemplates = [
        {
          sdk: 'supabase',
          template: 'default',
          config: { name: 'supabase', visible: true }
        },
        {
          sdk: 'vercel-ai',
          template: 'default',
          config: { name: 'Vercel AI Basic', visible: false }
        },
        {
          sdk: 'evm',
          template: 'default',
          config: { name: 'EVM Basic', visible: true }
        }
      ];

      const mockValidationResults = [
        { sdk: 'supabase', template: 'default', valid: true },
        { sdk: 'vercel-ai', template: 'default', valid: true },
        { sdk: 'evm', template: 'default', valid: false }
      ];

      listTemplates.mockReturnValue(mockTemplates);
      validateAllTemplates.mockResolvedValue({ results: mockValidationResults });
    });

    test('should return all valid visible templates by default', async () => {
      const templates = await TemplateManager.listTemplates();

      expect(templates).toHaveLength(1); // Only supabase (visible and valid)
      expect(templates[0].sdk).toBe('supabase');
    });

    test('should include hidden templates when showHidden is true', async () => {
      const templates = await TemplateManager.listTemplates({ showHidden: true });

      expect(templates).toHaveLength(2); // supabase and vercel-ai (both valid)
      expect(templates.map(t => t.sdk)).toContain('vercel-ai');
    });

    test('should include invalid templates when onlyValid is false', async () => {
      const templates = await TemplateManager.listTemplates({ 
        showHidden: true, 
        onlyValid: false 
      });

      expect(templates).toHaveLength(3); // All templates
      expect(templates.map(t => t.sdk)).toContain('evm');
    });

    test('should auto-initialize if not initialized', async () => {
      expect(TemplateManager._initialized).toBe(false);
      
      await TemplateManager.listTemplates();
      
      expect(TemplateManager._initialized).toBe(true);
      expect(listTemplates).toHaveBeenCalled();
    });
  });

  describe('getTemplatesBySDK', () => {
    beforeEach(async () => {
      const mockTemplates = [
        {
          sdk: 'supabase',
          template: 'default',
          config: { name: 'supabase', visible: true }
        },
        {
          sdk: 'supabase',
          template: 'advanced',
          config: { name: 'supabase-advanced', visible: true }
        },
        {
          sdk: 'vercel-ai',
          template: 'default',
          config: { name: 'Vercel AI Basic', visible: true }
        }
      ];

      const mockValidationResults = mockTemplates.map(t => ({
        sdk: t.sdk,
        template: t.template,
        valid: true
      }));

      listTemplates.mockReturnValue(mockTemplates);
      validateAllTemplates.mockResolvedValue({ results: mockValidationResults });
    });

    test('should return templates for specific SDK', async () => {
      const templates = await TemplateManager.getTemplatesBySDK('supabase');

      expect(templates).toHaveLength(2);
      expect(templates.every(t => t.sdk === 'supabase')).toBe(true);
    });

    test('should return empty array for non-existent SDK', async () => {
      const templates = await TemplateManager.getTemplatesBySDK('non-existent');

      expect(templates).toHaveLength(0);
    });

    test('should pass options to listTemplates', async () => {
      const spy = jest.spyOn(TemplateManager, 'listTemplates');
      
      await TemplateManager.getTemplatesBySDK('supabase', { showHidden: true });

      expect(spy).toHaveBeenCalledWith({ showHidden: true });
    });
  });

  describe('findTemplate', () => {
    beforeEach(async () => {
      const mockTemplates = [
        {
          sdk: 'supabase',
          template: 'default',
          config: { name: 'supabase', visible: true }
        },
        {
          sdk: 'vercel-ai',
          template: 'default',
          config: { name: 'Vercel AI Basic', visible: true }
        }
      ];

      const mockValidationResults = mockTemplates.map(t => ({
        sdk: t.sdk,
        template: t.template,
        valid: true
      }));

      listTemplates.mockReturnValue(mockTemplates);
      validateAllTemplates.mockResolvedValue({ results: mockValidationResults });
    });

    test('should find specific template by SDK and template name', async () => {
      const template = await TemplateManager.findTemplate('supabase', 'default');

      expect(template).toBeDefined();
      expect(template.sdk).toBe('supabase');
      expect(template.template).toBe('default');
    });

    test('should return undefined for non-existent template', async () => {
      const template = await TemplateManager.findTemplate('non-existent', 'default');

      expect(template).toBeUndefined();
    });

    test('should pass options to listTemplates', async () => {
      const spy = jest.spyOn(TemplateManager, 'listTemplates');
      
      await TemplateManager.findTemplate('supabase', 'default', { showHidden: true });

      expect(spy).toHaveBeenCalledWith({ showHidden: true });
    });
  });

  describe('validation methods', () => {
    beforeEach(async () => {
      const mockValidationResults = [
        { sdk: 'supabase', template: 'default', valid: true, errors: null },
        { sdk: 'vercel-ai', template: 'default', valid: false, errors: ['Invalid config'] }
      ];

      validateAllTemplates.mockResolvedValue({ results: mockValidationResults });
      listTemplates.mockReturnValue([]);
    });

    test('validateAll should return JSON results when json=true', async () => {
      const results = await TemplateManager.validateAll({ json: true });

      expect(results).toHaveLength(2);
      expect(results[0].valid).toBe(true);
      expect(results[1].valid).toBe(false);
    });

    test('validateAll should call pretty print when json=false', async () => {
      await TemplateManager.validateAll({ json: false });

      expect(validateAllTemplates).toHaveBeenCalledWith({ json: false });
    });

    test('getValidationReport should return JSON when json=true', async () => {
      const results = await TemplateManager.getValidationReport({ json: true });

      expect(results).toHaveLength(2);
      expect(results[0].valid).toBe(true);
    });

    test('getValidationReport should print summary when json=false', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const results = await TemplateManager.getValidationReport({ json: false });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Template Validation Summary:')
      );
      expect(results).toHaveLength(2);

      consoleSpy.mockRestore();
    });
  });

  describe('getUsableTemplates', () => {
    test('should return only visible and valid templates', async () => {
      const spy = jest.spyOn(TemplateManager, 'listTemplates').mockResolvedValue([]);

      await TemplateManager.getUsableTemplates();

      expect(spy).toHaveBeenCalledWith({ showHidden: false, onlyValid: true });
    });
  });

  describe('cache management', () => {
    test('invalidateCache should reset all cached data', () => {
      TemplateManager._discovered = ['cached'];
      TemplateManager._validationResults = ['cached'];
      TemplateManager._errors = ['cached'];
      TemplateManager._initialized = true;

      TemplateManager.invalidateCache();

      expect(TemplateManager._discovered).toBeNull();
      expect(TemplateManager._validationResults).toBeNull();
      expect(TemplateManager._errors).toEqual([]);
      expect(TemplateManager._initialized).toBe(false);
    });

    test('getErrors should return current errors', () => {
      TemplateManager._errors = ['error1', 'error2'];

      const errors = TemplateManager.getErrors();

      expect(errors).toEqual(['error1', 'error2']);
    });
  });

});