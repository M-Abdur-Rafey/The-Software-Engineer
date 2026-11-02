'use strict';
/**
 * Tests for shared/lib/persist.js. Writes only to the git-ignored orchestrator sessions folder
 * and removes what it wrote. Run: node tests/persist.test.js (after npm run init).
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { run, readOps } = require('../shared/lib/persist');

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

  test('db ops: only bookkeeping commands, and knowledge writes must name the caller', () => {
    const r = run([
      { db: ['query', 'backend', 'SELECT 1'] },
      { db: ['insert', 'backend', 'decisions', '{}'] },
      { db: ['save-decision', 'backend', 's', 't', 'x'] },
    ]);
    assert.strictEqual(r.ran, 0);
    assert.strictEqual(r.failed.length, 3);
  });

  test('insert refuses unknown tables and columns', () => {
    const { execFileSync } = require('child_process');
    const cli = path.join(ROOT, 'shared', 'lib', 'db-cli.js');
    const bad = (table, row) => {
      try { execFileSync(process.execPath, [cli, '--as', 'backend', 'insert', 'backend', table, JSON.stringify(row)], { stdio: 'pipe' }); return false; } catch { return true; }
    };
    assert.ok(bad('decisions; DROP TABLE decisions', { id: 'x' }));
    assert.ok(bad('nonexistent', { id: 'x' }));
    assert.ok(bad('decisions', { 'id) VALUES (1); --': 'x' }));
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

  test('reads ops from an array, { persistOps }, or a workflow output file', () => {
    const ops = [{ write: rel, content: 'x' }];
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'persist-test-'));
    const cases = {
      'array.json': ops,
      'object.json': { persistOps: ops },
      'workflow.json': { summary: 's', agentCount: 3, result: { status: 'completed', persistOps: ops } },
      'workflow-string.json': { result: JSON.stringify({ persistOps: ops }) },
    };
    for (const [name, data] of Object.entries(cases)) {
      fs.writeFileSync(path.join(tmp, name), JSON.stringify(data));
      assert.deepStrictEqual(readOps(path.join(tmp, name)), ops, name);
    }
    fs.writeFileSync(path.join(tmp, 'none.json'), JSON.stringify({ result: { status: 'completed' } }));
    assert.throws(() => readOps(path.join(tmp, 'none.json')), /no ops found/);
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  console.log(`\npersist: ${passed} passed`);
} catch (err) {
  console.error(`\nFAILED after ${passed} passed:\n${err.stack}`);
  process.exitCode = 1;
} finally {
  fs.rmSync(path.join(ROOT, path.dirname(rel)), { recursive: true, force: true });
}
