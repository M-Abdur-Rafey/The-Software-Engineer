'use strict';
/**
 * End-to-end test for shared/lib/sysdocs.js against a throwaway git repo.
 * Run: node tests/sysdocs.test.js
 */

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync, spawnSync } = require('child_process');
const { parseYaml } = require('../shared/lib/sysdocs');

const CLI = path.join(__dirname, '..', 'shared', 'lib', 'sysdocs.js');
const project = fs.mkdtempSync(path.join(os.tmpdir(), 'sysdocs-test-'));
const doc = (...p) => path.join(project, 'docs', 'system', ...p);
let passed = 0;

function run(...args) {
  const r = spawnSync(process.execPath, [CLI, args[0], project, ...args.slice(1)], { encoding: 'utf8' });
  const out = r.stdout.trim() ? JSON.parse(r.stdout) : JSON.parse(r.stderr);
  return Object.assign(out, { exitCode: r.status });
}

function git(...args) {
  return execFileSync('git', ['-C', project, '-c', 'core.autocrlf=false', '-c', 'user.email=dev@example.com', '-c', 'user.name=Dev', ...args], { encoding: 'utf8' });
}

function writeFile(rel, text) {
  fs.mkdirSync(path.dirname(path.join(project, rel)), { recursive: true });
  fs.writeFileSync(path.join(project, rel), text);
}

function setLists(module, lists) {
  const file = doc('modules', module, 'README.md');
  let text = fs.readFileSync(file, 'utf8');
  for (const [key, value] of Object.entries(lists)) text = text.replace(new RegExp(`^${key}: \\[\\]$`, 'm'), `${key}:${value}`);
  fs.writeFileSync(file, text);
}

function test(name, fn) {
  fn();
  passed++;
  console.log(`  ok  ${name}`);
}

try {
  git('init', '-q');

  test('parseYaml handles the template subset', () => {
    const y = parseYaml([
      'module: auth   # comment',
      'layer: 2',
      'approved_by:',
      'paths: []',
      'provides:',
      '  - api:GET /api/users/:id',
      '  - fn:requireAuth',
      'depends_on:',
      '  - module: foundation',
      '    uses: [fn:db.pool, config:DATABASE_URL]',
      '  - module: billing',
      '    uses:',
      '      - api:GET /api/invoices/:id#total',
    ].join('\n'));
    assert.strictEqual(y.module, 'auth');
    assert.strictEqual(y.approved_by, null);
    assert.deepStrictEqual(y.paths, []);
    assert.deepStrictEqual(y.provides, ['api:GET /api/users/:id', 'fn:requireAuth']);
    assert.deepStrictEqual(y.depends_on, [
      { module: 'foundation', uses: ['fn:db.pool', 'config:DATABASE_URL'] },
      { module: 'billing', uses: ['api:GET /api/invoices/:id#total'] },
    ]);
  });

  test('init scaffolds team.md, layers.md, INDEX.md, dependencies.md', () => {
    const r = run('init');
    assert.deepStrictEqual(r.created, ['docs/system/team.md', 'docs/system/layers.md']);
    for (const f of ['team.md', 'layers.md', 'INDEX.md', 'dependencies.md']) assert.ok(fs.existsSync(doc(f)), f);
  });

  test('add-module creates README + questions and rejects bad names', () => {
    assert.deepStrictEqual(run('add-module', 'foundation', '1', 'Asad').errors, []);
    run('add-module', 'auth', '2', 'Shan');
    run('add-module', 'orders', '3', 'Sara');
    run('add-module', 'reports', '4', 'Sara');
    assert.ok(fs.existsSync(doc('modules', 'auth', 'questions.md')));
    assert.strictEqual(run('add-module', 'Bad Name', '1').exitCode, 1);
    assert.strictEqual(run('add-module', 'layers', '1').exitCode, 1);
  });

  setLists('foundation', {
    paths: '\n  - src/db.js\n  - src/config/',
    provides: '\n  - fn:db.pool\n  - config:DATABASE_URL',
  });
  setLists('auth', {
    paths: '\n  - src/auth/',
    provides: '\n  - api:POST /api/auth/login\n  - api:GET /api/users/:id\n  - fn:requireAuth',
    depends_on: '\n  - module: foundation\n    uses:\n      - fn:db.pool',
  });
  setLists('orders', {
    paths: '\n  - src/orders/',
    provides: '\n  - api:GET /api/orders',
    depends_on: '\n  - module: auth\n    uses: [fn:requireAuth, api:GET /api/users/:id#email]\n  - module: foundation\n    uses: [fn:db.pool]',
  });
  setLists('reports', {
    paths: '\n  - src/reports/',
    depends_on: '\n  - module: orders\n    uses: [api:GET /api/orders]',
  });

  test('index validates and renders the dependency map', () => {
    const r = run('index');
    assert.deepStrictEqual(r.errors, []);
    assert.deepStrictEqual(r.warnings, []);
    const deps = fs.readFileSync(doc('dependencies.md'), 'utf8');
    assert.ok(deps.includes('| `fn:requireAuth` | auth | orders |'), deps);
    assert.ok(deps.includes('| `api:GET /api/users/:id` | auth | orders (#email) |'), deps);
    assert.ok(deps.includes('foundation --> auth'), deps);
    const index = fs.readFileSync(doc('INDEX.md'), 'utf8');
    assert.ok(index.includes('| [auth](modules/auth/README.md) | 2 | draft | Shan | 0 | 0 | `src/auth` |'), index);
  });

  test('index reports undeclared touchpoints and upward layer dependencies', () => {
    run('add-module', 'broken', '1');
    setLists('broken', { depends_on: '\n  - module: auth\n    uses: [fn:notProvided]' });
    const r = run('index');
    assert.strictEqual(r.exitCode, 1);
    assert.ok(r.errors.some(e => e.includes('auth does not provide it')), r.errors.join('\n'));
    assert.ok(r.errors.some(e => e.includes('can only depend on its own or lower layers')), r.errors.join('\n'));
    assert.ok(fs.readFileSync(doc('INDEX.md'), 'utf8').includes('## Problems'));
    fs.rmSync(doc('modules', 'broken'), { recursive: true });
    assert.deepStrictEqual(run('index').errors, []);
  });

  test('impact finds direct consumers, indirect consumers and owners', () => {
    const tp = run('impact', 'fn:requireAuth');
    assert.deepStrictEqual(tp.targets[0].providers, ['auth']);
    assert.deepStrictEqual(tp.targets[0].consumers.map(c => [c.module, c.uses]), [['orders', ['fn:requireAuth']]]);
    assert.deepStrictEqual(tp.indirect, ['reports']);
    assert.deepStrictEqual(tp.owners.sort(), ['Sara', 'Shan']);

    const sub = run('impact', 'api:GET /api/users/:id');
    assert.deepStrictEqual(sub.targets[0].consumers[0].uses, ['api:GET /api/users/:id#email']);

    const byPath = run('impact', 'src/db.js', 'scripts/seed.js', 'fn:missing');
    assert.deepStrictEqual(byPath.targets[0].consumers.map(c => c.module), ['auth', 'orders']);
    assert.deepStrictEqual(byPath.unowned, ['scripts/seed.js']);
    assert.deepStrictEqual(byPath.unknownTouchpoints, ['fn:missing']);
  });

  test('ask enforces all three examples and numbers questions', () => {
    const missing = run('ask', 'auth', JSON.stringify({ question: 'x', chainReaction: 'y', technical: 'z', plain: 'w' }));
    assert.strictEqual(missing.exitCode, 1);
    assert.ok(missing.error.includes('data'));

    const qfile = path.join(project, 'q.json');
    fs.writeFileSync(qfile, JSON.stringify([
      {
        question: 'Stay logged in after the browser closes?',
        touches: ['fn:requireAuth'],
        chainReaction: 'orders calls requireAuth on every request',
        technical: 'refresh token in an httpOnly cookie, 30-day expiry',
        plain: 'close the laptop Friday, open it Monday: still signed in?',
        data: { id: 's_91', user_id: 12, expires_at: '2026-11-11T09:00Z' },
        options: ['A) 30 days', 'B) until the browser closes'],
      },
      { question: 'Lock the account after failed logins?', chainReaction: 'none yet', technical: '5 attempts, 15 min', plain: 'like a bank card', data: 'failed_logins: 5' },
    ]));
    const r = run('ask', 'auth', `@${qfile}`);
    assert.deepStrictEqual(r.added, ['Q-auth-001', 'Q-auth-002']);
    const text = fs.readFileSync(doc('modules', 'auth', 'questions.md'), 'utf8');
    assert.ok(text.includes('### Q-auth-001: Stay logged in after the browser closes?'));
    assert.ok(text.includes('touches: fn:requireAuth'));
    assert.ok(text.includes('"user_id": 12'));
  });

  test('gate blocks a draft module with open questions', () => {
    const g = run('gate', 'auth');
    assert.strictEqual(g.pass, false);
    assert.deepStrictEqual(g.blocking.map(b => b.id), ['Q-auth-001', 'Q-auth-002']);
  });

  test('answers record who; a different answer becomes a conflict; --final resolves', () => {
    assert.strictEqual(run('answer', 'Q-auth-001', 'Shan', 'A) 30 days').status, 'answered');
    assert.strictEqual(run('answer', 'Q-auth-001', 'Shan', 'A) 30 days').status, 'answered');
    const c = run('answer', 'Q-auth-001', 'Ali', 'B) until the browser closes');
    assert.strictEqual(c.status, 'conflict');
    assert.strictEqual(c.conflicts[0].by, 'Ali');
    assert.strictEqual(run('questions').questions.find(q => q.id === 'Q-auth-001').status, 'conflict');
    const f = run('answer', 'Q-auth-001', 'Shan', 'C) user chooses at login', '--final');
    assert.strictEqual(f.status, 'answered');
    const text = fs.readFileSync(doc('modules', 'auth', 'questions.md'), 'utf8');
    assert.ok(text.includes('**Earlier answer** (by Shan,'), text);
    assert.ok(text.includes('**Earlier answer** (by Ali,'), text);
    assert.ok(/\*\*Answer:\*\*\nC\) user chooses at login\n\nanswered_by: Shan/.test(text), text);
  });

  test('deferred questions block their own module but are hidden from the global list', () => {
    assert.strictEqual(run('defer', 'Q-auth-002', 'Shan').status, 'deferred');
    assert.strictEqual(run('gate', 'auth').blocking[0].status, 'deferred');
    assert.ok(!run('questions').questions.some(q => q.id === 'Q-auth-002'));
    assert.strictEqual(run('questions', 'auth').questions[0].id, 'Q-auth-002');
    assert.strictEqual(run('approve', 'auth', 'Ali').approved, false);
  });

  test('answers typed into the file are picked up and signed as unsigned', () => {
    const file = doc('modules', 'auth', 'questions.md');
    const text = fs.readFileSync(file, 'utf8');
    const i = text.indexOf('### Q-auth-002');
    fs.writeFileSync(file, text.slice(0, i) + text.slice(i).replace('**Answer:**\n', '**Answer:**\nYes, 5 attempts then 15 minutes\n'));
    const g = run('gate', 'auth');
    assert.deepStrictEqual(g.blocking, []);
    assert.strictEqual(g.reason, 'doc status is "draft", needs approval');
    run('index');
    assert.ok(/answered_by: unsigned/.test(fs.readFileSync(file, 'utf8')));
  });

  test('approve opens the gate; layers can be approved', () => {
    assert.strictEqual(run('approve', 'auth', 'Ali').approved, true);
    const g = run('gate', 'auth');
    assert.strictEqual(g.pass, true);
    assert.ok(fs.readFileSync(doc('modules', 'auth', 'README.md'), 'utf8').includes('approved_by: Ali'));
    assert.strictEqual(run('approve', 'layers', 'Asad').approved, true);
    assert.ok(fs.readFileSync(doc('layers.md'), 'utf8').startsWith('---\nstatus: approved\napproved_by: Asad'));
  });

  test('drift finds manual edits since synced_at and unowned changes', () => {
    writeFile('src/auth/login.js', 'module.exports = 1;\n');
    writeFile('src/db.js', 'module.exports = 2;\n');
    git('add', '-A');
    git('commit', '-q', '-m', 'init');
    run('synced', 'auth');
    let d = run('drift');
    assert.strictEqual(d.modules.find(m => m.module === 'auth').state, 'in-sync');
    assert.strictEqual(d.modules.find(m => m.module === 'foundation').state, 'never-synced');

    writeFile('src/auth/login.js', 'module.exports = 3;\n');
    git('commit', '-q', '-am', 'manual edit');
    writeFile('scripts/seed.js', '// unowned\n');
    d = run('drift');
    assert.deepStrictEqual(d.modules.find(m => m.module === 'auth').changed, ['src/auth/login.js']);
    assert.ok(d.unownedChanged.includes('scripts/seed.js'), JSON.stringify(d));
  });

  test('team lists unknown git emails; team-add maps them', () => {
    assert.deepStrictEqual(run('team').unknown, [{ email: 'dev@example.com', gitName: 'Dev' }]);
    assert.strictEqual(run('team-add', 'Dev@Example.com', 'Asad', 'lead').updated, false);
    assert.deepStrictEqual(run('team').unknown, []);
    assert.strictEqual(run('team-add', 'dev@example.com', 'Asad N', 'lead').updated, true);
    assert.strictEqual(run('team').known[0].name, 'Asad N');
  });

  test('unknown commands fail cleanly', () => {
    assert.strictEqual(run('toString').exitCode, 1);
  });

  console.log(`\nsysdocs: ${passed} passed`);
} catch (err) {
  console.error(`\nFAILED after ${passed} passed:\n${err.stack}`);
  process.exitCode = 1;
} finally {
  fs.rmSync(project, { recursive: true, force: true });
}
