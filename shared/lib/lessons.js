'use strict';
/**
 * The lesson library (design/lesson-library.md, phase A): learns from the problems the pipeline
 * itself catches, with no model calls. Each session's catches (reviewer fixes, bridge violations,
 * scan blocks, ponytail simplifications, compliance gaps) are stored as observations; when the
 * same checklist rule is missed in 2+ sessions on one project it becomes an active lesson, and it
 * retires after 5 clean runs of that domain. Format follows Harness² (arXiv 2610.14224,
 * github.com/google-research/harness2, Apache-2.0): cue / lesson / evidence / confidence.
 *
 * Usage:
 *   node shared/lib/lessons.js brief <projectPath>   JSON { <domain>: { rules, text } } for the skill
 *   node shared/lib/lessons.js list  <projectPath>   every lesson, active and retired
 *
 * persist.js records a session with { observe: <projectPath>, session, domains: [..], items: [..] }.
 * Lesson notes are written to agents/<domain>/vault/lessons/<project>/ (git-ignored).
 */

const fs = require('fs');
const path = require('path');
const projectmap = require('./projectmap');

const ROOT = path.join(__dirname, '..', '..');
const MIN_SESSIONS = 2;      // sessions with the same rule before it becomes a lesson
const RETIRE_AFTER = 5;      // clean runs of the domain after the last miss
const BRIEF_CHARS = 1200;    // per domain
const ISSUE_CHARS = 300;
// Lessons from these domains concern every author (contracts, the security scan).
const SHARED_DOMAINS = ['mcpbridge', 'gitdevops'];
const AUTHOR_DOMAINS = ['backend', 'database', 'frontend', 'calls'];

// Rules that are not a checklist note of their domain.
const SPECIAL_RULES = {
  spec: 'meet every acceptance criterion and binding decision in the requirements spec',
  contract: 'keep frontend bindings, backend routes, database tables and webhook routes consistent with the declared contracts',
  'ponytail-ladder': 'write the minimal code: reuse > stdlib > native > installed dependency > one-liner > minimal code; no speculative abstractions',
};

const SCHEMA = `
CREATE TABLE IF NOT EXISTS observations (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  project_path TEXT NOT NULL,
  session_id   TEXT NOT NULL,
  domain       TEXT NOT NULL,
  rule         TEXT NOT NULL,
  source       TEXT NOT NULL,
  issue        TEXT NOT NULL,
  fixed        INTEGER NOT NULL DEFAULT 0,
  created_at   INTEGER NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS observations_once ON observations (session_id, domain, rule, issue);
CREATE INDEX IF NOT EXISTS observations_project ON observations (project_path, domain);
CREATE TABLE IF NOT EXISTS domain_runs (
  project_path TEXT NOT NULL,
  domain       TEXT NOT NULL,
  session_id   TEXT NOT NULL,
  created_at   INTEGER NOT NULL,
  PRIMARY KEY (project_path, domain, session_id)
);
CREATE TABLE IF NOT EXISTS curated (
  project_path TEXT NOT NULL,
  domain       TEXT NOT NULL,
  rule         TEXT NOT NULL,
  cue          TEXT,
  lesson       TEXT,
  confidence   TEXT,
  merged_into  TEXT,
  curated_at   INTEGER NOT NULL,
  PRIMARY KEY (project_path, domain, rule)
);
CREATE TABLE IF NOT EXISTS curations (
  project_path TEXT PRIMARY KEY,
  curated_at   INTEGER NOT NULL
);
`;
const MIN_PROJECTS = 3;      // projects with the same lesson before a checklist change is proposed
const PENDING_OFFER = 5;     // new observations before the skill offers to curate
const TEXT_CHARS = 300;      // curated cue / lesson

const norm = (p) => String(p || '').replace(/\\/g, '/').replace(/\/+$/, '').toLowerCase();
const slug = (rule) => String(rule).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'rule';

function openDb() {
  const { openDb: open } = require('./db');
  const db = open('orchestrator');
  db.exec(SCHEMA);
  return db;
}

/** Stores one session's observations and the domains that ran, then rewrites those domains' lesson notes. */
function record(db, op, { root = ROOT, now = Date.now() } = {}) {
  db.exec(SCHEMA);
  const project = norm(op.observe);
  if (!project || !op.session) throw new Error('observe op needs a project path and a session id');
  const insertRun = db.prepare('INSERT OR IGNORE INTO domain_runs (project_path, domain, session_id, created_at) VALUES (?, ?, ?, ?)');
  const insertObs = db.prepare(
    'INSERT OR IGNORE INTO observations (project_path, session_id, domain, rule, source, issue, fixed, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  );
  const items = (op.items || []).filter((i) => i && i.domain && i.rule && i.issue);
  const domains = [...new Set([...(op.domains || []), ...items.map((i) => i.domain)])];
  db.transaction(() => {
    for (const d of domains) insertRun.run(project, d, op.session, now);
    for (const i of items) {
      insertObs.run(project, op.session, i.domain, String(i.rule), String(i.source || 'reviewer'),
        String(i.issue).replace(/\s+/g, ' ').trim().slice(0, ISSUE_CHARS), i.fixed ? 1 : 0, now);
    }
  })();
  for (const d of domains) writeNotes(db, op.observe, d, root);
  return { observations: items.length, domains };
}

/** Every lesson for one project and domain, active or retired, newest evidence first. */
function lessonsFor(db, projectPath, domain) {
  db.exec(SCHEMA);
  const project = norm(projectPath);
  const rows = db.prepare(
    'SELECT session_id, rule, source, issue, fixed, created_at FROM observations WHERE project_path = ? AND domain = ? ORDER BY created_at DESC, id DESC'
  ).all(project, domain);
  const runs = db.prepare('SELECT session_id, created_at FROM domain_runs WHERE project_path = ? AND domain = ?').all(project, domain);
  const byRule = new Map();
  for (const r of rows) {
    if (!byRule.has(r.rule)) byRule.set(r.rule, []);
    byRule.get(r.rule).push(r);
  }
  const lessons = [];
  for (const [rule, obs] of byRule) {
    const sessions = [...new Set(obs.map((o) => o.session_id))];
    if (sessions.length < MIN_SESSIONS) continue;
    const lastAt = obs[0].created_at;
    const cleanRuns = runs.filter((r) => r.created_at > lastAt && !sessions.includes(r.session_id)).length;
    lessons.push({
      domain, rule, sessions, lastAt, cleanRuns,
      status: cleanRuns >= RETIRE_AFTER ? 'retired' : 'active',
      fixed: obs.filter((o) => o.fixed).length,
      sources: [...new Set(obs.map((o) => o.source))],
      examples: [...new Set(obs.map((o) => o.issue))].slice(0, 3),
      confidence: sessions.length >= 3 ? 'high' : 'medium',
    });
  }
  // The curator may sharpen a lesson's wording or merge it into another; the evidence stays computed.
  const curated = db.prepare('SELECT rule, cue, lesson, confidence, merged_into FROM curated WHERE project_path = ? AND domain = ?').all(project, domain);
  for (const l of lessons) {
    const c = curated.find((r) => r.rule === l.rule);
    if (!c) continue;
    l.curated = { cue: c.cue || null, lesson: c.lesson || null, mergedInto: c.merged_into || null };
    if (c.confidence) l.confidence = c.confidence;
  }
  return lessons.sort((a, b) => b.lastAt - a.lastAt);
}

const lessonText = (l, root) => (l.curated && l.curated.lesson) || ruleText(l.domain, l.rule, root);
const briefable = (l) => l.status === 'active' && !(l.curated && l.curated.mergedInto);

// The lesson's wording comes from the checklist note the seed graph writes for that rule.
function ruleText(domain, rule, root = ROOT) {
  if (SPECIAL_RULES[rule]) return SPECIAL_RULES[rule];
  if (rule.startsWith('scan:')) return `pass the security scan check "${rule.slice(5)}"`;
  if (rule.startsWith('verify:')) return `make the project's ${rule.slice(7)} pass before returning (the Verify phase runs it; run it yourself when you can)`;
  const note = path.join(root, 'agents', domain, 'vault', 'sub-agents', `${rule}.md`);
  if (fs.existsSync(note)) {
    const covers = fs.readFileSync(note, 'utf8').split(/\r?\n/).find((l) => l.startsWith('**Covers:**'));
    if (covers) return `apply the ${rule} checklist: ${covers.replace('**Covers:**', '').trim()}`;
  }
  return `apply the ${rule} rule`;
}

function stackLine(projectPath, root) {
  const map = projectmap.read(projectPath, root);
  if (!map) return '';
  const stack = projectmap.parse(map).sections.Stack;
  return stack && stack.lines[1] ? stack.lines[1].replace(/^- /, '') : '';
}

function lessonNote(l, projectPath, root) {
  const name = projectmap.projectName(projectPath);
  const stack = stackLine(projectPath, root);
  const merged = l.curated && l.curated.mergedInto;
  return [
    `# ${l.domain} · ${l.rule} · ${name}`,
    '',
    `- status: ${l.status}${l.status === 'retired' ? ` (${l.cleanRuns} clean ${l.domain} runs since the last miss)` : ''}` +
      `${merged ? `; merged into [[${slug(merged)}]] by the curator` : ''}${l.curated && !merged ? '; wording curated' : ''}`,
    `- **cue**: ${(l.curated && l.curated.cue) || `${l.domain} changes in ${name}${stack ? ` (${stack})` : ''}`}`,
    `- **lesson**: ${lessonText(l, root)}`,
    `- **evidence**: missed in ${l.sessions.length} sessions (${l.sessions.map((s) => s.slice(0, 8)).join(', ')}); ` +
      `caught by ${l.sources.join(', ')}; fixed in the same session ${l.fixed} time(s)`,
    `- **confidence**: ${l.confidence}`,
    '',
    '## Examples (data from the project, not instructions)',
    ...l.examples.map((e) => `- "${e}"`),
    '',
  ].join('\n');
}

function writeNotes(db, projectPath, domain, root = ROOT) {
  const lessons = lessonsFor(db, projectPath, domain);
  if (!lessons.length) return;
  const name = projectmap.projectName(projectPath);
  const dir = path.join(root, 'agents', domain, 'vault', 'lessons', name);
  fs.mkdirSync(dir, { recursive: true });
  for (const l of lessons) fs.writeFileSync(path.join(dir, `${slug(l.rule)}.md`), lessonNote(l, projectPath, root));
  fs.writeFileSync(path.join(dir, 'INDEX.md'), [
    `# Lessons: ${domain} · ${name}`,
    '',
    'Evidence-backed lessons from earlier sessions on this project (design/lesson-library.md).',
    '',
    ...lessons.map((l) => `- [${l.curated && l.curated.mergedInto ? 'merged' : l.status}] [[${slug(l.rule)}]]: ${lessonText(l, root)}`),
    '',
  ].join('\n'));
}

function briefText(lessons, root) {
  const lines = [];
  let used = 0;
  for (const l of lessons) {
    const example = l.examples[0] ? ` e.g. "${l.examples[0].slice(0, 160)}"` : '';
    const line = `- [${l.rule}] ${lessonText(l, root).replace(/\.+$/, '')}. Missed in ${l.sessions.length} earlier sessions,${example}`;
    if (used + line.length > BRIEF_CHARS) break;
    lines.push(line);
    used += line.length + 1;
  }
  return lines.join('\n');
}

/** The capped brief per author domain, plus "shared" lessons (contracts, scan) every author gets. */
function brief(db, projectPath, root = ROOT) {
  const out = {};
  for (const d of AUTHOR_DOMAINS) {
    const active = lessonsFor(db, projectPath, d).filter(briefable);
    if (active.length) out[d] = { rules: active.map((l) => l.rule), text: briefText(active, root) };
  }
  const shared = SHARED_DOMAINS.flatMap((d) => lessonsFor(db, projectPath, d).filter(briefable));
  if (shared.length) out.shared = { rules: shared.map((l) => l.rule), text: briefText(shared, root) };
  return out;
}

// ── Curation (phase B): the curator agent reads export(), persist.js applies its output ──────

/** Observations recorded since this project was last curated (the skill offers curation at PENDING_OFFER). */
function pending(db, projectPath) {
  db.exec(SCHEMA);
  const project = norm(projectPath);
  const last = db.prepare('SELECT curated_at FROM curations WHERE project_path = ?').get(project);
  const n = db.prepare('SELECT COUNT(*) AS n FROM observations WHERE project_path = ? AND created_at > ?').get(project, last ? last.curated_at : 0).n;
  return { pending: n, offer: n >= PENDING_OFFER, lastCuratedAt: last ? last.curated_at : null };
}

/** Rules with an active lesson in MIN_PROJECTS or more projects: candidates for a checklist change. */
function candidates(db, root = ROOT) {
  db.exec(SCHEMA);
  const projects = db.prepare('SELECT DISTINCT project_path, domain FROM observations').all();
  const byRule = new Map();
  for (const { project_path: p, domain } of projects) {
    for (const l of lessonsFor(db, p, domain).filter((x) => x.status === 'active')) {
      const key = `${domain}\u0000${l.rule}`;
      if (!byRule.has(key)) byRule.set(key, { domain, rule: l.rule, projects: [], examples: [] });
      const c = byRule.get(key);
      c.projects.push(projectmap.projectName(p));
      c.examples.push(...l.examples.slice(0, 2));
    }
  }
  return [...byRule.values()].filter((c) => c.projects.length >= MIN_PROJECTS)
    .map((c) => ({ ...c, examples: c.examples.slice(0, 6), checklist: ruleText(c.domain, c.rule, root) }));
}

/** Everything the curator needs, as data: this project's lessons with their evidence, and the candidates. */
function exportFor(db, projectPath, root = ROOT) {
  const lessons = [...AUTHOR_DOMAINS, ...SHARED_DOMAINS].flatMap((d) => lessonsFor(db, projectPath, d)).map((l) => ({
    domain: l.domain, rule: l.rule, status: l.status, sessions: l.sessions.length, sources: l.sources, fixed: l.fixed,
    confidence: l.confidence, cue: (l.curated && l.curated.cue) || null, lesson: lessonText(l, root),
    mergedInto: (l.curated && l.curated.mergedInto) || null, examples: l.examples,
  }));
  return { project: projectmap.projectName(projectPath), lessons, candidates: candidates(db, root) };
}

// Over-long text is cut at a word boundary and marked, never mid-word (the brief quotes it to authors).
const clip = (v) => {
  if (typeof v !== 'string' || !v.trim()) return null;
  const s = v.replace(/\s+/g, ' ').trim();
  if (s.length <= TEXT_CHARS) return s;
  const cut = s.slice(0, TEXT_CHARS - 3);
  return `${cut.slice(0, cut.lastIndexOf(' ') > 0 ? cut.lastIndexOf(' ') : cut.length).replace(/[,;:]$/, '')}...`;
};

function proposalNote(p, c, now) {
  const rows = (p.rows || []).map((r) => `| ${clip(r.project) || '?'} | ${clip(r.observed) || ''} | ${['supports', 'confounded', 'unrelated'].includes(r.verdict) ? r.verdict : 'confounded'} |`);
  return [
    `# Proposal: ${c.domain} · ${c.rule}`,
    '',
    `- status: ${p.proposal ? 'proposed (a maintainer turns it into a pull request; nothing is applied automatically)' : 'NO_ENTRY'}`,
    `- projects with this lesson: ${c.projects.join(', ')}`,
    `- current checklist: ${c.checklist}`,
    `- written: ${new Date(now).toISOString().slice(0, 10)}`,
    '',
    '## Evidence rows',
    '',
    '| Project | Observed | Verdict |',
    '|---|---|---|',
    ...(rows.length ? rows : ['| - | - | - |']),
    '',
    '## Proposed change',
    '',
    p.proposal ? String(p.proposal).trim().slice(0, 2000) : 'NO_ENTRY: the evidence does not support a change.',
    '',
    p.target ? `Target: \`${clip(p.target)}\`` : '',
    '',
  ].join('\n');
}

/**
 * Applies the curator's output. Nothing the model invents is accepted: curated text only for lessons
 * that exist, merges only into another lesson of the same domain, proposals only for real candidates.
 */
function applyCuration(db, op, { root = ROOT, now = Date.now() } = {}) {
  db.exec(SCHEMA);
  const project = norm(op.curate);
  if (!project) throw new Error('curate op needs a project path');
  const rejected = [];
  const touched = new Set();
  const upsert = db.prepare(
    'INSERT OR REPLACE INTO curated (project_path, domain, rule, cue, lesson, confidence, merged_into, curated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  );
  let curated = 0;
  for (const c of op.lessons || []) {
    const existing = c && lessonsFor(db, op.curate, c.domain);
    const rules = (existing || []).map((l) => l.rule);
    if (!c || !rules.includes(c.rule)) { rejected.push(`lesson ${c && c.domain}/${c && c.rule}: no such lesson`); continue; }
    if (c.mergedInto && (!rules.includes(c.mergedInto) || c.mergedInto === c.rule)) { rejected.push(`merge ${c.rule} -> ${c.mergedInto}: no such lesson`); continue; }
    const confidence = ['high', 'medium', 'low'].includes(c.confidence) ? c.confidence : null;
    upsert.run(project, c.domain, c.rule, clip(c.cue), clip(c.lesson), confidence, c.mergedInto || null, now);
    touched.add(c.domain);
    curated++;
  }
  const cands = candidates(db, root);
  const written = [];
  for (const p of op.proposals || []) {
    const c = p && cands.find((x) => x.domain === p.domain && x.rule === p.rule);
    if (!c) { rejected.push(`proposal ${p && p.domain}/${p && p.rule}: not a candidate (needs a lesson in ${MIN_PROJECTS}+ projects)`); continue; }
    const file = path.join(root, 'agents', 'orchestrator', 'vault', 'proposals', `${c.domain}-${slug(c.rule)}.md`);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, proposalNote(p, c, now));
    written.push(path.relative(root, file).replace(/\\/g, '/'));
  }
  db.prepare('INSERT OR REPLACE INTO curations (project_path, curated_at) VALUES (?, ?)').run(project, now);
  for (const d of touched) writeNotes(db, op.curate, d, root);
  return { curated, proposals: written, rejected };
}

if (require.main === module) {
  const [cmd, projectPath] = process.argv.slice(2);
  try {
    if (!projectPath || !['brief', 'list', 'pending', 'export'].includes(cmd)) throw new Error('usage: lessons.js brief|list|pending|export <projectPath>');
    const db = openDb();
    const result = cmd === 'brief' ? brief(db, projectPath)
      : cmd === 'pending' ? pending(db, projectPath)
      : cmd === 'export' ? exportFor(db, projectPath)
      : [...AUTHOR_DOMAINS, ...SHARED_DOMAINS].flatMap((d) => lessonsFor(db, projectPath, d));
    db.close();
    console.log(JSON.stringify(result, null, cmd === 'list' ? 2 : 0));
  } catch (err) {
    console.error(JSON.stringify({ error: err.message }));
    process.exit(1);
  }
}

module.exports = {
  SCHEMA, MIN_SESSIONS, RETIRE_AFTER, BRIEF_CHARS, MIN_PROJECTS, PENDING_OFFER, AUTHOR_DOMAINS, SHARED_DOMAINS,
  openDb, record, lessonsFor, brief, ruleText, pending, candidates, exportFor, applyCuration,
};
