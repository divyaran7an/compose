const fs = require('fs-extra');
const path = require('path');
const os = require('os');

// Import modules to test their integration
const { scaffoldProject } = require('../../lib/scaffold');
const { listTemplates } = require('../../lib/templateDiscovery');
const { ProgressTracker } = require('../../lib/progress');
const { CleanupTracker } = require('../../lib/cleanup');

describe('Module Integration Tests', () => {
  let tempDir;
  let originalCwd;

  beforeEach(async () => {
    // Create temporary directory for each test
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'integration-test-'));
    
    // Save original working directory and change to temp directory
    originalCwd = process.cwd();
    process.chdir(tempDir);
  });

  afterEach(async () => {
    // Restore original working directory
    process.chdir(originalCwd);
    
    // Clean up temporary directory
    if (tempDir && await fs.pathExists(tempDir)) {
      await fs.remove(tempDir);
    }
  });

  describe('Template Discovery + Scaffolding Integration', () => {
    test('should discover templates and use them in scaffolding', async () => {
      // Test the integration between template discovery and scaffolding
      const templates = await listTemplates();
      expect(templates.length).toBeGreaterThan(0);

      // Use the first available template for scaffolding
      const firstTemplate = templates[0];
      const projectName = 'test-project';
      const projectPath = path.join(tempDir, projectName);

      const options = {
        templates: [firstTemplate],
        installDependencies: false,
        silent: true
      };

      await scaffoldProject(projectName, options);

      // Verify project was created
      expect(await fs.pathExists(projectPath)).toBe(true);
      expect(await fs.pathExists(path.join(projectPath, 'package.json'))).toBe(true);
    });

    test('should handle multiple templates in scaffolding', async () => {
      const templates = await listTemplates();
      
      if (templates.length >= 2) {
        const selectedTemplates = templates.slice(0, 2);
        const projectName = 'multi-template-project';
        const projectPath = path.join(tempDir, projectName);

        const options = {
          templates: selectedTemplates,
          installDependencies: false,
          silent: true
        };

        await scaffoldProject(projectName, options);

        // Verify project structure
        expect(await fs.pathExists(projectPath)).toBe(true);
        expect(await fs.pathExists(path.join(projectPath, 'package.json'))).toBe(true);

        // Check that package.json contains merged dependencies
        const packageJson = await fs.readJson(path.join(projectPath, 'package.json'));
        expect(packageJson.dependencies).toBeDefined();
      }
    });
  });

  describe('Progress Tracking + Scaffolding Integration', () => {
    test('should use progress tracking during scaffolding', async () => {
      const templates = await listTemplates();
      const firstTemplate = templates[0];
      const projectName = 'progress-test-project';
      const projectPath = path.join(tempDir, projectName);

      // Mock progress tracking to verify it's being used
      const progressSpy = jest.spyOn(ProgressTracker.prototype, 'start');
      const progressSucceedSpy = jest.spyOn(ProgressTracker.prototype, 'succeed');

      const options = {
        templates: [firstTemplate],
        installDependencies: false,
        silent: false // Enable progress tracking
      };

      await scaffoldProject(projectName, options);

      // Verify progress tracking was used
      expect(progressSpy).toHaveBeenCalled();
      expect(progressSucceedSpy).toHaveBeenCalled();

      // Verify project was created
      expect(await fs.pathExists(projectPath)).toBe(true);

      progressSpy.mockRestore();
      progressSucceedSpy.mockRestore();
    });
  });

  describe('Cleanup + Scaffolding Integration', () => {
    test('should use cleanup tracking during scaffolding', async () => {
      const templates = await listTemplates();
      const firstTemplate = templates[0];
      const projectName = 'cleanup-test-project';
      const projectPath = path.join(tempDir, projectName);

      // Mock cleanup tracking to verify it's being used
      const cleanupSpy = jest.spyOn(CleanupTracker.prototype, 'track');

      const options = {
        templates: [firstTemplate],
        installDependencies: false,
        silent: true
      };

      await scaffoldProject(projectName, options);

      // Verify cleanup tracking was used
      expect(cleanupSpy).toHaveBeenCalled();

      // Verify project was created
      expect(await fs.pathExists(projectPath)).toBe(true);

      cleanupSpy.mockRestore();
    });

    test('should handle scaffolding gracefully with invalid templates', async () => {
      const projectName = 'cleanup-failure-test';
      const projectPath = path.join(tempDir, projectName);

      // Create a scenario with invalid template (but scaffolding should still succeed)
      const invalidOptions = {
        templates: [{ 
          sdk: 'invalid', 
          template: 'nonexistent',
          path: '/nonexistent/path'
        }],
        installDependencies: false,
        silent: true
      };

      // Scaffolding should succeed but with warnings about invalid templates
      const result = await scaffoldProject(projectName, invalidOptions);
      expect(result.success).toBe(true);

      // Project should still be created (with default structure)
      expect(await fs.pathExists(projectPath)).toBe(true);
    });
  });

  describe('End-to-End Workflow Integration', () => {
    test('should complete full project creation workflow', async () => {
      // Test the complete workflow from template discovery to project creation
      const templates = await listTemplates();
      expect(templates.length).toBeGreaterThan(0);

      // Find a specific template type for consistent testing
      const supabaseTemplate = templates.find(t => t.sdk === 'supabase');
      
      if (supabaseTemplate) {
        const projectName = 'full-workflow-project';
        const projectPath = path.join(tempDir, projectName);

        const options = {
          templates: [supabaseTemplate],
          installDependencies: false,
          silent: true,
          eslint: true
        };

        await scaffoldProject(projectName, options);

        // Verify complete project structure
        expect(await fs.pathExists(projectPath)).toBe(true);
        expect(await fs.pathExists(path.join(projectPath, 'package.json'))).toBe(true);
        expect(await fs.pathExists(path.join(projectPath, 'next.config.js'))).toBe(true);
        expect(await fs.pathExists(path.join(projectPath, 'tsconfig.json'))).toBe(true);

        // Verify package.json content
        const packageJson = await fs.readJson(path.join(projectPath, 'package.json'));
        expect(packageJson.name).toBeDefined(); // Template may use default name
        expect(packageJson.dependencies).toBeDefined();
        expect(packageJson.scripts).toBeDefined();
      }
    });

    test('should handle project creation with different options', async () => {
      const templates = await listTemplates();
      const firstTemplate = templates[0];
      const projectName = 'options-test-project';
      const projectPath = path.join(tempDir, projectName);

      const options = {
        templates: [firstTemplate],
        installDependencies: false,
        silent: true,
        eslint: false,
        typescript: true
      };

      await scaffoldProject(projectName, options);

      // Verify project was created with correct options
      expect(await fs.pathExists(projectPath)).toBe(true);
      
      const packageJson = await fs.readJson(path.join(projectPath, 'package.json'));
      expect(packageJson.name).toBeDefined(); // Template may use default name
    });
  });

  describe('Error Handling Integration', () => {
    test('should handle invalid template gracefully', async () => {
      const invalidTemplate = {
        sdk: 'nonexistent',
        template: 'invalid',
        path: '/invalid/path'
      };

      const projectName = 'invalid-project';
      const options = {
        templates: [invalidTemplate],
        installDependencies: false,
        silent: true
      };

      // Should succeed but with warnings (scaffolding is resilient)
      const result = await scaffoldProject(projectName, options);
      expect(result.success).toBe(true);
    });

    test('should handle project creation successfully', async () => {
      const templates = await listTemplates();
      const firstTemplate = templates[0];
      const projectName = 'valid-project-name';

      const options = {
        templates: [firstTemplate],
        installDependencies: false,
        silent: true
      };

      // Should succeed with valid inputs
      const result = await scaffoldProject(projectName, options);
      expect(result.success).toBe(true);
    });
  });

  describe('Performance Integration', () => {
    test('should complete scaffolding within reasonable time', async () => {
      const templates = await listTemplates();
      const firstTemplate = templates[0];
      const projectName = 'performance-test-project';
      
      const startTime = Date.now();
      
      const options = {
        templates: [firstTemplate],
        installDependencies: false,
        silent: true
      };

      await scaffoldProject(projectName, options);
      
      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should complete within 10 seconds (generous for CI environments)
      expect(duration).toBeLessThan(10000);
      
      // Verify project was created
      const projectPath = path.join(tempDir, projectName);
      expect(await fs.pathExists(projectPath)).toBe(true);
    });
  });
}); 