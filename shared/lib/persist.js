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
 *   { "map": "<projectPath>", "sections": {...} | "update": {...} }   the project map (shared/lib/projectmap.js)
 *   { "observe": "<projectPath>", "session": "<id>", "domains": [...], "items": [...] }   lessons (shared/lib/lessons.js)
 *   { "curate": "<projectPath>", "lessons": [...], "proposals": [...] }   the curator's output (shared/lib/lessons.js)
 *
 * Writes are confined to agents/<name>/vault/ under the install dir. Each op runs
 * independently: a failed op is reported, never fatal, because bookkeeping must not undo a
 * finished session. Output: { ran, failed: [{ op, error }] } as JSON.
 */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const projectmap = require('./projectmap');
const lessons = require('./lessons');

const ROOT = path.join(__dirname, '..', '..');
const DB_CLI = path.join(__dirname, 'db-cli.js');
const VAULT_PATH = /^agents\/[a-z0-9-]+\/vault\//;

// Accepts an ops array, an object with persistOps, or a Workflow output file
// ({ result: { persistOps } }, result possibly a JSON string): the skill passes the run's
// output file straight through, so nothing has to be re-typed by a model.
function readOps(arg) {
  const text = arg === '-' ? fs.readFileSync(0, 'utf8') : fs.readFileSync(arg, 'utf8');
  let data = JSON.parse(text);
  if (data && !Array.isArray(data) && data.result !== undefined) {
    data = typeof data.result === 'string' ? JSON.parse(data.result) : data.result;
  }
  const ops = Array.isArray(data) ? data : data && data.persistOps;
  if (!Array.isArray(ops)) throw new Error('no ops found: expected an array, { persistOps }, or a workflow output with result.persistOps');
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
  if (op && typeof op.map === 'string') {
    projectmap.applyOp(op, ROOT);
    return;
  }
  if (op && typeof op.observe === 'string') {
    const db = lessons.openDb();
    try { lessons.record(db, op, { root: ROOT }); } finally { db.close(); }
    return;
  }
  if (op && typeof op.curate === 'string') {
    const db = lessons.openDb();
    try { return { curation: lessons.applyCuration(db, op, { root: ROOT }) }; } finally { db.close(); }
  }
  throw new Error('unknown op (expected "db", "write", "map", "observe" or "curate")');
}

function run(ops) {
  const failed = [];
  let curation = null;
  for (const op of ops) {
    try {
      const out = runOp(op);
      if (out && out.curation) curation = out.curation;
    } catch (err) {
      const detail = err.stderr ? err.stderr.toString().trim() : err.message;
      failed.push({ op: op && (op.db ? `db ${op.db.slice(0, 4).join(' ')}` : op.map ? `map ${op.map}` : op.observe ? `observe ${op.observe}` : op.curate ? `curate ${op.curate}` : `write ${op.write}`), error: detail.slice(0, 300) });
    }
  }
  // The curator's result (what was applied, which proposals were written, what was rejected) for the skill to report.
  return curation ? { ran: ops.length - failed.length, failed, curation } : { ran: ops.length - failed.length, failed };
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

module.exports = { run, readOps };
