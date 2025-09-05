const fs = require('fs-extra');
const path = require('path');
const os = require('os');
const { performance } = require('perf_hooks');

// Import modules for performance testing
const { scaffoldProject } = require('../../lib/scaffold');
const { listTemplates } = require('../../lib/templateDiscovery');

describe('Performance Tests', () => {
  let tempDir;
  let originalCwd;

  beforeEach(async () => {
    // Create temporary directory for each test
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'performance-test-'));
    
    // Save original working directory
    originalCwd = process.cwd();
  });

  afterEach(async () => {
    // Restore original working directory
    process.chdir(originalCwd);
    
    // Clean up temporary directory
    if (tempDir && await fs.pathExists(tempDir)) {
      await fs.remove(tempDir);
    }
  });

  describe('Template Discovery Performance', () => {
    test('should discover templates within reasonable time', async () => {
      const startTime = performance.now();
      
      const templates = await listTemplates();
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      expect(templates.length).toBeGreaterThan(0);
      expect(duration).toBeLessThan(1000); // Should complete within 1 second
    });
  });

  describe('Project Scaffolding Performance', () => {
    test('should scaffold project within reasonable time', async () => {
      const templates = await listTemplates();
      const firstTemplate = templates[0];
      const projectName = `perf-test-${Date.now()}`;
      
      // Change to temp directory
      process.chdir(tempDir);
      
      const startTime = performance.now();
      
      const options = {
        templates: [firstTemplate],
        installDependencies: false,
        silent: true
      };
      
      await scaffoldProject(projectName, options);
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // Verify project was created
      const projectPath = path.join(tempDir, projectName);
      expect(await fs.pathExists(projectPath)).toBe(true);
      
      // Should complete within 10 seconds
      expect(duration).toBeLessThan(10000);
      
      console.log(`Project scaffolding completed in ${Math.round(duration)}ms`);
    });

    test('should handle multiple templates efficiently', async () => {
      const templates = await listTemplates();
      
      if (templates.length >= 2) {
        const selectedTemplates = templates.slice(0, 2);
        const projectName = `multi-perf-test-${Date.now()}`;
        
        // Change to temp directory
        process.chdir(tempDir);
        
        const startTime = performance.now();
        
        const options = {
          templates: selectedTemplates,
          installDependencies: false,
          silent: true
        };
        
        await scaffoldProject(projectName, options);
        
        const endTime = performance.now();
        const duration = endTime - startTime;
        
        // Verify project was created
        const projectPath = path.join(tempDir, projectName);
        expect(await fs.pathExists(projectPath)).toBe(true);
        
        // Should complete within 15 seconds for multiple templates
        expect(duration).toBeLessThan(15000);
        
        console.log(`Multi-template scaffolding completed in ${Math.round(duration)}ms`);
      }
    });
  });

  describe('File System Performance', () => {
    test('should handle large number of files efficiently', async () => {
      const templates = await listTemplates();
      const firstTemplate = templates[0];
      const projectName = `fs-perf-test-${Date.now()}`;
      
      // Change to temp directory
      process.chdir(tempDir);
      
      const options = {
        templates: [firstTemplate],
        installDependencies: false,
        silent: true
      };
      
      await scaffoldProject(projectName, options);
      
      const projectPath = path.join(tempDir, projectName);
      
      const startTime = performance.now();
      
      // Count all files in the project
      const countFiles = async (dir) => {
        let count = 0;
        const items = await fs.readdir(dir);
        
        for (const item of items) {
          const itemPath = path.join(dir, item);
          const stats = await fs.stat(itemPath);
          
          if (stats.isDirectory()) {
            count += await countFiles(itemPath);
          } else {
            count++;
          }
        }
        
        return count;
      };
      
      const fileCount = await countFiles(projectPath);
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      expect(fileCount).toBeGreaterThan(0);
      expect(duration).toBeLessThan(2000); // Should count files within 2 seconds
      
      console.log(`Counted ${fileCount} files in ${Math.round(duration)}ms`);
    });
  });

  describe('Memory Usage', () => {
    test('should not consume excessive memory during scaffolding', async () => {
      const templates = await listTemplates();
      const firstTemplate = templates[0];
      const projectName = `memory-test-${Date.now()}`;
      
      // Change to temp directory
      process.chdir(tempDir);
      
      const initialMemory = process.memoryUsage();
      
      const options = {
        templates: [firstTemplate],
        installDependencies: false,
        silent: true
      };
      
      await scaffoldProject(projectName, options);
      
      const finalMemory = process.memoryUsage();
      
      // Calculate memory increase
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      const memoryIncreaseMB = memoryIncrease / (1024 * 1024);
      
      // Should not increase memory by more than 100MB
      expect(memoryIncreaseMB).toBeLessThan(100);
      
      console.log(`Memory increase: ${Math.round(memoryIncreaseMB * 100) / 100}MB`);
    });
  });
}); 