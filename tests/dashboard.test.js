'use strict';
/**
 * Tests for shared/lib/dashboard.js and its page: a fake Claude Code workflow trail on disk, read the way the real one is.
 * Run: node tests/dashboard.test.js
 */

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const D = require('../shared/lib/dashboard');

const tmp = [];
let passed = 0;
async function test(name, fn) { await fn(); passed++; console.log(`  ok  ${name}`); }

const iso = (ms) => new Date(ms).toISOString();
const line = (o) => JSON.stringify(o) + '\n';

/** A workflow trail: <root>/<project>/<session>/subagents/workflows/<id>/ with a journal and one transcript per agent. */
function trail(agents, { id = 'wf_test1', cwd = 'C:\\Users\\me\\myproj', t0 = Date.now() - 60000 } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'dash-'));
  tmp.push(root);
  const dir = path.join(root, 'proj', 'sess', 'subagents', 'workflows', id);
  fs.mkdirSync(dir, { recursive: true });
  let journal = line({ type: 'launched' });
  agents.forEach((a, i) => {
    const agentId = `a${i}`;
    journal += line({ type: 'started', key: `k${i}`, agentId, label: a.label, phase: a.phase });
    if (a.done) journal += line({ type: 'result', key: `k${i}`, agentId, result: a.result || { ok: true }, toolsUsed: ['Bash'] });
    fs.writeFileSync(path.join(dir, `agent-${agentId}.meta.json`), JSON.stringify({ description: a.label, workflowPhase: a.phase, model: a.model || 'haiku' }));
    let tr = '';
    (a.tools || []).forEach((tool, k) => {
      tr += line({ type: 'assistant', timestamp: iso(t0 + i * 1000 + k * 100), cwd, uuid: `u${i}-${k}`,
        message: { id: `m${i}-${k}`, role: 'assistant', content: [{ type: 'tool_use', name: tool.name, input: tool.input }],
          usage: { input_tokens: 10, cache_creation_input_tokens: 100, cache_read_input_tokens: 1000, output_tokens: 5 } } });
    });
    fs.writeFileSync(path.join(dir, `agent-${agentId}.jsonl`), tr);
  });
  fs.writeFileSync(path.join(dir, 'journal.jsonl'), journal);
  return { root, dir };
}
const loadFrom = (root, id = 'wf_test1', now) => D.loadRun(D.discoverRuns(root).find((r) => r.id === id), now);
const get = (port, p, headers = {}, method = 'GET') => new Promise((resolve, reject) => {
  const req = http.request({ host: '127.0.0.1', port, path: p, method, headers }, (res) => { let b = ''; res.on('data', (c) => (b += c)); res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: b })); });
  req.on('error', reject); req.end();
});

(async () => {
  await test('an agent belongs to the stage its phase (or its label) names; the baseline run is session set-up', () => {
    assert.strictEqual(D.stageOf('author', '\u25b8 backend'), 'backend');
    assert.strictEqual(D.stageOf('bridge', '\u25b8 mcpbridge'), 'mcpbridge');
    assert.strictEqual(D.stageOf('drift-check', '\u25b8 sysdocs'), 'sysdocs');
    assert.strictEqual(D.stageOf('impact-analyst', 'System Docs'), 'sysdocs');
    assert.strictEqual(D.stageOf('classify-task', 'Init'), 'init');
    assert.strictEqual(D.stageOf('verify-baseline', 'Requirements'), 'init');
    assert.strictEqual(D.stageOf('verify', 'Verify'), 'verify');
    assert.strictEqual(D.stageOf('fix-backend', 'Verify'), 'verify');
    assert.strictEqual(D.stageOf('update:auth', '\u25b8 sysdocs'), 'docs');
    assert.strictEqual(D.stageOf('docs-synced', 'Git'), 'gitdevops');
    assert.strictEqual(D.stageOf('persist', '\u25b8 backend'), 'bookkeeping');
  });

  await test('what an agent is doing is shown as a short line; credentials in a command are masked', () => {
    assert.strictEqual(D.describeTool('Read', { file_path: 'C:\\a\\b\\c\\d\\src\\server.js' }), 'Reading d/src/server.js');
    assert.ok(/^Running: node run\.js/.test(D.describeTool('Bash', { command: 'node run.js\nsecond line' })));
    const masked = D.describeTool('Bash', { command: 'curl -H "Authorization: Bearer abcdefghijklmnop123" --data API_KEY=sk_live_abc123 https://x.example/zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz' });
    assert.ok(!/abcdefghijklmnop123|sk_live_abc123|zzzzzzzzzz/.test(masked), masked);
    assert.ok(/\*\*\*/.test(masked));
    assert.strictEqual(D.describeTool('StructuredOutput', {}), 'Returning its result');
  });

  await test('stages: done, running, between steps, skipped and waiting come from what has started', () => {
    const { root } = trail([
      { label: 'spec-author', phase: '\u25b8 requirements', done: true, tools: [{ name: 'Read', input: { file_path: '/a/b.md' } }] },
      { label: 'author', phase: '\u25b8 backend', done: true, tools: [] },
      { label: 'author', phase: '\u25b8 frontend', done: false, tools: [{ name: 'Write', input: { file_path: '/web/x.tsx' } }] },
    ]);
    const r = loadFrom(root);
    const st = Object.fromEntries(r.stages.map((s) => [s.id, s.state]));
    assert.strictEqual(st.requirements, 'done');
    assert.strictEqual(st.backend, 'done');
    assert.strictEqual(st.frontend, 'running');
    assert.strictEqual(st.testing, 'pending', 'a parallel stage is not skipped just because its sibling started');
    assert.strictEqual(st.database, 'skipped', 'no agent, but a later stage started');
    assert.strictEqual(st.sre, 'pending');
    assert.strictEqual(r.run.state, 'running');
    assert.strictEqual(r.run.project, 'myproj', 'the project name comes from the agent\'s working folder');
    assert.strictEqual(r.agents.find((a) => a.stage === 'frontend').now, 'Writing web/x.tsx');
  });

  await test('a finished run is complete, one that stopped before the commit is "ended early"', () => {
    const full = trail([{ label: 'scan-and-commit', phase: '\u25b8 gitdevops', done: true, tools: [] }]);
    const later = Date.now() + 10 * 60 * 1000;
    assert.strictEqual(loadFrom(full.root, 'wf_test1', later).run.state, 'complete');
    assert.strictEqual(loadFrom(full.root, 'wf_test1', later).progress.pct, 100);
    const stopped = trail([{ label: 'author', phase: '\u25b8 backend', done: true, tools: [] }]);
    assert.strictEqual(loadFrom(stopped.root, 'wf_test1', later).run.state, 'ended-early');
    assert.strictEqual(loadFrom(stopped.root, 'wf_test1', Date.now()).run.state, 'working', 'recent activity, nothing running: between agents');
  });

  await test('tokens are counted once per message, and only appended transcript lines are read on the next look', () => {
    const { root, dir } = trail([{ label: 'author', phase: '\u25b8 backend', done: false, tools: [{ name: 'Read', input: { file_path: '/a' } }] }]);
    const before = loadFrom(root);
    assert.strictEqual(before.agents[0].tokens.out, 5);
    const file = path.join(dir, 'agent-a0.jsonl');
    const again = line({ type: 'assistant', timestamp: iso(Date.now()), uuid: 'x', message: { id: 'm0-0', role: 'assistant', content: [], usage: { input_tokens: 10, cache_creation_input_tokens: 100, cache_read_input_tokens: 1000, output_tokens: 5 } } });
    fs.appendFileSync(file, again);                                 // the same message id again: not counted twice
    assert.strictEqual(loadFrom(root).agents[0].tokens.out, 5);
    fs.appendFileSync(file, line({ type: 'assistant', timestamp: iso(Date.now()), uuid: 'y', message: { id: 'm9', role: 'assistant', content: [{ type: 'tool_use', name: 'Bash', input: { command: 'npm test' } }], usage: { output_tokens: 7 } } }));
    const grown = loadFrom(root).agents[0];
    assert.strictEqual(grown.toolCount, 2);
    assert.strictEqual(grown.tokens.out, 12);
    assert.strictEqual(grown.now, 'Running: npm test');
    fs.appendFileSync(file, '{"type":"assistant","message":{"id":"half"');   // half-written last line: ignored until it is complete
    assert.strictEqual(loadFrom(root).agents[0].toolCount, 2);
    fs.appendFileSync(file, ',"content":[{"type":"tool_use","name":"Read","input":{"file_path":"/z"}}],"usage":{"output_tokens":1}}}\n');
    assert.strictEqual(loadFrom(root).agents[0].toolCount, 3);
  });

  await test('damaged or missing files do not break the picture', () => {
    const { root, dir } = trail([{ label: 'author', phase: '\u25b8 backend', done: true, tools: [] }]);
    fs.appendFileSync(path.join(dir, 'journal.jsonl'), 'not json at all\n');
    fs.rmSync(path.join(dir, 'agent-a0.jsonl'));
    fs.rmSync(path.join(dir, 'agent-a0.meta.json'));
    const r = loadFrom(root);
    assert.strictEqual(r.agents.length, 1);
    assert.strictEqual(r.agents[0].state, 'done');
    assert.deepStrictEqual(D.discoverRuns(path.join(root, 'does-not-exist')), []);
  });

  await test('the scripted demo runs the whole pipeline: parallel stages together, unused ones skipped, then complete', () => {
    const mid = D.demoRun(55);
    assert.deepStrictEqual(mid.stages.filter((s) => s.state === 'running').map((s) => s.id).sort(), ['frontend', 'testing']);
    assert.strictEqual(mid.stages.find((s) => s.id === 'calls').state, 'pending');
    const end = D.demoRun(D.DEMO_LENGTH);
    assert.strictEqual(end.run.state, 'complete');
    assert.strictEqual(end.progress.pct, 100);
    assert.strictEqual(end.stages.find((s) => s.id === 'calls').state, 'skipped');
    assert.strictEqual(end.totals.running, 0);
  });

  await test('the server is read-only, local-only, and serves the page with a strict policy', async () => {
    const { root } = trail([{ label: 'author', phase: '\u25b8 backend', done: false, tools: [{ name: 'Read', input: { file_path: '/a' } }] }]);
    const server = D.createServer({ root });
    const port = await D.listen(server, 0);
    try {
      const page = await get(port, '/');
      assert.strictEqual(page.status, 200);
      assert.ok(/default-src 'none'/.test(page.headers['content-security-policy']) && /frame-ancestors 'none'/.test(page.headers['content-security-policy']));
      assert.strictEqual(page.headers['x-content-type-options'], 'nosniff');
      const runs = JSON.parse((await get(port, '/api/runs')).body);
      assert.strictEqual(runs.runs[0].id, 'wf_test1');
      assert.strictEqual(runs.runs[0].running, 1);
      const run = JSON.parse((await get(port, '/api/runs/wf_test1')).body);
      assert.strictEqual(run.run.state, 'running');
      assert.strictEqual(JSON.parse((await get(port, '/api/demo?t=30')).body).run.id, 'demo');
      assert.strictEqual((await get(port, '/api/runs', { Host: 'evil.example.com' })).status, 403, 'a request addressed to another name is refused');
      assert.strictEqual((await get(port, '/api/runs/..%2F..%2Fetc')).status, 400);
      assert.strictEqual((await get(port, '/api/runs/wf_nope1')).status, 404);
      assert.strictEqual((await get(port, '/api/runs', {}, 'POST')).status, 405);
      assert.strictEqual((await get(port, '/nothing-here')).status, 404);
    } finally { server.close(); }
  });

  await test('the page loads nothing from elsewhere and puts untrusted text in only as text', () => {
    const html = fs.readFileSync(path.join(__dirname, '..', 'shared', 'dashboard', 'index.html'), 'utf8');
    assert.ok(!/(src|href)=["']https?:/i.test(html), 'no external resources');
    assert.ok(!/https?:\/\/(?!127\.0\.0\.1)/.test(html.replace(/<!--[\s\S]*?-->/g, '')), 'no URL to another host');
    const script = html.slice(html.indexOf('<script>') + 8, html.indexOf('</script>'));
    new Function(script);   // it parses
    const writes = script.split('\n').filter((l) => /innerHTML\s*=/.test(l));
    assert.strictEqual(writes.length, 2);
    assert.ok(writes.every((l) => /ICON\[|TURN/.test(l)), 'innerHTML only ever gets the built-in icons: ' + writes.join(' | '));
    assert.ok(!/insertAdjacentHTML|document\.write|eval\(/.test(script));
  });

  console.log(`\ndashboard: ${passed} passed`);
})().catch((err) => { console.error(`\nFAILED after ${passed} passed:\n${err.stack}`); process.exitCode = 1; }).finally(() => { for (const d of tmp) fs.rmSync(d, { recursive: true, force: true }); });
