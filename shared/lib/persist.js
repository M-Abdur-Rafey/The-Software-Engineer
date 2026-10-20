'use strict';
/**
 * Runs a session's bookkeeping in one go, with no model calls (design/agent-consolidation.md,
 * phase 1). Domain workflows return their bookkeeping as data instead of spawning an agent
 * each; the skill (or one fallback agent) runs it all here.
 *
 * Usage:
 *   node shared/lib/persist.js <ops.json|->
 *
 * ops.json is an array of:
 *   { "db": ["--as", "backend", "save-decision", ...] }   arguments for shared/lib/db-cli.js
 *   { "write": "agents/<agent>/vault/<path>.md", "content": "..." }
 *
 * Writes are confined to agents/<name>/vault/ under the install dir. Each op runs
 * independently: a failed op is reported, never fatal, because bookkeeping must not undo a
 * finished session. Output: { ran, failed: [{ op, error }] } as JSON.
 */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..', '..');
const DB_CLI = path.join(__dirname, 'db-cli.js');
const VAULT_PATH = /^agents\/[a-z0-9-]+\/vault\//;

function readOps(arg) {
  const text = arg === '-' ? fs.readFileSync(0, 'utf8') : fs.readFileSync(arg, 'utf8');
  const ops = JSON.parse(text);
  if (!Array.isArray(ops)) throw new Error('ops must be a JSON array');
  return ops;
}

function runOp(op) {
  if (op && Array.isArray(op.db)) {
    execFileSync(process.execPath, [DB_CLI, ...op.db.map(String)], { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'] });
    return;
  }
  if (op && typeof op.write === 'string') {
    const rel = op.write.replace(/\\/g, '/');
    if (path.isAbsolute(rel) || rel.split('/').includes('..') || !VAULT_PATH.test(rel)) {
      throw new Error(`write path must be under agents/<name>/vault/: ${op.write}`);
    }
    const file = path.join(ROOT, rel);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, String(op.content == null ? '' : op.content));
    return;
  }
  throw new Error('unknown op (expected "db" or "write")');
}

function run(ops) {
  const failed = [];
  for (const op of ops) {
    try {
      runOp(op);
    } catch (err) {
      const detail = err.stderr ? err.stderr.toString().trim() : err.message;
      failed.push({ op: op && (op.db ? `db ${op.db.slice(0, 4).join(' ')}` : `write ${op.write}`), error: detail.slice(0, 300) });
    }
  }
  return { ran: ops.length - failed.length, failed };
}

if (require.main === module) {
  try {
    if (!process.argv[2]) throw new Error('usage: persist.js <ops.json|->');
    console.log(JSON.stringify(run(readOps(process.argv[2]))));
  } catch (err) {
    console.error(JSON.stringify({ error: err.message }));
    process.exit(1);
  }
}

module.exports = { run };
