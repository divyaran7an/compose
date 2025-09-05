const chalk = require('chalk');
const { listTemplates } = require('./templateDiscovery');
const { validateAllTemplates, validateTemplate } = require('./templateValidator');

class TemplateManager {
  constructor() {
    this._discovered = null;
    this._validationResults = null;
    this._errors = [];
    this._initialized = false;
  }

  async initialize() {
    this._discovered = listTemplates({ showHidden: true });
    this._validationResults = null;
    this._errors = [];
    this._initialized = true;
  }

  async _ensureValidated() {
    if (!this._validationResults) {
      const { results } = await validateAllTemplates({ json: true });
      this._validationResults = results;
      this._errors = results.filter(r => !r.valid);
    }
  }

  async listTemplates({ showHidden = false, onlyValid = true } = {}) {
    if (!this._initialized) await this.initialize();
    await this._ensureValidated();
    let templates = this._discovered;
    if (!showHidden) templates = templates.filter(t => t.config.visible !== false);
    if (onlyValid) {
      const validSet = new Set(this._validationResults.filter(r => r.valid).map(r => `${r.sdk}/${r.template}`));
      templates = templates.filter(t => validSet.has(`${t.sdk}/${t.template}`));
    }
    return templates;
  }

  async getTemplatesBySDK(sdk, options = {}) {
    const all = await this.listTemplates(options);
    return all.filter(t => t.sdk === sdk);
  }

  async findTemplate(sdk, template, options = {}) {
    const all = await this.listTemplates(options);
    return all.find(t => t.sdk === sdk && t.template === template);
  }

  async validateAll({ json = false } = {}) {
    await this._ensureValidated();
    if (json) {
      return this._validationResults;
    } else {
      // Pretty-printed report
      // Use templateValidator's pretty print
      await validateAllTemplates({ json: false });
      return this._validationResults;
    }
  }

  async getValidationReport({ json = false } = {}) {
    await this._ensureValidated();
    if (json) return this._validationResults;
    // Pretty print summary
    const valid = this._validationResults.filter(r => r.valid).length;
    const invalid = this._validationResults.length - valid;
    console.log(chalk.bold('\nTemplate Validation Summary:') +
      ` ${chalk.green(valid + ' valid')}, ${chalk.red(invalid + ' invalid')}`);
    return this._validationResults;
  }

  async getUsableTemplates() {
    return this.listTemplates({ showHidden: false, onlyValid: true });
  }

  invalidateCache() {
    this._discovered = null;
    this._validationResults = null;
    this._errors = [];
    this._initialized = false;
  }

  getErrors() {
    return this._errors;
  }
}

module.exports = new TemplateManager(); 