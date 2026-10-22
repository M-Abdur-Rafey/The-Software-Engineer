'use strict';
/**
 * The Verify phase's runner (design/verify-phase.md): runs a project's own install, build, type-check,
 * lint and test commands, and its session's API collection with Newman, and judges each by exit code or
 * the test runner's report. No model calls. Commands come only from a per-project file the user confirmed:
 *
 *   agents/orchestrator/vault/projects/<name>/verify.json        (confirmed; private, git-ignored, next to map.md)
 *   agents/orchestrator/vault/projects/<name>/verify.draft.json  (onboarding's proposal, never run)
 *
 * Usage:
 *   node shared/lib/verify.js show <project>                    { config, draft }: what runs, and what onboarding proposed
 *   node shared/lib/verify.js set  <project> <json|@file>
 *   node shared/lib/verify.js run  <project> [--baseline <file>] [--collection <file>] [--changed <a,b,...>]
 *                                            [--owners <file>] [--guard <previousRunFile>] [--out <file>]
 *
 * run prints { configured, passed, steps: [...], testsWeakened, attribution, testFiles } as JSON. A step
 * passes when it has no failure that the baseline did not already have. Tests that existed before a fix
 * round and were then edited or deleted (--guard) fail the run: a fix may never weaken the checks.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { spawn, spawnSync } = require('child_process');
const projectmap = require('./projectmap');
const { portFree, hostAllowed } = require('./uitest');
const { TEST_PATH } = require('./scan');

const ROOT = path.join(__dirname, '..', '..');
const KINDS = ['install', 'build', 'typecheck', 'lint', 'test'];
const REPORTS = ['jest', 'vitest', 'mocha'];
const TAIL = 4000;
const DEFAULT_TIMEOUT = 600;     // seconds per step
const DEPS = /(^|\/)(package\.json|package-lock\.json|npm-shrinkwrap\.json|yarn\.lock|pnpm-lock\.yaml|requirements[^/]*\.txt|pyproject\.toml|poetry\.lock)$/i;

const configPath = (project, root = ROOT) => path.join(path.dirname(projectmap.absPath(project, root)), 'verify.json');
const draftPath = (project, root = ROOT) => path.join(path.dirname(projectmap.absPath(project, root)), 'verify.draft.json');
const readJson = (f) => (fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : null);
const norm = (p) => String(p || '').replace(/\\/g, '/').replace(/^\.\//, '');
const tail = (s) => { const t = String(s || ''); return t.length > TAIL ? `...${t.slice(-TAIL)}` : t; };

// ── config ──────────────────────────────────────────────────────────────────

/** Checks a verify.json object; returns an error string or null. */
function validate(cfg) {
  if (!cfg || typeof cfg !== 'object') return 'config must be an object';
  if (!Array.isArray(cfg.steps)) return 'steps must be an array';
  const inside = (cwd) => typeof cwd === 'string' && !path.isAbsolute(cwd) && !norm(cwd).split('/').includes('..');
  for (const [i, s] of cfg.steps.entries()) {
    if (!s || !KINDS.includes(s.kind)) return `steps[${i}].kind must be one of ${KINDS.join(', ')}`;
    if (typeof s.run !== 'string' || !s.run.trim()) return `steps[${i}].run is empty`;
    if (s.cwd !== undefined && !inside(s.cwd)) return `steps[${i}].cwd must be a relative path inside the project`;
    if (s.report !== undefined && s.report !== null && !REPORTS.includes(s.report)) return `steps[${i}].report must be one of ${REPORTS.join(', ')}`;
    if (s.when !== undefined && !['always', 'deps-changed'].includes(s.when)) return `steps[${i}].when must be always or deps-changed`;
  }
  if (cfg.serve) {
    const v = cfg.serve;
    if (typeof v.run !== 'string' || !v.run.trim()) return 'serve.run is empty';
    if (v.cwd !== undefined && !inside(v.cwd)) return 'serve.cwd must be a relative path inside the project';
    if (v.ready !== undefined && !/^\//.test(String(v.ready))) return 'serve.ready must be a path starting with /';
    if (v.env && (typeof v.env !== 'object' || Array.isArray(v.env))) return 'serve.env must be an object';
    if (!Object.values(v.env || {}).some((x) => String(x).includes('{port}'))) return 'serve.env must pass {port} to the app';
  }
  return null;
}

function show(project, root = ROOT) {
  return readJson(configPath(project, root));
}

function draft(project, root = ROOT) {
  return readJson(draftPath(project, root));
}

function set(project, cfg, root = ROOT) {
  const err = validate(cfg);
  if (err) throw new Error(err);
  const f = configPath(project, root);
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, JSON.stringify(cfg, null, 2));
  return f;
}

// ── running commands ────────────────────────────────────────────────────────

// Test runners' machine-readable reports, so results compare test by test. npm-style scripts get the
// flags after "--".
const REPORTERS = {
  jest:   { args: (f) => ['--json', `--outputFile=${f}`], parse: (j) => (j.testResults || []).flatMap((t) => (t.assertionResults || []).filter((a) => a.status === 'failed').map((a) => a.fullName || a.title)) },
  vitest: { args: (f) => ['--reporter=json', `--outputFile=${f}`], parse: (j) => (j.testResults || []).flatMap((t) => (t.assertionResults || []).filter((a) => a.status === 'failed').map((a) => a.fullName || a.title)) },
  mocha:  { args: (f) => ['--reporter', 'json', '--reporter-option', `output=${f}`], parse: (j) => (j.failures || []).map((t) => t.fullTitle || t.title) },
};
const quote = (a) => (/[\s"]/.test(a) ? `"${a.replace(/"/g, '\\"')}"` : a);

function withReport(run, report, file) {
  const args = REPORTERS[report].args(file).map(quote).join(' ');
  return /^(npm|pnpm|yarn)\s+(run\s+)?[\w:-]+\s*$/.test(run.trim()) || /^npm\s+(test|t)\s*$/.test(run.trim())
    ? `${run.trim()} -- ${args}` : `${run.trim()} ${args}`;
}

function exec(command, cwd, timeoutSec) {
  const t0 = Date.now();
  const r = spawnSync(command, { cwd, shell: true, encoding: 'utf8', timeout: timeoutSec * 1000, maxBuffer: 64 * 1024 * 1024, env: { ...process.env, CI: 'true' } });
  const timedOut = r.error && r.error.code === 'ETIMEDOUT';
  return { exitCode: timedOut ? null : r.status, timedOut, durationMs: Date.now() - t0, output: `${r.stdout || ''}${r.stderr || ''}` };
}

function runStep(step, project) {
  const cwd = path.join(project, step.cwd || '.');
  const timeout = step.timeoutSec || DEFAULT_TIMEOUT;
  const reportFile = step.report ? path.join(os.tmpdir(), `verify-${process.pid}-${crypto.randomBytes(4).toString('hex')}.json`) : null;
  const command = reportFile ? withReport(step.run, step.report, reportFile) : step.run;
  const r = exec(command, cwd, timeout);
  let failures = null;
  if (reportFile) {
    try { failures = REPORTERS[step.report].parse(JSON.parse(fs.readFileSync(reportFile, 'utf8'))); } catch { failures = null; }
    fs.rmSync(reportFile, { force: true });
  }
  return { ok: r.exitCode === 0, exitCode: r.exitCode, timedOut: r.timedOut, durationMs: r.durationMs, failures, tail: tail(r.output) };
}

function depsChanged(step, project, changed) {
  const cwd = norm(step.cwd || '.');
  const prefix = cwd === '.' ? '' : `${cwd}/`;
  if (!fs.existsSync(path.join(project, step.cwd || '.', 'node_modules')) && fs.existsSync(path.join(project, step.cwd || '.', 'package.json'))) return true;
  return changed.some((f) => f.startsWith(prefix) && DEPS.test(f.slice(prefix.length)) && !f.slice(prefix.length).includes('/'));
}

// ── API tests with Newman ───────────────────────────────────────────────────

async function freePort() {
  for (let p = 4400; p < 4800; p++) if (await portFree(p)) return p;
  throw new Error('no free port in 4400-4799');
}

function stopTree(child) {
  if (!child || child.exitCode !== null) return;
  if (process.platform === 'win32') spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
  else { try { process.kill(-child.pid, 'SIGTERM'); } catch { /* already gone */ } }
}

async function waitReady(url, child, timeoutSec, log) {
  const end = Date.now() + timeoutSec * 1000;
  while (Date.now() < end) {
    if (child.exitCode !== null) throw new Error(`the app exited with code ${child.exitCode} before it was ready:\n${tail(log())}`);
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(2000) });
      if (r.status < 500) return;
    } catch { /* not up yet */ }
    await new Promise((res) => setTimeout(res, 500));
  }
  throw new Error(`the app was not ready at ${url} within ${timeoutSec}s:\n${tail(log())}`);
}

// Tests the testing agent marked as needing setup live in a "needs setup" folder; they are not run.
function runnableCollection(file) {
  const c = JSON.parse(fs.readFileSync(file, 'utf8'));
  const skipped = [];
  const prune = (items) => (items || []).filter((it) => {
    if (it.item && /needs[\s-]?setup/i.test(it.name || '')) { skipped.push(...flatNames(it.item)); return false; }
    if (it.item) it.item = prune(it.item);
    return true;
  });
  c.item = prune(c.item);
  return { collection: c, skipped };
}
const flatNames = (items) => (items || []).flatMap((it) => (it.item ? flatNames(it.item) : [it.name]));

async function runApi(cfg, project, collectionFile) {
  const step = { kind: 'api', run: `newman run ${path.basename(collectionFile)}`, cwd: '.' };
  if (!cfg.serve) return { ...step, ok: true, skipped: 'serve is not configured: the API collection was not run' };
  const newman = require('newman');
  const port = await freePort();
  const base = `http://127.0.0.1:${port}`;
  if (!hostAllowed(base)) throw new Error(`refusing to test a non-local host: ${base}`);
  const tmpdb = path.join(os.tmpdir(), `verify-${port}-${crypto.randomBytes(4).toString('hex')}.db`);
  const fill = (v) => String(v).replace(/\{port\}/g, String(port)).replace(/\{tmpdb\}/g, tmpdb).replace(/\{random\}/g, crypto.randomBytes(24).toString('hex'));
  const env = { ...process.env, ...Object.fromEntries(Object.entries(cfg.serve.env || {}).map(([k, v]) => [k, fill(v)])) };
  let log = '';
  const child = spawn(cfg.serve.run, { cwd: path.join(project, cfg.serve.cwd || '.'), shell: true, env, detached: process.platform !== 'win32', stdio: ['ignore', 'pipe', 'pipe'] });
  child.stdout.on('data', (d) => { log = (log + d).slice(-TAIL * 2); });
  child.stderr.on('data', (d) => { log = (log + d).slice(-TAIL * 2); });
  const t0 = Date.now();
  try {
    await waitReady(`${base}${cfg.serve.ready || '/'}`, child, cfg.serve.timeoutSec || 60, () => log);
    const { collection, skipped } = runnableCollection(collectionFile);
    const summary = await new Promise((resolve, reject) => newman.run({
      collection, envVar: [{ key: 'baseUrl', value: base }], reporters: [], timeoutRequest: 15000,
    }, (err, s) => (err ? reject(err) : resolve(s))));
    const failures = (summary.run.failures || []).map((f) => `${(f.source && f.source.name) || 'request'}: ${(f.error && (f.error.test || f.error.message)) || 'failed'}`);
    const executed = (summary.run.stats && summary.run.stats.requests && summary.run.stats.requests.total) || 0;
    return { ...step, ok: failures.length === 0, exitCode: failures.length ? 1 : 0, durationMs: Date.now() - t0, failures, requests: executed, notRun: skipped, tail: tail(failures.join('\n') || `${executed} request(s), all assertions passed`) };
  } catch (err) {
    return { ...step, ok: false, exitCode: null, durationMs: Date.now() - t0, failures: null, tail: tail(err.message) };
  } finally {
    stopTree(child);
    for (const f of [tmpdb, `${tmpdb}-wal`, `${tmpdb}-shm`, `${tmpdb}-journal`]) fs.rmSync(f, { force: true });
  }
}

// ── baseline, guard, attribution ────────────────────────────────────────────

const stepKey = (s) => `${s.kind}\u0000${norm(s.cwd || '.')}\u0000${s.run}`;

/** Splits a step's failures into new and already-failing, against the baseline run. */
function compare(step, base) {
  if (step.ok || step.skipped) return { ...step, newFailures: [], alreadyFailing: [] };
  if (!base || base.ok) return { ...step, newFailures: step.failures && step.failures.length ? step.failures : [`${step.kind} failed (exit ${step.exitCode === null ? 'timeout' : step.exitCode})`], alreadyFailing: [] };
  if (step.failures && base.failures) {
    const before = new Set(base.failures);
    return { ...step, newFailures: step.failures.filter((f) => !before.has(f)), alreadyFailing: step.failures.filter((f) => before.has(f)) };
  }
  return { ...step, newFailures: [], alreadyFailing: [`${step.kind} was already failing before this session`] };
}

function testFiles(project) {
  const r = spawnSync('git', ['-C', project, 'ls-files', '-co', '--exclude-standard'], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  if (r.status !== 0) return null;
  const out = {};
  for (const f of r.stdout.split('\n').map(norm).filter((x) => x && TEST_PATH.test(x))) {
    try { out[f] = crypto.createHash('sha1').update(fs.readFileSync(path.join(project, f))).digest('hex'); } catch { /* deleted */ }
  }
  return out;
}

/** Test files present at the previous run that are now changed or gone. */
function weakened(before, now) {
  if (!before || !now) return [];
  return Object.keys(before).filter((f) => now[f] !== before[f]).map((f) => (f in now ? `${f} (edited)` : `${f} (deleted)`));
}

/** Maps each new failure to the domain whose files it names; API failures go to backend. */
function attribute(steps, owners) {
  const files = Object.fromEntries(Object.entries(owners || {}).map(([d, fs_]) => [d, (fs_ || []).map(norm).filter(Boolean)]));
  const fallback = Object.entries(files).sort((a, b) => b[1].length - a[1].length).map(([d]) => d)[0] || 'backend';
  const out = {};
  for (const s of steps) {
    for (const f of s.newFailures || []) {
      let domain = s.kind === 'api' && files.backend ? 'backend' : null;
      if (!domain) {
        const text = `${f}\n${s.tail || ''}`.replace(/\\/g, '/');
        const score = Object.entries(files).map(([d, list]) => [d, list.filter((p) => text.includes(p) || text.includes(path.posix.basename(p))).length]);
        const best = score.sort((a, b) => b[1] - a[1])[0];
        domain = best && best[1] > 0 ? best[0] : fallback;
      }
      (out[domain] = out[domain] || []).push({ kind: s.kind, issue: String(f).slice(0, 300) });
    }
  }
  return out;
}

// ── run ─────────────────────────────────────────────────────────────────────

async function run(project, opts = {}, root = ROOT) {
  const cfg = show(project, root);
  if (!cfg || !cfg.confirmed) {
    return { configured: false, passed: true, steps: [], testsWeakened: [], attribution: {}, testFiles: testFiles(project),
      note: cfg ? 'commands are not confirmed yet: nothing was run' : 'no verify commands for this project: nothing was run' };
  }
  const changed = (opts.changed || []).map(norm);
  const baseline = opts.baseline && fs.existsSync(opts.baseline) ? JSON.parse(fs.readFileSync(opts.baseline, 'utf8')) : null;
  const baseSteps = new Map(((baseline && baseline.steps) || []).map((s) => [stepKey(s), s]));
  const steps = [];
  for (const step of cfg.steps) {
    const meta = { kind: step.kind, cwd: norm(step.cwd || '.'), run: step.run };
    if (step.kind === 'install' && step.when === 'deps-changed' && !depsChanged(step, project, changed)) {
      steps.push({ ...meta, ok: true, skipped: 'dependencies unchanged', newFailures: [], alreadyFailing: [] });
      continue;
    }
    let r = runStep(step, project);
    // One automatic re-run of a failed test step: a pass on the re-run with no code change is flakiness.
    if (!r.ok && step.kind === 'test') {
      const again = runStep(step, project);
      if (again.ok) r = { ...again, flaky: (r.failures && r.failures.length ? r.failures : ['the test command failed once, then passed']) };
      else r = again;
    }
    steps.push(compare({ ...meta, ...r }, baseSteps.get(stepKey(meta))));
    if (step.kind === 'install' && !r.ok) break; // nothing after a failed install is meaningful
  }
  if (opts.collection && fs.existsSync(opts.collection)) steps.push(compare(await runApi(cfg, project, opts.collection), null));
  const files = testFiles(project);
  const prev = opts.guard && fs.existsSync(opts.guard) ? JSON.parse(fs.readFileSync(opts.guard, 'utf8')).testFiles : null;
  const testsWeakened = weakened(prev, files);
  const owners = opts.owners && fs.existsSync(opts.owners) ? JSON.parse(fs.readFileSync(opts.owners, 'utf8')) : {};
  const result = {
    configured: true,
    passed: steps.every((s) => !s.newFailures.length) && !testsWeakened.length,
    steps: steps.map(({ failures, ...s }) => ({ ...s, failures: failures || null })),
    testsWeakened,
    attribution: attribute(steps, owners),
    testFiles: files,
  };
  return result;
}

if (require.main === module) {
  const [cmd, project, ...rest] = process.argv.slice(2);
  const opt = (name) => { const i = rest.indexOf(name); return i >= 0 ? rest[i + 1] : undefined; };
  (async () => {
    if (!project || !['show', 'set', 'run'].includes(cmd)) throw new Error('usage: verify.js show|set|run <project> ...');
    const dir = path.resolve(project);
    if (cmd === 'show') { console.log(JSON.stringify({ config: show(dir), draft: draft(dir) }, null, 2)); return; }
    if (cmd === 'set') {
      const raw = rest[0] || '';
      const cfg = JSON.parse(raw.startsWith('@') ? fs.readFileSync(raw.slice(1), 'utf8') : raw);
      console.log(JSON.stringify({ written: set(dir, cfg) }));
      return;
    }
    const result = await run(dir, {
      baseline: opt('--baseline'), collection: opt('--collection'), owners: opt('--owners'), guard: opt('--guard'),
      changed: (opt('--changed') || '').split(',').filter(Boolean),
    });
    const out = opt('--out');
    if (out) { fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true }); fs.writeFileSync(out, JSON.stringify(result, null, 2)); }
    // Printed without the test-file hashes, which only the guard needs (they stay in --out).
    const { testFiles: _hashes, ...printed } = result;
    console.log(JSON.stringify(printed));
  })().catch((err) => { console.error(JSON.stringify({ error: err.message })); process.exit(1); });
}

module.exports = { KINDS, REPORTS, configPath, draftPath, validate, show, draft, set, run, compare, weakened, attribute, withReport, runnableCollection };
