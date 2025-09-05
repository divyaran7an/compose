const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const os = require('os');

describe('Plugin Combinations Tests', () => {
  let testDir;
  let originalCwd;
  const CLI_PATH = path.join(__dirname, '..', '..', '..', 'bin', 'capx-compose.js');

  beforeEach(() => {
    // Create a temporary directory for each test
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'plugin-combo-test-'));
    originalCwd = process.cwd();
    process.chdir(testDir);
  });

  afterEach(() => {
    // Clean up
    process.chdir(originalCwd);
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  // Helper function to run CLI and verify basic project structure
  const testPluginCombination = (projectName, plugins, expectedFiles = []) => {
    // Execute CLI command
    execSync(`node ${CLI_PATH} ${projectName} --yes --skip-install --plugins="${plugins}"`, {
      stdio: 'pipe',
      cwd: testDir,
      encoding: 'utf8'
    });

    const projectPath = path.join(testDir, projectName);
    
    // Verify basic project structure
    expect(fs.existsSync(projectPath)).toBe(true);
    expect(fs.existsSync(path.join(projectPath, 'package.json'))).toBe(true);
    expect(fs.existsSync(path.join(projectPath, 'README.md'))).toBe(true);
    expect(fs.existsSync(path.join(projectPath, 'next.config.js'))).toBe(true);
    expect(fs.existsSync(path.join(projectPath, 'tsconfig.json'))).toBe(true);

    // Verify package.json is valid JSON
    const packageJson = JSON.parse(fs.readFileSync(path.join(projectPath, 'package.json'), 'utf8'));
    expect(packageJson.name).toBe(projectName);
    expect(packageJson.dependencies).toBeDefined();
    expect(packageJson.scripts).toBeDefined();

    // Verify plugin-specific pages exist (check for main plugin pages)
    // Note: vercel-kv doesn't create a page file, only library files
    const pluginList = plugins.split(',');
    pluginList.forEach(plugin => {
      if (plugin !== 'vercel-kv') {
        const pluginPagePath = path.join(projectPath, `src/pages/${plugin}.tsx`);
        expect(fs.existsSync(pluginPagePath)).toBe(true);
      }
    });

    // Verify expected plugin-specific files (only check if expectedFiles is provided)
    if (expectedFiles.length > 0) {
      expectedFiles.forEach(file => {
        const filePath = path.join(projectPath, file);
        if (!fs.existsSync(filePath)) {
          // List actual files for debugging
          console.log(`Missing file: ${file}`);
          console.log('Actual files in project:');
          const findFiles = (dir, prefix = '') => {
            const items = fs.readdirSync(dir);
            items.forEach(item => {
              const fullPath = path.join(dir, item);
              const relativePath = path.join(prefix, item);
              if (fs.statSync(fullPath).isDirectory()) {
                console.log(`  ${relativePath}/`);
                findFiles(fullPath, relativePath);
              } else {
                console.log(`  ${relativePath}`);
              }
            });
          };
          findFiles(projectPath);
        }
        expect(fs.existsSync(filePath)).toBe(true);
      });
    }

    return { projectPath, packageJson };
  };

  // Helper function to verify plugin-specific dependencies
  const verifyDependencies = (packageJson, expectedDeps) => {
    expectedDeps.forEach(dep => {
      if (!packageJson.dependencies || !packageJson.dependencies[dep]) {
        console.log(`Missing dependency: ${dep}`);
        console.log('Available dependencies:', Object.keys(packageJson.dependencies || {}));
      }
      expect(packageJson.dependencies).toBeDefined();
      expect(packageJson.dependencies[dep]).toBeDefined();
    });
  };

  describe('Individual Plugin Templates', () => {
    test('1. Supabase only', () => {
      const { packageJson } = testPluginCombination('supabase-app', 'supabase', [
        'src/pages/supabase.tsx',
        'src/pages/supabase-auth.tsx',
        'schema.sql'
      ]);

      verifyDependencies(packageJson, [
        '@supabase/supabase-js',
        'next',
        'react',
        'react-dom'
      ]);
    });

    test('2. Firebase only', () => {
      const { packageJson } = testPluginCombination('firebase-app', 'firebase', [
        'src/pages/firebase.tsx',
        'src/lib/firebase/config.ts',
        'src/lib/firebase/auth.ts',
        'src/components/AuthExample.tsx'
      ]);

      verifyDependencies(packageJson, [
        'firebase',
        'next',
        'react',
        'react-dom'
      ]);
    });

    test('3. Vercel AI only', () => {
      const { packageJson } = testPluginCombination('ai-app', 'vercel-ai', [
        'src/pages/vercel-ai.tsx',
        'src/pages/api/chat.ts'
      ]);

      verifyDependencies(packageJson, [
        'ai',
        '@ai-sdk/openai',
        'next',
        'react',
        'react-dom'
      ]);
    });

    test('4. EVM only', () => {
      const { packageJson } = testPluginCombination('evm-app', 'evm', [
        'src/pages/evm.tsx',
        'src/config/networks.json',
        'src/utils/NetworkManager.ts'
      ]);

      verifyDependencies(packageJson, [
        'ethers',
        'next',
        'react',
        'react-dom'
      ]);
    });

    test('5. Solana only', () => {
      const { packageJson } = testPluginCombination('solana-app', 'solana', [
        'src/pages/solana.tsx',
        'src/components/WalletProvider.tsx',
        'src/components/WalletButton.tsx',
        'src/components/SolanaOperations.tsx'
      ]);

      verifyDependencies(packageJson, [
        '@solana/wallet-adapter-react',
        '@solana/wallet-adapter-react-ui',
        '@solana/wallet-adapter-wallets',
        '@solana/web3.js',
        'next',
        'react',
        'react-dom'
      ]);
    });
  });

  describe('Two-Plugin Combinations', () => {
    test('6. Supabase + EVM', () => {
      const { packageJson } = testPluginCombination('web3-database-app', 'supabase,evm', [
        'src/pages/supabase.tsx',
        'src/pages/supabase-auth.tsx',
        'schema.sql',
        'src/pages/evm.tsx',
        'src/config/networks.json'
      ]);

      verifyDependencies(packageJson, [
        '@supabase/supabase-js',
        'ethers',
        'next',
        'react',
        'react-dom'
      ]);
    });

    test('7. Supabase + Vercel AI', () => {
      const { packageJson } = testPluginCombination('ai-database-app', 'supabase,vercel-ai', [
        'src/pages/supabase.tsx',
        'src/pages/supabase-auth.tsx',
        'schema.sql',
        'src/pages/vercel-ai.tsx',
        'src/pages/api/chat.ts'
      ]);

      verifyDependencies(packageJson, [
        '@supabase/supabase-js',
        'ai',
        '@ai-sdk/openai',
        'next',
        'react',
        'react-dom'
      ]);
    });

    test('8. Supabase + Solana', () => {
      const { packageJson } = testPluginCombination('solana-database-app', 'supabase,solana', [
        'src/pages/supabase.tsx',
        'src/pages/supabase-auth.tsx',
        'schema.sql',
        'src/pages/solana.tsx',
        'src/components/WalletProvider.tsx'
      ]);

      verifyDependencies(packageJson, [
        '@supabase/supabase-js',
        '@solana/wallet-adapter-react',
        '@solana/wallet-adapter-react-ui',
        '@solana/wallet-adapter-wallets',
        '@solana/web3.js',
        'next',
        'react',
        'react-dom'
      ]);
    });

    test('9. Firebase + EVM', () => {
      const { packageJson } = testPluginCombination('firebase-web3-app', 'firebase,evm', [
        'src/pages/firebase.tsx',
        'src/lib/firebase/config.ts',
        'src/pages/evm.tsx',
        'src/config/networks.json'
      ]);

      verifyDependencies(packageJson, [
        'firebase',
        'ethers',
        'next',
        'react',
        'react-dom'
      ]);
    });

    test('10. Firebase + Vercel AI', () => {
      const { packageJson } = testPluginCombination('firebase-ai-app', 'firebase,vercel-ai', [
        'src/pages/firebase.tsx',
        'src/lib/firebase/config.ts',
        'src/pages/vercel-ai.tsx',
        'src/pages/api/chat.ts'
      ]);

      verifyDependencies(packageJson, [
        'firebase',
        'ai',
        '@ai-sdk/openai',
        'next',
        'react',
        'react-dom'
      ]);
    });

    test('11. Firebase + Solana', () => {
      const { packageJson } = testPluginCombination('firebase-solana-app', 'firebase,solana', [
        'src/pages/firebase.tsx',
        'src/lib/firebase/config.ts',
        'src/pages/solana.tsx',
        'src/components/WalletProvider.tsx'
      ]);

      verifyDependencies(packageJson, [
        'firebase',
        '@solana/wallet-adapter-react',
        '@solana/wallet-adapter-react-ui',
        '@solana/wallet-adapter-wallets',
        '@solana/web3.js',
        'next',
        'react',
        'react-dom'
      ]);
    });
  });

  describe('Three-Plugin Combinations', () => {
    test('13. Supabase + EVM + Vercel AI', () => {
      const { packageJson } = testPluginCombination('web3-ai-platform', 'supabase,evm,vercel-ai', [
        'src/pages/supabase.tsx',
        'src/pages/supabase-auth.tsx',
        'schema.sql',
        'src/pages/evm.tsx',
        'src/config/networks.json',
        'src/pages/vercel-ai.tsx',
        'src/pages/api/chat.ts'
      ]);

      verifyDependencies(packageJson, [
        '@supabase/supabase-js',
        'ethers',
        'ai',
        '@ai-sdk/openai',
        'next',
        'react',
        'react-dom'
      ]);
    });

    test('14. Supabase + EVM + Vercel KV', () => {
      const { packageJson } = testPluginCombination('web3-analytics', 'supabase,evm,vercel-kv', [
        'src/pages/supabase.tsx',
        'src/pages/supabase-auth.tsx',
        'schema.sql',
        'src/pages/evm.tsx',
        'src/config/networks.json',
        'src/lib/vercel-kv/config.ts'
      ]);

      verifyDependencies(packageJson, [
        '@supabase/supabase-js',
        'ethers',
        '@vercel/kv',
        'next',
        'react',
        'react-dom'
      ]);
    });

    test('16. Supabase + Solana + Vercel AI', () => {
      const { packageJson } = testPluginCombination('solana-ai-app', 'supabase,solana,vercel-ai');

      verifyDependencies(packageJson, [
        '@supabase/supabase-js',
        '@solana/wallet-adapter-react',
        '@solana/wallet-adapter-react-ui',
        '@solana/wallet-adapter-wallets',
        '@solana/web3.js',
        'ai',
        '@ai-sdk/openai',
        'next',
        'react',
        'react-dom'
      ]);
    });

    test('17. Supabase + Solana + Vercel KV', () => {
      const { packageJson } = testPluginCombination('solana-performance', 'supabase,solana,vercel-kv');

      verifyDependencies(packageJson, [
        '@supabase/supabase-js',
        '@solana/wallet-adapter-react',
        '@solana/wallet-adapter-react-ui',
        '@solana/wallet-adapter-wallets',
        '@solana/web3.js',
        '@vercel/kv',
        'next',
        'react',
        'react-dom'
      ]);
    });

    test('19. Firebase + EVM + Vercel AI', () => {
      const { packageJson } = testPluginCombination('mobile-web3-ai', 'firebase,evm,vercel-ai');

      verifyDependencies(packageJson, [
        'firebase',
        'ethers',
        'ai',
        '@ai-sdk/openai',
        'next',
        'react',
        'react-dom'
      ]);
    });

    test('20. Firebase + EVM + Vercel KV', () => {
      const { packageJson } = testPluginCombination('mobile-web3-cache', 'firebase,evm,vercel-kv');

      verifyDependencies(packageJson, [
        'firebase',
        'ethers',
        '@vercel/kv',
        'next',
        'react',
        'react-dom'
      ]);
    });

    test('22. Firebase + Solana + Vercel AI', () => {
      const { packageJson } = testPluginCombination('mobile-solana-ai', 'firebase,solana,vercel-ai');

      verifyDependencies(packageJson, [
        'firebase',
        '@solana/wallet-adapter-react',
        '@solana/wallet-adapter-react-ui',
        '@solana/wallet-adapter-wallets',
        '@solana/web3.js',
        'ai',
        '@ai-sdk/openai',
        'next',
        'react',
        'react-dom'
      ]);
    });

    test('23. Firebase + Solana + Vercel KV', () => {
      const { packageJson } = testPluginCombination('mobile-solana-cache', 'firebase,solana,vercel-kv');

      verifyDependencies(packageJson, [
        'firebase',
        '@solana/wallet-adapter-react',
        '@solana/wallet-adapter-react-ui',
        '@solana/wallet-adapter-wallets',
        '@solana/web3.js',
        '@vercel/kv',
        'next',
        'react',
        'react-dom'
      ]);
    });
  });

  describe('Four-Plugin Combinations (Maximum)', () => {
    test('12. Supabase + EVM + Vercel AI + Vercel KV', () => {
      const { packageJson } = testPluginCombination('full-stack-web3-ai', 'supabase,evm,vercel-ai,vercel-kv');

      verifyDependencies(packageJson, [
        '@supabase/supabase-js',
        'ethers',
        'ai',
        '@ai-sdk/openai',
        '@vercel/kv',
        'next',
        'react',
        'react-dom'
      ]);
    });

    test('15. Supabase + Solana + Vercel AI + Vercel KV', () => {
      const { packageJson } = testPluginCombination('solana-ai-platform', 'supabase,solana,vercel-ai,vercel-kv');

      verifyDependencies(packageJson, [
        '@supabase/supabase-js',
        '@solana/wallet-adapter-react',
        '@solana/wallet-adapter-react-ui',
        '@solana/wallet-adapter-wallets',
        '@solana/web3.js',
        'ai',
        '@ai-sdk/openai',
        '@vercel/kv',
        'next',
        'react',
        'react-dom'
      ]);
    });

    test('18. Firebase + EVM + Vercel AI + Vercel KV', () => {
      const { packageJson } = testPluginCombination('firebase-web3-ai', 'firebase,evm,vercel-ai,vercel-kv');

      verifyDependencies(packageJson, [
        'firebase',
        'ethers',
        'ai',
        '@ai-sdk/openai',
        '@vercel/kv',
        'next',
        'react',
        'react-dom'
      ]);
    });

    test('21. Firebase + Solana + Vercel AI + Vercel KV', () => {
      const { packageJson } = testPluginCombination('firebase-solana-ai', 'firebase,solana,vercel-ai,vercel-kv');

      verifyDependencies(packageJson, [
        'firebase',
        '@solana/wallet-adapter-react',
        '@solana/wallet-adapter-react-ui',
        '@solana/wallet-adapter-wallets',
        '@solana/web3.js',
        'ai',
        '@ai-sdk/openai',
        '@vercel/kv',
        'next',
        'react',
        'react-dom'
      ]);
    });
  });

  describe('Plugin Combination Validation', () => {
    test('should reject invalid plugin combinations', () => {
      // Test multiple database plugins (should fail)
      expect(() => {
        execSync(`node ${CLI_PATH} test-invalid --yes --plugins="supabase,firebase"`, {
          stdio: 'pipe',
          cwd: testDir,
          encoding: 'utf8'
        });
      }).toThrow();

      // Test more than 4 plugins (should fail)
      expect(() => {
        execSync(`node ${CLI_PATH} test-too-many --yes --plugins="supabase,evm,vercel-ai,vercel-kv,firebase"`, {
          stdio: 'pipe',
          cwd: testDir,
          encoding: 'utf8'
        });
      }).toThrow();

      // Test invalid plugin name (should fail)
      expect(() => {
        execSync(`node ${CLI_PATH} test-invalid-plugin --yes --plugins="invalid-plugin"`, {
          stdio: 'pipe',
          cwd: testDir,
          encoding: 'utf8'
        });
      }).toThrow();
    });

    test('should accept valid plugin combinations', () => {
      const validCombinations = [
        'supabase',
        'firebase',
        'vercel-ai',
        'evm',
        'solana',
        'vercel-kv',
        'supabase,evm',
        'firebase,vercel-ai',
        'supabase,evm,vercel-ai',
        'firebase,solana,vercel-kv',
        'supabase,evm,vercel-ai,vercel-kv'
      ];

      validCombinations.forEach((plugins, index) => {
        const projectName = `valid-combo-${index}`;
        
        expect(() => {
          execSync(`node ${CLI_PATH} ${projectName} --yes --skip-install --plugins="${plugins}"`, {
            stdio: 'pipe',
            cwd: testDir,
            encoding: 'utf8'
          });
        }).not.toThrow();

        // Verify project was created
        const projectPath = path.join(testDir, projectName);
        expect(fs.existsSync(projectPath)).toBe(true);
        expect(fs.existsSync(path.join(projectPath, 'package.json'))).toBe(true);

        // Clean up for next test
        if (fs.existsSync(projectPath)) {
          fs.rmSync(projectPath, { recursive: true, force: true });
        }
      });
    });
  });

  describe('Project Structure Validation', () => {
    test('should create consistent project structure across all combinations', () => {
      const testCombinations = [
        { plugins: 'supabase', name: 'structure-test-1' },
        { plugins: 'supabase,evm', name: 'structure-test-2' },
        { plugins: 'firebase,vercel-ai,vercel-kv', name: 'structure-test-3' },
        { plugins: 'supabase,evm,vercel-ai,vercel-kv', name: 'structure-test-4' }
      ];

      testCombinations.forEach(({ plugins, name }) => {
        const { projectPath } = testPluginCombination(name, plugins);

        // Verify common project structure
        const commonFiles = [
          'package.json',
          'README.md',
          'next.config.js',
          'tsconfig.json',
          'tailwind.config.js',
          '.env.example',
          'src/pages/_app.tsx',
          'src/pages/index.tsx',
          'src/styles/globals.css'
        ];

        commonFiles.forEach(file => {
          expect(fs.existsSync(path.join(projectPath, file))).toBe(true);
        });

        // Verify package.json structure
        const packageJson = JSON.parse(fs.readFileSync(path.join(projectPath, 'package.json'), 'utf8'));
        expect(packageJson.name).toBe(name);
        expect(packageJson.version).toBeDefined();
        expect(packageJson.scripts).toBeDefined();
        expect(packageJson.scripts.dev).toBeDefined();
        expect(packageJson.scripts.build).toBeDefined();
        expect(packageJson.scripts.start).toBeDefined();
        expect(packageJson.dependencies).toBeDefined();
        expect(packageJson.devDependencies).toBeDefined();
      });
    });

    test('should include plugin-specific environment variables in .env.example', () => {
      const { projectPath } = testPluginCombination('env-test', 'supabase,vercel-ai,vercel-kv');
      
      const envExample = fs.readFileSync(path.join(projectPath, '.env.example'), 'utf8');
      
      // Check for Supabase env vars
      expect(envExample).toContain('NEXT_PUBLIC_SUPABASE_URL');
      expect(envExample).toContain('NEXT_PUBLIC_SUPABASE_ANON_KEY');
      
      // Check for Vercel AI env vars
      expect(envExample).toContain('OPENAI_API_KEY');
      
      // Check for Vercel KV env vars
      expect(envExample).toContain('KV_REST_API_URL');
      expect(envExample).toContain('KV_REST_API_TOKEN');
    });
  });

  describe('Performance and Reliability', () => {
    test('should complete scaffolding within reasonable time', () => {
      const startTime = Date.now();
      
      testPluginCombination('performance-test', 'supabase,evm,vercel-ai,vercel-kv');
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Should complete within 30 seconds (generous timeout for CI)
      expect(duration).toBeLessThan(30000);
    });

    test('should handle concurrent project creation', () => {
      const promises = [];
      
      for (let i = 0; i < 3; i++) {
        const promise = new Promise((resolve, reject) => {
          try {
            const projectName = `concurrent-test-${i}`;
            execSync(`node ${CLI_PATH} ${projectName} --yes --skip-install --plugins="supabase"`, {
              stdio: 'pipe',
              cwd: testDir,
              encoding: 'utf8'
            });
            
            const projectPath = path.join(testDir, projectName);
            expect(fs.existsSync(projectPath)).toBe(true);
            resolve();
          } catch (error) {
            reject(error);
          }
        });
        
        promises.push(promise);
      }
      
      return Promise.all(promises);
    });
  });
}); 