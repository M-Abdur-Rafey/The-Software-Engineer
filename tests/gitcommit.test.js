'use strict';
/**
 * Tests for shared/lib/gitcommit.js: the scan decides whether a commit happens, inside the script.
 * Throwaway repos. Run: node tests/gitcommit.test.js
 */

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync, spawnSync } = require('child_process');
const { commitChange, cleanFiles } = require('../shared/lib/gitcommit');

const CLI = path.join(__dirname, '..', 'shared', 'lib', 'gitcommit.js');
const tmp = [];
let passed = 0;
function test(name, fn) {
  fn();
  passed++;
  console.log(`  ok  ${name}`);
}

function repo() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gitcommit-'));
  tmp.push(dir);
  const git = (...a) => execFileSync('git', ['-C', dir, '-c', 'core.autocrlf=false', '-c', 'user.email=t@example.com', '-c', 'user.name=T', ...a], { stdio: 'ignore' });
  git('init', '-q');
  fs.writeFileSync(path.join(dir, 'README.md'), '# app\n');
  git('add', '-A');
  git('commit', '-q', '-m', 'base');
  // identity for the commits the script makes
  execFileSync('git', ['-C', dir, 'config', 'user.email', 't@example.com']);
  execFileSync('git', ['-C', dir, 'config', 'user.name', 'T']);
  return dir;
}
const write = (dir, rel, text) => { fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true }); fs.writeFileSync(path.join(dir, rel), text); };
const out = (dir, ...a) => execFileSync('git', ['-C', dir, ...a], { encoding: 'utf8' }).trim();

try {
  test('a clean change is committed on a new branch with exactly the listed files', () => {
    const d = repo();
    write(d, 'src/a.js', '// a\nmodule.exports = 1\n');
    write(d, 'other.txt', 'not part of the commit');
    const r = commitChange(d, ['src/a.js'], { type: 'feat', slug: 'Add A!', session: 'abcd-1234-ef', message: 'feat(a): add a', body: 'why' });
    assert.strictEqual(r.committed, true, JSON.stringify(r));
    assert.strictEqual(r.branch, 'feat/add-a-abcd1234');
    assert.strictEqual(out(d, 'rev-parse', '--abbrev-ref', 'HEAD'), r.branch);
    assert.deepStrictEqual(out(d, 'show', '--name-only', '--format=', 'HEAD').split('\n'), ['src/a.js']);
    assert.ok(out(d, 'status', '--porcelain').includes('other.txt'));
  });

  test('files the user had already staged are not swept into the commit', () => {
    const d = repo();
    write(d, 'src/a.js', '// a\nmodule.exports = 1\n');
    write(d, 'staged-by-user.txt', 'mine');
    execFileSync('git', ['-C', d, 'add', 'staged-by-user.txt']);
    const r = commitChange(d, ['src/a.js'], { type: 'feat', slug: 'only', session: 's9', message: 'feat: only a' });
    assert.strictEqual(r.committed, true, JSON.stringify(r));
    assert.deepStrictEqual(out(d, 'show', '--name-only', '--format=', 'HEAD').split('\n'), ['src/a.js']);
    assert.ok(out(d, 'status', '--porcelain').includes('staged-by-user.txt'), 'still staged, not committed');
  });

  test('a blocking finding means no branch and no commit, and the scan result is written to --out', () => {
    const d = repo();
    write(d, 'src/leak.js', '// leak\nconst API_KEY = "fake-0123456789abcdef";\n');
    const before = out(d, 'rev-parse', 'HEAD');
    const scanFile = path.join(d, 'scan.json');
    const r = commitChange(d, ['src/leak.js'], { type: 'feat', slug: 'leak', session: 's1', message: 'feat: leak', out: scanFile });
    assert.strictEqual(r.committed, false);
    assert.ok(r.blocked.some(x => /secrets/.test(x)), JSON.stringify(r.blocked));
    assert.strictEqual(out(d, 'rev-parse', 'HEAD'), before);
    assert.ok(!out(d, 'branch', '--list', 'feat/*'), 'no branch was created');
    assert.strictEqual(JSON.parse(fs.readFileSync(scanFile, 'utf8')).passed, false);
  });

  test('paths that leave the project are dropped, and nothing valid left means no commit', () => {
    assert.deepStrictEqual(cleanFiles(['./a.js', '../x', '/abs', 'C:/y', '-rf', 'a/../b', 'src/ok.js']), ['a.js', 'src/ok.js']);
    const d = repo();
    assert.strictEqual(commitChange(d, ['../x', '/etc/passwd'], { message: 'x' }).committed, false);
  });

  test('an unknown type falls back to feat; the subject is one line of at most 72 characters', () => {
    const d = repo();
    write(d, 'src/a.js', '// a\nmodule.exports = 1\n');
    const r = commitChange(d, ['src/a.js'], { type: 'rm -rf', slug: 'x', session: 's', message: 'line one\nline two ' + 'x'.repeat(100) });
    assert.strictEqual(r.committed, true);
    assert.ok(r.branch.startsWith('feat/'));
    assert.ok(!r.message.includes('\n') && r.message.length <= 72);
  });

  test('--require-verify: the commit needs the Verify result file the script wrote, and a pass when configured', () => {
    const sess = fs.mkdtempSync(path.join(os.tmpdir(), 'gitcommit-sess-'));
    tmp.push(sess);
    const attempt = (n, data) => fs.writeFileSync(path.join(sess, `sv.verify-${n}.json`), JSON.stringify(data));
    const go = (slug) => {
      const d = repo();
      write(d, 'src/a.js', '// a\nmodule.exports = 1\n');
      return commitChange(d, ['src/a.js'], { type: 'feat', slug, session: 'sv', message: 'feat: x', requireVerify: sess });
    };
    const none = go('none');
    assert.strictEqual(none.committed, false);
    assert.ok(/left no result file/.test(none.blocked[0]), JSON.stringify(none));
    attempt(0, { configured: true, passed: false });
    assert.ok(/did not pass/.test(go('failed').blocked[0]));
    attempt(1, { configured: true, passed: true });            // the highest attempt is the last run
    assert.strictEqual(go('passed').committed, true);
    attempt(2, { configured: false, passed: true });           // nothing configured: nothing to fail
    assert.strictEqual(go('unconfigured').committed, true);
    assert.ok(/valid session id/.test(commitChange(repo(), ['x'], { session: '../x', requireVerify: sess }).blocked[0]));
  });

  test('the command line commits and exits 0, or refuses and exits 1', () => {
    const d = repo();
    write(d, 'src/a.js', '// a\nmodule.exports = 1\n');
    const ok = spawnSync(process.execPath, [CLI, d, '--type', 'fix', '--slug', 'cli', '--session', 'zz', '--message', 'fix: cli', '--', 'src/a.js'], { encoding: 'utf8' });
    assert.strictEqual(ok.status, 0, ok.stdout + ok.stderr);
    assert.strictEqual(JSON.parse(ok.stdout).committed, true);
    write(d, 'src/b.js', '// b\nconst API_KEY = "fake-0123456789abcdef";\n');
    const no = spawnSync(process.execPath, [CLI, d, '--type', 'fix', '--slug', 'cli2', '--session', 'zz', '--message', 'fix: no', '--', 'src/b.js'], { encoding: 'utf8' });
    assert.strictEqual(no.status, 1);
    assert.strictEqual(JSON.parse(no.stdout).committed, false);
  });

  console.log(`\ngitcommit: ${passed} passed`);
} catch (err) {
  console.error(`\nFAILED after ${passed} passed:\n${err.stack}`);
  process.exitCode = 1;
} finally {
  for (const d of tmp) fs.rmSync(d, { recursive: true, force: true });
}
