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

  // ── Curation (phase B) ──────────────────────────────────────────────────────
  test('pending counts observations since the last curation and offers at the threshold', () => {
    const p = L.pending(db, PROJECT);
    assert.ok(p.pending >= L.PENDING_OFFER && p.offer === true && p.lastCuratedAt === null);
  });

  test('curated wording replaces the template; a merge hides a lesson from the brief', () => {
    session('m1', [{ domain: 'backend', rule: 'flow-planner', source: 'reviewer', issue: 'pool created in controller', fixed: true }]);
    session('m2', [{ domain: 'backend', rule: 'flow-planner', source: 'reviewer', issue: 'pool created in controller', fixed: true }]);
    const r = L.applyCuration(db, {
      curate: PROJECT,
      lessons: [
        { domain: 'backend', rule: 'data-architect', cue: 'a new feature in this Express app needs the database', lesson: 'import the shared pool from src/db.js; never construct a pool in a request path', confidence: 'high' },
        { domain: 'backend', rule: 'flow-planner', mergedInto: 'data-architect' },
      ],
    }, { root: tmp, now: t++ });
    assert.strictEqual(r.curated, 2);
    assert.deepStrictEqual(r.rejected, []);
    const b = L.brief(db, PROJECT, tmp);
    assert.deepStrictEqual(b.backend.rules, ['data-architect'], 'merged lesson is not briefed');
    assert.match(b.backend.text, /import the shared pool from src\/db\.js/);
    const note = fs.readFileSync(path.join(tmp, 'agents/backend/vault/lessons/shop/flow-planner.md'), 'utf8');
    assert.match(note, /merged into \[\[data-architect\]\]/);
    assert.strictEqual(L.pending(db, PROJECT).pending, 0, 'curating resets the pending count');
  });

  test('the curator cannot invent lessons, merge into nothing, or propose without 3 projects', () => {
    const r = L.applyCuration(db, {
      curate: PROJECT,
      lessons: [
        { domain: 'backend', rule: 'prompt-engineer', lesson: 'invented' },
        { domain: 'backend', rule: 'data-architect', mergedInto: 'no-such-rule' },
        { domain: 'backend', rule: 'data-architect', mergedInto: 'data-architect' },
      ],
      proposals: [{ domain: 'backend', rule: 'data-architect', proposal: 'add a line' }],
    }, { root: tmp, now: t++ });
    assert.strictEqual(r.curated, 0);
    assert.strictEqual(r.rejected.length, 4);
    assert.deepStrictEqual(r.proposals, []);
    assert.match(L.brief(db, PROJECT, tmp).backend.text, /import the shared pool/, 'earlier curation untouched');
  });

  test('a rule with a lesson in 3 projects is a candidate; its proposal is written, never applied', () => {
    for (const proj of ['C:/work/a', 'C:/work/b']) {
      for (const s of ['1', '2']) L.record(db, { observe: proj, session: `${proj}-${s}`, domains: ['backend'], items: [poolMiss()] }, { root: tmp, now: t++ });
    }
    const [c, ...rest] = L.candidates(db, tmp);
    assert.strictEqual(rest.length, 0);
    assert.deepStrictEqual([c.domain, c.rule, c.projects.length], ['backend', 'data-architect', 3]);
    assert.match(c.checklist, /One shared DB pool/);
    const ex = L.exportFor(db, PROJECT, tmp);
    assert.strictEqual(ex.project, 'shop');
    assert.ok(ex.lessons.some(l => l.rule === 'data-architect' && l.examples.length));
    assert.strictEqual(ex.candidates.length, 1);
    const r = L.applyCuration(db, {
      curate: PROJECT,
      proposals: [{ domain: 'backend', rule: 'data-architect', target: 'agents/backend/CLAUDE.md', proposal: 'Add: "import the shared pool; never construct one per request"',
        rows: [{ project: 'shop', observed: 'pool per request', verdict: 'supports' }, { project: 'a', observed: 'pool per request', verdict: 'made-up' }] }],
    }, { root: tmp, now: t++ });
    assert.deepStrictEqual(r.proposals, ['agents/orchestrator/vault/proposals/backend-data-architect.md']);
    const note = fs.readFileSync(path.join(tmp, r.proposals[0]), 'utf8');
    assert.match(note, /nothing is applied automatically/);
    assert.match(note, /\| a \| pool per request \| confounded \|/, 'unknown verdicts become confounded');
  });

  test('over-long curated text is cut at a word boundary, never mid-word', () => {
    const long = 'import the shared pool from the db module and never construct a pool or a connection inside a handler, ' +
      'controller or service function; the reviewer checks the changed files for any pool constructor outside that module, ' +
      'and the author confirms it before returning the work to the pipeline for review, so the same miss never reaches ' +
      'the reviewer again on this project';
    assert.ok(long.length > 300);
    L.applyCuration(db, { curate: PROJECT, lessons: [{ domain: 'backend', rule: 'data-architect', lesson: long }] }, { root: tmp, now: t++ });
    const text = L.exportFor(db, PROJECT, tmp).lessons.find(l => l.rule === 'data-architect').lesson;
    assert.ok(text.length <= 300 && text.endsWith('...'), text);
    assert.ok(long.startsWith(text.slice(0, -3)) && long[text.length - 3] === ' ', 'cut on a space');
  });

  test('a proposal without a change is recorded as NO_ENTRY', () => {
    const r = L.applyCuration(db, { curate: PROJECT, proposals: [{ domain: 'backend', rule: 'data-architect', proposal: '' }] }, { root: tmp, now: t++ });
    assert.match(fs.readFileSync(path.join(tmp, r.proposals[0]), 'utf8'), /status: NO_ENTRY/);
  });

  console.log(`\nlessons: ${passed} passed`);
} catch (err) {
  console.error(`\nFAILED after ${passed} passed:\n${err.stack}`);
  process.exitCode = 1;
} finally {
  db.close();
  fs.rmSync(tmp, { recursive: true, force: true });
}
