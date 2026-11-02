'use strict';
/**
 * Live dashboard for the agent pipeline (no model calls, no dependencies, read-only).
 *
 * Claude Code writes a trail for every workflow run:
 *   <claude dir>/projects/<project>/<session>/subagents/workflows/wf_<id>/
 *     journal.jsonl            one line when an agent starts, one when it returns
 *     agent-<id>.meta.json     its label, phase (the sub-workflow it belongs to) and model
 *     agent-<id>.jsonl         its transcript: timestamps, tool calls, token usage
 * This turns that trail into a picture of the orchestration: which stage is running, which agent is doing what right now, what
 * is finished, what was skipped, how long each step took. The page is shared/dashboard/index.html.
 *
 * Usage:
 *   node shared/lib/dashboard.js [--port 4777] [--root <projects dir>] [--open]
 *
 * It listens on 127.0.0.1 only, accepts only requests addressed to a local host name, and shows tool names and short targets
 * (file names, command starts with secrets masked), never whole prompts or transcripts.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const { spawn } = require('child_process');

const PAGE = path.join(__dirname, '..', 'dashboard', 'index.html');

/** The standard pipeline, in order. `parallel` stages run side by side after the backend. */
const PIPELINE = [
  { id: 'init', name: 'Session', blurb: 'Opens the session, classifies the task and records the baseline' },
  { id: 'onboard', name: 'Project scan', blurb: 'Learns the stack, layout and conventions (first use only)' },
  { id: 'sysdocs', name: 'System Docs', blurb: 'Syncs the per-module docs and checks who depends on the change' },
  { id: 'requirements', name: 'Requirements', blurb: 'Turns the task into user stories and a specification' },
  { id: 'database', name: 'Database', blurb: 'Schema and migration' },
  { id: 'backend', name: 'Backend', blurb: 'Routes, controllers and services' },
  { id: 'frontend', name: 'Frontend', blurb: 'Design, components and API wiring', parallel: true },
  { id: 'testing', name: 'Testing', blurb: 'Postman collection for the changed routes', parallel: true },
  { id: 'calls', name: 'Calls', blurb: 'Phone and voice flows', parallel: true },
  { id: 'ponytail', name: 'Simplify', blurb: 'Trims over-engineering from the new code' },
  { id: 'verify', name: 'Verify', blurb: 'Runs the project\'s own build, tests and API checks' },
  { id: 'mcpbridge', name: 'Contract bridge', blurb: 'Checks frontend, backend and database agree' },
  { id: 'docs', name: 'Docs update', blurb: 'Records what changed in each module doc' },
  { id: 'gitdevops', name: 'Scan & commit', blurb: 'Security scan, then the commit on a new branch' },
  { id: 'sre', name: 'SRE review', blurb: 'Health, metrics and feedback for the next cycle' },
];
const STAGE_INDEX = new Map(PIPELINE.map((s, i) => [s.id, i]));
const PHASE_ALIASES = { 'system docs': 'sysdocs', sysdocs: 'sysdocs', bridge: 'mcpbridge', git: 'gitdevops', 'frontend testing calls': 'frontend' };

/** Which stage an agent belongs to, from its label and the phase it reported. */
function stageOf(label, phase) {
  const l = String(label || '');
  if (l === 'persist') return 'bookkeeping';
  // The baseline run happens before any code is written, so it belongs with the session set-up, not with the Verify stage.
  if (/^(init-session|check-onboarded|classify-task|verify-baseline)$/.test(l)) return 'init';
  if (/^(verify|fix-)/.test(l)) return 'verify';
  if (l === 'docs-synced') return 'gitdevops';
  if (/^update:/.test(l)) return 'docs';
  const p = String(phase || '').replace(/^[^A-Za-z]+/, '').trim().toLowerCase();
  if (!p) return 'other';
  return PHASE_ALIASES[p] || p.split(' ')[0];
}

// ── small helpers ────────────────────────────────────────────────────────────
const MASKS = [
  [/Bearer\s+[A-Za-z0-9._~+/=-]{8,}/g, 'Bearer ***'],
  // a value after a credential-looking name (a "Bearer" word before it is part of the value)
  [/(api[_-]?key|secret|token|password|passwd|authorization)(["']?\s*[=:]\s*["']?)(?:Bearer\s+)?[^\s"']+/gi, '$1$2***'],
  [/\b[A-Za-z0-9_-]{32,}\b/g, '***'],
];
/** Masks things that look like credentials before a command or path is shown. */
function scrub(s) { return MASKS.reduce((t, [re, to]) => t.replace(re, to), String(s)); }
// A project's name is the folder name of its working directory. A run that has not written a transcript yet does not know it,
// so the name seen for any run of the same Claude project folder is reused; the folder slug itself is the last resort.
const projectNames = new Map();
function projectName(slug, cwd) {
  if (cwd) {
    let dir = String(cwd).split(String.fromCharCode(92)).join('/');
    while (dir.endsWith('/')) dir = dir.slice(0, -1);
    const name = path.basename(dir);
    if (name) { projectNames.set(slug, name); return name; }
  }
  if (projectNames.has(slug)) return projectNames.get(slug);
  const parts = String(slug).split('--').slice(1).join('--').split('-');   // "c--Users-me-Desktop-app" -> ["Users", "me", "Desktop", "app"]
  return parts.slice(/^(Desktop|Documents|Projects)$/.test(parts[2]) ? 3 : 2).join('-') || String(slug);
}
const shortPath = (p) => String(p || '').split(/[\\/]+/).filter(Boolean).slice(-3).join('/');
const clip = (s, n) => (String(s).length > n ? String(s).slice(0, n - 1) + '…' : String(s));

/** A person-readable line for a tool call. Never the whole input. */
function describeTool(name, input = {}) {
  const i = input || {};
  switch (name) {
    case 'Read': return `Reading ${shortPath(i.file_path)}`;
    case 'Edit': case 'MultiEdit': return `Editing ${shortPath(i.file_path)}`;
    case 'Write': return `Writing ${shortPath(i.file_path)}`;
    case 'NotebookEdit': return `Editing ${shortPath(i.notebook_path)}`;
    case 'Bash': case 'PowerShell': return `Running: ${clip(scrub(String(i.command || '').split('\n')[0]), 110)}`;
    case 'Grep': return `Searching for ${clip(scrub(i.pattern || ''), 60)}`;
    case 'Glob': return `Finding ${clip(i.pattern || '', 60)}`;
    case 'StructuredOutput': return 'Returning its result';
    case 'WebFetch': case 'WebSearch': return 'Looking something up on the web';
    default: return name || 'Working';
  }
}

/** The kind of a tool call, for the telemetry bars: reading, running, writing, searching, returning. */
function toolKind(name) {
  if (name === 'Read') return 'read';
  if (name === 'Bash' || name === 'PowerShell') return 'run';
  if (/^(Edit|Write|MultiEdit|NotebookEdit)$/.test(name)) return 'write';
  if (/^(Grep|Glob|WebSearch|WebFetch)$/.test(name)) return 'find';
  if (name === 'StructuredOutput') return 'done';
  return 'other';
}
const emptyKinds = () => ({ read: 0, run: 0, write: 0, find: 0, done: 0, other: 0 });

// ── reading the trail ────────────────────────────────────────────────────────
const claudeDir = () => process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude');
const fileCache = new Map();   // transcript path -> incremental parse state

/** Reads only what was appended since the last call, so a long transcript is parsed once. */
function readTranscript(file) {
  let st;
  try { st = fs.statSync(file); } catch { return null; }
  let c = fileCache.get(file);
  if (!c || st.size < c.pos) c = { pos: 0, first: null, last: null, usage: new Map(), tools: [], toolCount: 0, cwd: null, kinds: emptyKinds(), ctx: 0 };
  if (st.size > c.pos) {
    const fd = fs.openSync(file, 'r');
    try {
      const buf = Buffer.alloc(st.size - c.pos);
      fs.readSync(fd, buf, 0, buf.length, c.pos);
      const text = buf.toString('utf8');
      const end = text.lastIndexOf('\n');          // a half-written last line is read next time
      if (end >= 0) {
        for (const line of text.slice(0, end).split('\n')) {
          if (!line) continue;
          let o;
          try { o = JSON.parse(line); } catch { continue; }
          if (o.timestamp) { c.first = c.first || o.timestamp; c.last = o.timestamp; }
          if (!c.cwd && o.cwd) c.cwd = o.cwd;
          const m = o.message;
          if (o.type !== 'assistant' || !m) continue;
          if (m.usage) { c.usage.set(m.id || o.uuid, m.usage); c.ctx = (m.usage.input_tokens || 0) + (m.usage.cache_creation_input_tokens || 0) + (m.usage.cache_read_input_tokens || 0); }   // one message can span several lines: count it once
          for (const b of Array.isArray(m.content) ? m.content : []) {
            if (b.type !== 'tool_use') continue;
            c.toolCount++; c.kinds[toolKind(b.name)]++;
            c.tools.push({ at: o.timestamp, tool: b.name, detail: describeTool(b.name, b.input) });
            if (c.tools.length > 60) c.tools.shift();
          }
        }
        c.pos += Buffer.byteLength(text.slice(0, end + 1), 'utf8');
      }
    } finally { fs.closeSync(fd); }
    fileCache.set(file, c);
  }
  return c;
}

function readJsonLines(file) {
  try {
    return fs.readFileSync(file, 'utf8').split('\n').filter(Boolean).map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
  } catch { return []; }
}

/** Every workflow run on disk, newest activity first. */
function discoverRuns(root = path.join(claudeDir(), 'projects')) {
  const runs = [];
  let projects = [];
  try { projects = fs.readdirSync(root); } catch { return runs; }
  for (const proj of projects) {
    const pdir = path.join(root, proj);
    let sessions = [];
    try { sessions = fs.readdirSync(pdir); } catch { continue; }
    for (const sess of sessions) {
      const wdir = path.join(pdir, sess, 'subagents', 'workflows');
      let wfs = [];
      try { wfs = fs.readdirSync(wdir); } catch { continue; }
      for (const wf of wfs) {
        const dir = path.join(wdir, wf);
        const journal = path.join(dir, 'journal.jsonl');
        let st;
        try { st = fs.statSync(journal); } catch { continue; }
        runs.push({ id: wf, dir, journal, project: proj, session: sess, mtimeMs: st.mtimeMs, birthMs: st.birthtimeMs });
      }
    }
  }
  return runs.sort((a, b) => b.mtimeMs - a.mtimeMs);
}

const IDLE_MS = 45000;   // no new journal line for this long, and nothing running: the run is over

/** The full picture of one run. */
function loadRun(run, now = Date.now()) {
  const journal = readJsonLines(run.journal);
  const started = journal.filter((x) => x.type === 'started');
  const results = new Map(journal.filter((x) => x.type === 'result').map((x) => [x.agentId, x]));
  const failed = new Set(journal.filter((x) => /err|fail/i.test(String(x.type)) && x.agentId).map((x) => x.agentId));
  let cwd = null;

  const agents = started.map((s, order) => {
    let meta = {};
    try { meta = JSON.parse(fs.readFileSync(path.join(run.dir, `agent-${s.agentId}.meta.json`), 'utf8')); } catch { /* not written yet */ }
    const label = s.label || meta.description || 'agent';
    const phase = s.phase || meta.workflowPhase || '';
    const tr = readTranscript(path.join(run.dir, `agent-${s.agentId}.jsonl`));
    if (tr && tr.cwd && !cwd) cwd = tr.cwd;
    let metaMs = null;
    try { metaMs = fs.statSync(path.join(run.dir, `agent-${s.agentId}.meta.json`)).mtimeMs; } catch { /* none */ }
    const res = results.get(s.agentId);
    const state = failed.has(s.agentId) ? 'failed' : res ? 'done' : 'running';
    const startedAt = tr && tr.first ? Date.parse(tr.first) : metaMs;
    const endedAt = state === 'running' ? null : (tr && tr.last ? Date.parse(tr.last) : null);
    let inTok = 0, outTok = 0;
    if (tr) for (const u of tr.usage.values()) {
      inTok += (u.input_tokens || 0) + (u.cache_creation_input_tokens || 0) + (u.cache_read_input_tokens || 0);
      outTok += u.output_tokens || 0;
    }
    return {
      id: s.agentId, order, label, phase, stage: stageOf(label, phase), model: meta.model || 'main',
      state, startedAt, endedAt, durationMs: startedAt && endedAt ? endedAt - startedAt : null,
      lastActivityAt: tr && tr.last ? Date.parse(tr.last) : startedAt,
      toolCount: tr ? tr.toolCount : 0, tools: tr ? tr.tools.slice(-25) : [], tokens: { in: inTok, out: outTok },
      kinds: tr ? { ...tr.kinds } : emptyKinds(), ctx: tr ? tr.ctx : 0,
      now: state === 'running' && tr && tr.tools.length ? tr.tools[tr.tools.length - 1].detail : (state === 'running' ? 'Starting up' : null),
      result: res ? clip(scrub(JSON.stringify(res.result === undefined ? null : res.result)), 1600) : null,
      toolsUsed: res && Array.isArray(res.toolsUsed) ? res.toolsUsed : [],
    };
  });

  return buildRun({ id: run.id, project: run.project, cwd, session: run.session, mtimeMs: run.mtimeMs, birthMs: run.birthMs }, agents, now, {});
}

/** The run object the page draws, from its agents. `over` can be forced (the demo knows when it is finished). */
function buildRun(run, agents, now, { over: forceOver } = {}) {
  const anyRunning = agents.some((a) => a.state === 'running');
  const lastMs = Math.max(run.mtimeMs, ...agents.map((a) => a.lastActivityAt || 0));
  const idle = now - lastMs > IDLE_MS;
  const over = forceOver !== undefined ? forceOver : !anyRunning && idle && agents.length > 0;
  const stages = summarizeStages(agents, over);
  const firstMs = Math.min(...agents.map((a) => a.startedAt || Infinity), run.birthMs || Infinity);
  const done = stages.filter((s) => s.state === 'done').length;
  const inScope = stages.filter((s) => s.state !== 'skipped').length;
  const live = stages.filter((s) => s.state === 'running' || s.state === 'active').length;
  const endedEarly = over && !stages.some((s) => s.id === 'gitdevops' && s.state === 'done');
  const state = !agents.length ? 'starting' : anyRunning ? 'running' : !over ? 'working' : endedEarly ? 'ended-early' : 'complete';

  return {
    run: {
      id: run.id, project: projectName(run.project, run.cwd), cwd: run.cwd, session: run.session,
      startedAt: Number.isFinite(firstMs) ? firstMs : null, lastActivityAt: lastMs, state, now,
    },
    progress: { pct: over && !endedEarly ? 100 : Math.min(99, Math.round((100 * (done + 0.5 * live)) / Math.max(1, inScope))), stagesDone: done, stagesTotal: inScope },
    totals: {
      agents: agents.length, done: agents.filter((x) => x.state === 'done').length, running: agents.filter((x) => x.state === 'running').length,
      failed: agents.filter((x) => x.state === 'failed').length, tools: agents.reduce((n, x) => n + x.toolCount, 0),
      tokensIn: agents.reduce((n, x) => n + x.tokens.in, 0), tokensOut: agents.reduce((n, x) => n + x.tokens.out, 0),
    },
    stages, agents, feed: buildFeed(agents),
  };
}

/** Per-stage state: running, active (between its agents), done, failed, skipped or pending. */
function summarizeStages(agents, over) {
  const real = agents.filter((a) => a.stage !== 'bookkeeping');
  const ids = PIPELINE.map((s) => s.id);
  for (const a of real) if (!ids.includes(a.stage)) ids.push(a.stage);
  const byStage = new Map(ids.map((id) => [id, real.filter((a) => a.stage === id)]));
  const meta = (id) => PIPELINE[STAGE_INDEX.get(id)] || { id, name: id.charAt(0).toUpperCase() + id.slice(1), blurb: '' };
  // the last position of a stage's group: parallel stages are not "after" each other
  const groupEnd = (id) => {
    const i = STAGE_INDEX.get(id);
    if (i === undefined) return ids.indexOf(id);
    if (!PIPELINE[i].parallel) return i;
    let j = i;
    while (PIPELINE[j + 1] && PIPELINE[j + 1].parallel) j++;
    return j;
  };
  const startedAfter = (id) => ids.some((other, k) => k > groupEnd(id) && byStage.get(other).length > 0);
  return ids.map((id) => {
    const list = byStage.get(id);
    const m = meta(id);
    let state;
    if (list.some((a) => a.state === 'failed')) state = 'failed';
    else if (list.some((a) => a.state === 'running')) state = 'running';
    else if (list.length) state = startedAfter(id) || over ? 'done' : 'active';
    else state = startedAfter(id) || over ? 'skipped' : 'pending';
    const starts = list.map((a) => a.startedAt).filter(Boolean);
    const ends = list.map((a) => a.endedAt).filter(Boolean);
    return {
      id, name: m.name, blurb: m.blurb, parallel: !!m.parallel, state,
      agents: list.length, agentsDone: list.filter((a) => a.state === 'done').length,
      startedAt: starts.length ? Math.min(...starts) : null,
      endedAt: state === 'done' && ends.length ? Math.max(...ends) : null,
      nowLabel: (list.find((a) => a.state === 'running') || {}).label || null,
      nowDetail: (list.find((a) => a.state === 'running') || {}).now || null,
    };
  });
}

/** One chronological stream: agents starting and finishing, and what they are doing. */
function buildFeed(agents) {
  const items = [];
  for (const a of agents) {
    if (a.startedAt) items.push({ at: a.startedAt, agent: a.label, stage: a.stage, kind: 'start', text: `${a.label} started` });
    for (const t of a.tools) items.push({ at: Date.parse(t.at) || 0, agent: a.label, stage: a.stage, kind: 'tool', text: t.detail });
    if (a.endedAt) items.push({ at: a.endedAt, agent: a.label, stage: a.stage, kind: a.state === 'failed' ? 'fail' : 'end', text: `${a.label} ${a.state === 'failed' ? 'failed' : 'finished'}` });
  }
  return items.sort((x, y) => x.at - y.at).slice(-120);
}

/** The runs list for the picker (cheap: reads each journal, not the transcripts). */
function listRuns(root, now = Date.now()) {
  const rows = discoverRuns(root).slice(0, 40).map((r) => {
    const j = readJsonLines(r.journal);
    const started = j.filter((x) => x.type === 'started').length;
    const finished = j.filter((x) => x.type === 'result').length;
    const running = started - finished;
    let project = r.project;
    const first = j.find((x) => x.type === 'started');
    if (first) {
      const tf = path.join(r.dir, `agent-${first.agentId}.jsonl`);
      const tr = readTranscript(tf);
      if (tr && tr.cwd) project = projectName(r.project, tr.cwd);
    }
    const state = !started ? 'starting' : running > 0 ? 'running' : now - r.mtimeMs <= IDLE_MS ? 'working' : 'finished';
    return { id: r.id, project, agents: started, running, state, lastActivityAt: r.mtimeMs, startedAt: r.birthMs, slug: r.project };
  });
  // second pass: a run seen before any transcript existed takes the name learned from its project's other runs
  return rows.map(({ slug, ...x }) => ({ ...x, project: projectName(slug, null) }));
}

// ── a scripted run, so the page can be previewed without a real one ─────────────
// [label, phase, model, start s, duration s, what it does]
const DEMO = [
  ['init-session', 'Init', 'haiku', 0, 2, ['Running: node shared/lib/db-cli.js init-session']],
  ['classify-task', 'Init', 'main', 2, 3, ['Reading the task', 'Returning its result']],
  ['verify-baseline', 'Init', 'haiku', 3, 3, ['Running: node shared/lib/verify.js run --out baseline.json']],
  ['drift-check', '\u25b8 sysdocs', 'haiku', 5, 3, ['Running: node shared/lib/sysdocs.js drift']],
  ['spec-author', '\u25b8 requirements', 'main', 8, 9, ['Reading src/server.js', 'Reading docs/system/INDEX.md', 'Searching for routes', 'Returning its result']],
  ['author', '\u25b8 database', 'main', 17, 8, ['Reading migrations/001_init.sql', 'Writing migrations/002_videos.sql', 'Returning its result']],
  ['reviewer', '\u25b8 database', 'main', 25, 5, ['Reading migrations/002_videos.sql', 'Editing migrations/002_videos.sql', 'Returning its result']],
  ['author', '\u25b8 backend', 'main', 30, 14, ['Reading src/routes.js', 'Writing src/features/videos/service.js', 'Writing src/features/videos/routes.js', 'Writing src/features/videos/schema.js', 'Returning its result']],
  ['reviewer', '\u25b8 backend', 'main', 44, 7, ['Reading src/features/videos/service.js', 'Editing src/features/videos/schema.js', 'Returning its result']],
  ['designer', '\u25b8 frontend', 'main', 51, 6, ['Reading web/src/theme.ts', 'Returning its result']],
  ['generate-collection', '\u25b8 testing', 'main', 51, 12, ['Reading src/features/videos/routes.js', 'Writing videos.postman.json', 'Returning its result']],
  ['author', '\u25b8 frontend', 'main', 57, 12, ['Writing web/src/pages/Library.tsx', 'Writing web/src/api/videos.api.ts', 'Writing web/src/components/VideoCard.tsx', 'Returning its result']],
  ['reviewer', '\u25b8 frontend', 'main', 69, 6, ['Reading web/src/pages/Library.tsx', 'Editing web/src/components/VideoCard.tsx', 'Returning its result']],
  ['ponytail', '\u25b8 ponytail', 'main', 75, 6, ['Reading src/features/videos/service.js', 'Editing src/features/videos/service.js', 'Returning its result']],
  ['verify', 'Verify', 'haiku', 81, 8, ['Running: node shared/lib/verify.js run --collection videos.postman.json', 'Returning its result']],
  ['bridge', '\u25b8 mcpbridge', 'main', 89, 4, ['Reading web/src/api/videos.api.ts', 'Returning its result']],
  ['scan-and-commit', '\u25b8 gitdevops', 'haiku', 93, 6, ['Running: node shared/lib/gitcommit.js --type feat --slug videos', 'Returning its result']],
  ['sre-diagnose', '\u25b8 sre', 'main', 99, 7, ['Reading agents/sre/vault/runbooks/root-cause-analysis.md', 'Returning its result']],
];
const DEMO_LENGTH = 106;
const TOOL_OF = (d) => (/^Reading/.test(d) ? 'Read' : /^Writing/.test(d) ? 'Write' : /^Editing/.test(d) ? 'Edit' : /^Running/.test(d) ? 'Bash' : /^Searching/.test(d) ? 'Grep' : 'StructuredOutput');

/** The scripted run `seconds` after it began, in exactly the shape of a real one. */
function demoRun(seconds, now = Date.now()) {
  const s = Math.max(0, Math.min(Number(seconds) || 0, DEMO_LENGTH));
  const t0 = now - s * 1000;
  const agents = DEMO.filter((d) => d[3] <= s).map(([label, phase, model, start, dur, lines], order) => {
    const finished = s >= start + dur;
    const startedAt = t0 + start * 1000;
    const shown = lines.filter((_, i) => start + (dur * (i + 1)) / (lines.length + 1) <= s || (finished && true));
    const tools = shown.map((detail, i) => ({ at: new Date(t0 + (start + (dur * (i + 1)) / (lines.length + 1)) * 1000).toISOString(), tool: TOOL_OF(detail), detail }));
    const elapsed = Math.min(s - start, dur);
    return {
      id: `demo${order}`, order, label, phase, stage: stageOf(label, phase), model, state: finished ? 'done' : 'running',
      startedAt, endedAt: finished ? t0 + (start + dur) * 1000 : null, durationMs: finished ? dur * 1000 : null,
      lastActivityAt: tools.length ? Date.parse(tools[tools.length - 1].at) : startedAt, toolCount: tools.length, tools,
      tokens: { in: Math.round(elapsed * 4200), out: Math.round(elapsed * 260) },
      kinds: tools.reduce((k, x) => { k[toolKind(x.tool)]++; return k; }, emptyKinds()), ctx: Math.round(elapsed * 4200),
      now: finished ? null : (tools.length ? tools[tools.length - 1].detail : 'Starting up'),
      result: finished ? '{"status":"completed","note":"scripted demo data"}' : null, toolsUsed: finished ? [...new Set(tools.map((x) => x.tool))] : [],
    };
  });
  return buildRun({ id: 'demo', project: 'demo-project', cwd: null, session: 'demo', mtimeMs: now, birthMs: t0 }, agents, now, { over: s >= DEMO_LENGTH });
}

// ── the server ───────────────────────────────────────────────────────────────
const RUN_ID = /^wf_[A-Za-z0-9-]{3,40}$/;
const SECURITY_HEADERS = {
  'content-security-policy': "default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; connect-src 'self'; img-src 'self' data:; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'no-referrer',
  'cache-control': 'no-store',
  'cross-origin-resource-policy': 'same-origin',
};

function createServer({ root } = {}) {
  const server = http.createServer((req, res) => {
    const send = (code, type, body) => { res.writeHead(code, { 'content-type': type, ...SECURITY_HEADERS }); res.end(body); };
    const json = (code, obj) => send(code, 'application/json; charset=utf-8', JSON.stringify(obj));
    try {
      // Only requests addressed to this machine by name: a web page elsewhere cannot reach it through DNS tricks.
      const host = String(req.headers.host || '').toLowerCase();
      const port = server.address() && server.address().port;
      if (![`127.0.0.1:${port}`, `localhost:${port}`, `[::1]:${port}`].includes(host)) return json(403, { error: 'forbidden host' });
      if (req.method !== 'GET' && req.method !== 'HEAD') return json(405, { error: 'read-only' });
      const url = new URL(req.url, 'http://local');
      if (url.pathname === '/' || url.pathname === '/index.html') return send(200, 'text/html; charset=utf-8', fs.readFileSync(PAGE));
      if (url.pathname === '/api/health') return json(200, { ok: true });
      if (url.pathname === '/api/runs') return json(200, { now: Date.now(), runs: listRuns(root) });
      if (url.pathname === '/api/demo') return json(200, demoRun(url.searchParams.get('t')));
      const m = /^\/api\/runs\/([^/]+)$/.exec(url.pathname);
      if (m) {
        if (!RUN_ID.test(m[1])) return json(400, { error: 'bad run id' });
        const run = discoverRuns(root).find((r) => r.id === m[1]);   // looked up, never joined into a path
        return run ? json(200, loadRun(run)) : json(404, { error: 'no such run' });
      }
      return json(404, { error: 'not found' });
    } catch (err) {
      return json(500, { error: 'could not read the run' });
    }
  });
  return server;
}

function listen(server, port, tries = 20) {
  return new Promise((resolve, reject) => {
    const attempt = (p, left) => {
      server.once('error', (e) => { if (e.code === 'EADDRINUSE' && left > 0 && p !== 0) attempt(p + 1, left - 1); else reject(e); });
      server.listen(p, '127.0.0.1', () => { server.removeAllListeners('error'); resolve(server.address().port); });
    };
    attempt(port, tries);
  });
}

function openBrowser(url) {
  const [cmd, args] = process.platform === 'win32' ? ['cmd', ['/c', 'start', '', url]] : process.platform === 'darwin' ? ['open', [url]] : ['xdg-open', [url]];
  try { spawn(cmd, args, { stdio: 'ignore', detached: true }).unref(); } catch { /* the URL is printed anyway */ }
}

if (require.main === module) {
  const argv = process.argv.slice(2);
  const opt = (n) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : undefined; };
  const port = opt('--port') !== undefined ? Number(opt('--port')) : 4777;
  if (!Number.isInteger(port) || port < 0 || port > 65535) { console.error('error: --port must be a number from 0 to 65535'); process.exit(2); }
  const server = createServer({ root: opt('--root') });
  listen(server, port).then((p) => {
    const url = `http://127.0.0.1:${p}`;
    console.log(`Dashboard: ${url}   (Ctrl+C to stop)`);
    if (argv.includes('--open')) openBrowser(url);
  }).catch((e) => { console.error(`error: could not start the dashboard: ${e.message}`); process.exit(1); });
}

module.exports = { createServer, listen, discoverRuns, listRuns, loadRun, buildRun, demoRun, DEMO_LENGTH, stageOf, describeTool, scrub, PIPELINE };
