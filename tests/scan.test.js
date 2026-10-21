'use strict';
/**
 * Tests for shared/lib/scan.js: one passing and one blocking case per check, each in a
 * throwaway git repo. All "secrets" here are fake values. Run: node tests/scan.test.js
 */

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const { scan } = require('../shared/lib/scan');

const repos = [];
let passed = 0;

function repo(committed = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'scan-test-'));
  repos.push(dir);
  const git = (...a) => execFileSync('git', ['-C', dir, '-c', 'core.autocrlf=false', '-c', 'user.email=t@example.com', '-c', 'user.name=T', ...a], { stdio: 'ignore' });
  git('init', '-q');
  write(dir, Object.assign({ 'README.md': '# app\n' }, committed));
  git('add', '-A');
  git('commit', '-q', '-m', 'base');
  return dir;
}

function write(dir, files) {
  for (const [rel, text] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true });
    fs.writeFileSync(path.join(dir, rel), text);
  }
}

const check = (r, name) => r.securityFlags.find(f => f.check.startsWith(name));

function test(name, fn) {
  fn();
  passed++;
  console.log(`  ok  ${name}`);
}

try {
  test('clean change passes every check', () => {
    const d = repo();
    write(d, { 'src/app.js': '// app entry\nconst key = process.env.API_KEY;\nmodule.exports = key;\n' });
    const r = scan(d, ['src/app.js']);
    assert.strictEqual(r.passed, true, JSON.stringify(r.blockingFailures));
    assert.ok(r.securityFlags.every(f => f.passed), JSON.stringify(r.securityFlags.filter(f => !f.passed)));
  });

  test('.env blocks; .env.example with placeholders does not', () => {
    const d = repo();
    write(d, { '.env': 'JWT_SECRET=fake\n', '.env.example': 'JWT_SECRET=change-me\nAPI_KEY=\n' });
    assert.strictEqual(check(scan(d, ['.env']), 'No .env').passed, false);
    const ok = scan(d, ['.env.example']);
    assert.strictEqual(ok.passed, true, JSON.stringify(ok.blockingFailures));
  });

  test('hardcoded secret blocks; env reads and placeholders do not', () => {
    const d = repo();
    write(d, {
      'src/bad.js': '// x\nconst API_KEY = "fake-0123456789abcdef";\n',
      'src/good.js': '// x\nconst API_KEY = process.env.API_KEY;\nconst PASSWORD = "<your-password>";\n',
    });
    assert.strictEqual(check(scan(d, ['src/bad.js']), 'No hardcoded secrets').passed, false);
    assert.strictEqual(check(scan(d, ['src/good.js']), 'No hardcoded secrets').passed, true);
  });

  test('type annotations, JSDoc and field copies are not hardcoded secrets; quoted literals and config values are', () => {
    const d = repo();
    write(d, {
      'src/app.js': [
        '// x',
        '/**',
        ' * @param {{ db: object, jwtSecret: string, corsOrigin: string }} deps',
        ' */',
        'function login(b) { return { email: b.email, password: b.password }; }',
        'const opts = { jwtSecret: config.jwtSecret, password: hash };',
        'const schema = { password: string().min(8) };',
        'const msg = `secret: ${name}`;',
        "const input = <input autoComplete={isRegister ? 'new-password' : 'current-password'} />;",
      ].join('\n'),
      'src/key.js': '// x\nconst cfg = { jwtSecret: \'fake-0123456789abcdef\' };\n',
      'src/key2.js': '// x\nconst cfg = { "apiKey": 1, "API_KEY": "fake-0123456789abcdef" };\n',
      'config/app.yaml': 'db:\n  password: hunter2hunter2\n',
    });
    assert.strictEqual(check(scan(d, ['src/app.js']), 'No hardcoded secrets').passed, true, 'the false positives from tuning round 1');
    for (const f of ['src/key.js', 'src/key2.js', 'config/app.yaml']) {
      assert.strictEqual(check(scan(d, [f]), 'No hardcoded secrets').passed, false, f);
    }
  });

  test('raw bearer token blocks; template header does not', () => {
    const d = repo();
    write(d, {
      'src/bad.js': '// x\nconst h = "Bearer fakefakefakefakefakefake123";\n',
      'src/good.js': '// x\nconst h = `Bearer ${token}`;\n',
    });
    assert.strictEqual(check(scan(d, ['src/bad.js']), 'No raw bearer').passed, false);
    assert.strictEqual(check(scan(d, ['src/good.js']), 'No raw bearer').passed, true);
  });

  test('localhost blocks in source, not in tests or docs', () => {
    const d = repo();
    write(d, {
      'src/api.js': '// x\nconst base = "http://localhost:3000";\n',
      'tests/api.test.js': 'const base = "http://localhost:3000";\n',
      'docs/setup.md': 'Open http://localhost:3000\n',
    });
    assert.strictEqual(check(scan(d, ['src/api.js']), 'No localhost').passed, false);
    assert.strictEqual(check(scan(d, ['tests/api.test.js', 'docs/setup.md']), 'No localhost').passed, true);
  });

  test('token from localStorage blocks', () => {
    const d = repo();
    write(d, { 'web/src/api.js': '// x\nconst t = localStorage.getItem("token");\n', 'server.js': '// x\napp.use(helmet());\n' });
    assert.strictEqual(check(scan(d, ['web/src/api.js', 'server.js']), 'No auth token').passed, false);
  });

  test('database credentials block; reading them from env does not', () => {
    const d = repo();
    write(d, {
      'src/db.js': '// x\nconst url = "postgres://app:fakepass@db.internal:5432/app";\n',
      'src/db2.js': '// x\nconst pw = process.env.DB_PASSWORD;\n',
    });
    assert.strictEqual(check(scan(d, ['src/db.js']), 'No database credentials').passed, false);
    assert.strictEqual(check(scan(d, ['src/db2.js']), 'No database credentials').passed, true);
  });

  test('frontend change without any CSP blocks; with helmet it passes', () => {
    const d = repo();
    write(d, { 'web/src/App.jsx': '// x\nexport default function App() { return null }\n' });
    const r = scan(d, ['web/src/App.jsx']);
    assert.strictEqual(check(r, 'CSP headers').passed, false);
    assert.strictEqual(r.passed, false);
    write(d, { 'src/server.js': '// x\napp.use(helmet({ contentSecurityPolicy: true }));\n' });
    assert.strictEqual(check(scan(d, ['web/src/App.jsx']), 'CSP headers').passed, true);
  });

  test('only added lines count for files already in the repo', () => {
    const d = repo({ 'src/config.js': '// x\nconst base = "http://localhost:3000";\nconst a = 1;\n' });
    write(d, { 'src/config.js': '// x\nconst base = "http://localhost:3000";\nconst a = 2;\n' });
    assert.strictEqual(check(scan(d, ['src/config.js']), 'No localhost').passed, true);
  });

  test('console.log and missing headers are warnings/info, not blocking', () => {
    const d = repo();
    write(d, { 'src/util.js': 'console.log("debug");\nmodule.exports = 1;\n' });
    const r = scan(d, ['src/util.js']);
    assert.strictEqual(r.passed, true);
    assert.strictEqual(check(r, 'No console.log').passed, false);
    assert.strictEqual(check(r, 'New files have').passed, false);
  });

  test('directories expand to their files; no paths means staged files', () => {
    const d = repo();
    write(d, { 'src/deep/a.js': '// x\nconst API_KEY = "fake-0123456789abcdef";\n' });
    assert.strictEqual(scan(d, ['src']).passed, false);
    execFileSync('git', ['-C', d, 'add', 'src/deep/a.js']);
    const staged = scan(d, []);
    assert.strictEqual(staged.filesScanned, 1);
    assert.strictEqual(staged.passed, false);
  });

  console.log(`\nscan: ${passed} passed`);
} catch (err) {
  console.error(`\nFAILED after ${passed} passed:\n${err.stack}`);
  process.exitCode = 1;
} finally {
  for (const d of repos) fs.rmSync(d, { recursive: true, force: true });
}
