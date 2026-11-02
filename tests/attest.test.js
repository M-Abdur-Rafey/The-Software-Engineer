'use strict';
/**
 * Tests for shared/lib/attest.js: a reported scan/Verify result is compared with the file the script wrote,
 * and the commit is re-scanned from git. Throwaway repo and session folder. Run: node tests/attest.test.js
 */

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const { attest } = require('../shared/lib/attest');

const tmp = [];
let passed = 0;
function test(name, fn) {
  fn();
  passed++;
  console.log(`  ok  ${name}`);
}

function repo(file, text) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'attest-repo-'));
  tmp.push(dir);
  const git = (...a) => execFileSync('git', ['-C', dir, '-c', 'core.autocrlf=false', '-c', 'user.email=t@example.com', '-c', 'user.name=T', ...a], { stdio: 'ignore' });
  git('init', '-q');
  fs.writeFileSync(path.join(dir, 'README.md'), '# app\n');
  git('add', '-A');
  git('commit', '-q', '-m', 'base');
  fs.mkdirSync(path.dirname(path.join(dir, file)), { recursive: true });
  fs.writeFileSync(path.join(dir, file), text);
  git('add', '-A');
  git('commit', '-q', '-m', 'change');
  return dir;
}

function sessions(files) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'attest-sess-'));
  tmp.push(dir);
  for (const [name, data] of Object.entries(files)) fs.writeFileSync(path.join(dir, name), JSON.stringify(data));
  return dir;
}

try {
  test('reports that agree with the script files, and a clean commit, are ok', () => {
    const d = repo('src/a.js', '// a\nmodule.exports = 1\n');
    const s = sessions({ 's1.scan.json': { passed: true }, 's1.verify-0.json': { configured: true, passed: false }, 's1.verify-1.json': { configured: true, passed: true } });
    const r = attest(d, 's1', { scanPassed: true, verifyPassed: true, commit: 'HEAD' }, s);
    assert.strictEqual(r.ok, true, JSON.stringify(r.problems));
    assert.strictEqual(r.verify.file, 's1.verify-1.json');   // the highest attempt is the last run
  });

  test('a reported pass with no file from the script is a problem', () => {
    const d = repo('src/a.js', '// a\nmodule.exports = 1\n');
    const r = attest(d, 's2', { scanPassed: true, verifyPassed: true }, sessions({}));
    assert.strictEqual(r.ok, false);
    assert.strictEqual(r.problems.length, 2);
  });

  test('a report that contradicts the file is a problem', () => {
    const d = repo('src/a.js', '// a\nmodule.exports = 1\n');
    const s = sessions({ 's3.scan.json': { passed: false }, 's3.verify-0.json': { configured: true, passed: false } });
    const r = attest(d, 's3', { scanPassed: true, verifyPassed: true }, s);
    assert.strictEqual(r.problems.length, 2);
    assert.ok(r.problems.every(p => /reported/.test(p)));
  });

  test('a secret in the commit is found even when the reported scan said passed', () => {
    const d = repo('src/leak.js', '// leak\nconst API_KEY = "fake-0123456789abcdef";\n');
    const s = sessions({ 's4.scan.json': { passed: true } });
    const r = attest(d, 's4', { scanPassed: true, commit: 'HEAD' }, s);
    assert.strictEqual(r.ok, false);
    assert.ok(r.problems.some(p => /independent scan/.test(p)), JSON.stringify(r.problems));
  });

  test('a session id cannot point outside the sessions folder', () => {
    const d = repo('src/a.js', '// a\n');
    assert.throws(() => attest(d, '../../etc/passwd', {}, sessions({})), /invalid session id/);
  });

  console.log(`\nattest: ${passed} passed`);
} catch (err) {
  console.error(`\nFAILED after ${passed} passed:\n${err.stack}`);
  process.exitCode = 1;
} finally {
  for (const d of tmp) fs.rmSync(d, { recursive: true, force: true });
}
