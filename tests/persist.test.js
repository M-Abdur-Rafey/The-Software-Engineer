'use strict';
/**
 * Tests for shared/lib/persist.js. Writes only to the git-ignored orchestrator sessions folder
 * and removes what it wrote. Run: node tests/persist.test.js (after npm run init).
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { run } = require('../shared/lib/persist');

const ROOT = path.join(__dirname, '..');
const rel = 'agents/orchestrator/vault/sessions/__persist-test/note.md';
let passed = 0;

function test(name, fn) {
  fn();
  passed++;
  console.log(`  ok  ${name}`);
}

try {
  test('writes vault notes and runs db-cli ops', () => {
    const r = run([
      { write: rel, content: '# note\n' },
      { db: ['check-onboarded', 'C:/definitely/not/onboarded'] },
    ]);
    assert.deepStrictEqual(r, { ran: 2, failed: [] });
    assert.strictEqual(fs.readFileSync(path.join(ROOT, rel), 'utf8'), '# note\n');
  });

  test('refuses writes outside agents/<name>/vault/', () => {
    const r = run([
      { write: 'package.json', content: 'x' },
      { write: 'agents/orchestrator/vault/../../../package.json', content: 'x' },
      { write: path.join(ROOT, 'agents/orchestrator/vault/x.md'), content: 'x' },
      { write: 'shared/lib/x.js', content: 'x' },
    ]);
    assert.strictEqual(r.ran, 0);
    assert.strictEqual(r.failed.length, 4);
    assert.ok(JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')).name, 'package.json untouched');
  });

  test('a failing op is reported and the rest still run', () => {
    const r = run([{ db: ['no-such-command'] }, { nope: true }, { write: rel, content: 'second\n' }]);
    assert.strictEqual(r.ran, 1);
    assert.strictEqual(r.failed.length, 2);
    assert.strictEqual(fs.readFileSync(path.join(ROOT, rel), 'utf8'), 'second\n');
  });

  console.log(`\npersist: ${passed} passed`);
} catch (err) {
  console.error(`\nFAILED after ${passed} passed:\n${err.stack}`);
  process.exitCode = 1;
} finally {
  fs.rmSync(path.join(ROOT, path.dirname(rel)), { recursive: true, force: true });
}
