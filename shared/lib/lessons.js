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
`;

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
  return lessons.sort((a, b) => b.lastAt - a.lastAt);
}

// The lesson's wording comes from the checklist note the seed graph writes for that rule.
function ruleText(domain, rule, root = ROOT) {
  if (SPECIAL_RULES[rule]) return SPECIAL_RULES[rule];
  if (rule.startsWith('scan:')) return `pass the security scan check "${rule.slice(5)}"`;
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
  return [
    `# ${l.domain} · ${l.rule} · ${name}`,
    '',
    `- status: ${l.status}${l.status === 'retired' ? ` (${l.cleanRuns} clean ${l.domain} runs since the last miss)` : ''}`,
    `- **cue**: ${l.domain} changes in ${name}${stack ? ` (${stack})` : ''}`,
    `- **lesson**: ${ruleText(l.domain, l.rule, root)}`,
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
    ...lessons.map((l) => `- [${l.status}] [[${slug(l.rule)}]]: ${ruleText(domain, l.rule, root)}`),
    '',
  ].join('\n'));
}

function briefText(lessons, root) {
  const lines = [];
  let used = 0;
  for (const l of lessons) {
    const example = l.examples[0] ? ` e.g. "${l.examples[0].slice(0, 160)}"` : '';
    const line = `- [${l.rule}] ${ruleText(l.domain, l.rule, root).replace(/\.+$/, '')}. Missed in ${l.sessions.length} earlier sessions,${example}`;
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
    const active = lessonsFor(db, projectPath, d).filter((l) => l.status === 'active');
    if (active.length) out[d] = { rules: active.map((l) => l.rule), text: briefText(active, root) };
  }
  const shared = SHARED_DOMAINS.flatMap((d) => lessonsFor(db, projectPath, d).filter((l) => l.status === 'active'));
  if (shared.length) out.shared = { rules: shared.map((l) => l.rule), text: briefText(shared, root) };
  return out;
}

if (require.main === module) {
  const [cmd, projectPath] = process.argv.slice(2);
  try {
    if (!projectPath || !['brief', 'list'].includes(cmd)) throw new Error('usage: lessons.js brief|list <projectPath>');
    const db = openDb();
    const result = cmd === 'brief'
      ? brief(db, projectPath)
      : [...AUTHOR_DOMAINS, ...SHARED_DOMAINS].flatMap((d) => lessonsFor(db, projectPath, d));
    db.close();
    console.log(JSON.stringify(result, null, cmd === 'list' ? 2 : 0));
  } catch (err) {
    console.error(JSON.stringify({ error: err.message }));
    process.exit(1);
  }
}

module.exports = { SCHEMA, MIN_SESSIONS, RETIRE_AFTER, BRIEF_CHARS, AUTHOR_DOMAINS, SHARED_DOMAINS, openDb, record, lessonsFor, brief, ruleText };
