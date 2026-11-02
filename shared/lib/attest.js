'use strict';
/**
 * Independent check of a finished session (no model calls). The scan and Verify results travel through agents:
 * an agent runs the script and reports what it printed. This compares those reports with what the scripts
 * themselves wrote to disk, and re-scans the commit from git, so a result an agent invented or mis-copied shows up.
 *
 * Usage:
 *   node shared/lib/attest.js <project> <sessionId> [--commit <sha>] [--scan-passed true|false] [--verify-passed true|false]
 *                             [--docs-targets a,b] [--light-fix true|false]
 *
 * Files read (written by the scripts, not by agents):
 *   agents/orchestrator/vault/sessions/<sessionId>.scan.json        scan.js ... --out
 *   agents/orchestrator/vault/sessions/<sessionId>.verify-<n>.json  verify.js run ... --out (the highest n is the last run)
 *
 * With System Docs (--docs-targets): the approval gate is run again for each target module, and for a run that used the
 * light-fix shortcut (no approval round because nothing was said to depend on the change) the dependents of the files the
 * commit changed are recomputed from the module docs.
 *
 * Prints { ok, problems: [string], scan, verify, rescan, docs } as JSON. Exit code 0 either way; the caller reports problems.
 */

const fs = require('fs');
const path = require('path');
const { scan } = require('./scan');
const sysdocs = require('./sysdocs');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..', '..');
const SESSIONS = path.join(ROOT, 'agents', 'orchestrator', 'vault', 'sessions');
const SESSION_ID = /^[A-Za-z0-9-]{1,64}$/;
const MODULE = /^[a-z0-9][a-z0-9-]*$/;

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
 * claims: { scanPassed?: boolean|null, verifyPassed?: boolean|null, commit?: string|null, docsTargets?: [string], lightFix?: boolean }
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
  // Whose commit is it: the user's. An AI author or an attribution trailer is a problem, whoever wrote the message.
  if (claims.commit) {
    try {
      const raw = execFileSync('git', ['-C', project, 'show', '-s', '--format=%an%n%ae%n%cn%n%ce%n%B', claims.commit], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).split('\n');
      const [an, ae, cn, ce, ...msg] = raw;
      const AI = new RegExp('claude|anthropic|codex|copilot|openai|chatgpt|gemini|cursor|windsurf|[(]ai[)]|\\bbot\\b', 'i');
      out.commitInfo = { author: `${an} <${ae}>`, committer: `${cn} <${ce}>` };
      if ([an, ae, cn, ce].some((x) => AI.test(x))) problems.push(`the commit is authored or committed under a tool identity (${an} <${ae}>); it should carry the user's own git identity`);
      const trailer = msg.find((l) => l.trim().toLowerCase().startsWith('co-authored-by:') || l.toLowerCase().includes('noreply@anthropic.com') || l.trim().toLowerCase().startsWith('generated with'));
      if (trailer) problems.push(`the commit message carries an attribution line: "${trailer.trim().slice(0, 80)}"`);
    } catch (e) {
      problems.push(`the commit's author could not be read: ${e.message}`);
    }
  }

  // System Docs: the gate and the dependents come from the module docs, not from the analyst agent that reported them.
  const targets = (claims.docsTargets || []).filter((n) => MODULE.test(String(n)));
  if (targets.length) {
    out.docs = { targets, gates: [], dependents: [] };
    try {
      for (const name of targets) {
        const g = sysdocs.commands.gate(project, name);
        out.docs.gates.push({ module: name, pass: g.pass, reason: g.reason });
        if (!g.pass && !claims.lightFix) problems.push(`module "${name}" was changed but its doc gate does not pass now (${g.reason})`);
      }
      if (claims.lightFix && claims.commit) {
        const files = execFileSync('git', ['-C', project, 'show', '--name-only', '--format=', claims.commit], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })
          .split('\n').filter((f) => f && !f.startsWith('docs/system/'));
        if (files.length) {
          const impact = sysdocs.commands.impact(project, ...files);
          const dependents = [...new Set(impact.targets.flatMap((t) => (t.consumers || []).map((c) => c.module)))];
          out.docs.dependents = dependents;
          if (dependents.length) problems.push(`the run skipped the approval round as a light fix, but ${dependents.join(', ')} depend on what the commit changed`);
        }
      }
    } catch (e) {
      problems.push(`System Docs could not be re-checked: ${e.message}`);
    }
  }
  return { ok: problems.length === 0, problems, ...out };
}

if (require.main === module) {
  const args = process.argv.slice(2);
  const take = (flag) => { const i = args.indexOf(flag); if (i < 0) return null; const v = args[i + 1]; args.splice(i, 2); return v || null; };
  const commit = take('--commit');
  const scanPassed = asBool(take('--scan-passed'));
  const verifyPassed = asBool(take('--verify-passed'));
  const docsTargets = (take('--docs-targets') || '').split(',').filter(Boolean);
  const lightFix = asBool(take('--light-fix')) === true;
  const [project, sessionId] = args;
  try {
    if (!project || !sessionId) throw new Error('usage: attest.js <project> <sessionId> [--commit <sha>] [--scan-passed true|false] [--verify-passed true|false] [--docs-targets a,b] [--light-fix true|false]');
    if (commit && !new RegExp('^([0-9a-f]{4,40}|HEAD)$', 'i').test(commit)) throw new Error('invalid commit');
    console.log(JSON.stringify(attest(path.resolve(project), sessionId, { scanPassed, verifyPassed, commit, docsTargets, lightFix })));
  } catch (err) {
    console.error(JSON.stringify({ error: err.message }));
    process.exit(1);
  }
}

module.exports = { attest, lastVerifyFile, readJson };
