# Contributing to capx-compose

Thank you for your interest in contributing to capx-compose! This CLI tool helps developers scaffold production-ready AI applications with integrated plugins for Supabase, Vercel AI, Firebase, Solana, EVM chains, and more.

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Contributing Guidelines](#contributing-guidelines)
- [Plugin Development](#plugin-development)
- [Code Style Guidelines](#code-style-guidelines)
- [Testing Guidelines](#testing-guidelines)
- [Pull Request Process](#pull-request-process)
- [Issue Reporting](#issue-reporting)
- [Release Process](#release-process)

## Code of Conduct

This project and everyone participating in it is governed by our Code of Conduct. By participating, you are expected to uphold this code.

### Our Standards

- **Be respectful**: Treat everyone with respect and kindness
- **Be inclusive**: Welcome newcomers and help them learn
- **Be collaborative**: Work together towards common goals
- **Be constructive**: Provide helpful feedback and suggestions
- **Be patient**: Remember that everyone has different experience levels

## Getting Started

### Prerequisites

Before contributing, ensure you have:

- **Node.js 18.0.0+** installed
- **npm 9.0.0+** (or equivalent yarn/pnpm)
- **Git** for version control
- A **GitHub account**

### Fork and Clone

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/capx-compose.git
   cd capx-compose
   ```
3. **Add upstream remote**:
   ```bash
   git remote add upstream https://github.com/capx-ai/capx-compose.git
   ```

## Development Setup

### Installation

```bash
# Install dependencies
npm install

# Run tests to ensure everything works
npm test

# Test the CLI locally
node bin/capx-compose.js my-test-project --yes --skip-install
```

### Verify Installation

```bash
# Check CLI version
node bin/capx-compose.js --version

# List available plugins
node bin/capx-compose.js plugins list

# Run full test suite
npm test
```

## Project Structure

```
capx-compose/
├── bin/                    # CLI entry point
│   └── capx-compose.js        # Main CLI executable
├── lib/                    # Core library modules
│   ├── scaffold.js        # Project scaffolding logic
│   ├── template-processor.js # Template processing engine
│   ├── prompt.js          # Interactive prompts
│   ├── install.js         # Dependency installation
│   ├── validation.js      # Input validation
│   ├── console.js         # Console output utilities
│   ├── cleanup.js         # Project cleanup utilities
│   ├── errors.js          # Error handling utilities
│   ├── progress.js        # Progress tracking utilities
│   ├── templateDiscovery.js # Template discovery
│   ├── templateConfigSchema.js # Template config validation
│   ├── templateValidator.js # Template validation logic
│   ├── TemplateManager.js # Template management
│   └── index.js           # Main library exports
├── templates/             # Plugin templates
│   ├── supabase/         # Supabase integration
│   ├── vercel-ai/        # Vercel AI SDK
│   ├── firebase/         # Firebase services
│   ├── solana/           # Solana Web3
│   ├── evm/              # EVM blockchains
│   └── vercel-kv/        # Vercel KV storage
├── test/                  # Test suite (flat structure)
│   ├── *.test.js         # All test files in root test directory
│   └── ...               # Unit, integration, and validation tests
├── .github/              # CI/CD workflows
│   └── workflows/        # GitHub Actions
├── examples/             # Usage examples
├── scripts/              # Build and utility scripts
├── coverage/             # Test coverage reports (gitignored)
├── README.md             # Project documentation
├── CHANGELOG.md          # Version history
└── package.json          # Package configuration
```

### Development Commands

```bash
# Run all tests (480 tests, ~80 seconds)
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage

# Run linting (placeholder - no linter configured yet)
npm run lint

# Test CLI locally with plugins
node bin/capx-compose.js test-project --plugins="supabase,vercel-ai" --yes --skip-install

# Validate all templates
node bin/capx-compose.js plugins validate

# Clean up test projects
npm run clean
```

## Contributing Guidelines

### Types of Contributions

We welcome several types of contributions:

1. **🐛 Bug Fixes**: Fix issues in existing code
2. **✨ New Features**: Add new CLI functionality
3. **🔌 New Plugins**: Create templates for new platforms/services
4. **📚 Documentation**: Improve documentation and examples
5. **🧪 Tests**: Add or improve test coverage
6. **🔧 Tooling**: Improve development tools and CI/CD
7. **⚡ Dependency Management**: Enhance the intelligent dependency conflict resolution system

### Contribution Workflow

1. **Check existing issues** to avoid duplicate work
2. **Create an issue** for new features or significant changes
3. **Fork and create a feature branch**:
   ```bash
   git checkout -b feature/your-feature-name
   ```
4. **Make your changes** following our guidelines
5. **Add comprehensive tests** for new functionality
6. **Update documentation** as needed
7. **Ensure all tests pass**:
   ```bash
   npm test
   ```
8. **Submit a pull request** with clear description

### Commit Message Guidelines

We follow conventional commits for clear history:

```
type(scope): description

feat(cli): add new plugin validation command
fix(scaffold): resolve dependency merging issue
docs(readme): update installation instructions
test(integration): add end-to-end workflow tests
```

**Types**: `feat`, `fix`, `docs`, `test`, `refactor`, `style`, `chore`

## Plugin Development

### Plugin Structure

Each plugin template follows this standardized structure:

```
templates/your-plugin/
├── config.json           # Plugin configuration (required)
├── *.tsx                 # React/TypeScript source files
├── *.ts                  # TypeScript utility files
├── *.sql                 # Database schema files (if applicable)
├── env.example          # Environment variables (optional)
└── README.md            # Plugin documentation (required)
```

**Note**: Plugins are stored as flat directories without nested `src/` folders. All source files are placed directly in the plugin directory.

### Plugin Configuration (`config.json`)

Every plugin must include a `config.json` file following this exact structure:

```json
{
  "name": "your-plugin",
  "displayName": "Your Plugin Display Name",
  "description": "Brief description of what this plugin provides",
  "packages": [
    { "name": "required-package-1", "version": "^1.0.0" },
    { "name": "required-package-2", "version": "^2.0.0" },
    { "name": "next", "version": "^14.0.0" },
    { "name": "react", "version": "^18.0.0" },
    { "name": "react-dom", "version": "^18.0.0" }
  ],
  "devPackages": [
    { "name": "@types/node", "version": "^20.0.0" },
    { "name": "@types/react", "version": "^18.0.0" },
    { "name": "@types/react-dom", "version": "^18.0.0" },
    { "name": "typescript", "version": "^5.0.0" }
  ],
  "envVars": [
    {
      "name": "API_KEY",
      "description": "Description of this environment variable",
      "required": true
    },
    {
      "name": "ENDPOINT_URL",
      "description": "Description of this endpoint",
      "required": false
    }
  ],
  "files": {
    "example.tsx": "src/pages/your-plugin.tsx",
    "api-example.ts": "src/pages/api/your-plugin.ts",
    "README.md": "README.md"
  },
  "tags": ["ai", "database"],
  "visible": true
}
```

#### Required Fields:
- **`name`**: Plugin identifier (lowercase, kebab-case)
- **`description`**: Brief description of functionality
- **`packages`**: Array of objects with `name` and `version` properties
- **`envVars`**: Array of environment variable objects
- **`files`**: Object mapping source files to destination paths

#### Optional Fields:
- **`displayName`**: Human-readable name for UI display
- **`devPackages`**: Development dependencies (same format as packages)
- **`tags`**: Array of strings for categorization
- **`visible`**: Boolean to show/hide plugin (default: true)

#### Real Example (Supabase Plugin):
```json
{
  "name": "supabase",
  "displayName": "Supabase",
  "description": "Complete Supabase integration with authentication, real-time CRUD operations, and database management",
  "packages": [
    { "name": "@supabase/supabase-js", "version": "^2.39.0" },
    { "name": "next", "version": "^14.0.0" },
    { "name": "react", "version": "^18.0.0" },
    { "name": "react-dom", "version": "^18.0.0" }
  ],
  "devPackages": [
    { "name": "@types/node", "version": "^20.0.0" },
    { "name": "@types/react", "version": "^18.0.0" },
    { "name": "@types/react-dom", "version": "^18.0.0" },
    { "name": "typescript", "version": "^5.0.0" }
  ],
  "envVars": [
    {
      "name": "NEXT_PUBLIC_SUPABASE_URL",
      "description": "Your Supabase project URL"
    },
    {
      "name": "NEXT_PUBLIC_SUPABASE_ANON_KEY",
      "description": "Your Supabase project's anon/public key"
    }
  ],
  "files": {
    "example.tsx": "src/pages/supabase.tsx",
    "auth-example.tsx": "src/pages/supabase-auth.tsx",
    "schema.sql": "schema.sql",
    "README.md": "README.md"
  }
}
```

### Plugin Development Process

1. **Plan Your Plugin**:
   - Identify the platform/service to integrate
   - Define core functionality to demonstrate
   - Research required dependencies and setup

2. **Create Plugin Directory**:
   ```bash
   mkdir templates/your-plugin
   cd templates/your-plugin
   ```

3. **Implement Core Files**:
   - Add `config.json` following the exact schema above
   - Create source files referenced in the `files` mapping
   - Add `env.example` with all environment variables from `envVars`
   - Write comprehensive `README.md` with setup instructions

4. **Test Your Plugin**:
   ```bash
   # Test plugin creation
   node bin/capx-compose.js test-plugin-project --plugins="your-plugin" --yes --skip-install
   
   # Validate plugin structure
   node bin/capx-compose.js plugins validate
   
   # Clean up
   rm -rf test-plugin-project/
   ```

5. **Add Tests**:
   - Create tests in `test/your-plugin.test.js` (in the root test directory)
   - Test plugin discovery, validation, and scaffolding
   - Ensure all tests pass

### Plugin Quality Standards

- **Functional**: Plugin must work out of the box
- **Well-documented**: Clear README with setup instructions
- **Tested**: Include comprehensive tests
- **Secure**: Follow security best practices
- **Performant**: Optimize for fast scaffolding
- **Maintainable**: Clean, readable code

## Code Style Guidelines

### JavaScript/Node.js

- **ES6+ Features**: Use modern JavaScript features
- **Async/Await**: Prefer async/await over promises
- **Error Handling**: Always handle errors gracefully
- **Naming**: Use descriptive variable and function names
- **Comments**: Add comments for complex logic

### File Organization

- **Single Responsibility**: Each module should have one clear purpose
- **Consistent Naming**: Use kebab-case for files, camelCase for variables
- **Logical Grouping**: Group related functionality together

### Example Code Style

```javascript
// Good: Clear, descriptive function with error handling
async function scaffoldProject(projectName, options) {
  try {
    validateProjectName(projectName);
    const templates = await discoverTemplates(options.plugins);
    await createProjectStructure(projectName, templates);
    console.log(`✅ Project ${projectName} created successfully!`);
  } catch (error) {
    console.error(`❌ Failed to create project: ${error.message}`);
    throw error;
  }
}

// Bad: Unclear function with poor error handling
function doStuff(name, opts) {
  // No validation or error handling
  const t = getTemplates(opts.p);
  makeProject(name, t);
}
```

## Testing Guidelines

### Test Structure

- **Unit Tests**: Test individual functions and modules
- **Integration Tests**: Test component interactions
- **Template Tests**: Validate plugin functionality
- **Performance Tests**: Ensure CLI performance standards

### Writing Tests

```javascript
describe('scaffold.js', () => {
  describe('scaffoldProject', () => {
    it('should create project with valid inputs', async () => {
      const result = await scaffoldProject('test-project', {
        plugins: ['supabase'],
        skipInstall: true
      });
      
      expect(result.success).toBe(true);
      expect(fs.existsSync('test-project')).toBe(true);
    });

    it('should handle invalid project names', async () => {
      await expect(scaffoldProject('Invalid Name!', {}))
        .rejects.toThrow('Invalid project name');
    });
  });
});
```

### Test Requirements

- **Coverage**: Maintain >80% test coverage (currently 81%)
- **Descriptive**: Clear test descriptions and assertions
- **Isolated**: Tests should not depend on each other
- **Fast**: Tests should run quickly (current suite: ~77 seconds)
- **Reliable**: Tests should be deterministic

## Pull Request Process

### Before Submitting

1. **Run full test suite**: `npm test`
2. **Check code style**: `npm run lint`
3. **Update documentation** if needed
4. **Add tests** for new functionality
5. **Update CHANGELOG.md** for significant changes

### PR Description Template

```markdown
## Description
Brief description of changes made.

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Plugin addition
- [ ] Documentation update
- [ ] Test improvement

## Testing
- [ ] All existing tests pass
- [ ] New tests added for new functionality
- [ ] Manual testing completed

## Checklist
- [ ] Code follows project style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] No breaking changes (or clearly documented)
```

### Review Process

1. **Automated Checks**: CI/CD pipeline runs tests and validation
2. **Code Review**: Maintainers review code quality and design
3. **Testing**: Manual testing of new functionality
4. **Approval**: At least one maintainer approval required
5. **Merge**: Squash and merge to main branch

## Issue Reporting

### Bug Reports

When reporting bugs, please include:

- **Environment**: Node.js version, OS, npm version
- **Command**: Exact command that caused the issue
- **Expected Behavior**: What should have happened
- **Actual Behavior**: What actually happened
- **Error Messages**: Full error output
- **Reproduction Steps**: Step-by-step instructions

### Feature Requests

For new features, please include:

- **Use Case**: Why this feature is needed
- **Proposed Solution**: How it should work
- **Alternatives**: Other solutions considered
- **Implementation**: Technical approach if known

## Release Process

### Version Management

We follow [Semantic Versioning](https://semver.org/):

- **MAJOR**: Breaking changes
- **MINOR**: New features (backward compatible)
- **PATCH**: Bug fixes (backward compatible)

### Release Checklist

1. **Update version** in `package.json`
2. **Update CHANGELOG.md** with release notes
3. **Run full test suite**: `npm test`
4. **Create release tag**: `git tag v1.0.0`
5. **Push to GitHub**: `git push origin v1.0.0`
6. **GitHub Actions** handles npm publishing

---

## Questions?

- **GitHub Issues**: For bugs and feature requests
- **GitHub Discussions**: For questions and community discussion
- **Documentation**: Check README.md and examples/

Thank you for contributing to capx-compose! 🚀 