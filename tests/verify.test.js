'use strict';
/**
 * Tests for shared/lib/verify.js (design/verify-phase.md): temp git projects with small scripted commands,
 * a fake jest-style reporter, and a real Newman run against a throwaway local server.
 * Run: node tests/verify.test.js
 */

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const net = require('net');
const { spawnSync } = require('child_process');
const V = require('../shared/lib/verify');

const ROOT = fs.mkdtempSync(path.join(os.tmpdir(), 'verify-root-'));
let passed = 0;
const test = async (name, fn) => { await fn(); passed++; console.log(`  ok  ${name}`); };

function project(files) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'verify-proj-'));
  for (const [f, c] of Object.entries(files)) { fs.mkdirSync(path.dirname(path.join(dir, f)), { recursive: true }); fs.writeFileSync(path.join(dir, f), c); }
  for (const a of [['init', '-q'], ['config', 'user.email', 't@example.test'], ['config', 'user.name', 't'], ['add', '-A'], ['commit', '-q', '-m', 'init']]) spawnSync('git', a, { cwd: dir });
  return dir;
}
const node = (f) => `node ${f}`;
const configure = (dir, cfg) => V.set(dir, { confirmed: true, ...cfg }, ROOT);
const run = (dir, opts = {}) => V.run(dir, opts, ROOT);

// A jest-style runner: fails the tests listed in failing.txt and writes the --outputFile report.
const FAKE_JEST = `const fs = require('fs');
const out = (process.argv.find(a => a.startsWith('--outputFile=')) || '').slice(13);
const failing = fs.existsSync('failing.txt') ? fs.readFileSync('failing.txt', 'utf8').split('\\n').filter(Boolean) : [];
const names = ['adds', 'subtracts', 'divides'];
if (out) fs.writeFileSync(out, JSON.stringify({ testResults: [{ assertionResults: names.map(n => ({ fullName: n, status: failing.includes(n) ? 'failed' : 'passed' })) }] }));
process.exit(failing.length ? 1 : 0);`;

(async () => {
  try {
    await test('config is validated: kinds, paths inside the project, serve must pass {port}', () => {
      assert.strictEqual(V.validate({ steps: [{ kind: 'test', run: 'npm test' }] }), null);
      assert.match(V.validate({ steps: [{ kind: 'deploy', run: 'x' }] }), /kind/);
      assert.match(V.validate({ steps: [{ kind: 'build', run: 'x', cwd: '../elsewhere' }] }), /inside the project/);
      assert.match(V.validate({ steps: [{ kind: 'test', run: 'x', report: 'karma' }] }), /report/);
      assert.match(V.validate({ steps: [], serve: { run: 'npm start', env: { PORT: '3000' } } }), /\{port\}/);
      assert.strictEqual(V.validate({ steps: [], serve: { run: 'npm start', env: { PORT: '{port}' }, ready: '/api/health' } }), null);
    });

    await test('nothing runs until the commands are confirmed', async () => {
      const dir = project({ 'boom.js': 'require("fs").writeFileSync("ran.txt", "x")' });
      let r = await run(dir);
      assert.deepStrictEqual([r.configured, r.passed, r.steps.length], [false, true, 0]);
      V.set(dir, { confirmed: false, steps: [{ kind: 'build', run: node('boom.js') }] }, ROOT);
      r = await run(dir);
      assert.strictEqual(r.configured, false);
      assert.ok(!fs.existsSync(path.join(dir, 'ran.txt')), 'an unconfirmed command never runs');
    });

    await test('exit codes decide; a failure the baseline already had is not blamed on the session', async () => {
      const dir = project({ 'ok.js': '', 'bad.js': 'console.error("lint: 2 problems"); process.exit(1)' });
      configure(dir, { steps: [{ kind: 'build', run: node('ok.js') }, { kind: 'lint', run: node('bad.js') }] });
      const before = await run(dir);
      assert.strictEqual(before.passed, false);
      assert.deepStrictEqual(before.steps.map((s) => s.ok), [true, false]);
      assert.match(before.steps[1].tail, /2 problems/);
      const base = path.join(dir, '..', `${path.basename(dir)}-base.json`);
      fs.writeFileSync(base, JSON.stringify(before));
      const after = await run(dir, { baseline: base });
      assert.strictEqual(after.passed, true, 'lint was already failing');
      assert.match(after.steps[1].alreadyFailing[0], /already failing/);
    });

    await test('with a test report, only tests that newly fail count', async () => {
      const dir = project({ 'jest.js': FAKE_JEST, 'failing.txt': 'divides\n' });
      configure(dir, { steps: [{ kind: 'test', run: node('jest.js'), report: 'jest' }] });
      const base = path.join(dir, '..', `${path.basename(dir)}-base.json`);
      fs.writeFileSync(base, JSON.stringify(await run(dir)));
      fs.writeFileSync(path.join(dir, 'failing.txt'), 'divides\nadds\n');
      const r = await run(dir, { baseline: base });
      assert.strictEqual(r.passed, false);
      assert.deepStrictEqual(r.steps[0].newFailures, ['adds']);
      assert.deepStrictEqual(r.steps[0].alreadyFailing, ['divides']);
    });

    await test('npm-style scripts get the report flags after --', () => {
      assert.match(V.withReport('npm test', 'jest', 'C:/t/r.json'), /^npm test -- --json --outputFile=C:\/t\/r\.json$/);
      assert.match(V.withReport('npm run test:unit', 'vitest', '/t/r.json'), /^npm run test:unit -- --reporter=json/);
      assert.match(V.withReport('npx jest', 'jest', '/t/r.json'), /^npx jest --json/);
    });

    await test('a test step that fails once and passes on the re-run is flaky, not a failure', async () => {
      const dir = project({ 'flaky.js': 'const fs=require("fs");if(!fs.existsSync("seen")){fs.writeFileSync("seen","1");process.exit(1)}' });
      configure(dir, { steps: [{ kind: 'test', run: node('flaky.js') }] });
      const r = await run(dir);
      assert.strictEqual(r.passed, true);
      assert.ok(r.steps[0].flaky);
    });

    await test('install runs only when dependencies changed or node_modules is missing', async () => {
      const dir = project({ 'package.json': '{}', 'node_modules/.keep': '', 'inst.js': 'require("fs").writeFileSync("installed","1")' });
      configure(dir, { steps: [{ kind: 'install', run: node('inst.js'), when: 'deps-changed' }] });
      let r = await run(dir, { changed: ['src/app.js'] });
      assert.match(r.steps[0].skipped, /unchanged/);
      r = await run(dir, { changed: ['package.json'] });
      assert.ok(!r.steps[0].skipped && fs.existsSync(path.join(dir, 'installed')));
    });

    await test('a step that runs past its timeout fails', async () => {
      const dir = project({ 'hang.js': 'setTimeout(()=>{}, 20000)' });
      configure(dir, { steps: [{ kind: 'build', run: node('hang.js'), timeoutSec: 1 }] });
      const r = await run(dir);
      assert.strictEqual(r.passed, false);
      assert.ok(r.steps[0].timedOut);
      assert.match(r.steps[0].newFailures[0], /timeout/);
    });

    await test('editing or deleting a test that existed at the previous run fails the gate', async () => {
      const dir = project({ 'ok.js': '', 'tests/math.test.js': 'expect(1).toBe(1)', 'tests/other.test.js': 'x' });
      configure(dir, { steps: [{ kind: 'build', run: node('ok.js') }] });
      const prev = path.join(dir, '..', `${path.basename(dir)}-prev.json`);
      fs.writeFileSync(prev, JSON.stringify(await run(dir)));
      fs.writeFileSync(path.join(dir, 'tests/math.test.js'), 'test.skip("math")');
      fs.rmSync(path.join(dir, 'tests/other.test.js'));
      fs.writeFileSync(path.join(dir, 'tests/new.test.js'), 'a new test is fine');
      const r = await run(dir, { guard: prev });
      assert.strictEqual(r.passed, false);
      assert.deepStrictEqual(r.testsWeakened.sort(), ['tests/math.test.js (edited)', 'tests/other.test.js (deleted)']);
    });

    await test('new failures are attributed to the domain whose files they name', () => {
      const steps = [
        { kind: 'typecheck', newFailures: ['src/routes/users.ts(12,3): error TS2322'], tail: '' },
        { kind: 'build', newFailures: ['build failed'], tail: 'web/src/App.jsx: Unexpected token' },
        { kind: 'api', newFailures: ['GET /api/users: expected 200'], tail: '' },
        { kind: 'lint', newFailures: ['lint failed'], tail: 'no file named' },
      ];
      const a = V.attribute(steps, { backend: ['src/routes/users.ts', 'src/app.ts', 'src/db.ts'], frontend: ['web/src/App.jsx'] });
      assert.deepStrictEqual(a.backend.map((x) => x.kind), ['typecheck', 'api', 'lint'], 'unattributable goes to the domain with most files');
      assert.deepStrictEqual(a.frontend.map((x) => x.kind), ['build']);
    });

    await test('the API collection runs with Newman against a throwaway local server; "needs setup" is skipped', async () => {
      const server = `const http = require('http');
const db = process.env.DB_PATH; require('fs').writeFileSync(db, 'x');
http.createServer((req, res) => {
  res.setHeader('content-type', 'application/json');
  if (req.url === '/health') return res.end('{"status":"ok"}');
  if (req.url === '/api/items') return res.end('[{"id":1}]');
  res.statusCode = 404; res.end('{"error":"not found"}');
}).listen(Number(process.env.PORT), '127.0.0.1');`;
      const req = (name, url, status) => ({ name, request: { method: 'GET', url: `{{baseUrl}}${url}` },
        event: [{ listen: 'test', script: { exec: [`pm.test("status ${status}", () => pm.response.to.have.status(${status}));`] } }] });
      const collection = { info: { name: 't', schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json' },
        item: [req('health', '/health', 200), req('items', '/api/items', 200), req('missing route is 200 (wrong on purpose)', '/api/nope', 200),
          { name: 'needs setup', item: [req('needs a seeded admin', '/api/admin', 200)] }] };
      const dir = project({ 'server.js': server, 'c.json': JSON.stringify(collection) });
      configure(dir, { steps: [], serve: { run: node('server.js'), env: { PORT: '{port}', DB_PATH: '{tmpdb}' }, ready: '/health', timeoutSec: 20 } });
      const r = await run(dir, { collection: path.join(dir, 'c.json'), owners: undefined });
      const api = r.steps.find((s) => s.kind === 'api');
      assert.strictEqual(api.requests, 3);
      assert.deepStrictEqual(api.notRun, ['needs a seeded admin']);
      assert.strictEqual(api.newFailures.length, 1);
      assert.match(api.newFailures[0], /missing route/);
      assert.strictEqual(r.passed, false);
      // The server it started is stopped: the port it used is free again.
      const port = Number((api.tail.match(/127\.0\.0\.1:(\d+)/) || [])[1]);
      if (port) assert.ok(await new Promise((res) => { const s = net.createServer().once('error', () => res(false)).listen(port, '127.0.0.1', () => s.close(() => res(true))); }));
    });

    await test('without serve, the API collection is skipped, not failed', async () => {
      const dir = project({ 'c.json': '{"info":{"name":"t"},"item":[]}' });
      configure(dir, { steps: [] });
      const r = await run(dir, { collection: path.join(dir, 'c.json') });
      assert.strictEqual(r.passed, true);
      assert.match(r.steps[0].skipped, /serve is not configured/);
    });

    await test('an already-red build does not hide a new error; secrets are not passed to commands', () => {
      const base = { kind: 'build', cwd: '.', run: 'x', ok: false, exitCode: 1, failures: null, tail: 'src/a.ts: error TS2322: old\n' };
      const same = V.compare({ ...base, tail: 'src/a.ts: error TS2322: old\n' }, base);
      assert.deepStrictEqual(same.newFailures, []);
      const worse = V.compare({ ...base, tail: 'src/a.ts: error TS2322: old\nsrc/b.ts: error TS2345: new\n' }, base);
      assert.strictEqual(worse.newFailures.length, 1);
      process.env.TEST_SECRET_TOKEN = 'leak';
      const dir = project({ 'p.js': 'process.exit(process.env.TEST_SECRET_TOKEN ? 1 : 0)' });
      configure(dir, { steps: [{ kind: 'build', run: node('p.js') }] });
      return run(dir).then((r) => { delete process.env.TEST_SECRET_TOKEN; assert.strictEqual(r.passed, true); });
    });

    await test('editing the test script or runner config counts as weakening the checks', async () => {
      const dir = project({ 'package.json': '{"scripts":{"test":"jest"}}', 'jest.config.js': 'module.exports={}' });
      configure(dir, { steps: [] });
      const first = await run(dir, {});
      const guard = path.join(dir, 'guard.json');
      fs.writeFileSync(guard, JSON.stringify(first));
      fs.writeFileSync(path.join(dir, 'package.json'), '{"scripts":{"test":"true"}}');
      const r = await run(dir, { guard });
      assert.ok(r.testsWeakened.some((x) => x.includes('package.json#scripts')), JSON.stringify(r.testsWeakened));
    });

    console.log(`\nverify: ${passed} passed`);
  } catch (err) {
    console.error(`\nFAILED after ${passed} passed:\n${err.stack}`);
    process.exitCode = 1;
  } finally {
    fs.rmSync(ROOT, { recursive: true, force: true });
  }
})();
