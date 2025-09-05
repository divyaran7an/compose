const Ajv = require('ajv');

const templateConfigSchema = {
  type: 'object',
  properties: {
    name: { type: 'string' },
    displayName: { type: 'string' },
    description: { type: 'string' },
    packages: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          version: { type: 'string' }
        },
        required: ['name', 'version'],
        additionalProperties: false
      }
    },
    devPackages: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          version: { type: 'string' }
        },
        required: ['name', 'version'],
        additionalProperties: false
      },
      default: []
    },
    envVars: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          description: { type: 'string' },
          required: { type: 'boolean', default: false }
        },
        required: ['name', 'description'],
        additionalProperties: false
      },
      default: []
    },
    files: {
      type: 'object',
      patternProperties: {
        '^.*$': { type: 'string' }
      },
      additionalProperties: false
    },
    tags: {
      type: 'array',
      items: { type: 'string' },
      default: []
    },
    visible: {
      type: 'boolean',
      default: true
    }
  },
  required: ['name', 'description', 'packages', 'envVars', 'files'],
  additionalProperties: false
};

const ajv = new Ajv({ allErrors: true, useDefaults: true });
const validate = ajv.compile(templateConfigSchema);

function validateTemplateConfig(config) {
  const valid = validate(config);
  return {
    valid,
    errors: valid ? null : validate.errors
  };
}

module.exports = {
  templateConfigSchema,
  validateTemplateConfig
}; 