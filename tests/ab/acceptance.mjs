// Hidden acceptance suite for the A/B test. Lives outside both projects so no agent sees it.
// Usage: node acceptance.mjs <projectDir> <base|change> [--skip-web]
// Prints one line per check and writes <projectDir>/../results-<arm>-<suite>.json
import { spawn, spawnSync, execSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const [projectDir, suite = 'base', ...flags] = process.argv.slice(2);
const arm = path.basename(path.resolve(projectDir));
const PORT = 4100 + Math.floor(Math.random() * 800);
const BASE = `http://127.0.0.1:${PORT}`;
const dbFile = path.join(os.tmpdir(), `abtest-${arm}-${suite}-${PORT}.db`);
const results = [];

function sh(cmd, cwd) {
  const r = spawnSync(cmd, { cwd, shell: true, encoding: 'utf8', timeout: 600000 });
  return { ok: r.status === 0, out: `${r.stdout || ''}${r.stderr || ''}`.slice(-1500) };
}

async function check(name, group, fn) {
  try {
    await fn();
    results.push({ name, group, pass: true });
    console.log(`  PASS  [${group}] ${name}`);
  } catch (err) {
    results.push({ name, group, pass: false, error: String(err.message || err).slice(0, 300) });
    console.log(`  FAIL  [${group}] ${name} -- ${String(err.message || err).slice(0, 200)}`);
  }
}

function expect(cond, msg) { if (!cond) throw new Error(msg); }
const expectStatus = (r, codes) => expect([].concat(codes).includes(r.status), `expected ${[].concat(codes).join('/')} got ${r.status} ${JSON.stringify(r.body).slice(0, 150)}`);

async function api(method, url, { token, body } = {}) {
  const res = await fetch(BASE + url, {
    method,
    headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let parsed = null;
  try { parsed = await res.json(); } catch { /* 204 / non-JSON */ }
  return { status: res.status, body: parsed };
}

const userId = (u) => (u && (u.id ?? u.userId));
const pick = (b) => (b && (b.project || b.task || b.data || b)) || {};

// ─── start server ───────────────────────────────────────────────────────────
let server;
async function start() {
  if (!fs.existsSync(path.join(projectDir, 'node_modules'))) {
    const inst = sh('npm install --no-audit --no-fund', projectDir);
    if (!inst.ok) throw new Error(`npm install failed: ${inst.out}`);
  }
  server = spawn('npm start', {
    cwd: projectDir, shell: true,
    env: { ...process.env, PORT: String(PORT), DB_PATH: dbFile, JWT_SECRET: 'abtest-secret-0123456789abcdef', NODE_ENV: 'test' },
  });
  let log = '';
  server.stdout.on('data', d => { log += d; });
  server.stderr.on('data', d => { log += d; });
  for (let i = 0; i < 60; i++) {
    try { const r = await fetch(`${BASE}/api/health`); if (r.status < 500) return; } catch { /* not up yet */ }
    await new Promise(r => setTimeout(r, 500));
  }
  throw new Error(`server did not start on ${PORT}: ${log.slice(-800)}`);
}
function stop() {
  if (!server) return;
  try { execSync(process.platform === 'win32' ? `taskkill /pid ${server.pid} /T /F` : `kill -9 ${server.pid}`, { stdio: 'ignore' }); } catch { /* gone */ }
}

// ─── suites ─────────────────────────────────────────────────────────────────
const S = {};
async function baseSuite() {
  const g = 'auth';
  await check('health returns ok', g, async () => { const r = await api('GET', '/api/health'); expectStatus(r, 200); expect(r.body && r.body.status === 'ok', 'body.status != ok'); });
  await check('first user registers as admin', g, async () => {
    const r = await api('POST', '/api/auth/register', { body: { email: 'admin@t.io', password: 'password123', name: 'Ada' } });
    expectStatus(r, 201); expect(r.body.role === 'admin', `role ${r.body.role}`); S.adminId = userId(r.body);
  });
  await check('second user registers as member', g, async () => {
    const r = await api('POST', '/api/auth/register', { body: { email: 'mem@t.io', password: 'password123', name: 'Mo' } });
    expectStatus(r, 201); expect(r.body.role === 'member', `role ${r.body.role}`); S.memId = userId(r.body);
  });
  await check('third user registers', g, async () => {
    const r = await api('POST', '/api/auth/register', { body: { email: 'out@t.io', password: 'password123', name: 'Oz' } });
    expectStatus(r, 201); S.outId = userId(r.body);
  });
  await check('duplicate email -> 409', g, async () => expectStatus(await api('POST', '/api/auth/register', { body: { email: 'admin@t.io', password: 'password123', name: 'X' } }), 409));
  await check('short password -> 400', g, async () => expectStatus(await api('POST', '/api/auth/register', { body: { email: 'x@t.io', password: 'short', name: 'X' } }), 400));
  await check('bad email -> 400', g, async () => expectStatus(await api('POST', '/api/auth/register', { body: { email: 'nope', password: 'password123', name: 'X' } }), 400));
  for (const [who, email] of [['admin', 'admin@t.io'], ['mem', 'mem@t.io'], ['out', 'out@t.io']]) {
    await check(`login ${who}`, g, async () => {
      const r = await api('POST', '/api/auth/login', { body: { email, password: 'password123' } });
      expectStatus(r, 200); expect(typeof r.body.token === 'string', 'no token'); S[`${who}Token`] = r.body.token;
    });
  }
  await check('wrong password -> 401', g, async () => expectStatus(await api('POST', '/api/auth/login', { body: { email: 'admin@t.io', password: 'wrongpass1' } }), 401));
  await check('me with token', g, async () => { const r = await api('GET', '/api/auth/me', { token: S.memToken }); expectStatus(r, 200); expect(r.body.email === 'mem@t.io', 'wrong user'); });
  await check('me without token -> 401', g, async () => expectStatus(await api('GET', '/api/auth/me'), 401));
  await check('projects without token -> 401', g, async () => expectStatus(await api('GET', '/api/projects'), 401));

  const p = 'projects';
  await check('member creates project', p, async () => {
    const r = await api('POST', '/api/projects', { token: S.memToken, body: { name: 'Mo project', description: 'd' } });
    expectStatus(r, 201); S.projId = pick(r.body).id; expect(S.projId != null, 'no id');
  });
  await check('admin creates project', p, async () => {
    const r = await api('POST', '/api/projects', { token: S.adminToken, body: { name: 'Admin project' } });
    expectStatus(r, 201); S.adminProjId = pick(r.body).id;
  });
  await check('member list shows only own projects', p, async () => {
    const r = await api('GET', '/api/projects', { token: S.memToken }); expectStatus(r, 200);
    const ids = (Array.isArray(r.body) ? r.body : r.body.projects || []).map(x => x.id);
    expect(ids.includes(S.projId) && !ids.includes(S.adminProjId), `ids ${ids}`);
  });
  await check('admin list shows all projects', p, async () => {
    const r = await api('GET', '/api/projects', { token: S.adminToken });
    const ids = (Array.isArray(r.body) ? r.body : r.body.projects || []).map(x => x.id);
    expect(ids.includes(S.projId) && ids.includes(S.adminProjId), `ids ${ids}`);
  });
  await check('non-member GET project -> 403', p, async () => expectStatus(await api('GET', `/api/projects/${S.projId}`, { token: S.outToken }), 403));
  await check('unknown project -> 404', p, async () => expectStatus(await api('GET', '/api/projects/999999', { token: S.adminToken }), 404));
  await check('owner PATCH project', p, async () => { const r = await api('PATCH', `/api/projects/${S.projId}`, { token: S.memToken, body: { name: 'Renamed' } }); expectStatus(r, 200); expect(pick(r.body).name === 'Renamed', 'not renamed'); });
  await check('non-owner PATCH -> 403', p, async () => expectStatus(await api('PATCH', `/api/projects/${S.projId}`, { token: S.outToken, body: { name: 'X' } }), 403));
  await check('admin PATCH any project', p, async () => expectStatus(await api('PATCH', `/api/projects/${S.projId}`, { token: S.adminToken, body: { description: 'by admin' } }), 200));

  const m = 'members';
  await check('owner adds member', m, async () => expectStatus(await api('POST', `/api/projects/${S.projId}/members`, { token: S.memToken, body: { userId: S.outId } }), 201));
  await check('member list includes new member', m, async () => {
    const r = await api('GET', `/api/projects/${S.projId}/members`, { token: S.outToken }); expectStatus(r, 200);
    const ids = (Array.isArray(r.body) ? r.body : r.body.members || []).map(userId);
    expect(ids.includes(S.outId) && ids.includes(S.memId), `ids ${ids}`);
  });
  await check('add unknown user -> 404', m, async () => expectStatus(await api('POST', `/api/projects/${S.projId}/members`, { token: S.memToken, body: { userId: 999999 } }), 404));
  await check('non-owner cannot add members -> 403', m, async () => expectStatus(await api('POST', `/api/projects/${S.adminProjId}/members`, { token: S.memToken, body: { userId: S.outId } }), 403));

  const t = 'tasks';
  await check('create task defaults to todo', t, async () => {
    const r = await api('POST', `/api/projects/${S.projId}/tasks`, { token: S.memToken, body: { title: 'First' } });
    expectStatus(r, 201); expect(pick(r.body).status === 'todo', `status ${pick(r.body).status}`); S.taskId = pick(r.body).id;
  });
  await check('create task assigned to member', t, async () => {
    const r = await api('POST', `/api/projects/${S.projId}/tasks`, { token: S.outToken, body: { title: 'Second', status: 'doing', assigneeId: S.memId, dueDate: '2026-12-01' } });
    expectStatus(r, 201); S.task2Id = pick(r.body).id;
  });
  await check('invalid status -> 400', t, async () => expectStatus(await api('POST', `/api/projects/${S.projId}/tasks`, { token: S.memToken, body: { title: 'X', status: 'blocked' } }), 400));
  await check('empty title -> 400', t, async () => expectStatus(await api('POST', `/api/projects/${S.projId}/tasks`, { token: S.memToken, body: { title: '' } }), 400));
  await check('assignee not a member -> 400', t, async () => expectStatus(await api('POST', `/api/projects/${S.projId}/tasks`, { token: S.memToken, body: { title: 'X', assigneeId: S.adminId } }), 400));
  await check('list tasks + status filter', t, async () => {
    const all = await api('GET', `/api/projects/${S.projId}/tasks`, { token: S.memToken }); expectStatus(all, 200);
    const doing = await api('GET', `/api/projects/${S.projId}/tasks?status=doing`, { token: S.memToken });
    const arr = (x) => (Array.isArray(x.body) ? x.body : x.body.tasks || []);
    expect(arr(all).length === 2 && arr(doing).length === 1, `all=${arr(all).length} doing=${arr(doing).length}`);
  });
  await check('non-member cannot list tasks -> 403', t, async () => expectStatus(await api('GET', `/api/projects/${S.adminProjId}/tasks`, { token: S.memToken }), 403));
  await check('PATCH task status', t, async () => { const r = await api('PATCH', `/api/tasks/${S.taskId}`, { token: S.memToken, body: { status: 'done' } }); expectStatus(r, 200); expect(pick(r.body).status === 'done', 'not done'); });
  await check('PATCH task invalid status -> 400', t, async () => expectStatus(await api('PATCH', `/api/tasks/${S.taskId}`, { token: S.memToken, body: { status: 'nope' } }), 400));
  await check('unknown task -> 404', t, async () => expectStatus(await api('PATCH', '/api/tasks/999999', { token: S.memToken, body: { status: 'done' } }), 404));
  await check('DELETE task', t, async () => expectStatus(await api('DELETE', `/api/tasks/${S.task2Id}`, { token: S.memToken }), 204));

  await check('non-owner DELETE project -> 403', p, async () => expectStatus(await api('DELETE', `/api/projects/${S.projId}`, { token: S.outToken }), 403));
  await check('owner DELETE project removes it', p, async () => {
    const tmp = await api('POST', '/api/projects', { token: S.memToken, body: { name: 'Temp' } });
    expectStatus(await api('DELETE', `/api/projects/${pick(tmp.body).id}`, { token: S.memToken }), 204);
    expectStatus(await api('GET', `/api/projects/${pick(tmp.body).id}`, { token: S.memToken }), 404);
  });
}

async function changeSuite() {
  const g = 'archive';
  await check('archive by owner', g, async () => { const r = await api('POST', `/api/projects/${S.projId}/archive`, { token: S.memToken }); expectStatus(r, 200); expect(pick(r.body).archived === true, `archived=${pick(r.body).archived}`); });
  await check('project objects include archived flag', g, async () => { const r = await api('GET', `/api/projects/${S.adminProjId}`, { token: S.adminToken }); expect(pick(r.body).archived === false, `archived=${pick(r.body).archived}`); });
  await check('non-owner cannot archive -> 403', g, async () => expectStatus(await api('POST', `/api/projects/${S.adminProjId}/archive`, { token: S.memToken }), 403));
  await check('list hides archived', g, async () => {
    const r = await api('GET', '/api/projects', { token: S.memToken });
    expect(!(Array.isArray(r.body) ? r.body : r.body.projects || []).some(x => x.id === S.projId), 'archived project listed');
  });
  await check('list ?includeArchived=true shows it', g, async () => {
    const r = await api('GET', '/api/projects?includeArchived=true', { token: S.memToken });
    expect((Array.isArray(r.body) ? r.body : r.body.projects || []).some(x => x.id === S.projId), 'missing');
  });
  await check('archived project still readable', g, async () => expectStatus(await api('GET', `/api/projects/${S.projId}`, { token: S.memToken }), 200));
  await check('archived project tasks still readable', g, async () => expectStatus(await api('GET', `/api/projects/${S.projId}/tasks`, { token: S.memToken }), 200));

  const l = 'linked (read-only)';
  await check('archived: PATCH project rejected', l, async () => expect((await api('PATCH', `/api/projects/${S.projId}`, { token: S.memToken, body: { name: 'Y' } })).status >= 400, 'accepted'));
  await check('archived: create task rejected', l, async () => expect((await api('POST', `/api/projects/${S.projId}/tasks`, { token: S.memToken, body: { title: 'Z' } })).status >= 400, 'accepted'));
  await check('archived: update task rejected', l, async () => expect((await api('PATCH', `/api/tasks/${S.taskId}`, { token: S.memToken, body: { status: 'todo' } })).status >= 400, 'accepted'));
  await check('archived: delete task rejected', l, async () => expect((await api('DELETE', `/api/tasks/${S.taskId}`, { token: S.memToken })).status >= 400, 'accepted'));
  await check('archived: add member rejected', l, async () => expect((await api('POST', `/api/projects/${S.projId}/members`, { token: S.memToken, body: { userId: S.adminId } })).status >= 400, 'accepted'));
  await check('unarchive restores writes', g, async () => {
    const r = await api('POST', `/api/projects/${S.projId}/unarchive`, { token: S.memToken });
    expectStatus(r, 200); expect(pick(r.body).archived === false, 'still archived');
    expectStatus(await api('POST', `/api/projects/${S.projId}/tasks`, { token: S.memToken, body: { title: 'After' } }), 201);
  });
}

// ─── run ────────────────────────────────────────────────────────────────────
try {
  await start();
  await baseSuite();               // regression for the change suite too
  if (suite === 'change') await changeSuite();
} catch (err) {
  results.push({ name: 'server starts', group: 'runtime', pass: false, error: String(err.message).slice(0, 800) });
  console.log(`  FAIL  [runtime] ${err.message.slice(0, 400)}`);
} finally {
  stop();
}

if (!flags.includes('--skip-web')) {
  await check('web/ builds', 'web', async () => {
    const web = path.join(projectDir, 'web');
    expect(fs.existsSync(path.join(web, 'package.json')), 'no web/package.json');
    const r = sh('npm install --no-audit --no-fund && npm run build', web);
    expect(r.ok, r.out);
  });
}

const byGroup = {};
for (const r of results) {
  byGroup[r.group] = byGroup[r.group] || { pass: 0, total: 0 };
  byGroup[r.group].total++; if (r.pass) byGroup[r.group].pass++;
}
const summary = { arm, suite, passed: results.filter(r => r.pass).length, total: results.length, byGroup, results };
fs.writeFileSync(path.join(path.dirname(path.resolve(projectDir)), `results-${arm}-${suite}.json`), JSON.stringify(summary, null, 2));
console.log(`\n${arm}/${suite}: ${summary.passed}/${summary.total} passed`);
console.log(JSON.stringify(byGroup));
