'use strict';
/**
 * Tests for shared/lib/projectmap.js and the persist "map" op. Writes to a temp dir, plus one
 * git-ignored map under agents/orchestrator/vault/projects/ that it removes. Run: node tests/projectmap.test.js
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const os = require('os');
const pm = require('../shared/lib/projectmap');
const { run } = require('../shared/lib/persist');

const ROOT = path.join(__dirname, '..');
const TEST_PROJECT = 'C:/work/__projectmap-test';
let passed = 0;

function test(name, fn) {
  fn();
  passed++;
  console.log(`  ok  ${name}`);
}

const SECTIONS = {
  Stack: ['Node 22 + Express 4', 'PostgreSQL via pg'],
  Layout: ['src/: server code', 'migrations/: SQL files'],
  Conventions: ['CommonJS, 2-space indent, single quotes', 'errors: { error: string }'],
  Routes: ['GET /api/health — src/server.js (public)'],
  Tables: ['users: id, email'],
  Run: ['install: npm ci', 'dev: npm start'],
};

try {
  test('names the map after the project folder', () => {
    assert.strictEqual(pm.projectName('C:/work/shop/'), 'shop');
    assert.strictEqual(pm.projectName('/home/me/shop'), 'shop');
    assert.strictEqual(pm.relPath('C:\\work\\shop'), 'agents/orchestrator/vault/projects/shop/map.md');
    assert.throws(() => pm.projectName('..'));
  });

  test('renders sections in a fixed order and parses them back', () => {
    const text = pm.render('shop', { Run: SECTIONS.Run, Stack: SECTIONS.Stack });
    assert.ok(text.indexOf('## Stack') < text.indexOf('## Run'));
    const parsed = pm.parse(text);
    assert.strictEqual(parsed.name, 'shop');
    assert.deepStrictEqual(parsed.sections.Stack.lines, ['- Node 22 + Express 4', '- PostgreSQL via pg']);
    assert.ok(!text.includes('## Routes'), 'empty sections are left out');
  });

  test('never exceeds 3000 characters and says what it left out', () => {
    const routes = Array.from({ length: 200 }, (_, i) => `GET /api/items/${i} — src/features/items/routes.js`);
    const text = pm.render('big', { ...SECTIONS, Routes: routes });
    assert.ok(text.length <= pm.MAX_CHARS, `length ${text.length}`);
    assert.match(text, /- \(\+\d+ more not listed\)/);
    assert.ok(text.includes('## Run') && text.includes('install: npm ci'), 'untrimmable sections survive');
    // The omitted count carries over a re-render (plus the line, if any, the new route pushed out).
    const again = pm.update(text, { routes: [{ method: 'post', path: '/api/new' }] });
    assert.ok(again.length <= pm.MAX_CHARS);
    const before = Number(text.match(/\+(\d+) more/)[1]);
    const after = Number(again.match(/\+(\d+) more/)[1]);
    assert.ok(after === before || after === before + 1, `omitted ${before} -> ${after}`);
    assert.ok(again.includes('- POST /api/new'), 'new routes go first so the cap keeps them');
  });

  test('merges routes, tables and notes without duplicates', () => {
    const base = pm.render('shop', SECTIONS);
    const text = pm.update(base, {
      routes: [
        { method: 'get', path: '/api/health', note: 'now reports db status' },
        { method: 'POST', path: '/api/orders', note: 'src/features/orders/routes.js (auth)' },
      ],
      tables: [{ name: 'orders', columns: [{ name: 'id' }, 'user_id', 'total'] }, { name: 'users', columns: ['id', 'email', 'name'] }],
      notes: [{ section: 'Modules', note: 'orders: checkout and order history' }, { section: 'Layout', note: 'src/: server code' }],
    });
    const p = pm.parse(text);
    assert.deepStrictEqual(p.sections.Routes.lines, ['- POST /api/orders — src/features/orders/routes.js (auth)', '- GET /api/health — now reports db status']);
    assert.deepStrictEqual(p.sections.Tables.lines, ['- users: id, email, name', '- orders: id, user_id, total']);
    assert.deepStrictEqual(p.sections.Modules.lines, ['- orders: checkout and order history']);
    assert.strictEqual(p.sections.Layout.lines.length, 2, 'a repeated note is not added twice');
  });

  test('applyOp rebuilds or merges a map file under a root', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'projectmap-test-'));
    pm.applyOp({ map: 'C:/work/shop', sections: SECTIONS }, tmp);
    pm.applyOp({ map: 'C:/work/shop', update: { tables: [{ name: 'carts', columns: ['id'] }] } }, tmp);
    const text = fs.readFileSync(path.join(tmp, pm.relPath('C:/work/shop')), 'utf8');
    assert.ok(text.includes('- carts: id') && text.includes('- users: id, email'));
    pm.applyOp({ map: 'C:/work/fresh', update: { routes: [{ method: 'GET', path: '/x' }] } }, tmp);
    assert.ok(pm.read('C:/work/fresh', tmp).includes('- GET /x'), 'an update creates the map when there is none');
    assert.throws(() => pm.applyOp({ map: 'C:/work/shop' }, tmp), /sections" or "update/);
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  test('persist runs map ops', () => {
    const r = run([
      { map: TEST_PROJECT, sections: SECTIONS },
      { map: TEST_PROJECT, update: { routes: [{ method: 'DELETE', path: '/api/users/:id' }] } },
      { map: TEST_PROJECT },
    ]);
    assert.strictEqual(r.ran, 2);
    assert.strictEqual(r.failed.length, 1);
    assert.match(r.failed[0].op, /^map /);
    assert.ok(pm.read(TEST_PROJECT).includes('- DELETE /api/users/:id'));
  });

  console.log(`\nprojectmap: ${passed} passed`);
} catch (err) {
  console.error(`\nFAILED after ${passed} passed:\n${err.stack}`);
  process.exitCode = 1;
} finally {
  fs.rmSync(path.dirname(pm.absPath(TEST_PROJECT)), { recursive: true, force: true });
}
