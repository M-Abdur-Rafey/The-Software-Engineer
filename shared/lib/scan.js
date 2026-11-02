'use strict';
/**
 * The 10-point pre-commit security scan as a deterministic script (no model calls).
 * Implements agents/gitdevops/vault/security-scans/checklist.md; see
 * design/agent-consolidation.md for why it is a script.
 *
 * Usage:
 *   node shared/lib/scan.js <project> [path ...]
 *
 * Paths (files or directories, relative to the project) are what this session changed;
 * with none, the staged files are scanned. Only lines the change adds are checked: the
 * whole file for new/untracked files, the added lines of `git diff HEAD` otherwise.
 *
 * Output (JSON): { passed, securityFlags: [{ check, severity, passed, detail }], blockingFailures: [string] }
 * Exit code 0 whether or not the scan passes; 1 only on usage errors. There is no override.
 */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const TEST_PATH = /(^|\/)(tests?|__tests__|spec|specs|e2e|cypress|fixtures)\/|\.(test|spec)\.[cm]?[jt]sx?$/i;
const EXAMPLE_ENV = /(^|\/)\.env\.(example|sample|template|dist)$/i;
const ENV_FILE = /(^|\/)\.env(\.[^/]+)?$/i;
const DOC_FILE = /\.(md|mdx|txt|rst)$/i;
const FRONTEND_FILE = /(^|\/)(web|frontend|client|public|app)\/|\.(jsx|tsx|vue|svelte|html)$/i;
const CODE_FILE = /\.[cm]?[jt]sx?$/i;
// A value that is clearly not a real secret: empty, a placeholder, or read from the environment.
const PLACEHOLDER = /^(|['"]{2}|<[^>]*>|\$\{?[A-Z_]+\}?|x+|\*+|changeme|change-me|change_me|your[-_a-z]*|example[-_a-z]*|placeholder|dummy|test|null|undefined|false|true)$/i;
const ENV_READ = /process\.env|import\.meta\.env|os\.environ|getenv\(|ENV\[/;
// A secret hidden behind an environment read: `process.env.API_KEY || "sk_live_..."`, `os.environ.get("X", "lit")`.
const ENV_FALLBACK = /(?:(?:process\.env|import\.meta\.env|os\.environ|getenv\(|ENV\[)[^\n]*?(?:\|\||\?\?|\bor\b)|(?:\.get|getenv)\(\s*['"`][^'"`]+['"`]\s*,)\s*(['"`])([^'"`]+)\1/;
const SECRET_NAME = /(API_?KEY|SECRET|PASSWORD|PASSWD|PRIVATE_?KEY|TOKEN)/i;

function git(project, args) {
  try {
    return execFileSync('git', ['-C', project, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 64 * 1024 * 1024 }).trimEnd();
  } catch {
    return null;
  }
}

const norm = (p) => p.replace(/\\/g, '/').replace(/^\.\//, '');

// Files to scan: the given paths (directories expanded to their tracked + untracked files) or the staged files.
function collectFiles(project, paths, notFound = [], commit = null) {
  if (commit) {
    return (git(project, ['show', '--name-only', '--diff-filter=ACMR', '--format=', commit]) || '').split('\n').filter(Boolean).map(norm);
  }
  if (!paths.length) {
    return (git(project, ['diff', '--staged', '--name-only', '--diff-filter=ACMR']) || '').split('\n').filter(Boolean).map(norm);
  }
  const out = new Set();
  for (const raw of paths) {
    const p = norm(path.isAbsolute(raw) ? path.relative(project, raw) : raw);
    const full = path.join(project, p);
    if (fs.existsSync(full) && fs.statSync(full).isDirectory()) {
      const listed = git(project, ['ls-files', '-co', '--exclude-standard', '--', p]) || '';
      listed.split('\n').filter(Boolean).forEach(f => out.add(norm(f)));
    } else if (fs.existsSync(full)) {
      out.add(p);
    } else {
      notFound.push(p);  // deleted files are expected here; reported so an empty scan is never silent
    }
  }
  return [...out];
}

// '+' lines of a zero-context diff, with their line numbers in the new file.
function parseAdded(diff) {
  const lines = [];
  let n = 0;
  for (const l of diff.split('\n')) {
    const h = /^@@ -\d+(?:,\d+)? \+(\d+)/.exec(l);
    if (h) { n = Number(h[1]); continue; }
    if (l.startsWith('+') && !l.startsWith('+++')) lines.push({ line: l.slice(1), n: n++ });
  }
  return lines;
}

// Lines this change adds to a file: all of it when new/untracked, otherwise '+' lines of the diff vs HEAD.
// With a commit: the lines that commit added, read from git itself (the working tree is not consulted).
function addedLines(project, file, commit = null) {
  if (commit) return parseAdded(git(project, ['show', '--format=', '-U0', commit, '--', file]) || '');
  const tracked = git(project, ['ls-files', '--error-unmatch', '--', file]) !== null && git(project, ['cat-file', '-e', `HEAD:${file}`]) !== null;
  let text;
  try { text = fs.readFileSync(path.join(project, file), 'utf8'); } catch { return []; }
  if (!tracked) return text.split(/\r?\n/).map((line, i) => ({ line, n: i + 1 }));
  const diff = git(project, ['diff', 'HEAD', '-U0', '--', file]) || '';
  const lines = [];
  let n = 0;
  for (const l of diff.split('\n')) {
    const h = /^@@ -\d+(?:,\d+)? \+(\d+)/.exec(l);
    if (h) { n = Number(h[1]); continue; }
    if (l.startsWith('+') && !l.startsWith('+++')) lines.push({ line: l.slice(1), n: n++ });
  }
  return lines;
}

function scan(project, paths, opts = {}) {
  const commit = opts.commit || null;
  const before = commit ? `${commit}^` : 'HEAD';   // where a file must already exist to not be new
  const notFound = [];
  const files = collectFiles(project, paths, notFound, commit);
  const hits = {};
  const add = (key, file, n, text) => { (hits[key] = hits[key] || []).push(`${file}:${n} ${text.trim().slice(0, 80)}`); };
  const newFiles = [];

  for (const file of files) {
    const isTest = TEST_PATH.test(file);
    const isExampleEnv = EXAMPLE_ENV.test(file);
    if (ENV_FILE.test(file) && !isExampleEnv) add('env', file, 0, 'environment file staged');
    const lines = addedLines(project, file, commit);
    if (lines.length && git(project, ['cat-file', '-e', `${before}:${file}`]) === null) newFiles.push({ file, lines });

    for (const { line, n } of lines) {
      // In code a hardcoded secret is a quoted string literal; an unquoted value there is a type annotation
      // (jwtSecret: string), a variable or a field copy (password: body.password). Comment and JSDoc lines are
      // left to the commented-credentials check. Config files (.yaml, .ini, ...) still count unquoted values.
      const isComment = /^\s*(\/\/|\/?\*|#)/.test(line);
      if (!isExampleEnv && !(CODE_FILE.test(file) && isComment)) {
        const value = CODE_FILE.test(file) ? `(['"\`])([^'"\`]*)\\2` : `['"]?([^'"\\s,;)}]*)`;
        // The key starts a name: not the tail of a string like 'new-password' or of a longer word.
        const secret = new RegExp(`(?<![-\\w])[A-Z0-9_]*(API_KEY|SECRET|PASSWORD|PRIVATE_KEY)[A-Z0-9_]*['"]?\\s*[=:]\\s*${value}`, 'i').exec(line);
        const literal = secret && (CODE_FILE.test(file) ? secret[3] : secret[2]);
        if (secret && !ENV_READ.test(line) && !PLACEHOLDER.test(literal) && !/\$\{/.test(literal)) add('secrets', file, n, line);
      }
      if (!isExampleEnv && !isComment && ENV_READ.test(line) && SECRET_NAME.test(line)) {
        const fb = ENV_FALLBACK.exec(line);
        if (fb && !PLACEHOLDER.test(fb[2]) && !/\$\{/.test(fb[2])) add('secrets', file, n, line);
      }
      if (/Bearer [A-Za-z0-9._-]{20,}/.test(line) && !/\$\{/.test(line)) add('bearer', file, n, line);
      if (!isTest && !DOC_FILE.test(file) && !isExampleEnv && /localhost|127\.0\.0\.1/.test(line)) add('localhost', file, n, line);
      if (!isTest && /localStorage.*(Authorization|[Tt]oken)|(Authorization|[Tt]oken).*localStorage/.test(line)) add('localStorage', file, n, line);
      if (/\.(js|json|[cm]?ts|mjs|cjs)$/i.test(file) && !ENV_READ.test(line) &&
          (/DB_PASSWORD\s*[:=]\s*['"][^'"]+['"]/i.test(line) || /DATABASE_URL.*password/i.test(line) ||
           /(postgres(ql)?|mysql|mongodb(\+srv)?):\/\/[^:\s/]+:[^@\s]+@/i.test(line))) add('dbCreds', file, n, line);
      if (!isTest && CODE_FILE.test(file) && /console\.log\s*\(/.test(line)) add('consoleLog', file, n, line);
      if (/(\/\/|#|\/\*).*\b(password|secret)\b/i.test(line) && /[=:]\s*\S{6,}/.test(line)) add('commentedCreds', file, n, line);
    }
  }

  // CSP: required when any frontend file changed; satisfied anywhere in the project.
  const frontendChanged = files.some(f => FRONTEND_FILE.test(f) && !TEST_PATH.test(f) && !DOC_FILE.test(f));
  let cspFound = true;
  if (frontendChanged) {
    const grep = git(project, ['grep', '-I', '-l', '-i', '-E', 'content-security-policy|contentSecurityPolicy|helmet\\(', ...(commit ? [commit] : []), '--', '.', ':!*.md']);
    const untracked = commit ? false : (git(project, ['ls-files', '-o', '--exclude-standard']) || '').split('\n').filter(Boolean)
      .some(f => { try { return /content-security-policy|contentSecurityPolicy|helmet\(/i.test(fs.readFileSync(path.join(project, f), 'utf8')); } catch { return false; } });
    cspFound = Boolean(grep) || untracked;
  }

  const missingHeaders = newFiles
    .filter(({ file }) => CODE_FILE.test(file) && !TEST_PATH.test(file))
    .filter(({ lines }) => !lines.slice(0, 6).some(({ line }) => /^\s*(\/\*\*|\/\/|\/\*|#!|')/.test(line)))
    .map(({ file }) => file);

  const flag = (check, severity, key, ok, okDetail) => ({
    check, severity, passed: ok, detail: ok ? okDetail : (hits[key] || []).slice(0, 5).join(' | ') || okDetail,
  });
  const securityFlags = [
    flag('No .env files staged', 'blocking', 'env', !hits.env, 'none'),
    flag('No hardcoded secrets', 'blocking', 'secrets', !hits.secrets, 'none'),
    flag('No raw bearer tokens in source', 'blocking', 'bearer', !hits.bearer, 'none'),
    flag('No localhost URLs in non-test files', 'blocking', 'localhost', !hits.localhost, 'none'),
    flag('No auth token or Authorization header from localStorage', 'blocking', 'localStorage', !hits.localStorage, 'none'),
    flag('No database credentials in .js/.json', 'blocking', 'dbCreds', !hits.dbCreds, 'none'),
    { check: 'CSP headers defined if frontend files changed', severity: 'blocking', passed: cspFound,
      detail: !frontendChanged ? 'no frontend files changed' : cspFound ? 'CSP found' : 'frontend changed but no Content-Security-Policy (header, helmet or meta tag) in the project' },
    flag('No console.log in production paths', 'warning', 'consoleLog', !hits.consoleLog, 'none'),
    flag('No commented-out credential strings', 'warning', 'commentedCreds', !hits.commentedCreds, 'none'),
    { check: 'New files have a README or header comment', severity: 'info', passed: !missingHeaders.length,
      detail: missingHeaders.length ? `no header comment: ${missingHeaders.slice(0, 5).join(', ')}` : 'ok' },
  ];
  const blockingFailures = securityFlags.filter(f => f.severity === 'blocking' && !f.passed).map(f => `${f.check}: ${f.detail}`);
  return { passed: blockingFailures.length === 0, filesScanned: files.length, notFound, securityFlags, blockingFailures };
}

if (require.main === module) {
  // scan.js <project> [path ...] [--commit <sha>] [--out <file>]
  //   --commit  scan what that commit added (an independent check after the fact); --out  also write the JSON to a file,
  //   so whoever relayed the result can be checked against the file the script itself wrote.
  const args = process.argv.slice(2);
  const take = (flag) => { const i = args.indexOf(flag); if (i < 0) return null; const v = args[i + 1]; args.splice(i, 2); return v || null; };
  const commit = take('--commit');
  const out = take('--out');
  const [project, ...paths] = args;
  if (!project || (commit && !/^([0-9a-f]{4,40}|HEAD)$/i.test(commit))) {
    console.error(JSON.stringify({ error: 'usage: scan.js <project> [path ...] [--commit <sha>] [--out <file>]' }));
    process.exit(1);
  }
  const result = scan(path.resolve(project), paths, { commit });
  if (out) { fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true }); fs.writeFileSync(out, JSON.stringify(result)); }
  console.log(JSON.stringify(result));
}

module.exports = { scan, TEST_PATH };
