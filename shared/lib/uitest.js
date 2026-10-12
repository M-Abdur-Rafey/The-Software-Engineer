'use strict';
/**
 * UI testing CLI: the deterministic parts of `/software-engineer uitest` (see
 * design/ui-testing.md). No model calls.
 *
 * Usage:
 *   node shared/lib/uitest.js <command> ...args
 *
 *   scope <project> [--full] [--modules=a,b]   what to test: modules, flows (and which specs to regenerate),
 *                                              endpoints, security suites, token estimate; or skip + reason
 *   env <project> [--url=U ...] [--ports=a,b]   running services, free ports, Playwright installs, workers,
 *                                              and whether every target URL is an allowed local dev host
 *   check-host <url>...                         exit 1 unless every URL is a local dev host
 *   record <project> <json|@file>               save {commit?, flows:[docPath], tokensUsed?, flowsGenerated?, summary?}
 *                                              to docs/system/testing/state.json
 *
 * <project> is the target project's git repo root. Output is JSON on stdout;
 * errors are JSON on stderr with exit code 1.
 */

const fs = require('fs');
const os = require('os');
const net = require('net');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');
const sysdocs = require('./sysdocs');

const STATE_FILE = ['docs', 'system', 'testing', 'state.json'];
const DEFAULT_TOKENS_PER_FLOW = 80000;   // until a real run records an average
const PLANNER_TOKENS = 200000;
const TRIAGE_RESERVE = 100000;
const SECURITY_SUITES = ['injection', 'xss', 'auth', 'access-control', 'direct-api', 'scraping', 'data-exposure', 'csrf'];
const PROBE_PORTS = [3000, 3001, 4000, 5000, 5173, 8000, 8080, 5432, 3306, 6379, 27017];

// Changes that can't alter behaviour: styling, assets, prose, copy/locale files.
const STYLE_ONLY = /\.(css|scss|sass|less|styl|svg|png|jpe?g|gif|webp|ico|bmp|woff2?|ttf|otf|eot|md|txt)$/i;
const COPY_DIR = /(^|\/)(locales?|i18n|lang|translations)\//i;
// The tests and docs themselves don't change app behaviour.
const IGNORED = /^(docs\/system\/|tests\/ui\/)/;

function fail(message) {
  throw Object.assign(new Error(message), { usage: true });
}

function readInput(arg) {
  if (arg === '-') return fs.readFileSync(0, 'utf8');
  if (arg && arg.startsWith('@')) return fs.readFileSync(arg.slice(1), 'utf8');
  return arg;
}

function flag(args, name) {
  const hit = args.find(a => a === `--${name}` || a.startsWith(`--${name}=`));
  if (!hit) return null;
  return hit.includes('=') ? hit.slice(hit.indexOf('=') + 1) : true;
}

function git(project, args) {
  try {
    return execFileSync('git', ['-C', project, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trimEnd();  // keep leading spaces: porcelain status lines start with them
  } catch {
    return null;
  }
}

const hash = (text) => crypto.createHash('sha1').update(String(text).replace(/\r\n/g, '\n')).digest('hex').slice(0, 12);

// ─── host allowlist (attacks only ever hit local dev hosts) ──────────────────
function hostAllowed(url) {
  let u;
  try { u = new URL(url); } catch { return false; }
  if (!['http:', 'https:', 'ws:', 'wss:'].includes(u.protocol)) return false;
  const h = u.hostname.toLowerCase().replace(/^\[|\]$/g, '');
  return h === 'localhost' || h === '127.0.0.1' || h === '::1' || h.endsWith('.localhost') || h.endsWith('.test');
}

// ─── state ───────────────────────────────────────────────────────────────────
function statePath(project) {
  return path.join(project, ...STATE_FILE);
}

function readState(project) {
  try { return JSON.parse(fs.readFileSync(statePath(project), 'utf8')); } catch { return null; }
}

// ─── scope ───────────────────────────────────────────────────────────────────
function changedSince(project, commit) {
  const committed = git(project, ['diff', '--name-only', commit, 'HEAD']);
  if (committed === null) return null;  // unknown commit: caller falls back to full
  const porcelain = (git(project, ['status', '--porcelain=v1', '-uall']) || '')
    .split('\n').filter(Boolean).map(l => l.slice(3).split(' -> ').pop().replace(/^"|"$/g, ''));
  return [...new Set([...committed.split('\n').filter(Boolean), ...porcelain])].map(sysdocs.normPath);
}

function flowsOf(project, moduleName, state) {
  const dir = path.join(project, 'docs', 'system', 'modules', moduleName, 'flows');
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter(f => f.endsWith('.md')).sort().map(f => {
    const doc = `docs/system/modules/${moduleName}/flows/${f}`;
    const flow = f.replace(/\.md$/, '');
    const spec = `tests/ui/flows/${moduleName}/${flow}.spec.ts`;
    const h = hash(fs.readFileSync(path.join(dir, f), 'utf8'));
    const known = state && state.flows ? state.flows[doc] : null;
    return { module: moduleName, flow, doc, spec, hash: h, regenerate: known !== h || !fs.existsSync(path.join(project, spec)) };
  });
}

function scope(project, ...args) {
  const { modules } = sysdocs.loadModules(project);
  const state = readState(project);
  const only = flag(args, 'modules');
  const onlyList = typeof only === 'string' ? only.split(',').map(s => s.trim()).filter(Boolean) : [];
  let mode = flag(args, 'full') || !state || !state.lastTestedCommit ? 'full' : 'changed';
  let reason = mode === 'full' ? (flag(args, 'full') ? 'full run requested' : 'no previous UI test run') : '';
  let changedFiles = [];
  let unowned = [];
  let inScope = modules.map(m => m.name);
  let changedModules = inScope;

  if (mode === 'changed') {
    const changed = changedSince(project, state.lastTestedCommit);
    if (changed === null) {
      mode = 'full';
      reason = `last tested commit ${state.lastTestedCommit} not found`;
    } else {
      changedFiles = changed.filter(f => !IGNORED.test(f));
      const behavioural = changedFiles.filter(f => !STYLE_ONLY.test(f) && !COPY_DIR.test(f));
      // Modules named with --modules are always tested, even when nothing changed.
      if (!onlyList.length && !changedFiles.length) return { mode, skip: true, reason: 'nothing changed since the last UI test', changedFiles };
      if (!onlyList.length && !behavioural.length) return { mode, skip: true, reason: 'only style, asset or text files changed', changedFiles };
      changedModules = [];
      inScope = [];
      if (behavioural.length) {
        const impact = sysdocs.commands.impact(project, ...behavioural);
        changedModules = [...new Set(impact.targets.flatMap(t => t.providers))];
        inScope = [...new Set([...changedModules, ...impact.targets.flatMap(t => t.consumers.map(c => c.module))])];
        unowned = impact.unowned;
      }
      reason = `${behavioural.length} behavioural file(s) changed in ${changedModules.length} module(s)`;
    }
  }
  if (onlyList.length) {
    const unknown = onlyList.filter(n => !modules.some(m => m.name === n));
    if (unknown.length) fail(`unknown module(s): ${unknown.join(', ')}`);
    inScope = mode === 'full' ? onlyList : [...new Set([...inScope, ...onlyList])];
    changedModules = mode === 'full' ? onlyList : [...new Set([...changedModules, ...onlyList])];
    reason = `${reason}${reason ? '; ' : ''}requested modules: ${onlyList.join(', ')}`;
  }

  const flows = inScope.flatMap(m => flowsOf(project, m, state));
  // Security suites target the endpoints of modules whose code changed (all endpoints on a full run).
  const endpoints = modules.filter(m => changedModules.includes(m.name))
    .flatMap(m => m.provides.filter(tp => tp.startsWith('api:')).map(tp => ({ module: m.name, endpoint: tp.slice(4) })));
  const securitySuites = ['headers', ...(endpoints.length ? SECURITY_SUITES : [])];
  const suitesToGenerate = securitySuites.filter(s => mode === 'full' || s !== 'headers' ||
    !fs.existsSync(path.join(project, 'tests', 'ui', 'security', `${s}.spec.ts`)));

  const perFlow = (state && state.avgTokensPerFlow) || DEFAULT_TOKENS_PER_FLOW;
  const generate = flows.filter(f => f.regenerate).length + suitesToGenerate.length;
  return {
    mode,
    skip: false,
    reason,
    changedFiles,
    unowned,
    modules: inScope,
    changedModules,
    flows,
    endpoints,
    securitySuites,
    suitesToGenerate,
    estimate: {
      specsToGenerate: generate,
      specsReused: flows.length - flows.filter(f => f.regenerate).length,
      tokensPerSpec: perFlow,
      tokensPerSpecSource: state && state.avgTokensPerFlow ? 'measured' : 'default',
      totalTokens: PLANNER_TOKENS + generate * perFlow + TRIAGE_RESERVE,
    },
  };
}

// ─── env ─────────────────────────────────────────────────────────────────────
function portOpen(port) {
  return new Promise(resolve => {
    const s = net.connect({ host: '127.0.0.1', port });
    const done = (open) => { s.destroy(); resolve(open); };
    s.setTimeout(300, () => done(false));
    s.once('connect', () => done(true));
    s.once('error', () => done(false));
  });
}

function portFree(port) {
  return new Promise(resolve => {
    const srv = net.createServer();
    srv.once('error', () => resolve(false));
    srv.listen(port, '127.0.0.1', () => srv.close(() => resolve(true)));
  });
}

function playwrightBrowsersInstalled() {
  const dirs = [
    process.env.PLAYWRIGHT_BROWSERS_PATH,
    process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, 'ms-playwright'),
    path.join(os.homedir(), '.cache', 'ms-playwright'),
    path.join(os.homedir(), 'Library', 'Caches', 'ms-playwright'),
  ].filter(Boolean);
  return dirs.some(d => fs.existsSync(d) && fs.readdirSync(d).some(e => e.startsWith('chromium')));
}

async function env(project, ...args) {
  const urls = args.filter(a => a.startsWith('--url=')).map(a => a.slice(6));
  const portsFlag = flag(args, 'ports');
  const ports = typeof portsFlag === 'string' ? portsFlag.split(',').map(Number).filter(Boolean) : PROBE_PORTS;
  const running = [];
  for (const p of ports) if (await portOpen(p)) running.push(p);
  const freePorts = [];
  for (let p = 4100; p < 4400 && freePorts.length < 3; p++) if (!running.includes(p) && await portFree(p)) freePorts.push(p);

  let pkg = {};
  try { pkg = JSON.parse(fs.readFileSync(path.join(project, 'package.json'), 'utf8')); } catch { /* not a node project */ }
  const declared = Boolean((pkg.devDependencies || {})['@playwright/test'] || (pkg.dependencies || {})['@playwright/test']);
  const installed = fs.existsSync(path.join(project, 'node_modules', '@playwright', 'test'));
  const browsers = playwrightBrowsersInstalled();
  const installs = [];
  if (!declared || !installed) installs.push('npm install -D @playwright/test');
  if (!browsers) installs.push('npx playwright install chromium (browser download, ~150 MB)');

  const targets = urls.map(url => ({ url, allowed: hostAllowed(url) }));
  return {
    runningPorts: running,
    freePorts,
    scripts: pkg.scripts || {},
    playwright: { declared, installed, browsers },
    installs,
    workers: Math.min(8, Math.max(1, Math.floor(os.cpus().length / 2))),
    targets,
    targetsAllowed: targets.every(t => t.allowed),
  };
}

// ─── record ──────────────────────────────────────────────────────────────────
function record(project, input) {
  const data = JSON.parse(readInput(input) || '{}');
  const prev = readState(project) || { flows: {}, runs: 0 };
  const commit = data.commit || git(project, ['rev-parse', '--short=10', 'HEAD']);
  if (!commit) fail('no commit given and HEAD could not be read');
  const flows = Object.assign({}, prev.flows);
  for (const doc of data.flows || []) {
    const file = path.join(project, doc);
    if (fs.existsSync(file)) flows[doc] = hash(fs.readFileSync(file, 'utf8'));
  }
  const runs = (prev.runs || 0) + 1;
  let avg = prev.avgTokensPerFlow || null;
  if (data.tokensUsed && data.flowsGenerated) {
    const sample = Math.round(data.tokensUsed / data.flowsGenerated);
    const n = prev.avgSamples || 0;
    avg = Math.round(((avg || 0) * n + sample) / (n + 1));
    prev.avgSamples = n + 1;
  }
  const next = {
    lastTestedCommit: commit,
    flows,
    avgTokensPerFlow: avg,
    avgSamples: prev.avgSamples || 0,
    runs,
    lastRun: { date: new Date().toISOString().slice(0, 10), summary: data.summary || null },
  };
  fs.mkdirSync(path.dirname(statePath(project)), { recursive: true });
  fs.writeFileSync(statePath(project), `${JSON.stringify(next, null, 2)}\n`);
  return next;
}

// ─── main ────────────────────────────────────────────────────────────────────
const commands = {
  scope: (args) => scope(path.resolve(args[0] || fail('scope needs a project path')), ...args.slice(1)),
  env: (args) => env(path.resolve(args[0] || fail('env needs a project path')), ...args.slice(1)),
  record: (args) => record(path.resolve(args[0] || fail('record needs a project path')), args[1]),
  'check-host': (args) => {
    if (!args.length) fail('check-host needs at least one URL');
    const results = args.map(url => ({ url, allowed: hostAllowed(url) }));
    return { allowed: results.every(r => r.allowed), results };
  },
};

if (require.main === module) {
  const [command, ...rest] = process.argv.slice(2);
  (async () => {
    if (!Object.prototype.hasOwnProperty.call(commands, command)) fail(`Unknown command: ${command}. See file header for usage.`);
    const result = await commands[command](rest);
    console.log(JSON.stringify(result));
    if (command === 'check-host' && !result.allowed) process.exit(1);
  })().catch(err => {
    console.error(JSON.stringify(err.usage ? { error: err.message } : { error: err.message, stack: err.stack }));
    process.exit(1);
  });
}

module.exports = { hostAllowed, scope, env, record, STYLE_ONLY, COPY_DIR };
