const TemplateManager = require('../../../lib/TemplateManager');
const { listTemplates } = require('../../../lib/templateDiscovery');
const { validateAllTemplates } = require('../../../lib/templateValidator');

// Mock dependencies
jest.mock('../../../lib/templateDiscovery');
jest.mock('../../../lib/templateValidator');

describe('TemplateManager Validation Caching', () => {
  beforeEach(() => {
    // Reset the singleton instance state
    TemplateManager.invalidateCache();
    jest.clearAllMocks();
  });

  test('should cache validation results', async () => {
    const mockTemplates = [
      { sdk: 'supabase', template: 'default', config: { visible: true } }
    ];
    const mockValidationResults = [
      { sdk: 'supabase', template: 'default', valid: true }
    ];

    listTemplates.mockReturnValue(mockTemplates);
    validateAllTemplates.mockResolvedValue({ results: mockValidationResults });

    // First call - this will trigger validation
    const result1 = await TemplateManager.listTemplates();
    
    // Verify that validation was called
    expect(validateAllTemplates).toHaveBeenCalledTimes(1);
    expect(validateAllTemplates).toHaveBeenCalledWith({ json: true });
    
    // Second call - this should use cached results
    const result2 = await TemplateManager.listTemplates();

    // Should still only be called once due to caching
    expect(validateAllTemplates).toHaveBeenCalledTimes(1);
    expect(result1).toEqual(result2);
  });

  test('should filter errors correctly', async () => {
    const mockTemplates = [
      { sdk: 'supabase', template: 'default', config: { visible: true } },
      { sdk: 'vercel-ai', template: 'default', config: { visible: true } }
    ];
    const mockValidationResults = [
      { sdk: 'supabase', template: 'default', valid: true },
      { sdk: 'vercel-ai', template: 'default', valid: false, errors: ['Invalid'] }
    ];

    listTemplates.mockReturnValue(mockTemplates);
    validateAllTemplates.mockResolvedValue({ results: mockValidationResults });

    // Call listTemplates to trigger validation
    const validTemplates = await TemplateManager.listTemplates();
    
    // Should only return valid templates by default
    expect(validTemplates).toHaveLength(1);
    expect(validTemplates[0].sdk).toBe('supabase');

    // Check that errors are stored correctly
    const errors = TemplateManager.getErrors();
    expect(errors).toHaveLength(1);
    expect(errors[0].valid).toBe(false);
    expect(errors[0].sdk).toBe('vercel-ai');
  });

  test('should invalidate cache properly', async () => {
    const mockTemplates = [
      { sdk: 'supabase', template: 'default', config: { visible: true } }
    ];
    const mockValidationResults = [
      { sdk: 'supabase', template: 'default', valid: true }
    ];

    listTemplates.mockReturnValue(mockTemplates);
    validateAllTemplates.mockResolvedValue({ results: mockValidationResults });

    // First call
    await TemplateManager.listTemplates();
    expect(validateAllTemplates).toHaveBeenCalledTimes(1);

    // Invalidate cache
    TemplateManager.invalidateCache();

    // Second call after invalidation should trigger validation again
    await TemplateManager.listTemplates();
    expect(validateAllTemplates).toHaveBeenCalledTimes(2);
  });
}); 