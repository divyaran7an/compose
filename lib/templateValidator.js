const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const https = require('https');
const { validateTemplateConfig } = require('./templateConfigSchema');
const { listTemplates } = require('./templateDiscovery');

// Helper to check if a file exists (sync)
function fileExists(filePath) {
  try {
    return fs.existsSync(filePath);
  } catch {
    return false;
  }
}

// Helper to check if an npm package exists (async)
function checkNpmPackageExists(pkgName) {
  return new Promise((resolve) => {
    const url = `https://registry.npmjs.org/${pkgName}`;
    https.get(url, (res) => {
      resolve(res.statusCode === 200);
    }).on('error', () => resolve(false));
  });
}

async function validateTemplate(template) {
  const errors = [];
  // Schema validation (should already be valid, but double-check)
  const { valid, errors: schemaErrors } = validateTemplateConfig(template.config);
  if (!valid) {
    errors.push(...(schemaErrors || []).map(e => ({ type: 'schema', message: e.message })));
  }
  // File existence
  const baseDir = template.path;
  for (const [src, dest] of Object.entries(template.config.files || {})) {
    const srcPath = path.join(baseDir, src);
    if (!fileExists(srcPath)) {
      errors.push({ type: 'file', message: `File not found: ${src}` });
    }
  }
  // Package existence (npm)
  const allPkgs = [
    ...(template.config.packages || []),
    ...(template.config.devPackages || [])
  ];
  for (const pkg of allPkgs) {
    // Only check if name is present
    if (pkg && pkg.name) {
      // eslint-disable-next-line no-await-in-loop
      const exists = await checkNpmPackageExists(pkg.name);
      if (!exists) {
        errors.push({ type: 'package', message: `Unknown npm package: ${pkg.name}` });
      }
    }
  }
  // Env vars (already schema-checked)
  // (Add more custom checks here if needed)
  return {
    ...template,
    valid: errors.length === 0,
    errors
  };
}

function iconAndColor(valid) {
  return valid
    ? { icon: chalk.green('✔️'), color: chalk.green }
    : { icon: chalk.red('❌'), color: chalk.red };
}

function summaryLine(validCount, invalidCount) {
  return (
    chalk.bold('Summary: ') +
    chalk.green(`${validCount} valid`) +
    ', ' +
    chalk.red(`${invalidCount} invalid`)
  );
}

async function validateAllTemplates({ json = false } = {}) {
  const templates = listTemplates({ showHidden: true });
  const results = [];
  let validCount = 0;
  let invalidCount = 0;
  for (const template of templates) {
    // eslint-disable-next-line no-await-in-loop
    const result = await validateTemplate(template);
    results.push(result);
    if (result.valid) validCount++;
    else invalidCount++;
  }
  if (json) {
    return {
      results: results.map(r => ({
        sdk: r.sdk,
        template: r.template,
        path: r.path,
        valid: r.valid,
        errors: r.errors
      })),
      summary: { valid: validCount, invalid: invalidCount }
    };
  } else {
    // Pretty-printed report
    console.log(chalk.bold('\nTemplate Validation Report'));
    console.log(chalk.gray('-------------------------'));
    for (const r of results) {
      const { icon, color } = iconAndColor(r.valid);
      const label = `${r.sdk}/${r.template}`;
      if (r.valid) {
        console.log(`${icon}  ${color(label)}`);
      } else {
        console.log(`${icon}  ${color(label)}:`);
        for (const err of r.errors) {
          console.log('   ' + chalk.redBright(`[${err.type.toUpperCase()}] ${err.message}`));
        }
      }
    }
    console.log();
    console.log(summaryLine(validCount, invalidCount));
    return { results, summary: { valid: validCount, invalid: invalidCount } };
  }
}

module.exports = {
  validateAllTemplates,
  validateTemplate,
  checkNpmPackageExists
}; 