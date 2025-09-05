const fs = require('fs-extra');
const path = require('path');
const { ProgressTracker, FileProgressTracker, createSpinner } = require('./progress');
const { logSuccess, logInfo, logWarning, logDim } = require('./console');
const { createCleanupTracker, withCleanup } = require('./cleanup');
const { 
  SHADCN_DEPENDENCIES,
  generateComponentsJson,
  generateUtilsFile,
  generateShadcnGlobalStyles,
  generateEnhancedTailwindConfig,
  generateCardComponent,
  generateButtonComponent,
  generateBadgeComponent,
  generateLabelComponent,
  generateSelectComponent,
  generateSeparatorComponent,
  generateInputComponent,
  generateAlertComponent,
  generateTextareaComponent,
  generateSwitchComponent,
  generateTabsComponent,
  generateAvatarComponent
} = require('./ui-constants');

/**
 * Optimize GOAT template packages based on selected blockchain
 * @param {Object} config - GOAT template configuration
 * @param {string} goatChain - Selected blockchain ('solana' or 'evm')
 * @returns {Object} Optimized template configuration
 */
function optimizeGoatPackages(config, goatChain) {
  // Base packages always needed
  const basePackages = [
    { name: '@goat-sdk/core', version: '0.4.9' },
    { name: '@goat-sdk/adapter-vercel-ai', version: '0.2.10' },
    { name: 'zod', version: '3.23.8' },
    { name: 'ai', version: '~4.0.3' },
    { name: '@ai-sdk/openai', version: '~1.0.4' },
    { name: 'next', version: '^14.0.0' },
    { name: 'react', version: '^18.0.0' },
    { name: 'react-dom', version: '^18.0.0' }
  ];

  let chainSpecificPackages = [];

  if (goatChain === 'solana') {
    chainSpecificPackages = [
      { name: '@goat-sdk/wallet-solana', version: '0.2.11' },
      { name: '@goat-sdk/plugin-spl-token', version: '0.2.14' },
      { name: '@goat-sdk/plugin-jupiter', version: '0.2.14' },
      { name: '@solana/web3.js', version: '^1.98.0' },
      { name: 'bs58', version: '^5.0.0' }
    ];
  } else if (goatChain === 'evm') {
    chainSpecificPackages = [
      { name: '@goat-sdk/wallet-evm', version: '0.2.11' },
      { name: '@goat-sdk/wallet-viem', version: '0.2.12' },
      { name: '@goat-sdk/plugin-erc20', version: '0.2.14' },
      { name: 'viem', version: '2.23.4' }
    ];
  }

  // Dynamic file mapping based on blockchain selection
  const files = {
    "example.tsx": "src/pages/goat.tsx",
    "api-goat.ts": "src/pages/api/goat.ts",
    "README.md": "README.md"
  };

  // Add chain-specific wallet config
  if (goatChain === 'solana') {
    files["wallet-config-solana.ts"] = "src/utils/wallet-config.ts";
  } else if (goatChain === 'evm') {
    files["wallet-config-evm.ts"] = "src/utils/wallet-config.ts";
  }

  // Return optimized config with only relevant packages and files
  return {
    ...config,
    packages: [...basePackages, ...chainSpecificPackages],
    files: files
  };
}

/**
 * Create a directory if it does not exist. Throws if it already exists.
 * @param {string} dirPath
 */
async function createDirectory(dirPath) {
  try {
    if (await fs.pathExists(dirPath)) {
      throw new Error(`Directory already exists: ${dirPath}`);
    }
    await fs.mkdirp(dirPath);
  } catch (err) {
    throw err;
  }
}

/**
 * Generate package.json for a Next.js project
 * @param {string} projectDir
 * @param {object} options (e.g., { projectName, typescript })
 */
async function generatePackageJson(projectDir, options = {}) {
  const { 
    projectName = 'next-app', 
    description = '', 
    author = '', 
    typescript = true,
    tailwind = true,
    eslint = false,
    templates = []
  } = options;

  const packageJson = {
    name: projectName,
    version: '0.1.0',
    private: true,
    description: description || `A Next.js application created with capx-compose`,
    author: author || '',
    scripts: {
      dev: 'next dev',
      build: 'next build',
      start: 'next start',
      lint: 'next lint'
    },
    dependencies: {
      next: '^14.0.0',
      react: '^18.0.0',
      'react-dom': '^18.0.0'
    },
    devDependencies: {}
  };

  // Add TypeScript dependencies
  if (typescript) {
    packageJson.devDependencies = {
      ...packageJson.devDependencies,
      '@types/node': '^20.0.0',
      '@types/react': '^18.0.0',
      '@types/react-dom': '^18.0.0',
      typescript: '^5.0.0'
    };
  }

  // Add Tailwind CSS dependencies
  if (tailwind) {
    packageJson.devDependencies = {
      ...packageJson.devDependencies,
      tailwindcss: '^3.3.0',
      autoprefixer: '^10.4.16',
      postcss: '^8.4.31',
      'tailwindcss-animate': '^1.0.7'
    };
    
    // Add shadcn dependencies when Tailwind is enabled
    packageJson.dependencies = {
      ...packageJson.dependencies,
      ...SHADCN_DEPENDENCIES
    };
  }

  // Add ESLint dependencies
  if (eslint) {
    packageJson.devDependencies = {
      ...packageJson.devDependencies,
      eslint: '^8.0.0',
      'eslint-config-next': '^14.0.0'
    };
  }

  const packageJsonPath = path.join(projectDir, 'package.json');
  await fs.writeJson(packageJsonPath, packageJson, { spaces: 2 });
  
  return packageJsonPath; // Return the path of the created file
}

/**
 * Generate Next.js config files: next.config.js, .gitignore, tsconfig.json (if typescript)
 * @param {string} projectDir
 * @param {object} options (e.g., { typescript })
 */
async function generateConfigFiles(projectDir, options = {}) {
  const { typescript = true, tailwind = true, eslint = false } = options;
  const createdFiles = [];
  
  // next.config.js
  const nextConfig = `/** @type {import('next').NextConfig} */\nconst nextConfig = {\n  reactStrictMode: true,\n};\n\nmodule.exports = nextConfig;\n`;
  
  // .gitignore
  const gitignore = `node_modules\n.next\nout\n.env*\n.DS_Store\n`;
  
  // tsconfig.json (if typescript)
  const tsconfig = {
    compilerOptions: {
      target: 'esnext',
      lib: ['dom', 'dom.iterable', 'esnext'],
      allowJs: true,
      skipLibCheck: true,
      strict: true,
      forceConsistentCasingInFileNames: true,
      noEmit: true,
      esModuleInterop: true,
      module: 'esnext',
      moduleResolution: 'bundler',
      resolveJsonModule: true,
      isolatedModules: true,
      jsx: 'preserve',
      incremental: true,
      baseUrl: '.',
      paths: {
        '@/*': ['./src/*']
      }
    },
    include: ['next-env.d.ts', '**/*.ts', '**/*.tsx'],
    exclude: ['node_modules']
  };

  // Enhanced Tailwind CSS configuration with shadcn
  const tailwindConfig = generateEnhancedTailwindConfig();

  // PostCSS configuration for Tailwind
  const postcssConfig = `module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}`;

  // ESLint configuration
  const eslintConfigTS = {
    extends: [
      'next/core-web-vitals',
      '@typescript-eslint/recommended'
    ],
    parser: '@typescript-eslint/parser',
    plugins: ['@typescript-eslint'],
    rules: {
      '@typescript-eslint/no-unused-vars': 'error',
      '@typescript-eslint/no-explicit-any': 'warn'
    }
  };

  const eslintConfigJS = {
    extends: ['next/core-web-vitals'],
    rules: {
      'no-unused-vars': 'error'
    }
  };

  try {
    const nextConfigPath = path.join(projectDir, 'next.config.js');
    await fs.writeFile(nextConfigPath, nextConfig);
    createdFiles.push(nextConfigPath);
    
    const gitignorePath = path.join(projectDir, '.gitignore');
    await fs.writeFile(gitignorePath, gitignore);
    createdFiles.push(gitignorePath);
    
    if (typescript) {
      const tsconfigPath = path.join(projectDir, 'tsconfig.json');
      await fs.writeJson(tsconfigPath, tsconfig, { spaces: 2 });
      createdFiles.push(tsconfigPath);
    }

    if (tailwind) {
      const tailwindConfigPath = path.join(projectDir, 'tailwind.config.js');
      await fs.writeFile(tailwindConfigPath, tailwindConfig);
      createdFiles.push(tailwindConfigPath);
      
      const postcssConfigPath = path.join(projectDir, 'postcss.config.js');
      await fs.writeFile(postcssConfigPath, postcssConfig);
      createdFiles.push(postcssConfigPath);
      
      // Add shadcn components.json
      const componentsJsonPath = path.join(projectDir, 'components.json');
      const componentsJson = generateComponentsJson();
      await fs.writeJson(componentsJsonPath, componentsJson, { spaces: 2 });
      createdFiles.push(componentsJsonPath);

    }

    if (eslint) {
      const eslintConfig = typescript ? eslintConfigTS : eslintConfigJS;
      const eslintConfigPath = path.join(projectDir, '.eslintrc.json');
      await fs.writeJson(eslintConfigPath, eslintConfig, { spaces: 2 });
      createdFiles.push(eslintConfigPath);
      

    }


    
    return { createdFiles };
  } catch (err) {
    throw err;
  }
}

/**
 * Create standard Next.js project structure and basic page files
 * @param {string} projectDir
 * @param {object} options (e.g., { typescript })
 */
async function createProjectStructure(projectDir, options = {}) {
  const { typescript = true, tailwind = true } = options;
  const ext = typescript ? 'tsx' : 'jsx';
  const createdFiles = [];
  const createdDirectories = [];
  
  const srcPagesDir = path.join(projectDir, 'src', 'pages');
  const publicDir = path.join(projectDir, 'public');
  
  try {
    await fs.mkdirp(srcPagesDir);
    createdDirectories.push(path.join(projectDir, 'src'));
    createdDirectories.push(srcPagesDir);
    
    await fs.mkdirp(publicDir);
    createdDirectories.push(publicDir);
    
    // index.tsx/jsx - will be generated dynamically based on templates
    // _app.tsx/jsx - keep clean and generic
    const appContent = typescript 
      ? `import React from 'react';\nimport type { AppProps } from 'next/app';\nimport '../styles/globals.css';\n\nexport default function App({ Component, pageProps }: AppProps) {\n  return <Component {...pageProps} />;\n}\n`
      : `import React from 'react';\nimport '../styles/globals.css';\n\nexport default function App({ Component, pageProps }) {\n  return <Component {...pageProps} />;\n}\n`;
    
    const appPath = path.join(srcPagesDir, `_app.${ext}`);
    await fs.writeFile(appPath, appContent);
    createdFiles.push(appPath);
    
    // Create styles directory and globals.css
    const stylesDir = path.join(projectDir, 'src', 'styles');
    await fs.mkdirp(stylesDir);
    createdDirectories.push(stylesDir);
    
    // globals.css with Tailwind directives if enabled
    const globalsCss = tailwind 
      ? generateShadcnGlobalStyles()
      : `html,\nbody {\n  padding: 0;\n  margin: 0;\n  font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Oxygen,\n    Ubuntu, Cantarell, Fira Sans, Droid Sans, Helvetica Neue, sans-serif;\n}\n\na {\n  color: inherit;\n  text-decoration: none;\n}\n\n* {\n  box-sizing: border-box;\n}\n`;
    
    const globalsCssPath = path.join(stylesDir, 'globals.css');
    await fs.writeFile(globalsCssPath, globalsCss);
    createdFiles.push(globalsCssPath);
    
    // Create lib directory and utils.ts for shadcn
    if (tailwind && typescript) {
      const libDir = path.join(projectDir, 'src', 'lib');
      await fs.mkdirp(libDir);
      createdDirectories.push(libDir);
      
      const utilsPath = path.join(libDir, 'utils.ts');
      await fs.writeFile(utilsPath, generateUtilsFile());
      createdFiles.push(utilsPath);
      
      // Create components/ui directory for shadcn components
      const componentsDir = path.join(projectDir, 'src', 'components');
      const componentsUiDir = path.join(componentsDir, 'ui');
      await fs.mkdirp(componentsUiDir);
      createdDirectories.push(componentsDir);
      createdDirectories.push(componentsUiDir);
      
      // Generate base shadcn components
      const cardPath = path.join(componentsUiDir, 'card.tsx');
      await fs.writeFile(cardPath, generateCardComponent());
      createdFiles.push(cardPath);
      
      const buttonPath = path.join(componentsUiDir, 'button.tsx');
      await fs.writeFile(buttonPath, generateButtonComponent());
      createdFiles.push(buttonPath);
      
      const badgePath = path.join(componentsUiDir, 'badge.tsx');
      await fs.writeFile(badgePath, generateBadgeComponent());
      createdFiles.push(badgePath);
      
      const labelPath = path.join(componentsUiDir, 'label.tsx');
      await fs.writeFile(labelPath, generateLabelComponent());
      createdFiles.push(labelPath);
      
      const selectPath = path.join(componentsUiDir, 'select.tsx');
      await fs.writeFile(selectPath, generateSelectComponent());
      createdFiles.push(selectPath);
      
      const separatorPath = path.join(componentsUiDir, 'separator.tsx');
      await fs.writeFile(separatorPath, generateSeparatorComponent());
      createdFiles.push(separatorPath);
      
      const inputPath = path.join(componentsUiDir, 'input.tsx');
      await fs.writeFile(inputPath, generateInputComponent());
      createdFiles.push(inputPath);
      
      const alertPath = path.join(componentsUiDir, 'alert.tsx');
      await fs.writeFile(alertPath, generateAlertComponent());
      createdFiles.push(alertPath);
      
      const textareaPath = path.join(componentsUiDir, 'textarea.tsx');
      await fs.writeFile(textareaPath, generateTextareaComponent());
      createdFiles.push(textareaPath);
      
      const switchPath = path.join(componentsUiDir, 'switch.tsx');
      await fs.writeFile(switchPath, generateSwitchComponent());
      createdFiles.push(switchPath);
      
      const tabsPath = path.join(componentsUiDir, 'tabs.tsx');
      await fs.writeFile(tabsPath, generateTabsComponent());
      createdFiles.push(tabsPath);
      
      const avatarPath = path.join(componentsUiDir, 'avatar.tsx');
      await fs.writeFile(avatarPath, generateAvatarComponent());
      createdFiles.push(avatarPath);
    }

    
    return { createdFiles, createdDirectories };
  } catch (err) {
    throw err;
  }
}

/**
 * Generate sample.env from envVars array
 * @param {string} projectDir
 * @param {Array} envVars
 */
async function generateSampleEnv(projectDir, envVars = []) {
  if (!envVars.length) return null;
  
  let content = '';
  for (const v of envVars) {
    if (v.description) content += `# ${v.description}\n`;
    const value = v.defaultValue || '';
    content += `${v.name}=${value}\n\n`;
  }
  
  const envPath = path.join(projectDir, 'sample.env');
  await fs.writeFile(envPath, content.trim() + '\n');

  
  return envPath;
}

/**
 * Generate dynamic index page based on selected templates
 * @param {string} projectDir
 * @param {Array} templates - Array of template objects with config
 * @param {object} options (e.g., { typescript })
 */
async function generateDynamicIndexPage(projectDir, templates = [], options = {}) {
  const { typescript = true } = options;
  const ext = typescript ? 'tsx' : 'jsx';
  const srcPagesDir = path.join(projectDir, 'src', 'pages');
  const indexPath = path.join(srcPagesDir, `index.${ext}`);
  
  if (templates.length === 0) {
    // Default polished index page with shadcn components
    const indexContent = `import React from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';

export default function Home() {
  return (
    <main className="min-h-screen bg-black text-white">
      {/* Grid background pattern */}
      <div className="fixed inset-0 bg-[linear-gradient(to_right,#0a0a0a_1px,transparent_1px),linear-gradient(to_bottom,#0a0a0a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
      
      {/* Content */}
      <div className="relative">
        {/* Logo */}
        <div className="flex justify-center pt-8">
          <a href="https://twitter.com/0xcapx" target="_blank" rel="noopener noreferrer" className="hover:opacity-80 transition-opacity">
            <svg width="60" height="21" viewBox="0 0 735 257" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M393.371 60.1076C428.418 39.3368 466.736 49.4457 488.168 73.7358C510.685 99.1 513.774 136.777 495.43 165.276C484.54 181.975 469.643 192.797 450.397 197.607C431.15 202.417 412.435 199.002 395.185 189.59V235.814C395.185 247.037 388.286 255.478 378.117 256.215C367.583 257.13 358.681 249.225 358.143 238.203C357.96 235.99 358.143 233.786 358.143 231.581V71.1384C358.042 68.2175 358.409 65.2993 359.228 62.4966C361.77 55.6906 366.49 51.4658 373.578 50.3596C380.295 49.0769 386.108 51.4658 390.829 56.6124C391.762 57.7109 392.612 58.8793 393.371 60.1076ZM395.367 124.071C394.282 141.355 408.626 162.495 433.138 162.495C453.842 162.679 470.736 145.396 470.918 124.256C470.918 102.932 454.206 85.6563 433.138 85.8406C409.354 86.025 394.456 106.427 395.367 124.071Z" fill="#E6E6E6"/>
            <path d="M284.264 64.3382C285.539 63.4244 285.539 62.318 285.896 61.3962C289.713 53.3075 297.704 49.0828 306.242 50.7342C310.287 51.4901 313.961 53.6097 316.664 56.748C319.368 59.8862 320.943 63.8584 321.132 68.0178V179.96C321.259 182.897 320.826 185.831 319.857 188.602C316.95 195.953 311.509 200.178 303.7 200.731C296.072 201.1 290.236 197.605 286.442 190.991C285.827 189.862 285.282 188.694 284.81 187.496C283.535 187.127 282.815 188.233 282.086 188.787C239.404 219.482 180.707 197.789 166.95 145.586C156.416 105.88 178.933 64.1538 217.069 52.4176C239.404 45.4272 260.629 48.9224 280.272 61.9733C281.718 62.5428 283.065 63.341 284.264 64.3382ZM201.632 125.737C201.608 129.27 202.036 132.792 202.907 136.214C209.624 162.869 240.497 174.26 261.564 157.722C280.454 143.012 282.268 114.521 265.524 97.4304C256.812 88.6122 246.097 84.5559 233.749 86.584C214.891 89.8868 201.814 106.064 201.632 125.737Z" fill="#E6E6E6"/>
            <path d="M594.467 93.1272C594.575 93.257 594.709 93.3614 594.861 93.433C595.013 93.5046 595.178 93.5417 595.346 93.5417C595.514 93.5417 595.679 93.5046 595.831 93.433C595.983 93.3614 596.117 93.257 596.225 93.1272C600.835 87.4355 605.437 81.9041 609.88 76.5571C615.511 69.751 620.968 62.929 626.591 56.155C631.676 50.2709 638.028 47.6976 645.655 49.7418C648.438 50.4709 651.012 51.8541 653.167 53.7789C655.322 55.7037 657 58.1159 658.061 60.8196C659.123 63.5234 659.54 66.4425 659.278 69.3399C659.016 72.2373 658.083 75.0313 656.554 77.495C655.2 79.5623 653.683 81.5142 652.015 83.331C641.846 95.8288 631.676 108.183 621.324 120.648C618.101 124.729 619.123 123.374 622.401 127.863L654.082 166.158C663.88 176.828 659.627 192.941 646.416 197.278C639.153 199.683 631.526 197.278 626.441 191.025C617.356 179.994 608.462 169.148 599.377 158.157C598.474 157.051 597.746 156.129 596.835 155.031C595.021 152.826 594.839 152.826 593.026 155.215C584.852 164.955 576.861 174.88 568.687 184.62C566.873 186.832 565.234 189.037 563.42 191.033C556.521 199.122 545.259 200.404 537.283 193.791C529.11 186.993 528.207 175.409 534.908 166.951C546.17 153.171 557.424 139.567 568.687 125.963C570.865 123.205 570.865 123.205 568.687 120.632C557.788 107.396 546.898 94.1774 536.001 81.1104C531.588 75.8035 529.213 70.1038 531.066 63.2897C531.804 60.0836 533.368 57.1326 535.6 54.7373C537.831 52.3419 540.649 50.5878 543.768 49.6534C546.887 48.719 550.194 48.6378 553.354 49.4179C556.514 50.1981 559.413 51.8118 561.757 54.0948C562.842 55.201 563.935 56.4997 565.02 57.7744C573.462 68.0996 590.412 88.3013 594.467 93.1272Z" fill="#8DBC1A"/>
            <path d="M79.6253 45.4856C99.4258 45.4856 116.494 52.2917 131.383 65.1581C139.739 72.5093 140.824 84.2695 133.759 92.1739C130.85 95.5177 126.849 97.6916 122.487 98.2994C118.125 98.9071 113.693 97.9081 109.999 95.4847C108.367 94.3783 107.092 93.0797 105.46 91.9895C86.3809 76.3653 56.7436 81.1431 43.303 101.738C28.4131 124.529 40.7607 155.961 67.6418 162.943C81.8033 166.623 94.6971 164.05 106.142 154.67C111.947 149.708 118.49 148.057 125.57 150.814C128.313 151.846 130.773 153.526 132.745 155.714C134.718 157.901 136.145 160.535 136.909 163.394C137.673 166.253 137.751 169.255 137.137 172.151C136.524 175.047 135.235 177.753 133.379 180.043C131.884 181.666 130.298 183.199 128.627 184.636C111.203 198.264 91.4024 204.301 69.4238 201.367C40.9112 197.359 19.6613 182.248 7.31376 155.961C-10.8472 117.177 5.1357 66.9779 52.7122 50.0791C61.3292 46.8913 70.4517 45.3343 79.6253 45.4856Z" fill="#E6E6E6"/>
            <rect x="675.089" y="3.13166" width="56.1296" height="56.9095" rx="27.877" stroke="#E6E6E6" strokeWidth="6.26869"/>
            <path d="M695.457 40.8973V21.3586H703.891C705.341 21.3586 706.61 21.6225 707.698 22.1504C708.785 22.6783 709.631 23.4384 710.235 24.4306C710.84 25.4228 711.142 26.6122 711.142 27.9987C711.142 29.398 710.83 30.5778 710.207 31.5382C709.59 32.4986 708.722 33.2237 707.602 33.7134C706.489 34.2031 705.188 34.448 703.7 34.448H698.663V30.3266H702.632C703.255 30.3266 703.786 30.2502 704.225 30.0976C704.67 29.9386 705.01 29.6874 705.246 29.3439C705.487 29.0004 705.608 28.552 705.608 27.9987C705.608 27.439 705.487 26.9842 705.246 26.6344C705.01 26.2782 704.67 26.0175 704.225 25.8521C703.786 25.6804 703.255 25.5945 702.632 25.5945H700.762V40.8973H695.457ZM706.906 31.9293L711.79 40.8973H706.028L701.258 31.9293H706.906Z" fill="#E6E6E6"/>
            </svg>
          </a>
        </div>
        
        {/* Hero Section */}
        <section className="px-6 py-20 md:py-28 lg:py-32">
          <div className="mx-auto max-w-6xl">
            <div className="flex flex-col items-center text-center">
              <h1 className="font-heading text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl lg:text-6xl">
                <span className="bg-gradient-to-b from-white to-zinc-400 bg-clip-text text-transparent">
                  Rapidly
                </span>
                <br />
                <span className="bg-gradient-to-b from-white to-zinc-400 bg-clip-text text-transparent">
                  build & ship
                </span>
                <br />
                <span className="bg-gradient-to-b from-white to-zinc-400 bg-clip-text text-transparent">
                  AI apps
                </span>
              </h1>
              <p className="mt-6 max-w-xl text-lg text-zinc-400 md:text-xl">
                Everything's installed. Templates are ready. Just open in your AI editor and start shipping.
              </p>
            </div>
          </div>
        </section>

        {/* How it Works Section */}
        <section className="px-6 py-16">
          <div className="mx-auto max-w-6xl">
            <div className="mb-12 text-center">
              <h2 className="font-heading text-3xl font-bold tracking-tight sm:text-4xl">
                Start Shipping
              </h2>
            </div>
            
            <div className="grid gap-8 md:grid-cols-3">
              <div className="relative">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full border border-zinc-800 bg-zinc-900">
                  <span className="text-sm font-bold">1</span>
                </div>
                <h3 className="font-heading mb-2 text-lg font-semibold">Open in AI Editor</h3>
                <p className="text-sm text-zinc-400">
                  Import your project into Cursor or any AI-powered editor. Let AI understand your codebase instantly.
                </p>
              </div>
              
              <div className="relative">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full border border-zinc-800 bg-zinc-900">
                  <span className="text-sm font-bold">2</span>
                </div>
                <h3 className="font-heading mb-2 text-lg font-semibold">Build with AI</h3>
                <p className="text-sm text-zinc-400">
                  Leverage AI to write code faster. Every template is optimized for AI-assisted development.
                </p>
              </div>
              
              <div className="relative">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full border border-zinc-800 bg-zinc-900">
                  <span className="text-sm font-bold">3</span>
                </div>
                <h3 className="font-heading mb-2 text-lg font-semibold">Ship Fast</h3>
                <p className="text-sm text-zinc-400">
                  Deploy to Vercel and get your first users. The best code is the code that ships.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Quote Section */}
        <section className="px-6 py-16">
          <div className="mx-auto max-w-4xl">
            <div className="p-8 text-center">
              <p className="text-lg italic leading-relaxed text-zinc-100 opacity-75 md:text-xl">
                "Done is better than perfect. Ship early, ship often, and listen to your users."
              </p>
              <p className="text-sm text-zinc-400 mt-4">
                - Reid Hoffman
              </p>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="mt-24">
          <div className="mx-auto max-w-6xl px-6 py-8">
            <p className="text-center text-sm text-zinc-400">
              Crafted with ❤️ at{' '}
              <a 
                href="https://twitter.com/0xcapx" 
                target="_blank" 
                rel="noopener noreferrer"
                className="font-bold text-white hover:text-zinc-300 transition-colors"
              >
                Capx
              </a>
            </p>
          </div>
        </footer>
      </div>
    </main>
  );
}
`;
    await fs.writeFile(indexPath, indexContent);
    return indexPath;
  }

  // Generate dynamic index page with plugin navigation using shadcn components
  const imports = typescript ? 
    `import React from 'react';\nimport Link from 'next/link';\nimport { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';\nimport { Button } from '../components/ui/button';\nimport { Badge } from '../components/ui/badge';` :
    `import React from 'react';\nimport Link from 'next/link';\nimport { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';\nimport { Button } from '../components/ui/button';\nimport { Badge } from '../components/ui/badge';`;
  
  const pluginCards = templates.map(template => {
    const config = template.config;
    if (!config || !config.name) {
      return '';
    }
    const routeName = config.name;
    const displayName = config.displayName || config.name.charAt(0).toUpperCase() + config.name.slice(1);
    const description = config.description || `${displayName} integration template`;
    
    // Determine category badge
    let categoryBadge = 'Integration';
    let categoryIcon = '🔧';
    if (config.name === 'evm' || config.name === 'solana') {
      categoryBadge = 'Web3';
      categoryIcon = '⛓️';
    } else if (config.name === 'vercel-ai' || config.name === 'goat' || config.name === 'solana-agent-kit') {
      categoryBadge = 'AI';
      categoryIcon = '🤖';
    } else if (config.name === 'supabase' || config.name === 'firebase') {
      categoryBadge = 'Database';
      categoryIcon = '🗄️';
    }
    
    return `
              <Card className="group border-zinc-800 bg-zinc-900/50 backdrop-blur transition-all duration-300 hover:border-zinc-700 hover:bg-zinc-900/70">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-zinc-800">
                      <span className="text-xl">${categoryIcon}</span>
                    </div>
                    <Badge variant="secondary" className="bg-zinc-800 text-zinc-300">
                      ${categoryBadge}
                    </Badge>
                  </div>
                  <CardTitle className="font-heading mt-4 text-xl">${displayName}</CardTitle>
                  <CardDescription className="text-zinc-400">
                    ${description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button asChild className="w-full bg-white text-black hover:bg-zinc-200">
                    <Link href="/${routeName}">
                      View Demo
                    </Link>
                  </Button>
                </CardContent>
              </Card>`;
  }).filter(card => card !== '').join('');

  const indexContent = `${imports}

export default function Home() {
  return (
    <main className="min-h-screen bg-black text-white">
      {/* Grid background pattern */}
      <div className="fixed inset-0 bg-[linear-gradient(to_right,#0a0a0a_1px,transparent_1px),linear-gradient(to_bottom,#0a0a0a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
      
      {/* Content */}
      <div className="relative">
        {/* Logo */}
        <div className="flex justify-center pt-8">
          <a href="https://twitter.com/0xcapx" target="_blank" rel="noopener noreferrer" className="hover:opacity-80 transition-opacity">
            <svg width="60" height="21" viewBox="0 0 735 257" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M393.371 60.1076C428.418 39.3368 466.736 49.4457 488.168 73.7358C510.685 99.1 513.774 136.777 495.43 165.276C484.54 181.975 469.643 192.797 450.397 197.607C431.15 202.417 412.435 199.002 395.185 189.59V235.814C395.185 247.037 388.286 255.478 378.117 256.215C367.583 257.13 358.681 249.225 358.143 238.203C357.96 235.99 358.143 233.786 358.143 231.581V71.1384C358.042 68.2175 358.409 65.2993 359.228 62.4966C361.77 55.6906 366.49 51.4658 373.578 50.3596C380.295 49.0769 386.108 51.4658 390.829 56.6124C391.762 57.7109 392.612 58.8793 393.371 60.1076ZM395.367 124.071C394.282 141.355 408.626 162.495 433.138 162.495C453.842 162.679 470.736 145.396 470.918 124.256C470.918 102.932 454.206 85.6563 433.138 85.8406C409.354 86.025 394.456 106.427 395.367 124.071Z" fill="#E6E6E6"/>
            <path d="M284.264 64.3382C285.539 63.4244 285.539 62.318 285.896 61.3962C289.713 53.3075 297.704 49.0828 306.242 50.7342C310.287 51.4901 313.961 53.6097 316.664 56.748C319.368 59.8862 320.943 63.8584 321.132 68.0178V179.96C321.259 182.897 320.826 185.831 319.857 188.602C316.95 195.953 311.509 200.178 303.7 200.731C296.072 201.1 290.236 197.605 286.442 190.991C285.827 189.862 285.282 188.694 284.81 187.496C283.535 187.127 282.815 188.233 282.086 188.787C239.404 219.482 180.707 197.789 166.95 145.586C156.416 105.88 178.933 64.1538 217.069 52.4176C239.404 45.4272 260.629 48.9224 280.272 61.9733C281.718 62.5428 283.065 63.341 284.264 64.3382ZM201.632 125.737C201.608 129.27 202.036 132.792 202.907 136.214C209.624 162.869 240.497 174.26 261.564 157.722C280.454 143.012 282.268 114.521 265.524 97.4304C256.812 88.6122 246.097 84.5559 233.749 86.584C214.891 89.8868 201.814 106.064 201.632 125.737Z" fill="#E6E6E6"/>
            <path d="M594.467 93.1272C594.575 93.257 594.709 93.3614 594.861 93.433C595.013 93.5046 595.178 93.5417 595.346 93.5417C595.514 93.5417 595.679 93.5046 595.831 93.433C595.983 93.3614 596.117 93.257 596.225 93.1272C600.835 87.4355 605.437 81.9041 609.88 76.5571C615.511 69.751 620.968 62.929 626.591 56.155C631.676 50.2709 638.028 47.6976 645.655 49.7418C648.438 50.4709 651.012 51.8541 653.167 53.7789C655.322 55.7037 657 58.1159 658.061 60.8196C659.123 63.5234 659.54 66.4425 659.278 69.3399C659.016 72.2373 658.083 75.0313 656.554 77.495C655.2 79.5623 653.683 81.5142 652.015 83.331C641.846 95.8288 631.676 108.183 621.324 120.648C618.101 124.729 619.123 123.374 622.401 127.863L654.082 166.158C663.88 176.828 659.627 192.941 646.416 197.278C639.153 199.683 631.526 197.278 626.441 191.025C617.356 179.994 608.462 169.148 599.377 158.157C598.474 157.051 597.746 156.129 596.835 155.031C595.021 152.826 594.839 152.826 593.026 155.215C584.852 164.955 576.861 174.88 568.687 184.62C566.873 186.832 565.234 189.037 563.42 191.033C556.521 199.122 545.259 200.404 537.283 193.791C529.11 186.993 528.207 175.409 534.908 166.951C546.17 153.171 557.424 139.567 568.687 125.963C570.865 123.205 570.865 123.205 568.687 120.632C557.788 107.396 546.898 94.1774 536.001 81.1104C531.588 75.8035 529.213 70.1038 531.066 63.2897C531.804 60.0836 533.368 57.1326 535.6 54.7373C537.831 52.3419 540.649 50.5878 543.768 49.6534C546.887 48.719 550.194 48.6378 553.354 49.4179C556.514 50.1981 559.413 51.8118 561.757 54.0948C562.842 55.201 563.935 56.4997 565.02 57.7744C573.462 68.0996 590.412 88.3013 594.467 93.1272Z" fill="#8DBC1A"/>
            <path d="M79.6253 45.4856C99.4258 45.4856 116.494 52.2917 131.383 65.1581C139.739 72.5093 140.824 84.2695 133.759 92.1739C130.85 95.5177 126.849 97.6916 122.487 98.2994C118.125 98.9071 113.693 97.9081 109.999 95.4847C108.367 94.3783 107.092 93.0797 105.46 91.9895C86.3809 76.3653 56.7436 81.1431 43.303 101.738C28.4131 124.529 40.7607 155.961 67.6418 162.943C81.8033 166.623 94.6971 164.05 106.142 154.67C111.947 149.708 118.49 148.057 125.57 150.814C128.313 151.846 130.773 153.526 132.745 155.714C134.718 157.901 136.145 160.535 136.909 163.394C137.673 166.253 137.751 169.255 137.137 172.151C136.524 175.047 135.235 177.753 133.379 180.043C131.884 181.666 130.298 183.199 128.627 184.636C111.203 198.264 91.4024 204.301 69.4238 201.367C40.9112 197.359 19.6613 182.248 7.31376 155.961C-10.8472 117.177 5.1357 66.9779 52.7122 50.0791C61.3292 46.8913 70.4517 45.3343 79.6253 45.4856Z" fill="#E6E6E6"/>
            <rect x="675.089" y="3.13166" width="56.1296" height="56.9095" rx="27.877" stroke="#E6E6E6" strokeWidth="6.26869"/>
            <path d="M695.457 40.8973V21.3586H703.891C705.341 21.3586 706.61 21.6225 707.698 22.1504C708.785 22.6783 709.631 23.4384 710.235 24.4306C710.84 25.4228 711.142 26.6122 711.142 27.9987C711.142 29.398 710.83 30.5778 710.207 31.5382C709.59 32.4986 708.722 33.2237 707.602 33.7134C706.489 34.2031 705.188 34.448 703.7 34.448H698.663V30.3266H702.632C703.255 30.3266 703.786 30.2502 704.225 30.0976C704.67 29.9386 705.01 29.6874 705.246 29.3439C705.487 29.0004 705.608 28.552 705.608 27.9987C705.608 27.439 705.487 26.9842 705.246 26.6344C705.01 26.2782 704.67 26.0175 704.225 25.8521C703.786 25.6804 703.255 25.5945 702.632 25.5945H700.762V40.8973H695.457ZM706.906 31.9293L711.79 40.8973H706.028L701.258 31.9293H706.906Z" fill="#E6E6E6"/>
            </svg>
          </a>
        </div>
        
        {/* Hero Section */}
        <section className="px-6 py-20 md:py-28 lg:py-32">
          <div className="mx-auto max-w-6xl">
            <div className="flex flex-col items-center text-center">
              <h1 className="font-heading text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl lg:text-6xl">
                <span className="bg-gradient-to-b from-white to-zinc-400 bg-clip-text text-transparent">
                  Rapidly
                </span>
                <br />
                <span className="bg-gradient-to-b from-white to-zinc-400 bg-clip-text text-transparent">
                  build & ship
                </span>
                <br />
                <span className="bg-gradient-to-b from-white to-zinc-400 bg-clip-text text-transparent">
                  AI apps
                </span>
              </h1>
              <p className="mt-6 max-w-xl text-lg text-zinc-400 md:text-xl">
                Everything's installed. Templates are ready. Just open in your AI editor and start shipping.
              </p>
            </div>
          </div>
        </section>

        {/* Templates Section */}
        <section className="px-6 py-16">
          <div className="mx-auto max-w-6xl">
            <div className="mb-12 text-center">
              <h2 className="font-heading text-3xl font-bold tracking-tight sm:text-4xl">
                Installed Templates
              </h2>
              <p className="mt-4 text-lg text-zinc-400">
                Click any template below to explore its features.
              </p>
            </div>
            
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">${pluginCards}
            </div>
          </div>
        </section>

        {/* How it Works Section */}
        <section className="px-6 py-16">
          <div className="mx-auto max-w-6xl">
            <div className="mb-12 text-center">
              <h2 className="font-heading text-3xl font-bold tracking-tight sm:text-4xl">
                Start Shipping
              </h2>
            </div>
            
            <div className="grid gap-8 md:grid-cols-3">
              <div className="relative">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full border border-zinc-800 bg-zinc-900">
                  <span className="text-sm font-bold">1</span>
                </div>
                <h3 className="font-heading mb-2 text-lg font-semibold">Open in AI Editor</h3>
                <p className="text-sm text-zinc-400">
                  Import your project into Cursor or any AI-powered editor. Let AI understand your codebase instantly.
                </p>
              </div>
              
              <div className="relative">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full border border-zinc-800 bg-zinc-900">
                  <span className="text-sm font-bold">2</span>
                </div>
                <h3 className="font-heading mb-2 text-lg font-semibold">Build with AI</h3>
                <p className="text-sm text-zinc-400">
                  Leverage AI to write code faster. Every template is optimized for AI-assisted development.
                </p>
              </div>
              
              <div className="relative">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full border border-zinc-800 bg-zinc-900">
                  <span className="text-sm font-bold">3</span>
                </div>
                <h3 className="font-heading mb-2 text-lg font-semibold">Ship Fast</h3>
                <p className="text-sm text-zinc-400">
                  Deploy to Vercel and get your first users. The best code is the code that ships.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Quote Section */}
        <section className="px-6 py-16">
          <div className="mx-auto max-w-4xl">
            <div className="p-8 text-center">
              <p className="text-lg italic leading-relaxed text-zinc-100 opacity-75 md:text-xl">
                "Done is better than perfect. Ship early, ship often, and listen to your users."
              </p>
              <p className="text-sm text-zinc-400 mt-4">
                - Reid Hoffman
              </p>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="mt-24">
          <div className="mx-auto max-w-6xl px-6 py-8">
            <p className="text-center text-sm text-zinc-400">
              Crafted with ❤️ at{' '}
              <a 
                href="https://twitter.com/0xcapx" 
                target="_blank" 
                rel="noopener noreferrer"
                className="font-bold text-white hover:text-zinc-300 transition-colors"
              >
                Capx
              </a>
            </p>
          </div>
        </footer>
      </div>
    </main>
  );
}`;

  await fs.writeFile(indexPath, indexContent);
  
  return indexPath;
}

/**
 * Merge template dependencies into the project's package.json
 * @param {string} projectPath - Path to the project directory
 * @param {Array} templateConfigs - Array of template configuration objects
 * @returns {Object} Summary of merged dependencies
 */
async function mergeTemplateDependencies(projectPath, templateConfigs, strategy = 'smart') {
  const packageJsonPath = path.join(projectPath, 'package.json');
  const packageJson = await fs.readJson(packageJsonPath);
  
  // Use the proper dependency merger from template-processor
  const { mergeDependencies } = require('./template-processor');
  const mergeResult = await Promise.resolve(mergeDependencies(templateConfigs, strategy));
  
  // Merge the dependencies into package.json
  Object.assign(packageJson.dependencies, mergeResult.dependencies);
  Object.assign(packageJson.devDependencies, mergeResult.devDependencies);
  
  // Write updated package.json
  await fs.writeJson(packageJsonPath, packageJson, { spaces: 2 });
  
  return {
    dependencies: Object.keys(mergeResult.dependencies).length,
    devDependencies: Object.keys(mergeResult.devDependencies).length,
    conflicts: mergeResult.conflicts,
    warnings: mergeResult.warnings,
    resolutions: mergeResult.resolutions,
    summary: mergeResult.summary,
    peerDependencyAnalysis: mergeResult.peerDependencyAnalysis // Include peer dependency analysis
  };
}

/**
 * Display peer dependency analysis feedback to the user
 * @param {object} peerAnalysis - Peer dependency analysis result
 */
function displayPeerDependencyFeedback(peerAnalysis) {
  if (!peerAnalysis) return;

  const { conflicts, resolutions, summary } = peerAnalysis;
  
  if (conflicts.length === 0 && resolutions.length === 0) {
    // No issues found
    logSuccess(`🔍 Peer dependency analysis completed - no conflicts detected`);
    return;
  }

  console.log('');
  logInfo(`🔍 Peer Dependency Analysis Results:`);
  logDim(`   Analyzed ${summary.totalPackages} packages in ${summary.analysisTime}ms`);

  // Display conflicts by severity
  if (conflicts.length > 0) {
    const severityGroups = {
      high: conflicts.filter(c => c.severity === 'high'),
      medium: conflicts.filter(c => c.severity === 'medium'),
      low: conflicts.filter(c => c.severity === 'low')
    };

    // High severity conflicts (critical issues)
    if (severityGroups.high.length > 0) {
      console.log('');
      logWarning(`⚠️  Critical peer dependency issues (${severityGroups.high.length}):`);
      severityGroups.high.forEach(conflict => {
        logWarning(`   ${conflict.package}: ${conflict.conflictType}`);
        logDim(`     Current: ${conflict.currentVersion}`);
        logDim(`     Required: ${conflict.requiredVersion} (by ${conflict.requiredBy.join(', ')})`);
        logDim(`     ${conflict.recommendation}`);
      });
    }

    // Medium severity conflicts (compatibility issues)
    if (severityGroups.medium.length > 0) {
      console.log('');
      logInfo(`🔄 Peer dependency warnings (${severityGroups.medium.length}):`);
      severityGroups.medium.forEach(conflict => {
        logDim(`   ${conflict.package}: ${conflict.currentVersion} → Required: ${conflict.requiredVersion}`);
      });
    }

    // Low severity conflicts (minor issues)
    if (severityGroups.low.length > 0) {
      logDim(`ℹ️  Minor peer dependency notes: ${severityGroups.low.length} items`);
    }
  }

  // Display automatic resolutions
  if (resolutions.length > 0) {
    console.log('');
    logSuccess(`🔧 Automatic resolutions applied (${resolutions.length}):`);
    resolutions.forEach(resolution => {
      const actionIcon = resolution.action === 'add' ? '➕' : '🔄';
      logSuccess(`   ${actionIcon} ${resolution.package}: ${resolution.action} ${resolution.version}`);
      logDim(`     ${resolution.reason} (confidence: ${resolution.confidence})`);
    });
    
    logInfo('These packages have been automatically added/updated to resolve peer dependency conflicts.');
  }

  console.log('');
}

/**
 * Main project scaffolding function
 * Orchestrates the entire project creation process: directory creation, package.json, config files, template copying, and dependency installation.
 * @param {string} projectPath
 * @param {object} options (e.g., { projectName, typescript, envVars, templates, installDependencies, packageManager })
 */
async function scaffoldProject(projectPath, options = {}) {
  const { 
    projectName = 'next-app', 
    typescript = true,
    tailwind = true,
    eslint = false,
    envVars = [], 
    templates = [],
    author = '',
    description = '',
    installDependencies = true,
    packageManager = null,
    silent = false
  } = options;
  
  // Create cleanup tracker for automatic cleanup on failure
  const cleanup = createCleanupTracker({
    preserveExisting: false, // For scaffolding, we want to clean up everything we created
    autoCleanup: true
  });
  
  // Use withCleanup wrapper to automatically handle cleanup on failure
  return await withCleanup(async (tracker) => {
    // Calculate total steps based on configuration
    let totalSteps = 4; // Basic steps: create dir, package.json, config files, project structure
    if (templates.length > 0) totalSteps += 3; // Template processing steps
    if (installDependencies) totalSteps += 1; // Dependency installation
    totalSteps += 1; // README generation
    
    const progress = new ProgressTracker(totalSteps, { 
      showPercentage: true, 
      showStepCount: true,
      silent: silent
    });
    
    // Step 1: Create project directory
    progress.start('Setting up project...');
    await createDirectory(projectPath);
    tracker.track(projectPath, 'directory');
    
    // Step 2: Generate package.json
    progress.nextStep('Configuring dependencies...');
    const packageJsonPath = await generatePackageJson(projectPath, {
      projectName,
      description,
      author,
      typescript,
      tailwind,
      eslint,
      templates
    });
    tracker.track(packageJsonPath, 'file');
    
    // Step 3: Generate configuration files
    progress.nextStep('Creating configuration files...');
    const configResult = await generateConfigFiles(projectPath, {
      typescript,
      tailwind,
      eslint
    });
    tracker.trackMultiple(configResult.createdFiles, 'file');
    
    // Step 4: Create project structure
    progress.nextStep('Building project structure...');
    const structureResult = await createProjectStructure(projectPath, {
      typescript,
      tailwind
    });
    tracker.trackMultiple(structureResult.createdFiles, 'file');
    tracker.trackMultiple(structureResult.createdDirectories, 'directory');
    
    // Template processing steps (if templates provided)
    if (templates.length > 0) {
      progress.nextStep('Processing templates...');
      
      const { readSelectedTemplateConfigs } = require('./template-processor');
      let templateConfigs = await readSelectedTemplateConfigs(templates);

      // Optimize GOAT template packages based on blockchain selection
      if (templates.some(t => t.sdk === 'goat') && options.goatChain) {
        templateConfigs = templateConfigs.map(config => {
          if (config.name === 'goat') {
            return optimizeGoatPackages(config, options.goatChain);
          }
          return config;
        });
      }
      
      // Step 5a: Merge dependencies from templates
      progress.nextStep('Integrating template dependencies...');
      
      // Merge template dependencies into package.json
      const mergeResult = await mergeTemplateDependencies(projectPath, templateConfigs, options.dependencyStrategy);
      
      // Display dependency resolution information if there were conflicts
      if (mergeResult.conflicts && mergeResult.conflicts.length > 0) {
        // Clear the progress line before showing dependency resolution info
        progress.spinner?.clear();
        console.log('');
        logInfo(`📦 Dependency Resolution Summary:`);
        
        // Group conflicts by severity
        const severityGroups = {
          high: mergeResult.conflicts.filter(c => c.severity === 'high'),
          medium: mergeResult.conflicts.filter(c => c.severity === 'medium'),
          low: mergeResult.conflicts.filter(c => c.severity === 'low')
        };
        
        // Show high-severity conflicts with warnings
        if (severityGroups.high.length > 0) {
          logWarning(`⚠️  High-risk resolutions (${severityGroups.high.length}):`);
          severityGroups.high.forEach(conflict => {
            logWarning(`   ${conflict.package}: ${conflict.versions[0].version} → ${conflict.resolution}`);
            if (conflict.recommendation) {
              logDim(`     ${conflict.recommendation}`);
            }
          });
        }
        
        // Show medium-severity conflicts
        if (severityGroups.medium.length > 0) {
          logInfo(`🔄 Version conflicts resolved (${severityGroups.medium.length}):`);
          severityGroups.medium.forEach(conflict => {
            logDim(`   ${conflict.package}: ${conflict.versions[0].version} → ${conflict.resolution}`);
          });
        }
        
        // Show low-severity (compatible) resolutions
        if (severityGroups.low.length > 0) {
          logSuccess(`✅ Compatible versions merged (${severityGroups.low.length})`);
        }
        
        // Show any compatibility warnings
        if (mergeResult.warnings && mergeResult.warnings.length > 0) {
          const importantWarnings = mergeResult.warnings.filter(w => 
            w.type === 'known_incompatibility' || w.type === 'high_risk_resolution'
          );
          
          if (importantWarnings.length > 0) {
            console.log('');
            logWarning('⚠️  Compatibility Warnings:');
            importantWarnings.forEach(warning => {
              logWarning(`   ${warning.message}`);
              if (warning.recommendation) {
                logDim(`     Recommendation: ${warning.recommendation}`);
              }
            });
          }
        }
        
        console.log('');
        
        // Restart the spinner for the current step
        if (!progress.options.silent) {
          progress.spinner = createSpinner(progress._formatText('Integrating template dependencies...'));
          progress.spinner.start();
        }
      }

      // Display peer dependency analysis feedback
      if (mergeResult.peerDependencyAnalysis) {
        // Clear the progress line before showing peer dependency feedback
        progress.spinner?.clear();
        displayPeerDependencyFeedback(mergeResult.peerDependencyAnalysis);
        
        // Restart the spinner for the current step if not silent
        if (!progress.options.silent) {
          progress.spinner = createSpinner(progress._formatText('Integrating template dependencies...'));
          progress.spinner.start();
        }
      }

      
      // Step 5b: Copy template files
      progress.nextStep('Adding template features...');
      
      const { copyTemplateFiles } = require('./template-processor');
      const copyResult = await copyTemplateFiles(templateConfigs, projectPath, {
        variables: {
          projectName,
          description,
          author
        }
      });

      
      // Track copied files - extract file paths from the copyResult.copiedFiles array
      if (copyResult.copiedFiles && copyResult.copiedFiles.length > 0) {
        const copiedFilePaths = copyResult.copiedFiles.map(fileInfo => 
          path.join(projectPath, fileInfo.targetPath)
        );
        tracker.trackMultiple(copiedFilePaths, 'file');
      }
      

      
      // Step 5c: Generate unified configuration files (.env.example and setup.md)
      // Merge template envVars with options.envVars
      const allEnvVars = [...envVars]; // Start with options.envVars
      templateConfigs.forEach(config => {
        if (config.envVars) {
          config.envVars.forEach(templateEnvVar => {
            // Only add if not already present (avoid duplicates)
            if (!allEnvVars.some(existing => existing.name === templateEnvVar.name)) {
              allEnvVars.push(templateEnvVar);
            }
          });
        }
      });

      // Add GOAT-specific environment variables based on blockchain selection
      if (templates.some(t => t.sdk === 'goat') && options.goatChain) {
        const goatChain = options.goatChain;
        
        // Add chain-specific environment variables
        const goatEnvVars = [
          {
            name: 'GOAT_CHAIN',
            description: `Blockchain to use for GOAT agent`,
            defaultValue: goatChain
          }
        ];

        if (goatChain === 'evm') {
          goatEnvVars.push(
            {
              name: 'RPC_PROVIDER_URL',
              description: 'Base Sepolia RPC endpoint for EVM operations',
              defaultValue: 'https://sepolia.base.org'
            },
            {
              name: 'WALLET_PRIVATE_KEY',
              description: 'Your EVM private key (keep this secure!)'
            }
          );
        } else if (goatChain === 'solana') {
          goatEnvVars.push(
            {
              name: 'RPC_PROVIDER_URL', 
              description: 'Solana Devnet RPC endpoint for Solana operations',
              defaultValue: 'https://api.devnet.solana.com'
            },
            {
              name: 'SOLANA_PRIVATE_KEY',
              description: 'Your Solana private key in base58 format (keep this secure!)'
            }
          );
        }

        // Add GOAT env vars to the list, avoiding duplicates
        goatEnvVars.forEach(goatEnvVar => {
          if (!allEnvVars.some(existing => existing.name === goatEnvVar.name)) {
            allEnvVars.push(goatEnvVar);
          }
        });
      }
      
      // Create modified template configs with merged envVars for configuration generation
      const configsWithMergedEnvVars = templateConfigs.map(config => ({
        ...config,
        envVars: allEnvVars
      }));
      
      const { generateConfigurationFiles } = require('./template-processor');
      const configResult = await generateConfigurationFiles(configsWithMergedEnvVars, projectPath, {
        projectName,
        projectDescription: description,
        author
      });

      
      // Track generated configuration files - extract file paths from the result objects
      if (configResult.generatedFiles && configResult.generatedFiles.length > 0) {
        const configFilePaths = configResult.generatedFiles.map(fileInfo => fileInfo.filePath);
        tracker.trackMultiple(configFilePaths, 'file');
      }
      

      
      // Step 6: Generate dynamic index page based on processed templates
      const indexPagePath = await generateDynamicIndexPage(projectPath, templateConfigs.map(config => ({
        config: {
          name: config.name || `${config._metadata?.sdk}/${config._metadata?.templateName}`,
          description: config.description || 'Template integration',
          route: config.route || `/${config._metadata?.sdk || 'template'}`
        }
      })), { typescript });
      tracker.track(indexPagePath, 'file');
      
    } else {
      // Generate basic sample.env if no templates but envVars provided
      if (envVars.length > 0) {
        const envPath = await generateSampleEnv(projectPath, envVars);
        tracker.track(envPath, 'file');
      }
      
      // Generate basic index page if no templates
      const indexPagePath = await generateDynamicIndexPage(projectPath, [], { typescript });
      tracker.track(indexPagePath, 'file');
    }
    
    // Step 7: Install dependencies if requested
    if (installDependencies) {
      progress.nextStep('Installing packages...');
      
      try {
        // Import the installation system
        const { installProjectDependencies } = require('./install');
        
        // Prepare selected packages for installation (extract SDK names from templates)
        const selectedPackages = templates.map(template => {
          // Extract SDK name from template metadata or path
          if (template.sdk) {
            return template.sdk;
          }
          // Fallback: extract from path if available
          if (template.path) {
            const pathParts = template.path.split(path.sep);
            const templatesIndex = pathParts.indexOf('templates');
            if (templatesIndex >= 0 && pathParts[templatesIndex + 1]) {
              return pathParts[templatesIndex + 1];
            }
          }
          return null;
        }).filter(Boolean);
        
        // Create template configs map for installation system
        const templateConfigs = {};
        if (templates.length > 0) {
          const { readSelectedTemplateConfigs } = require('./template-processor');
          const configs = await readSelectedTemplateConfigs(templates);
          configs.forEach(config => {
            if (config._metadata?.sdk) {
              templateConfigs[config._metadata.sdk] = config;
            }
          });
        }
        
        // Execute dependency installation
        const installResult = await installProjectDependencies(projectPath, selectedPackages, templateConfigs, {
          packageManager,
          silent,
          verbose: false,
          autoRecover: true
        });
        
        if (!installResult.success) {
          logWarning('Dependency installation failed, but project was created successfully.');
          logWarning('You can install dependencies manually by running:');
          logWarning(`  cd ${projectName} && npm install`);
        }
      } catch (installError) {
        logWarning('Dependency installation failed:', installError.message);
        logWarning('Project was created successfully. You can install dependencies manually by running:');
        logWarning(`  cd ${projectName} && npm install`);
      }
    }
    
    // Generate README.md if not present
    progress.nextStep('Finalizing project...');
    const readmePath = path.join(projectPath, 'README.md');
    if (!(await fs.pathExists(readmePath))) {
      const dependencyInstructions = installDependencies 
        ? 'Dependencies have been automatically installed. If you need to reinstall them:\n```bash\nnpm install\n```\n\n'
        : 'Install dependencies:\n```bash\nnpm install\n```\n\n';
      
      const readme = `# ${projectName}\n\n` +
        `This project was generated with the capx-compose scaffolder.\n\n` +
        `## Getting Started\n\n` +
        dependencyInstructions +
        'Run the development server:\n' +
        '```bash\nnpm run dev\n```\n\n' +
        'Open [http://localhost:3000](http://localhost:3000) to see your app.\n\n' +
        '## Project Structure\n' +
        '- `src/pages/`: Next.js pages\n' +
        '- `src/styles/`: Global styles\n' +
        '- `public/`: Static assets\n' +
        (typescript ? '- `tsconfig.json`: TypeScript config\n' : '') +
        '- `next.config.js`: Next.js config\n' +
        '- `.gitignore`: Standard ignores\n' +
        (templates.length > 0 ? '- `.env.example`: Environment variables template\n' : '') +
        (templates.length > 0 ? '- `setup.md`: Comprehensive setup guide\n' : '');
      await fs.writeFile(readmePath, readme);
      tracker.track(readmePath, 'file');
    }
    
    // Complete the progress tracker
    progress.succeed('Project setup complete!');
    
    // Return summary information
    return {
      projectPath,
      templatesProcessed: templates.length,
      success: true
    };
    
  }, cleanup, {
    logError: true,
    performCleanup: true,
    rethrow: true
  });
}

module.exports = {
  scaffoldProject,
  createDirectory,
  generatePackageJson,
  generateConfigFiles,
  createProjectStructure,
  generateSampleEnv,
  generateDynamicIndexPage,
  displayPeerDependencyFeedback
}; 