'use strict';
/**
 * Tests for shared/lib/stage-workflows.js and for how orchestrate.js finds its sub-workflows.
 * Run: node tests/stage.test.js
 */

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const { stage } = require('../shared/lib/stage-workflows');

const WORKFLOWS = path.join(__dirname, '..', '.claude', 'workflows');
const tmp = [];
let passed = 0;
function test(name, fn) {
  fn();
  passed++;
  console.log(`  ok  ${name}`);
}
const mk = () => { const d = fs.mkdtempSync(path.join(os.tmpdir(), 'stage-')); tmp.push(d); return d; };

try {
  test('every workflow script is copied, with LF endings and identical content', () => {
    const dest = mk();
    const r = stage(dest);
    const names = fs.readdirSync(WORKFLOWS).filter((f) => f.endsWith('.js'));
    assert.strictEqual(r.files, names.length);
    assert.ok(r.dir.endsWith('/software-engineer-workflows') && !r.dir.includes(String.fromCharCode(92)), r.dir);
    for (const f of names) {
      const copy = fs.readFileSync(path.join(r.dir, f), 'utf8');
      assert.ok(!copy.includes(String.fromCharCode(13)), `${f} has a carriage return`);
      assert.strictEqual(copy, fs.readFileSync(path.join(WORKFLOWS, f), 'utf8').split(String.fromCharCode(13) + '\n').join('\n'));
    }
  });

  test('staging again replaces the old copy instead of mixing with it', () => {
    const dest = mk();
    const first = stage(dest);
    fs.writeFileSync(path.join(first.dir, 'stale.js'), '// left over');
    const second = stage(dest);
    assert.strictEqual(second.dir, first.dir);
    assert.ok(!fs.existsSync(path.join(second.dir, 'stale.js')));
  });

  test('the command line prints the folder as JSON, and fails without a destination', () => {
    const dest = mk();
    const ok = spawnSync(process.execPath, [path.join(__dirname, '..', 'shared', 'lib', 'stage-workflows.js'), dest], { encoding: 'utf8' });
    assert.strictEqual(ok.status, 0, ok.stderr);
    assert.ok(fs.existsSync(path.join(JSON.parse(ok.stdout).dir, 'orchestrate.js')));
    const bad = spawnSync(process.execPath, [path.join(__dirname, '..', 'shared', 'lib', 'stage-workflows.js')], { encoding: 'utf8' });
    assert.strictEqual(bad.status, 1);
  });

  test('orchestrate.js starts every sub-workflow from workflowsDir, never from the engine folder directly', () => {
    const src = fs.readFileSync(path.join(WORKFLOWS, 'orchestrate.js'), 'utf8');
    assert.ok(src.includes('const WF_DIR'), 'WF_DIR is defined');
    assert.ok(src.includes('args.workflowsDir'), 'it reads the argument');
    const direct = src.split('\n').filter((l) => l.includes('scriptPath') && l.includes('AGENTS_DIR}/.claude/workflows'));
    assert.deepStrictEqual(direct, [], 'a sub-workflow is started from the engine folder: ' + direct.join(' | '));
    assert.ok((src.match(/[$][{]WF_DIR[}]\//g) || []).length >= 12);
  });

  test('the skill tells the session how to stage, and what to pass', () => {
    const skill = fs.readFileSync(path.join(__dirname, '..', 'skills', 'software-engineer', 'SKILL.md'), 'utf8');
    assert.ok(skill.includes('stage-workflows.js'));
    assert.ok(skill.includes('workflowsDir'));
  });

  console.log(`\nstage: ${passed} passed`);
} catch (err) {
  console.error(`\nFAILED after ${passed} passed:\n${err.stack}`);
  process.exitCode = 1;
} finally {
  for (const d of tmp) fs.rmSync(d, { recursive: true, force: true });
}
