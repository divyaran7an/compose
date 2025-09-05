const fs = require('fs');
const path = require('path');
const { listTemplates, getTemplatesBySDK, findTemplate, getDiscoveryErrors } = require('../../../lib/templateDiscovery');
const { validateTemplateConfig } = require('../../../lib/templateConfigSchema');

describe('template discovery visibility', () => {
  // Setup: create a hidden template config in a temp directory
  const tempDir = path.join(__dirname, '../../../templates/test-sdk/hidden-template');
  const configPath = path.join(tempDir, 'config.json');
  beforeAll(() => {
    fs.mkdirSync(tempDir, { recursive: true });
    fs.writeFileSync(
      configPath,
      JSON.stringify({
        name: 'Hidden Template',
        description: 'Should be hidden',
        packages: [{ name: 'x', version: '1' }],
        envVars: [],
        files: {},
        visible: false
      }, null, 2)
    );
  });
  afterAll(() => {
    fs.rmSync(path.join(__dirname, '../../../templates/test-sdk'), { recursive: true, force: true });
  });

  it('does not show hidden templates by default', () => {
    const all = listTemplates();
    expect(all.some(t => t.config.name === 'Hidden Template')).toBe(false);
  });

  it('shows hidden templates when showHidden is true', () => {
    const all = listTemplates({ showHidden: true });
    expect(all.some(t => t.config.name === 'Hidden Template')).toBe(true);
  });

  it('shows visible templates by default', () => {
    // All current templates are visible (visible: true or omitted)
    const all = listTemplates();
    // Should include at least one known visible template
    expect(all.some(t => t.config.name && t.config.visible !== false)).toBe(true);
  });

  it('getTemplatesBySDK respects visibility', () => {
    const visible = getTemplatesBySDK('test-sdk');
    expect(visible.some(t => t.config.name === 'Hidden Template')).toBe(false);
    const all = getTemplatesBySDK('test-sdk', { showHidden: true });
    expect(all.some(t => t.config.name === 'Hidden Template')).toBe(true);
  });
});

describe('Template Discovery', () => {
  describe('listTemplates', () => {
    test('should discover all valid templates', () => {
      const templates = listTemplates();
      
      // Should find at least the 4 main templates
      expect(templates.length).toBeGreaterThanOrEqual(4);
      
      // Check that all expected SDKs are present
      const sdks = templates.map(t => t.sdk);
      expect(sdks).toContain('supabase');
      expect(sdks).toContain('vercel-ai');
      expect(sdks).toContain('evm');
      expect(sdks).toContain('solana');
    });

    test('should return templates with required properties', () => {
      const templates = listTemplates();
      
      templates.forEach(template => {
        expect(template).toHaveProperty('sdk');
        expect(template).toHaveProperty('template');
        expect(template).toHaveProperty('path');
        expect(template).toHaveProperty('config');
        
        // Validate config structure
        expect(template.config).toHaveProperty('name');
        expect(template.config).toHaveProperty('description');
        expect(template.config).toHaveProperty('packages');
        expect(template.config).toHaveProperty('envVars');
        expect(template.config).toHaveProperty('files');
      });
    });

    test('should validate all discovered template configs', () => {
      const templates = listTemplates();
      
      templates.forEach(template => {
        const { valid, errors } = validateTemplateConfig(template.config);
        expect(valid).toBe(true);
        expect(errors).toBeNull();
      });
    });
  });

  describe('getTemplatesBySDK', () => {
    test('should find supabase template', () => {
      const supabaseTemplates = getTemplatesBySDK('supabase');
      
      expect(supabaseTemplates).toHaveLength(1);
      expect(supabaseTemplates[0].sdk).toBe('supabase');
      expect(supabaseTemplates[0].config.name).toBe('supabase');
    });

    test('should find vercel-ai template', () => {
      const vercelTemplates = getTemplatesBySDK('vercel-ai');
      
      expect(vercelTemplates).toHaveLength(1);
      expect(vercelTemplates[0].sdk).toBe('vercel-ai');
      expect(vercelTemplates[0].config.name).toBe('vercel-ai');
    });

    test('should return empty array for non-existent SDK', () => {
      const templates = getTemplatesBySDK('non-existent');
      expect(templates).toHaveLength(0);
    });
  });

  describe('findTemplate', () => {
    test('should find specific template by SDK and template name', () => {
      const template = findTemplate('supabase', 'default');
      
      expect(template).toBeDefined();
      expect(template.sdk).toBe('supabase');
      expect(template.template).toBe('default');
    });

    test('should return undefined for non-existent template', () => {
      const template = findTemplate('non-existent', 'default');
      expect(template).toBeUndefined();
    });
  });

  describe('template file validation', () => {
    test('supabase template should have all referenced files', () => {
      const template = findTemplate('supabase', 'default');
      expect(template).toBeDefined();
      
      const templatePath = template.path;
      const files = template.config.files;
      
      Object.keys(files).forEach(sourceFile => {
        const filePath = path.join(templatePath, sourceFile);
        expect(fs.existsSync(filePath)).toBe(true);
      });
    });

    test('vercel-ai template should have all referenced files', () => {
      const template = findTemplate('vercel-ai', 'default');
      expect(template).toBeDefined();
      
      const templatePath = template.path;
      const files = template.config.files;
      
      Object.keys(files).forEach(sourceFile => {
        const filePath = path.join(templatePath, sourceFile);
        expect(fs.existsSync(filePath)).toBe(true);
      });
    });

    test('evm template should have all referenced files', () => {
      const template = findTemplate('evm', 'default');
      expect(template).toBeDefined();
      
      const templatePath = template.path;
      const files = template.config.files;
      
      Object.keys(files).forEach(sourceFile => {
        const filePath = path.join(templatePath, sourceFile);
        expect(fs.existsSync(filePath)).toBe(true);
      });
    });

    test('solana template should have all referenced files', () => {
      const template = findTemplate('solana', 'default');
      expect(template).toBeDefined();
      
      const templatePath = template.path;
      const files = template.config.files;
      
      Object.keys(files).forEach(sourceFile => {
        const filePath = path.join(templatePath, sourceFile);
        expect(fs.existsSync(filePath)).toBe(true);
      });
    });
  });

  describe('getDiscoveryErrors', () => {
    test('should not have any discovery errors for valid templates', () => {
      const errors = getDiscoveryErrors();
      
      // Filter out any errors that might be from test fixtures or invalid templates
      const realErrors = errors.filter(error => 
        !error.path.includes('test') && 
        !error.path.includes('fixture')
      );
      
      expect(realErrors).toHaveLength(0);
    });
  });

  describe('template config validation', () => {
    test('should validate supabase config structure', () => {
      const template = findTemplate('supabase', 'default');
      const config = template.config;
      
      expect(config.name).toBe('supabase');
      expect(config.description).toContain('Supabase');
      expect(Array.isArray(config.packages)).toBe(true);
      expect(Array.isArray(config.envVars)).toBe(true);
      expect(typeof config.files).toBe('object');
      
      // Check required packages
      const packageNames = config.packages.map(p => p.name);
      expect(packageNames).toContain('@supabase/supabase-js');
      
      // Check required env vars
      const envVarNames = config.envVars.map(e => e.name);
      expect(envVarNames).toContain('NEXT_PUBLIC_SUPABASE_URL');
      expect(envVarNames).toContain('NEXT_PUBLIC_SUPABASE_ANON_KEY');
    });

    test('should validate vercel-ai config structure', () => {
      const template = findTemplate('vercel-ai', 'default');
      const config = template.config;
      
      expect(config.name).toBe('vercel-ai');
      expect(config.description).toContain('Vercel AI');
      expect(Array.isArray(config.packages)).toBe(true);
      expect(Array.isArray(config.envVars)).toBe(true);
      expect(typeof config.files).toBe('object');
      
      // Check required packages
      const packageNames = config.packages.map(p => p.name);
      expect(packageNames).toContain('ai');
      expect(packageNames).toContain('@ai-sdk/openai');
      
      // Check required env vars
      const envVarNames = config.envVars.map(e => e.name);
      expect(envVarNames).toContain('OPENAI_API_KEY');
    });
  });
}); 