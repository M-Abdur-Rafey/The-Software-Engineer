'use strict';
const fs = require('fs');
const path = require('path');
const Ajv = require('ajv');
const { AGENTS_DIR } = require('./db');

const ajv = new Ajv({ allErrors: true });
const schemaCache = {};

function loadSchema(name) {
  if (schemaCache[name]) return schemaCache[name];
  const schemaPath = path.join(AGENTS_DIR, 'shared', 'contracts', `${name}.schema.json`);
  const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
  schemaCache[name] = schema;
  return schema;
}

const NAME = /^[a-z][a-z0-9-]*$/;

function validate(name, data) {
  if (!NAME.test(String(name))) throw new Error(`invalid contract name: ${name}`);
  const schema = loadSchema(name);
  const valid = ajv.validate(schema, data);
  return { valid, errors: valid ? null : ajv.errors };
}

function getSchemaPath(name) {
  return path.join(AGENTS_DIR, 'shared', 'contracts', `${name}.schema.json`);
}

/** One line per problem: "<path> <message>", at most `max`, so a report stays small. */
function summarize(errors, max = 5) {
  return (errors || []).slice(0, max).map((e) => `${e.instancePath || '(root)'} ${e.message}`);
}

module.exports = { validate, loadSchema, getSchemaPath, summarize };

// node shared/lib/contracts.js validate <name> <file|->   prints { name, valid, errors } (exit 1 when invalid)
if (require.main === module) {
  const [cmd, name, file] = process.argv.slice(2);
  try {
    if (cmd !== 'validate' || !name || !file) throw new Error('usage: contracts.js validate <name> <file|->');
    const data = JSON.parse(fs.readFileSync(file === '-' ? 0 : file, 'utf8'));
    const r = validate(name, data);
    console.log(JSON.stringify({ name, valid: r.valid, errors: summarize(r.errors) }));
    if (!r.valid) process.exit(1);
  } catch (err) {
    console.error(JSON.stringify({ error: err.message }));
    process.exit(2);
  }
}
