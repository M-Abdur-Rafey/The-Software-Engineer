'use strict';
/**
 * Health check: verifies all databases, tables, vault INDEX.md files, and contract schemas exist.
 * Exits with code 1 if any check fails.
 * Run after seed: node init/verify.js
 */
const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const AGENTS_DIR = path.resolve(__dirname, '..');
const { createLogger } = require(path.join(AGENTS_DIR, 'shared', 'lib', 'logger'));
const log = createLogger('verify');

let pass = 0;
let fail = 0;

function check(label, fn) {
  try {
    fn();
    log.ok(label);
    pass++;
  } catch (err) {
    log.error(`FAIL: ${label} — ${err.message}`);
    fail++;
  }
}

// ─── Agent knowledge.db files ─────────────────────────────────────────────────
const AGENT_NAMES = ['backend', 'frontend', 'database', 'testing', 'gitdevops', 'mcpbridge', 'calls', 'ponytail', 'requirements', 'sre', 'orchestrator'];
const COMMON_TABLES = ['decisions', 'patterns', 'session_log', 'contracts'];

AGENT_NAMES.forEach(name => {
  const dbPath = path.join(AGENTS_DIR, 'agents', name, 'knowledge.db');
  check(`agents/${name}/knowledge.db exists`, () => {
    if (!fs.existsSync(dbPath)) throw new Error('file missing');
  });
  check(`agents/${name}/knowledge.db has correct tables`, () => {
    const db = new Database(dbPath, { readonly: true });
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(r => r.name);
    db.close();
    const expected = name === 'database' ? [...COMMON_TABLES, 'migrations'] : COMMON_TABLES;
    expected.forEach(t => {
      if (!tables.includes(t)) throw new Error(`missing table: ${t}`);
    });
  });
});

// ─── orchestrator.db ─────────────────────────────────────────────────────────
const orchPath = path.join(AGENTS_DIR, 'shared', 'orchestrator.db');
check('shared/orchestrator.db exists', () => {
  if (!fs.existsSync(orchPath)) throw new Error('file missing');
});
check('shared/orchestrator.db has correct tables', () => {
  const db = new Database(orchPath, { readonly: true });
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(r => r.name);
  db.close();
  ['sessions', 'agent_runs', 'contracts_registry'].forEach(t => {
    if (!tables.includes(t)) throw new Error(`missing table: ${t}`);
  });
});

// ─── Vault INDEX.md files ─────────────────────────────────────────────────────
AGENT_NAMES.forEach(name => {
  const indexPath = path.join(AGENTS_DIR, 'agents', name, 'vault', 'INDEX.md');
  check(`agents/${name}/vault/INDEX.md exists and non-empty`, () => {
    if (!fs.existsSync(indexPath)) throw new Error('file missing');
    const content = fs.readFileSync(indexPath, 'utf8');
    if (content.trim().length < 10) throw new Error('file is empty');
  });
});

// ─── Contract schema files ────────────────────────────────────────────────────
const CONTRACT_NAMES = ['task', 'backend', 'frontend', 'database', 'testing', 'gitdevops', 'mcpbridge', 'calls', 'ponytail', 'requirements', 'sre'];
CONTRACT_NAMES.forEach(name => {
  const schemaPath = path.join(AGENTS_DIR, 'shared', 'contracts', `${name}.schema.json`);
  check(`shared/contracts/${name}.schema.json is valid JSON`, () => {
    if (!fs.existsSync(schemaPath)) throw new Error('file missing');
    JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
  });
});

// ─── Shared standards ─────────────────────────────────────────────────────────
['commit-format.md', 'security-rules.md', 'code-standards.md'].forEach(f => {
  check(`shared/standards/${f} exists`, () => {
    const p = path.join(AGENTS_DIR, 'shared', 'standards', f);
    if (!fs.existsSync(p)) throw new Error('file missing');
  });
});

// ─── Shared lib ───────────────────────────────────────────────────────────────
['db.js', 'db-cli.js', 'vault.js', 'logger.js', 'contracts.js', 'acl.js', 'truncate.js'].forEach(f => {
  check(`shared/lib/${f} exists`, () => {
    const p = path.join(AGENTS_DIR, 'shared', 'lib', f);
    if (!fs.existsSync(p)) throw new Error('file missing');
  });
});

// ─── Summary ─────────────────────────────────────────────────────────────────
console.log('');
log.table([
  ['Passed', String(pass), 'green'],
  ['Failed', String(fail), fail > 0 ? 'red' : 'green'],
]);

if (fail > 0) {
  console.error('\nVerification FAILED. Fix the errors above then re-run.\n');
  process.exit(1);
} else {
  console.log('\nAll checks passed. The orchestration system is ready.\n');
}
