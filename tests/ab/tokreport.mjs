// Token accounting for one or more workflow runs.
// Usage: node tokreport.mjs <name> <workflowTranscriptDir>... [--json out.json]
//
// Input side (fresh input, cache write, cache read) comes straight from message.usage.
// Output side: transcripts store usage as of message start, so output_tokens is only
// final for some messages. We take, per API message, max(recorded output, estimated
// output) where the estimate is (chars of text + tool_use input) / 3.5. Hidden thinking
// is not visible in transcripts, so output is a lower bound.
import fs from 'node:fs';
import path from 'node:path';

const argv = process.argv.slice(2);
const jsonOut = argv.includes('--json') ? argv[argv.indexOf('--json') + 1] : null;
const [name, ...dirs] = argv.filter((a, i) => a !== '--json' && argv[i - 1] !== '--json');
const CHARS_PER_TOKEN = 3.5;

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out); else out.push(p);
  }
  return out;
}

const labels = new Map();
const agents = [];
for (const dir of dirs) {
  const files = walk(dir);
  for (const j of files.filter(f => f.endsWith('journal.jsonl'))) {
    for (const line of fs.readFileSync(j, 'utf8').split('\n').filter(Boolean)) {
      try { const e = JSON.parse(line); if (e.agentId && e.label) labels.set(e.agentId, { label: e.label, phase: e.phase || '' }); } catch { /* partial line */ }
    }
  }
  for (const f of files.filter(f => /agent-[\w-]+\.jsonl$/.test(f))) {
    const id = path.basename(f).replace(/^agent-|\.jsonl$/g, '');
    const perMsg = new Map();
    let model = '';
    for (const line of fs.readFileSync(f, 'utf8').split('\n').filter(Boolean)) {
      let e; try { e = JSON.parse(line); } catch { continue; }
      const m = e.message;
      if (!m || !m.usage || e.type !== 'assistant') continue;
      model = m.model || model;
      const key = m.id || e.uuid;
      const p = perMsg.get(key) || { input: 0, cacheWrite: 0, cacheRead: 0, recordedOut: 0, chars: 0 };
      p.input = Math.max(p.input, m.usage.input_tokens || 0);
      p.cacheWrite = Math.max(p.cacheWrite, m.usage.cache_creation_input_tokens || 0);
      p.cacheRead = Math.max(p.cacheRead, m.usage.cache_read_input_tokens || 0);
      p.recordedOut = Math.max(p.recordedOut, m.usage.output_tokens || 0);
      for (const c of m.content || []) {
        if (c.type === 'text') p.chars += (c.text || '').length;
        else if (c.type === 'tool_use') p.chars += JSON.stringify(c.input || {}).length + (c.name || '').length;
      }
      perMsg.set(key, p);
    }
    const u = { input: 0, cacheWrite: 0, cacheRead: 0, output: 0, calls: perMsg.size };
    for (const v of perMsg.values()) {
      u.input += v.input; u.cacheWrite += v.cacheWrite; u.cacheRead += v.cacheRead;
      u.output += Math.max(v.recordedOut, Math.round(v.chars / CHARS_PER_TOKEN));
    }
    const meta = labels.get(id) || { label: id.slice(0, 8), phase: '' };
    agents.push({
      id, ...meta, model, ...u,
      total: u.input + u.cacheWrite + u.cacheRead + u.output,
      billable: u.input + u.cacheWrite + u.output,                       // excludes cheap cache reads
      weighted: Math.round(u.input + 1.25 * u.cacheWrite + 0.1 * u.cacheRead + 5 * u.output),
      workflow: path.basename(path.dirname(f)),
    });
  }
}

const FIELDS = ['input', 'cacheWrite', 'cacheRead', 'output', 'total', 'billable', 'weighted', 'calls'];
const sum = (rows) => rows.reduce((a, r) => {
  FIELDS.forEach(k => { a[k] += r[k]; });
  a.agents++;
  return a;
}, Object.fromEntries([...FIELDS, 'agents'].map(k => [k, 0])));

const group = (key) => {
  const g = {};
  for (const a of agents) (g[a[key] || '(none)'] = g[a[key] || '(none)'] || []).push(a);
  return Object.fromEntries(Object.entries(g).map(([k, rows]) => [k, sum(rows)]).sort((x, y) => y[1].weighted - x[1].weighted));
};

const report = { name, totals: sum(agents), byPhase: group('phase'), byModel: group('model'), agents: agents.sort((a, b) => b.weighted - a.weighted) };
const k = (n) => `${(n / 1000).toFixed(1)}k`;
const t = report.totals;
console.log(`\n== ${name}: ${t.agents} agents, ${t.calls} model calls ==`);
console.log(`all tokens ${k(t.total)} = fresh input ${k(t.input)} + cache write ${k(t.cacheWrite)} + cache read ${k(t.cacheRead)} + output ~${k(t.output)}`);
console.log(`billable excl. cache reads: ${k(t.billable)} | cost-weighted (in=1, cache write=1.25, cache read=0.1, out=5): ${k(t.weighted)}`);
const row = (label, s) => `  ${label.slice(0, 30).padEnd(30)} wtd ${k(s.weighted).padStart(8)}  billable ${k(s.billable).padStart(8)}  out ~${k(s.output).padStart(7)}  ${String(s.agents).padStart(3)} agents`;
console.log('\nby phase:');
for (const [p, s] of Object.entries(report.byPhase)) console.log(row(p, s));
console.log('\nby model:');
for (const [p, s] of Object.entries(report.byModel)) console.log(row(p, s));
console.log('\ntop agents:');
for (const a of report.agents.slice(0, 12)) console.log(row(a.label, Object.assign({ agents: 1 }, a)));
if (jsonOut) fs.writeFileSync(jsonOut, JSON.stringify(report, null, 2));
