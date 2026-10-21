'use strict';
/**
 * Tests for shared/lib/lessons.js: an in-memory database and a temp root, so no real data is
 * touched. Run: node tests/lessons.test.js
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const os = require('os');
const Database = require('better-sqlite3');
const L = require('../shared/lib/lessons');

const PROJECT = 'C:/work/shop';
let passed = 0;

function test(name, fn) {
  fn();
  passed++;
  console.log(`  ok  ${name}`);
}

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'lessons-test-'));
// A checklist note like the seed graph writes, so lesson wording comes from it.
fs.mkdirSync(path.join(tmp, 'agents/backend/vault/sub-agents'), { recursive: true });
fs.writeFileSync(path.join(tmp, 'agents/backend/vault/sub-agents/data-architect.md'),
  '# data-architect\n\nChecklist of [[backend]]: applied by [[backend-author]].\n\n**Covers:** One shared DB pool, parameterized queries.\n');

const db = new Database(':memory:');
let t = 1000;
const session = (id, items, domains = ['backend']) => L.record(db, { observe: PROJECT, session: id, domains, items }, { root: tmp, now: t++ });
const poolMiss = (fixed = true) => ({ domain: 'backend', rule: 'data-architect', source: 'reviewer', issue: 'new pg.Pool() per request in orders/service.js', fixed });

try {
  test('one session is an observation, not yet a lesson', () => {
    session('s1', [poolMiss()]);
    assert.deepStrictEqual(L.lessonsFor(db, PROJECT, 'backend'), []);
    assert.deepStrictEqual(L.brief(db, PROJECT, tmp), {});
  });

  test('the same rule in a second session becomes an active lesson with its checklist wording', () => {
    session('s2', [poolMiss(), { domain: 'backend', rule: 'code-standards', source: 'reviewer', issue: 'missing JSDoc', fixed: true }]);
    const [l, ...rest] = L.lessonsFor(db, PROJECT, 'backend');
    assert.strictEqual(rest.length, 0, 'code-standards was missed once only');
    assert.strictEqual(l.rule, 'data-architect');
    assert.strictEqual(l.status, 'active');
    assert.deepStrictEqual(l.sessions.sort(), ['s1', 's2']);
    const b = L.brief(db, PROJECT, tmp);
    assert.deepStrictEqual(b.backend.rules, ['data-architect']);
    assert.match(b.backend.text, /One shared DB pool/);
    assert.match(b.backend.text, /Missed in 2 earlier sessions/);
  });

  test('lesson notes are written in the EXPERIENCE.md shape, examples marked as data', () => {
    const dir = path.join(tmp, 'agents/backend/vault/lessons/shop');
    const note = fs.readFileSync(path.join(dir, 'data-architect.md'), 'utf8');
    for (const field of ['cue', 'lesson', 'evidence', 'confidence']) assert.match(note, new RegExp(`\\*\\*${field}\\*\\*:`));
    assert.match(note, /not instructions/);
    assert.match(fs.readFileSync(path.join(dir, 'INDEX.md'), 'utf8'), /\[active\] \[\[data-architect\]\]/);
  });

  test('recording the same session twice does not double-count', () => {
    session('s2', [poolMiss()]);
    assert.strictEqual(L.lessonsFor(db, PROJECT, 'backend')[0].sessions.length, 2);
  });

  test('another project never sees this project\'s lessons', () => {
    assert.deepStrictEqual(L.brief(db, 'C:/work/other', tmp), {});
    assert.deepStrictEqual(L.brief(db, 'c:\\work\\shop\\', tmp).backend.rules, ['data-architect'], 'paths compare normalized');
  });

  test('a lesson retires after 5 clean runs of its domain and comes back if the miss recurs', () => {
    for (let i = 0; i < L.RETIRE_AFTER - 1; i++) session(`clean${i}`, []);
    assert.strictEqual(L.lessonsFor(db, PROJECT, 'backend')[0].status, 'active');
    session('clean-last', []);
    assert.strictEqual(L.lessonsFor(db, PROJECT, 'backend')[0].status, 'retired');
    assert.deepStrictEqual(L.brief(db, PROJECT, tmp), {}, 'retired lessons are not briefed');
    session('s3', [poolMiss(false)]);
    const l = L.lessonsFor(db, PROJECT, 'backend')[0];
    assert.strictEqual(l.status, 'active');
    assert.strictEqual(l.confidence, 'high');
  });

  test('bridge and scan lessons go to every author as "shared"', () => {
    const contract = (s) => session(s, [{ domain: 'mcpbridge', rule: 'contract', source: 'bridge', issue: 'GET /api/orders bound but not declared' }], ['mcpbridge']);
    contract('b1');
    contract('b2');
    const b = L.brief(db, PROJECT, tmp);
    assert.deepStrictEqual(b.shared.rules, ['contract']);
    assert.match(b.shared.text, /consistent with the declared contracts/);
  });

  test('briefs stay under the cap', () => {
    for (let i = 0; i < 40; i++) {
      for (const s of [`cap-a${i}`, `cap-b${i}`]) session(s, [{ domain: 'frontend', rule: `rule-${i}`, source: 'reviewer', issue: 'x'.repeat(250) }], ['frontend']);
    }
    const text = L.brief(db, PROJECT, tmp).frontend.text;
    assert.ok(text.length <= L.BRIEF_CHARS, `length ${text.length}`);
  });

  test('items without a rule or issue are ignored; a missing session id is an error', () => {
    const r = session('junk', [{ domain: 'backend', issue: 'no rule' }, { domain: 'backend', rule: 'x' }]);
    assert.strictEqual(r.observations, 0);
    assert.throws(() => L.record(db, { observe: PROJECT, items: [] }, { root: tmp }), /session id/);
  });

  console.log(`\nlessons: ${passed} passed`);
} catch (err) {
  console.error(`\nFAILED after ${passed} passed:\n${err.stack}`);
  process.exitCode = 1;
} finally {
  db.close();
  fs.rmSync(tmp, { recursive: true, force: true });
}
