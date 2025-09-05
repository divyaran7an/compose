# Branch Protection Configuration

This document outlines the recommended branch protection rules for the capx-compose repository.

## Main Branch Protection Rules

Configure the following settings for the `main` branch in GitHub repository settings:

### General Settings
- ✅ **Require a pull request before merging**
  - ✅ Require approvals: 1
  - ✅ Dismiss stale PR approvals when new commits are pushed
  - ✅ Require review from code owners (if CODEOWNERS file exists)

### Status Checks
- ✅ **Require status checks to pass before merging**
  - ✅ Require branches to be up to date before merging
  - **Required status checks:**
    - `test (ubuntu-latest, 18)`
    - `test (ubuntu-latest, 20)`
    - `test (ubuntu-latest, 22)`
    - `test (windows-latest, 18)`
    - `test (windows-latest, 20)`
    - `test (windows-latest, 22)`
    - `test (macos-latest, 18)`
    - `test (macos-latest, 20)`
    - `test (macos-latest, 22)`
    - `security`
    - `package-validation`

### Additional Restrictions
- ✅ **Restrict pushes that create files larger than 100MB**
- ✅ **Require signed commits** (recommended for security)
- ✅ **Include administrators** (apply rules to repository administrators)

### Advanced Settings
- ✅ **Allow force pushes**: Disabled
- ✅ **Allow deletions**: Disabled

## Develop Branch Protection Rules (if using)

If using a `develop` branch for integration:

### General Settings
- ✅ **Require a pull request before merging**
  - ✅ Require approvals: 1
  - ❌ Dismiss stale PR approvals (more flexible for development)

### Status Checks
- ✅ **Require status checks to pass before merging**
  - ✅ Require branches to be up to date before merging
  - **Required status checks:**
    - `test (ubuntu-latest, 20)` (minimum requirement)
    - `security`

## Environment Secrets

Configure the following secrets in **Settings** → **Secrets and variables** → **Actions**:

### Currently Disabled (Optional for Future)
- `CODECOV_TOKEN` - For code coverage reporting (currently commented out)
- `SNYK_TOKEN` - For Snyk security scanning (currently commented out)

### Optional Secrets
- `NPM_TOKEN` - For automated npm publishing (when ready)

## Current Security Features

The pipeline currently includes:
- **npm audit**: Dependency vulnerability scanning (moderate+ severity)
- **GitHub CodeQL**: Static code analysis for JavaScript
- **Coverage enforcement**: Automated threshold checking

## Future Enhancements

When ready to enable additional services:

1. **Enable Codecov Integration**:
   - Sign up for Codecov account
   - Add `CODECOV_TOKEN` to repository secrets
   - Uncomment the Codecov upload step in `.github/workflows/test.yml`

2. **Enable Snyk Security Scanning**:
   - Sign up for Snyk account
   - Add `SNYK_TOKEN` to repository secrets
   - Uncomment the Snyk scan step in `.github/workflows/test.yml`

## How to Configure

1. Go to your GitHub repository
2. Navigate to **Settings** → **Branches**
3. Click **Add rule** or edit existing rule for `main`
4. Configure the settings as outlined above
5. Save the protection rule

## Verification

After setting up branch protection:

1. Try to push directly to `main` - should be blocked
2. Create a test PR and verify status checks are required
3. Verify that failing CI blocks the merge
4. Test that coverage requirements are enforced

## Notes

- These settings ensure code quality and prevent breaking changes
- All CI jobs must pass before merging to main
- Coverage threshold of 80% lines / 65% branches is enforced
- Security scanning helps identify vulnerabilities early
- Package validation ensures npm publishing readiness
- External services (Codecov, Snyk) are disabled by default and can be enabled later 