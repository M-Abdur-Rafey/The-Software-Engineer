'use strict';
/**
 * The shared project map (design/agent-consolidation.md, change 4): one compact note per target
 * project, at most 3000 characters, handed to every agent so none of them has to explore the repo
 * again. Onboarding builds it; after each committed session the routes, tables and reviewer notes
 * are merged in. Deterministic, no model calls. It lives in the private orchestrator vault:
 *
 *   agents/orchestrator/vault/projects/<name>/map.md   (git-ignored, like the code graph)
 *
 * Usage:
 *   node shared/lib/projectmap.js path <projectPath>   absolute path of the map file
 *   node shared/lib/projectmap.js show <projectPath>   the map, or nothing if there is none yet
 *
 * persist.js runs the writes: { map: <projectPath>, sections: {...} } rebuilds the map,
 * { map: <projectPath>, update: { routes, tables, notes } } merges into it.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const MAX_CHARS = 3000;
const SECTIONS = ['Stack', 'Layout', 'Conventions', 'Modules', 'Routes', 'Tables', 'Run'];
// When the map is too long, lines are dropped from the end of these sections, largest first.
const TRIMMABLE = ['Routes', 'Tables', 'Modules', 'Layout', 'Conventions'];
const MORE = /^- \(\+(\d+) more\b/;

function projectName(projectPath) {
  const name = String(projectPath || '').replace(/[\\/]+$/, '').split(/[\\/]/).pop() || 'project';
  if (name === '.' || name === '..') throw new Error(`cannot derive a project name from: ${projectPath}`);
  return name;
}

function relPath(projectPath) {
  return `agents/orchestrator/vault/projects/${projectName(projectPath)}/map.md`;
}

function absPath(projectPath, root = ROOT) {
  return path.join(root, relPath(projectPath));
}

const bullet = (line) => {
  const s = String(line).replace(/\s+/g, ' ').trim();
  return s.startsWith('- ') ? s : `- ${s}`;
};

/** Parses a map into { name, sections: { <Section>: { lines, omitted } } }. Unknown sections are kept. */
function parse(text) {
  const out = { name: null, sections: {} };
  let current = null;
  for (const raw of String(text || '').split(/\r?\n/)) {
    const line = raw.trimEnd();
    const title = line.match(/^# Project map: (.+)$/);
    if (title) { out.name = title[1].trim(); continue; }
    const head = line.match(/^## (.+)$/);
    if (head) { current = head[1].trim(); out.sections[current] = out.sections[current] || { lines: [], omitted: 0 }; continue; }
    if (!current || !line.startsWith('- ')) continue;
    const more = line.match(MORE);
    if (more) out.sections[current].omitted += Number(more[1]);
    else out.sections[current].lines.push(line);
  }
  return out;
}

function renderRaw(name, sections) {
  const order = [...SECTIONS, ...Object.keys(sections).filter((s) => !SECTIONS.includes(s))];
  const parts = [
    `# Project map: ${name}`,
    '',
    `> Compact context for every agent (max ${MAX_CHARS} chars). Built by onboarding, updated after each committed session. ` +
      `Trust it instead of exploring the repo; read only the files you change. Per-domain detail: agents/<domain>/vault/projects/${name}.md.`,
  ];
  for (const s of order) {
    const sec = sections[s];
    if (!sec || (!sec.lines.length && !sec.omitted)) continue;
    parts.push('', `## ${s}`, ...sec.lines);
    if (sec.omitted) parts.push(`- (+${sec.omitted} more not listed)`);
  }
  return parts.join('\n') + '\n';
}

/** Renders sections ({ <Section>: [lines] } or parsed form) and trims to MAX_CHARS. */
function render(name, sections) {
  const secs = {};
  for (const [k, v] of Object.entries(sections || {})) {
    const lines = Array.isArray(v) ? v : (v && v.lines) || [];
    const seen = new Set();
    secs[k] = {
      lines: lines.filter(Boolean).map(bullet).filter((l) => (seen.has(l) ? false : seen.add(l))),
      omitted: Array.isArray(v) ? 0 : (v && v.omitted) || 0,
    };
  }
  let text = renderRaw(name, secs);
  while (text.length > MAX_CHARS) {
    const victim = TRIMMABLE.filter((s) => secs[s] && secs[s].lines.length)
      .sort((a, b) => secs[b].lines.length - secs[a].lines.length)[0];
    if (!victim) return text.slice(0, MAX_CHARS - 20) + '\n[... truncated]\n';
    secs[victim].lines.pop();
    secs[victim].omitted += 1;
    text = renderRaw(name, secs);
  }
  return text;
}

const routeKey = (line) => {
  const m = line.match(/^- ([A-Za-z]+) (\S+)/);
  return m ? `${m[1].toUpperCase()} ${m[2]}` : null;
};
const tableKey = (line) => {
  const m = line.match(/^- ([^:\s]+):/);
  return m ? m[1].toLowerCase() : null;
};

// Newest first: trimming drops lines from the end, so fresh entries survive the cap.
function upsert(sec, line, keyOf) {
  const key = keyOf(line);
  const i = key ? sec.lines.findIndex((l) => keyOf(l) === key) : sec.lines.indexOf(line);
  if (i >= 0) sec.lines.splice(i, 1);
  sec.lines.unshift(line);
}

/**
 * Merges a session's changes into a map.
 * update: { routes: [{ method, path, note? }], tables: [{ name, columns?: [string] }],
 *           notes: [{ section, note }] }   (section is one of SECTIONS)
 */
function update(text, upd, name) {
  const parsed = parse(text);
  const secs = parsed.sections;
  const sec = (s) => (secs[s] = secs[s] || { lines: [], omitted: 0 });
  for (const r of (upd && upd.routes) || []) {
    if (!r || !r.method || !r.path) continue;
    upsert(sec('Routes'), bullet(`${String(r.method).toUpperCase()} ${r.path}${r.note ? ` — ${r.note}` : ''}`), routeKey);
  }
  for (const t of (upd && upd.tables) || []) {
    if (!t || !t.name) continue;
    const cols = (t.columns || []).map((c) => (typeof c === 'string' ? c : c && c.name)).filter(Boolean);
    const list = cols.length ? ` ${cols.slice(0, 8).join(', ')}${cols.length > 8 ? `, +${cols.length - 8}` : ''}` : '';
    upsert(sec('Tables'), bullet(`${t.name}:${list}`), tableKey);
  }
  for (const n of (upd && upd.notes) || []) {
    if (!n || !n.note) continue;
    const s = SECTIONS.includes(n.section) ? n.section : 'Modules';
    upsert(sec(s), bullet(n.note), () => null);
  }
  return render(parsed.name || name || 'project', secs);
}

function read(projectPath, root = ROOT) {
  const file = absPath(projectPath, root);
  return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : null;
}

function write(projectPath, content, root = ROOT) {
  const file = absPath(projectPath, root);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
  return file;
}

/** Runs a persist op: { map, sections } rebuilds, { map, update } merges (creating the map if needed). */
function applyOp(op, root = ROOT) {
  const name = projectName(op.map);
  if (op.sections) return write(op.map, render(name, op.sections), root);
  if (op.update) return write(op.map, update(read(op.map, root) || '', op.update, name), root);
  throw new Error('map op needs "sections" or "update"');
}

if (require.main === module) {
  const [cmd, projectPath] = process.argv.slice(2);
  try {
    if (!projectPath || !['path', 'show'].includes(cmd)) throw new Error('usage: projectmap.js path|show <projectPath>');
    if (cmd === 'path') console.log(absPath(projectPath));
    else process.stdout.write(read(projectPath) || '');
  } catch (err) {
    console.error(JSON.stringify({ error: err.message }));
    process.exit(1);
  }
}

module.exports = { MAX_CHARS, SECTIONS, projectName, relPath, absPath, parse, render, update, read, write, applyOp };
