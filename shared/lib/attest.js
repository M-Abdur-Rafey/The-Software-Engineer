'use strict';
/**
 * Independent check of a finished session (no model calls). The scan and Verify results travel through agents:
 * an agent runs the script and reports what it printed. This compares those reports with what the scripts
 * themselves wrote to disk, and re-scans the commit from git, so a result an agent invented or mis-copied shows up.
 *
 * Usage:
 *   node shared/lib/attest.js <project> <sessionId> [--commit <sha>] [--scan-passed true|false] [--verify-passed true|false]
 *
 * Files read (written by the scripts, not by agents):
 *   agents/orchestrator/vault/sessions/<sessionId>.scan.json        scan.js ... --out
 *   agents/orchestrator/vault/sessions/<sessionId>.verify-<n>.json  verify.js run ... --out (the highest n is the last run)
 *
 * Prints { ok, problems: [string], scan, verify, rescan } as JSON. Exit code 0 either way; the caller reports problems.
 */

const fs = require('fs');
const path = require('path');
const { scan } = require('./scan');

const ROOT = path.join(__dirname, '..', '..');
const SESSIONS = path.join(ROOT, 'agents', 'orchestrator', 'vault', 'sessions');
const SESSION_ID = /^[A-Za-z0-9-]{1,64}$/;

const readJson = (f) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return null; } };
const asBool = (v) => (v === 'true' ? true : v === 'false' ? false : null);

function lastVerifyFile(sessionId, dir) {
  let best = null;
  for (const f of fs.existsSync(dir) ? fs.readdirSync(dir) : []) {
    const m = new RegExp('^' + sessionId + '[.]verify-([0-9]+)[.]json$').exec(f);
    if (m && (!best || Number(m[1]) > best.n)) best = { n: Number(m[1]), file: path.join(dir, f) };
  }
  return best;
}

/**
 * claims: { scanPassed?: boolean|null, verifyPassed?: boolean|null, commit?: string|null }
 * A claim of null/undefined means "not reported", and that file is then only read, not required.
 */
function attest(project, sessionId, claims = {}, dir = SESSIONS) {
  if (!SESSION_ID.test(String(sessionId))) throw new Error('invalid session id');
  const problems = [];
  const out = { scan: null, verify: null, rescan: null };

  const scanFile = path.join(dir, `${sessionId}.scan.json`);
  const scanData = readJson(scanFile);
  if (scanData) out.scan = { file: path.basename(scanFile), passed: scanData.passed };
  if (typeof claims.scanPassed === 'boolean') {
    if (!scanData) problems.push('the scan result was reported but scan.js left no output file: the result may not have come from the script');
    else if (scanData.passed !== claims.scanPassed) problems.push(`the scan was reported ${claims.scanPassed ? 'passed' : 'failed'} but scan.js wrote ${scanData.passed ? 'passed' : 'failed'}`);
  }

  const last = lastVerifyFile(sessionId, dir);
  const verifyData = last ? readJson(last.file) : null;
  if (verifyData) out.verify = { file: path.basename(last.file), configured: verifyData.configured, passed: verifyData.passed };
  if (typeof claims.verifyPassed === 'boolean') {
    if (!verifyData) problems.push('Verify was reported but verify.js left no output file: the result may not have come from the script');
    else if (verifyData.passed !== claims.verifyPassed) problems.push(`Verify was reported ${claims.verifyPassed ? 'passed' : 'failed'} but verify.js wrote ${verifyData.passed ? 'passed' : 'failed'}`);
  }

  if (claims.commit) {
    const r = scan(project, [], { commit: claims.commit });
    out.rescan = { commit: claims.commit, passed: r.passed, filesScanned: r.filesScanned, blockingFailures: r.blockingFailures };
    if (!r.passed) problems.push(`an independent scan of commit ${String(claims.commit).slice(0, 10)} found: ${r.blockingFailures.join('; ')}`);
  }
  return { ok: problems.length === 0, problems, ...out };
}

if (require.main === module) {
  const args = process.argv.slice(2);
  const take = (flag) => { const i = args.indexOf(flag); if (i < 0) return null; const v = args[i + 1]; args.splice(i, 2); return v || null; };
  const commit = take('--commit');
  const scanPassed = asBool(take('--scan-passed'));
  const verifyPassed = asBool(take('--verify-passed'));
  const [project, sessionId] = args;
  try {
    if (!project || !sessionId) throw new Error('usage: attest.js <project> <sessionId> [--commit <sha>] [--scan-passed true|false] [--verify-passed true|false]');
    if (commit && !new RegExp('^([0-9a-f]{4,40}|HEAD)$', 'i').test(commit)) throw new Error('invalid commit');
    console.log(JSON.stringify(attest(path.resolve(project), sessionId, { scanPassed, verifyPassed, commit })));
  } catch (err) {
    console.error(JSON.stringify({ error: err.message }));
    process.exit(1);
  }
}

module.exports = { attest };
