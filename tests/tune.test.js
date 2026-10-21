'use strict';
/**
 * Tests for tests/ab/tune.mjs (design/lesson-library.md, phase C): edit validation, applying edits,
 * selection, and the answer-key guard. Temp dirs only. Run: node tests/tune.test.js
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { pathToFileURL } = require('url');

(async () => {
  const T = await import(pathToFileURL(path.join(__dirname, 'ab', 'tune.mjs')).href);
  let passed = 0;
  const test = async (name, fn) => { await fn(); passed++; console.log(`  ok  ${name}`); };

  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'tune-test-'));
  fs.mkdirSync(path.join(root, 'agents/backend'), { recursive: true });
  fs.mkdirSync(path.join(root, '.claude/workflows'), { recursive: true });
  fs.writeFileSync(path.join(root, 'agents/backend/CLAUDE.md'),
    '# Backend\n\n- Thin controllers.\n- Bearer token rule (blocking): tokens only in the Authorization header.\n- Thin controllers.\n');
  fs.writeFileSync(path.join(root, '.claude/workflows/backend.js'),
    "export const meta = { name: 'backend' }\nconst CHECKLIST = `- Flow: thin controllers.\\n`\nreturn { CHECKLIST }\n");
  const edit = (o) => ({ kind: 'domain', file: 'agents/backend/CLAUDE.md', find: '# Backend', replace: '# Backend agent', rationale: 'r', expected: 'e', ...o });

  try {
    await test('only agents/<domain>/CLAUDE.md and domain workflows are editable', () => {
      assert.strictEqual(T.validateEdit(edit(), root), null);
      for (const file of ['.claude/workflows/orchestrate.js', 'shared/lib/scan.js', 'agents/backend/../../x.md', 'tests/ab/acceptance.mjs']) {
        assert.match(T.validateEdit(edit({ file }), root), /not editable/, file);
      }
      assert.match(T.validateEdit(edit({ kind: 'other' }), root), /kind/);
    });

    await test('find must match exactly once', () => {
      assert.match(T.validateEdit(edit({ find: '- Thin controllers.' }), root), /matched 2 times/);
      assert.match(T.validateEdit(edit({ find: 'nowhere' }), root), /matched 0 times/);
    });

    await test('an edit may not drop protected rule wording or add hidden characters', () => {
      assert.match(T.validateEdit(edit({ find: '- Bearer token rule (blocking): tokens only in the Authorization header.', replace: '- Tokens: any header.' }), root), /protected rule wording: blocking, bearer/);
      assert.strictEqual(T.validateEdit(edit({ find: '- Bearer token rule (blocking): tokens only in the Authorization header.', replace: '- Bearer token rule (blocking): Authorization header only, never storage.' }), root), null);
      assert.match(T.validateEdit(edit({ replace: '# Backend​' }), root), /hidden/);
    });

    await test('applying a workflow edit that breaks the script is refused and leaves the file alone', () => {
      const file = '.claude/workflows/backend.js';
      const before = fs.readFileSync(path.join(root, file), 'utf8');
      const bad = edit({ file, find: '`- Flow: thin controllers.\\n`', replace: '`- Flow: thin controllers.\\n' });
      assert.strictEqual(T.validateEdit(bad, root), null);
      assert.match(T.applyEdit(bad, root), /no longer parses/);
      assert.strictEqual(fs.readFileSync(path.join(root, file), 'utf8'), before);
      const good = edit({ file, find: '`- Flow: thin controllers.\\n`', replace: '`- Flow: thin controllers; services hold the logic.\\n`' });
      assert.strictEqual(T.applyEdit(good, root), null);
      assert.match(fs.readFileSync(path.join(root, file), 'utf8'), /services hold the logic/);
    });

    await test('an edit is kept only if it holds the score at no extra cost', () => {
      const e1 = edit({ kind: 'invariant', file: 'agents/backend/CLAUDE.md', find: 'a' });
      const e2 = edit({ kind: 'domain', file: 'agents/database/CLAUDE.md', find: 'b' });
      const state = { arms: {
        ref: { passed: 41, total: 41, tokens: 1000 },
        inv: { edit: e1, passed: 41, total: 41, tokens: 1040 },
        dom: { edit: e2, passed: 40, total: 41, tokens: 800 },
      } };
      const [inv, dom] = T.decide(state, 0.05);
      assert.strictEqual(inv.accepted, true);
      assert.strictEqual(dom.accepted, false);
      assert.match(dom.reason, /40\/41 < ref 41\/41/);
      state.arms.inv.tokens = 1100;
      assert.match(T.decide(state, 0.05)[0].reason, /tokens 1100 > ref 1000/);
      assert.throws(() => T.decide({ arms: { ref: {} } }), /ref arm must be scored/);
    });

    await test('two accepted edits to the same text: the cheaper one is kept', () => {
      const a = edit({ kind: 'invariant', find: '- Thin controllers.\n- Bearer' });
      const b = edit({ kind: 'domain', find: '- Thin controllers.' });
      const rows = T.decide({ arms: { ref: { passed: 41, total: 41, tokens: 1000 }, inv: { edit: a, passed: 41, total: 41, tokens: 900 }, dom: { edit: b, passed: 41, total: 41, tokens: 950 } } });
      assert.deepStrictEqual(rows.map((r) => r.accepted), [true, false]);
      assert.match(rows[1].reason, /overlaps/);
    });

    await test('answer-key guard: per-check results leave the run folder, only counts remain', () => {
      const runDir = path.join(root, 'run');
      const sealed = path.join(root, 'sealed');
      fs.mkdirSync(runDir);
      const results = path.join(runDir, 'results-ref-base.json');
      fs.writeFileSync(results, JSON.stringify({ passed: 40, total: 41, results: [{ name: 'POST /api/tasks rejects bad status', pass: false }] }));
      const r = T.sealResults(results, sealed);
      assert.deepStrictEqual([r.passed, r.total], [40, 41]);
      assert.ok(!fs.existsSync(results), 'removed from the run folder');
      assert.match(fs.readFileSync(r.sealedAt, 'utf8'), /rejects bad status/);
      const left = fs.readdirSync(runDir).map((f) => fs.readFileSync(path.join(runDir, f), 'utf8')).join('');
      assert.ok(!left.includes('rejects bad status'));
    });

    console.log(`\ntune: ${passed} passed`);
  } catch (err) {
    console.error(`\nFAILED after ${passed} passed:\n${err.stack}`);
    process.exitCode = 1;
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
})();
