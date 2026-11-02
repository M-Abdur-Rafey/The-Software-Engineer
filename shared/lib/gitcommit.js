'use strict';
/**
 * The commit gate as a script (no model calls). It runs the 10-point security scan (shared/lib/scan.js) on exactly the
 * files to commit and only then makes the branch and the commit, so whether a commit happens is decided by code, not by
 * an agent reading a scan result. There is no override: a blocking finding means no branch and no commit. An agent
 * supplies only the commit message. It never commits on the current branch: it always creates a new one.
 *
 * Usage:
 *   node shared/lib/gitcommit.js <project> --type <feat|fix|...> --slug <kebab> --session <id> --message "<subject>"
 *        [--body "<text>"] [--out <scan.json>] [--require-verify <sessions-dir>] -- <file> [<file> ...]
 *
 * --require-verify: also refuse to commit unless the Verify phase left its own result file for this session
 * (<sessions-dir>/<session>.verify-<n>.json, written by verify.js) and, when the project's checks are configured, that
 * file says they passed. The file is read here, so an agent's report of the result cannot stand in for it.
 *
 * Prints { committed, branch, hash, message, scan } as JSON; when blocked: { committed: false, blocked: [...], scan }.
 * Exit code 0 when committed, 1 otherwise.
 */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { scan } = require('./scan');
const { lastVerifyFile, readJson } = require('./attest');

const TYPES = ['feat', 'fix', 'chore', 'test', 'docs', 'refactor', 'security'];
const BAD_PATH = new RegExp('[\\x00-\\x1f]');

function git(project, ...args) {
  return execFileSync('git', ['-C', project, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}

/** Plain relative paths only: no "..", nothing absolute, no control characters, no duplicates. */
function cleanFiles(files) {
  const out = [];
  for (const raw of files || []) {
    const p = String(raw).split(String.fromCharCode(92)).join('/').replace(/^[.][/]/, '');
    if (!p || BAD_PATH.test(p) || p.split('/').includes('..') || p.startsWith('/') || /^[A-Za-z]:/.test(p) || p.startsWith('-')) continue;
    if (!out.includes(p)) out.push(p);
  }
  return out;
}

const oneLine = (s) => String(s || '').split(String.fromCharCode(13)).join(' ').split(String.fromCharCode(10)).join(' ').replace(/\s+/g, ' ').trim();

/** null when the commit may go ahead, otherwise why Verify blocks it. */
function verifyBlock(dir, session) {
  if (!/^[A-Za-z0-9-]{1,64}$/.test(String(session || ''))) return 'Verify was required but there is no valid session id to find its result';
  const last = lastVerifyFile(session, dir);
  const data = last ? readJson(last.file) : null;
  if (!data) return 'Verify was required but left no result file: the project checks did not run, so nothing was committed';
  if (data.configured && !data.passed) return 'Verify did not pass: the project checks still fail, so nothing was committed';
  return null;
}

function commitChange(project, files, { type, slug, session, message, body, out, requireVerify } = {}) {
  const list = cleanFiles(files);
  if (!list.length) return { committed: false, error: 'no valid files to commit' };

  // The scan decides. Its result is also written to --out so it can be compared with what anyone relays later.
  const result = scan(project, list);
  if (out) { fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true }); fs.writeFileSync(out, JSON.stringify(result)); }
  if (!result.passed) return { committed: false, blocked: result.blockingFailures, scan: result };
  if (requireVerify) {
    const why = verifyBlock(requireVerify, session);
    if (why) return { committed: false, blocked: [why], scan: result };
  }

  const kind = TYPES.includes(type) ? type : 'feat';
  const name = String(slug || 'change').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 30) || 'change';
  const id = String(session || '').replace(/[^A-Za-z0-9]/g, '').slice(0, 8) || 'session';
  const branch = `${kind}/${name}-${id}`;
  const subject = oneLine(message || `${kind}: ${name}`).slice(0, 72);
  try {
    git(project, 'switch', '-c', branch);
    git(project, 'add', '--', ...list);
    // Only these paths: whatever else the user had already staged stays staged and is not swept into the commit.
    git(project, 'commit', '-m', subject, ...(body && String(body).trim() ? ['-m', String(body).trim()] : []), '--', ...list);
    return { committed: true, branch, hash: git(project, 'rev-parse', 'HEAD'), message: subject, scan: result };
  } catch (e) {
    return { committed: false, error: String((e.stderr && e.stderr.toString()) || e.message).trim().slice(0, 300), scan: result };
  }
}

if (require.main === module) {
  const argv = process.argv.slice(2);
  const sep = argv.indexOf('--');
  const head = sep < 0 ? argv : argv.slice(0, sep);
  const files = sep < 0 ? [] : argv.slice(sep + 1);
  const opt = (name) => { const i = head.indexOf(name); return i >= 0 ? head[i + 1] : undefined; };
  try {
    const project = head[0];
    if (!project || project.startsWith('--')) throw new Error('usage: gitcommit.js <project> --type T --slug S --session ID --message "..." [--body "..."] [--out F] [--require-verify DIR] -- <files>');
    const r = commitChange(path.resolve(project), files, { type: opt('--type'), slug: opt('--slug'), session: opt('--session'), message: opt('--message'), body: opt('--body'), out: opt('--out'), requireVerify: opt('--require-verify') });
    console.log(JSON.stringify(r));
    process.exit(r.committed ? 0 : 1);
  } catch (err) {
    console.error(JSON.stringify({ error: err.message }));
    process.exit(1);
  }
}

module.exports = { commitChange, cleanFiles };
