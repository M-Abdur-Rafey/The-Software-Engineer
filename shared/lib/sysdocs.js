'use strict';
/**
 * System Docs CLI — deterministic upkeep of a target project's docs/system/ tree
 * (the per-module source of truth; see design/system-docs.md). No model calls:
 * everything here is parsing, git and file writes, so it costs zero tokens.
 *
 * Usage:
 *   node shared/lib/sysdocs.js <command> <projectPath> ...args
 *
 *   init <project>                              scaffold docs/system/ (team.md, layers.md, modules/)
 *   add-module <project> <module> <layer> [owner]
 *   add-flow <project> <module> <flow>
 *   set-meta <project> <module> <json|@file>    set owner/layer/paths/provides/dependsOn in frontmatter
 *   apply-plan <project> <json|@file> [--synced] create/update many modules + questions + layers table
 *   index <project>                            rebuild INDEX.md + dependencies.md; validate frontmatter
 *   impact <project> <touchpoint|path>...       provider + direct/indirect consumers
 *   drift <project>                             code changed since each module's synced_at
 *   synced <project> <module> [commit]          record that a module's doc matches the code
 *   gate <project> <module>                     may this module be coded?
 *   approve <project> <module|layers> <name>    approve a module doc (refused while questions block)
 *   questions <project> [module]                open/conflict questions (+ that module's deferred ones)
 *   ask <project> <module> <json|@file|->       append question(s) in the standard format
 *   answer <project> <qid> <name> <text|@file> [--final]
 *   defer <project> <qid> <name>                shelve a question until its module is next up
 *   team <project>                              git author emails missing from team.md
 *   team-add <project> <email> <name> [role]
 *
 * <projectPath> is the target project's git repo root. Output is JSON on stdout;
 * errors are JSON on stderr with exit code 1 (`index` also exits 1 when the docs
 * have validation errors, after writing INDEX.md with them listed).
 */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { capRows } = require('./truncate');

const TEMPLATES_DIR = path.join(__dirname, '..', 'templates', 'system-docs');
const STATUSES = ['draft', 'in-review', 'approved'];
const BLOCKING = ['open', 'conflict', 'deferred'];
const TOUCHPOINT_RE = /^[a-z]{2,}:\S/;
const MODULE_RE = /^[a-z0-9][a-z0-9-]*$/;

// ─── small helpers ────────────────────────────────────────────────────────────
const today = () => new Date().toISOString().slice(0, 10);
const docsRoot = (project) => path.join(project, 'docs', 'system');
const modulesDir = (project) => path.join(docsRoot(project), 'modules');
const asList = (v) => (Array.isArray(v) ? v : v == null || v === '' ? [] : [v]);
const normPath = (p) => String(p).replace(/\\/g, '/').replace(/^\.\//, '').replace(/\/+$/, '');

function fail(message) {
  throw Object.assign(new Error(message), { usage: true });
}

function read(file) {
  return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : null;
}

function write(file, text) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, text.replace(/\r\n/g, '\n'));
}

function template(name, vars) {
  const text = fs.readFileSync(path.join(TEMPLATES_DIR, name), 'utf8');
  return text.replace(/\{\{(\w+)\}\}/g, (_, k) => (vars[k] != null ? String(vars[k]) : ''));
}

function git(project, args, { allowFail = false } = {}) {
  try {
    return execFileSync('git', ['-C', project, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trimEnd();  // keep leading spaces: porcelain status lines start with them
  } catch (err) {
    if (allowFail) return null;
    fail(`git ${args.join(' ')} failed: ${(err.stderr || err.message).toString().trim()}`);
  }
}

function readInput(arg) {
  if (arg === '-') return fs.readFileSync(0, 'utf8');
  if (arg && arg.startsWith('@')) return fs.readFileSync(arg.slice(1), 'utf8');
  return arg;
}

// ─── frontmatter (the YAML subset the templates use) ─────────────────────────
// Supports: `key: scalar`, `key: [a, b]`, block lists of scalars, and block
// lists of maps whose values are scalars, inline lists or block lists.
function unquote(s) {
  return /^(['"]).*\1$/.test(s) ? s.slice(1, -1) : s;
}

function stripComment(s) {
  return s.replace(/(^|\s+)#.*$/, '').trim();
}

function scalar(raw) {
  const s = stripComment(raw);
  if (s === '') return null;
  if (s.startsWith('[') && s.endsWith(']')) {
    return s.slice(1, -1).split(',').map(x => unquote(x.trim())).filter(Boolean);
  }
  return unquote(s);
}

const indentOf = (l) => l.match(/^\s*/)[0].length;
const isBlank = (l) => !l.trim() || /^\s*#/.test(l);

function parseYaml(src) {
  const lines = src.split(/\r?\n/);
  const out = {};
  let i = 0;

  // Block list starting at lines[i]; items are `- x` lines with indent >= minIndent.
  function blockList(minIndent) {
    const items = [];
    while (i < lines.length) {
      if (isBlank(lines[i])) { i++; continue; }
      const m = /^(\s*)-\s+(.*)$/.exec(lines[i]) || /^(\s*)-()$/.exec(lines[i]);
      if (!m || m[1].length < minIndent) break;
      const itemIndent = m[1].length;
      const kv = /^([A-Za-z_][\w-]*):(\s.*|)$/.exec(m[2]);
      i++;
      if (!kv) { items.push(scalar(m[2])); continue; }
      const obj = {};
      const setKey = (key, rest, keyIndent) => {
        if (stripComment(rest) !== '') { obj[key] = scalar(rest); return; }
        obj[key] = blockList(keyIndent);
      };
      setKey(kv[1], kv[2], itemIndent + 2);
      while (i < lines.length) {
        if (isBlank(lines[i])) { i++; continue; }
        const ind = indentOf(lines[i]);
        if (ind <= itemIndent) break;
        const sub = /^\s*([A-Za-z_][\w-]*):(.*)$/.exec(lines[i]);
        if (!sub) fail(`frontmatter: cannot parse line "${lines[i].trim()}"`);
        i++;
        setKey(sub[1], sub[2], ind);
      }
      items.push(obj);
    }
    return items;
  }

  while (i < lines.length) {
    if (isBlank(lines[i])) { i++; continue; }
    const top = /^([A-Za-z_][\w-]*):(.*)$/.exec(lines[i]);
    if (!top) fail(`frontmatter: cannot parse line "${lines[i].trim()}"`);
    i++;
    if (stripComment(top[2]) !== '') { out[top[1]] = scalar(top[2]); continue; }
    const list = blockList(0);
    out[top[1]] = list.length ? list : null;
  }
  return out;
}

function frontmatter(text) {
  const m = /^---\r?\n([\s\S]*?)\r?\n---[ \t]*(\r?\n|$)/.exec(text || '');
  return m ? parseYaml(m[1]) : null;
}

// Replace (or add) a top-level scalar key inside the frontmatter block.
function setFrontmatterKey(text, key, value) {
  const m = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text);
  if (!m) fail('no frontmatter block');
  const body = m[1];
  const line = `${key}: ${value == null ? '' : oneLine(value, key)}`.trimEnd();
  const re = new RegExp(`^${key}:.*$`, 'm');
  const next = re.test(body) ? body.replace(re, () => line) : `${body}\n${line}`;
  return `---\n${next}\n---${text.slice(m[0].length)}`;
}

// Replace (or add) a top-level key together with its indented block.
function setFrontmatterBlock(text, key, lines) {
  const m = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text);
  if (!m) fail('no frontmatter block');
  const fm = m[1].split(/\r?\n/);
  const idx = fm.findIndex(l => l.startsWith(`${key}:`));
  if (idx === -1) fm.push(...lines);
  else {
    let end = idx + 1;
    while (end < fm.length && (/^\s+\S/.test(fm[end]) || /^-/.test(fm[end]))) end++;
    fm.splice(idx, end - idx, ...lines);
  }
  return `---\n${fm.join('\n')}\n---${text.slice(m[0].length)}`;
}

// A frontmatter value must stay on one line: a newline would let the value add keys of its own
// (e.g. `status: approved`) and forge the approval gate.
function oneLine(value, what) {
  const s = String(value);
  if (/[\r\n\u2028\u2029]/.test(s)) fail(`${what}: value must be a single line`);
  return s;
}

function yamlList(key, items) {
  if (!items.length) return [`${key}: []`];
  return [`${key}:`, ...items.flatMap(it => (typeof it === 'string'
    ? [`  - ${oneLine(it, key)}`]
    : [`  - module: ${oneLine(it.module, key)}`, ...(asList(it.uses).length ? ['    uses:', ...asList(it.uses).map(u => `      - ${oneLine(u, key)}`)] : ['    uses: []'])]))];
}

function assertModuleName(name) {
  if (typeof name !== 'string' || !MODULE_RE.test(name)) fail(`module name "${name}" must be lowercase kebab-case`);
  return name;
}

// ─── modules ─────────────────────────────────────────────────────────────────
function loadModules(project) {
  const dir = modulesDir(project);
  if (!fs.existsSync(dir)) fail(`no docs/system/modules in ${project} — run: sysdocs.js init "${project}"`);
  const modules = [];
  const problems = [];
  for (const name of fs.readdirSync(dir).sort()) {
    const readmePath = path.join(dir, name, 'README.md');
    if (!fs.existsSync(readmePath)) continue;
    let fm;
    try { fm = frontmatter(read(readmePath)); } catch (err) { problems.push(`${name}: ${err.message}`); continue; }
    if (!fm) { problems.push(`${name}: README.md has no frontmatter`); continue; }
    modules.push({
      name,
      declaredName: fm.module,
      layer: fm.layer,
      status: fm.status || 'draft',
      owner: fm.owner || '',
      approvedBy: fm.approved_by || '',
      syncedAt: fm.synced_at || '',
      paths: asList(fm.paths).map(normPath),
      provides: asList(fm.provides),
      dependsOn: asList(fm.depends_on).map(d => (typeof d === 'string' ? { module: d, uses: [] } : { module: d.module, uses: asList(d.uses) })),
      readmePath,
      questions: loadQuestions(path.join(dir, name, 'questions.md')),
    });
  }
  return { modules, problems };
}

function getModule(modules, name) {
  const mod = modules.find(m => m.name === name);
  if (!mod) fail(`unknown module "${name}"`);
  return mod;
}

function owns(mod, file) {
  const f = normPath(file);
  return mod.paths.some(p => f === p || f.startsWith(`${p}/`));
}

// Does `provider` provide touchpoint `tp`? A sub-field (`...#email`) matches its base.
function providesTp(provider, tp) {
  return provider.provides.includes(tp) || provider.provides.includes(tp.split('#')[0]);
}

function sameTp(a, b) {
  return a === b || a.split('#')[0] === b || b.split('#')[0] === a;
}

function validate(modules) {
  const errors = [];
  const warnings = [];
  const byName = new Map(modules.map(m => [m.name, m]));
  const providedBy = new Map();

  for (const m of modules) {
    if (m.declaredName !== m.name) errors.push(`${m.name}: frontmatter module "${m.declaredName}" does not match folder name`);
    if (!Number.isInteger(Number(m.layer)) || m.layer === null) errors.push(`${m.name}: layer must be an integer`);
    if (!STATUSES.includes(m.status)) errors.push(`${m.name}: status "${m.status}" must be one of ${STATUSES.join(', ')}`);
    for (const tp of m.provides) {
      if (!TOUCHPOINT_RE.test(tp)) errors.push(`${m.name}: touchpoint "${tp}" must look like kind:name (api:, fn:, table:, config:, event:, ui:)`);
      if (providedBy.has(tp)) errors.push(`${tp} is provided by both ${providedBy.get(tp)} and ${m.name}`);
      providedBy.set(tp, m.name);
    }
    for (const dep of m.dependsOn) {
      const provider = byName.get(dep.module);
      if (!provider) { errors.push(`${m.name}: depends on unknown module "${dep.module}"`); continue; }
      for (const tp of dep.uses) {
        if (!providesTp(provider, tp)) errors.push(`${m.name}: uses ${tp} from ${dep.module}, but ${dep.module} does not provide it`);
      }
      const a = Number(m.layer);
      const b = Number(provider.layer);
      if (b > a) errors.push(`${m.name} (layer ${a}) depends on ${dep.module} (layer ${b}): a module can only depend on its own or lower layers`);
      else if (b === a) warnings.push(`${m.name} and ${dep.module} are both layer ${a} but ${m.name} depends on ${dep.module}: they cannot build in parallel`);
    }
  }

  for (let i = 0; i < modules.length; i++) {
    for (let j = i + 1; j < modules.length; j++) {
      for (const p of modules[i].paths) {
        if (owns(modules[j], p) || modules[j].paths.some(q => owns({ paths: [p] }, q))) {
          warnings.push(`${p} is owned by both ${modules[i].name} and ${modules[j].name}`);
        }
      }
    }
  }

  // cycles in the module dependency graph
  const state = new Map();
  const visit = (name, trail) => {
    if (state.get(name) === 'done') return;
    if (state.get(name) === 'active') { errors.push(`dependency cycle: ${[...trail, name].join(' -> ')}`); return; }
    state.set(name, 'active');
    for (const dep of (byName.get(name) || { dependsOn: [] }).dependsOn) {
      if (byName.has(dep.module)) visit(dep.module, [...trail, name]);
    }
    state.set(name, 'done');
  };
  modules.forEach(m => visit(m.name, []));

  return { errors, warnings };
}

// ─── questions ───────────────────────────────────────────────────────────────
// Entry layout (see templates/system-docs/module-questions.md):
//   ### Q-<module>-NNN: <question>
//   status: / asked: / touches: / deferred_by: / deferred_at:    (header, until a blank line)
//   <body: chain reaction, examples, options>
//   **Answer:**
//   <answer text>
//   answered_by: / answered_at:
//   **Conflicting answer** (by <name>, <date>): <text>           (zero or more)
const HEADER_ORDER = ['status', 'asked', 'touches', 'deferred_by', 'deferred_at'];
const HISTORY_RE = /^\*\*(Conflicting|Earlier) answer\*\* \(by (.+?), (\d{4}-\d{2}-\d{2})\): (.*)$/;

function parseEntry(lines) {
  const t = /^### (Q-[\w.-]+):\s*(.*)$/.exec(lines[0]);
  if (!t) fail(`bad question heading "${lines[0]}"`);
  const q = { id: t[1], title: t[2].trim(), meta: {}, extraHeader: [], body: [], answer: '', answeredBy: '', answeredAt: '', history: [], tail: [] };
  let i = 1;
  for (; i < lines.length && lines[i].trim() !== ''; i++) {
    const kv = /^([a-z_]+):\s*(.*)$/.exec(lines[i]);
    if (kv && HEADER_ORDER.includes(kv[1])) q.meta[kv[1]] = kv[2].trim();
    else q.extraHeader.push(lines[i]);
  }
  const ansIdx = lines.findIndex((l, k) => k >= i && /^\*\*Answer:\*\*/.test(l.trim()));
  if (ansIdx === -1) { q.body = lines.slice(i); return q; }
  q.body = lines.slice(i, ansIdx);
  const answerLines = [lines[ansIdx].trim().replace(/^\*\*Answer:\*\*\s*/, '')];
  let k = ansIdx + 1;
  for (; k < lines.length && !/^answered_by:/.test(lines[k]); k++) answerLines.push(lines[k]);
  q.answer = answerLines.join('\n').trim();
  for (; k < lines.length; k++) {
    const by = /^answered_by:\s*(.*)$/.exec(lines[k]);
    const at = /^answered_at:\s*(.*)$/.exec(lines[k]);
    const h = HISTORY_RE.exec(lines[k]);
    if (by) q.answeredBy = by[1].trim();
    else if (at) q.answeredAt = at[1].trim();
    else if (h) q.history.push({ kind: h[1], by: h[2], at: h[3], text: h[4] });
    else if (lines[k].trim()) q.tail.push(lines[k]);
  }
  return q;
}

// Status after picking up answers a teammate typed straight into the file.
function effectiveStatus(q) {
  const s = q.meta.status || 'open';
  return (s === 'open' || s === 'deferred') && q.answer ? 'answered' : s;
}

function renderEntry(q) {
  const status = effectiveStatus(q);
  const meta = Object.assign({}, q.meta, { status });
  if (status === 'answered' && !q.answeredBy) q.answeredBy = 'unsigned';
  if (status === 'answered' && !q.answeredAt) q.answeredAt = today();
  const out = [`### ${q.id}: ${q.title}`];
  HEADER_ORDER.forEach(k => { if (meta[k]) out.push(`${k}: ${meta[k]}`); });
  out.push(...q.extraHeader);
  const body = [...q.body];
  while (body.length && !body[body.length - 1].trim()) body.pop();
  if (!body.length || body[0].trim()) body.unshift('');
  out.push(...body, '', '**Answer:**');
  if (q.answer) out.push(q.answer);
  out.push('', `answered_by: ${q.answeredBy}`.trimEnd(), `answered_at: ${q.answeredAt}`.trimEnd());
  q.history.forEach(h => out.push(`**${h.kind} answer** (by ${h.by}, ${h.at}): ${h.text}`));
  out.push(...q.tail);
  return out.join('\n');
}

function loadQuestions(file) {
  const text = read(file);
  if (text == null) return { file, preamble: '', entries: [] };
  const lines = text.split(/\r?\n/);
  const preamble = [];
  const groups = [];
  for (const l of lines) {
    if (/^### Q-/.test(l)) groups.push([l]);
    else if (groups.length) groups[groups.length - 1].push(l);
    else preamble.push(l);
  }
  return { file, preamble: preamble.join('\n').trimEnd(), entries: groups.map(parseEntry) };
}

// Writes only when the rendering differs, so a command touching one module never
// rewrites (and can't clobber) another module's file written concurrently.
function saveQuestions(qs) {
  const text = `${[qs.preamble, ...qs.entries.map(renderEntry)].join('\n\n')}\n`;
  if ((read(qs.file) || '').replace(/\r\n/g, '\n') !== text) write(qs.file, text);
}

function findQuestion(modules, qid) {
  for (const m of modules) {
    const q = m.questions.entries.find(e => e.id === qid);
    if (q) return { mod: m, q };
  }
  fail(`unknown question "${qid}"`);
}

function summarize(q, mod) {
  return {
    id: q.id,
    module: mod.name,
    status: effectiveStatus(q),
    question: q.title,
    touches: q.meta.touches || '',
    details: q.body.join('\n').trim(),
    answer: q.answer || null,
    answeredBy: q.answeredBy || null,
    conflicts: q.history.filter(h => h.kind === 'Conflicting'),
  };
}

const blockingOf = (mod) => mod.questions.entries.filter(q => BLOCKING.includes(effectiveStatus(q)));

// ─── generated files ─────────────────────────────────────────────────────────
const GENERATED = '<!-- GENERATED by shared/lib/sysdocs.js index. Do not edit: change module READMEs and re-run index. -->';
const mermaidId = (s) => s.replace(/\W/g, '_');

function renderIndex(modules, errors, warnings) {
  const sorted = [...modules].sort((a, b) => Number(a.layer) - Number(b.layer) || a.name.localeCompare(b.name));
  const rows = sorted.map(m => {
    const statuses = m.questions.entries.map(effectiveStatus);
    const open = statuses.filter(s => s === 'open' || s === 'conflict').length;
    const shelved = statuses.filter(s => s === 'deferred').length;
    const ownsList = m.paths.slice(0, 3).map(p => `\`${p}\``).join(', ') + (m.paths.length > 3 ? ` +${m.paths.length - 3} more` : '');
    return `| [${m.name}](modules/${m.name}/README.md) | ${m.layer} | ${m.status} | ${m.owner} | ${open} | ${shelved} | ${ownsList} |`;
  });
  const out = [
    '# System index', '', GENERATED, '',
    'Start here. One line per module; open a module\'s README only when it is in scope. Who uses what: [dependencies](dependencies.md). Build order: [layers](layers.md). People: [team](team.md).', '',
    '| Module | Layer | Status | Owner | Open questions | Shelved | Owns |',
    '|---|---|---|---|---|---|---|',
    ...rows,
  ];
  if (errors.length || warnings.length) {
    out.push('', '## Problems', '', ...errors.map(e => `- ERROR: ${e}`), ...warnings.map(w => `- WARNING: ${w}`));
  }
  return `${out.join('\n')}\n`;
}

function renderDependencies(modules, warnings) {
  const byName = new Map(modules.map(m => [m.name, m]));
  const edges = [];
  const rows = [];
  for (const provider of modules) {
    for (const tp of provider.provides) {
      const users = [];
      for (const m of modules) {
        for (const dep of m.dependsOn) {
          if (dep.module !== provider.name) continue;
          dep.uses.filter(u => sameTp(u, tp)).forEach(u => users.push(u === tp ? m.name : `${m.name} (${u.slice(tp.length)})`));
        }
      }
      rows.push(`| \`${tp}\` | ${provider.name} | ${users.length ? users.join(', ') : '_(none)_'} |`);
    }
  }
  for (const m of modules) {
    for (const dep of m.dependsOn) if (byName.has(dep.module)) edges.push(`  ${mermaidId(dep.module)} --> ${mermaidId(m.name)}`);
  }
  const out = [
    '# Dependencies', '', GENERATED, '',
    'Who uses what. Before changing anything a module provides, check its row: every module under "Used by" can break.', '',
    'Arrows point from a module to the modules that use it.', '',
    '```mermaid', 'graph TD',
    ...modules.map(m => `  ${mermaidId(m.name)}["${m.name} (L${m.layer})"]`),
    ...edges,
    '```', '',
    '| Touchpoint | Provided by | Used by |',
    '|---|---|---|',
    ...rows,
  ];
  const sameLayer = warnings.filter(w => w.includes('cannot build in parallel'));
  if (sameLayer.length) out.push('', '## Same-layer dependencies', '', ...sameLayer.map(w => `- ${w}`));
  return `${out.join('\n')}\n`;
}

function runIndex(project) {
  const { modules, problems } = loadModules(project);
  const { errors, warnings } = validate(modules);
  errors.unshift(...problems);
  // Normalize answers picked up from the files (status + who/when).
  for (const m of modules) {
    if (m.questions.entries.length) saveQuestions(m.questions);
  }
  write(path.join(docsRoot(project), 'INDEX.md'), renderIndex(modules, errors, warnings));
  write(path.join(docsRoot(project), 'dependencies.md'), renderDependencies(modules, warnings));
  return { modules: modules.length, errors, warnings };
}

// ─── team ────────────────────────────────────────────────────────────────────
function loadTeam(project) {
  const text = read(path.join(docsRoot(project), 'team.md')) || '';
  const rows = [];
  for (const line of text.split(/\r?\n/)) {
    const cells = line.split('|').slice(1, -1).map(c => c.trim());
    if (cells.length < 2 || !cells[0].includes('@')) continue;
    rows.push({ email: cells[0].toLowerCase(), name: cells[1], role: cells[2] || '' });
  }
  return { text, rows };
}

// ─── shared write helpers (no index rebuild; callers decide) ─────────────────
function scaffoldModule(project, name, layer, owner) {
  if (!name || !MODULE_RE.test(name) || name === 'layers') fail(`module name "${name}" must be lowercase kebab-case (and not "layers")`);
  if (!Number.isInteger(Number(layer)) || layer === undefined || layer === null) fail(`module "${name}": layer must be an integer`);
  const dir = path.join(modulesDir(project), name);
  const created = [];
  for (const [file, tpl] of [['README.md', 'module-README.md'], ['questions.md', 'module-questions.md']]) {
    const p = path.join(dir, file);
    if (!fs.existsSync(p)) { write(p, template(tpl, { module: name, layer: Number(layer), owner: owner || '' })); created.push(`docs/system/modules/${name}/${file}`); }
  }
  return created;
}

// meta: { owner?, layer?, paths?, provides?, dependsOn? | depends_on? }
function applyMeta(project, name, meta) {
  assertModuleName(name);
  const file = path.join(modulesDir(project), name, 'README.md');
  let text = read(file);
  if (text == null) fail(`unknown module "${name}"`);
  if (meta.owner != null) text = setFrontmatterKey(text, 'owner', meta.owner);
  if (meta.layer != null) text = setFrontmatterKey(text, 'layer', Number(meta.layer));
  if (meta.paths) text = setFrontmatterBlock(text, 'paths', yamlList('paths', asList(meta.paths).map(normPath)));
  if (meta.provides) text = setFrontmatterBlock(text, 'provides', yamlList('provides', asList(meta.provides)));
  const deps = meta.dependsOn || meta.depends_on;
  if (deps) text = setFrontmatterBlock(text, 'depends_on', yamlList('depends_on', asList(deps).map(d => (typeof d === 'string' ? { module: d, uses: [] } : d))));
  write(file, text);
}

// items: [{ question, chainReaction, technical, plain, data, touches?, options?, askedBy? }]
function appendQuestions(project, name, items) {
  assertModuleName(name);
  const file = path.join(modulesDir(project), name, 'questions.md');
  if (!fs.existsSync(path.join(modulesDir(project), name, 'README.md'))) fail(`unknown module "${name}"`);
  const missing = [];
  items.forEach((it, n) => {
    ['question', 'chainReaction', 'technical', 'plain', 'data'].forEach(k => {
      if (!it || it[k] == null || String(typeof it[k] === 'object' ? JSON.stringify(it[k]) : it[k]).trim() === '') missing.push(`${name} item ${n}: ${k}`);
    });
  });
  if (missing.length) fail(`every question needs question, chainReaction, technical, plain and data — missing: ${missing.join('; ')}`);

  const qs = fs.existsSync(file)
    ? loadQuestions(file)
    : { file, preamble: template('module-questions.md', { module: name }).trimEnd(), entries: [] };
  let next = qs.entries.reduce((max, e) => Math.max(max, Number((/-(\d+)$/.exec(e.id) || [])[1] || 0)), 0);
  const ids = [];
  for (const it of items) {
    const id = `Q-${name}-${String(++next).padStart(3, '0')}`;
    const data = typeof it.data === 'object' ? `\`\`\`json\n${JSON.stringify(it.data, null, 2)}\n\`\`\`` : `\`\`\`\n${String(it.data).trim()}\n\`\`\``;
    const body = [
      '',
      `**Chain reaction:** ${it.chainReaction}`, '',
      `**Technical example:** ${it.technical}`, '',
      `**Plain-language example:** ${it.plain}`, '',
      '**Data example:**', data,
    ];
    if (asList(it.options).length) body.push('', '**Options:**', ...asList(it.options).map(o => `- ${o}`));
    qs.entries.push({
      id, title: String(it.question).replace(/\s+/g, ' ').trim(),
      meta: { status: 'open', asked: `${today()} by ${it.askedBy || 'agent'}`, touches: asList(it.touches).join(', ') },
      extraHeader: [], body, answer: '', answeredBy: '', answeredAt: '', history: [], tail: [],
    });
    ids.push(id);
  }
  saveQuestions(qs);
  return ids;
}

function writeLayersTable(project, layers) {
  const file = path.join(docsRoot(project), 'layers.md');
  const text = (read(file) || template('layers.md', {})).replace(/\r\n/g, '\n');
  const rows = [...layers].sort((a, b) => a.layer - b.layer)
    .map(l => `| ${l.layer} | ${l.name || ''} | ${asList(l.modules).join(', ')} | ${l.why || ''} |`);
  const lines = text.split('\n');
  const start = lines.findIndex(l => /^\| *Layer *\|/.test(l));
  if (start === -1) { write(file, `${text.trimEnd()}\n\n| Layer | Name | Modules | Why this order |\n|---|---|---|---|\n${rows.join('\n')}\n`); return; }
  let end = start + 2;
  while (end < lines.length && lines[end].startsWith('|')) end++;
  lines.splice(start + 2, end - start - 2, ...rows);
  write(file, lines.join('\n'));
}

// ─── commands ────────────────────────────────────────────────────────────────
const commands = {
  init(project) {
    const root = docsRoot(project);
    const created = [];
    for (const [file, tpl] of [['team.md', 'team.md'], ['layers.md', 'layers.md']]) {
      const p = path.join(root, file);
      if (!fs.existsSync(p)) { write(p, template(tpl, {})); created.push(`docs/system/${file}`); }
    }
    fs.mkdirSync(modulesDir(project), { recursive: true });
    return Object.assign({ created }, runIndex(project));
  },

  'add-module'(project, name, layer, owner) {
    return Object.assign({ created: scaffoldModule(project, name, layer, owner) }, runIndex(project));
  },

  'set-meta'(project, name, input) {
    applyMeta(project, name, JSON.parse(readInput(input) || '{}'));
    return Object.assign({ module: name }, runIndex(project));
  },

  // plan: { layers?: [{layer, name, why, modules?}], modules: [{name, layer, owner?, paths, provides, dependsOn, questions?}] }
  // --synced marks every module in the plan as matching the current HEAD (bootstrap from existing code).
  'apply-plan'(project, input, ...flags) {
    const plan = JSON.parse(readInput(input) || '{}');
    const mods = asList(plan.modules);
    if (!mods.length) fail('plan has no modules');
    if (!fs.existsSync(docsRoot(project))) commands.init(project);
    const created = [];
    const questionsAdded = {};
    for (const m of mods) {
      created.push(...scaffoldModule(project, m.name, m.layer, m.owner));
      applyMeta(project, m.name, m);
      if (asList(m.questions).length) questionsAdded[m.name] = appendQuestions(project, m.name, asList(m.questions));
    }
    if (asList(plan.layers).length) {
      writeLayersTable(project, asList(plan.layers).map(l => Object.assign({}, l, {
        modules: asList(l.modules).length ? l.modules : mods.filter(m => Number(m.layer) === Number(l.layer)).map(m => m.name),
      })));
    }
    if (flags.includes('--synced')) {
      const sha = git(project, ['rev-parse', '--short=10', 'HEAD']);
      for (const m of mods) {
        const file = path.join(modulesDir(project), m.name, 'README.md');
        write(file, setFrontmatterKey(read(file), 'synced_at', sha));
      }
    }
    return Object.assign({ created, questionsAdded }, runIndex(project));
  },

  'add-flow'(project, name, flow) {
    if (!flow || !MODULE_RE.test(flow)) fail('flow name must be lowercase kebab-case');
    assertModuleName(name);
    if (!fs.existsSync(path.join(modulesDir(project), name || '', 'README.md'))) fail(`unknown module "${name}"`);
    const p = path.join(modulesDir(project), name, 'flows', `${flow}.md`);
    if (fs.existsSync(p)) return { created: [] };
    write(p, template('flow.md', { module: name, flow }));
    return { created: [`docs/system/modules/${name}/flows/${flow}.md`] };
  },

  index(project) {
    return runIndex(project);
  },

  impact(project, ...targets) {
    if (!targets.length) fail('impact needs at least one touchpoint or path');
    const { modules } = loadModules(project);
    const byName = new Map(modules.map(m => [m.name, m]));
    const consumersOf = (provider, match) => modules.flatMap(m => m.dependsOn
      .filter(d => d.module === provider.name)
      .map(d => ({ module: m.name, owner: m.owner, layer: m.layer, uses: d.uses.filter(match) }))
      .filter(c => c.uses.length));

    const results = [];
    const unowned = [];
    const unknownTouchpoints = [];
    for (const raw of targets) {
      if (TOUCHPOINT_RE.test(raw)) {
        const providers = modules.filter(m => providesTp(m, raw));
        if (!providers.length) unknownTouchpoints.push(raw);
        results.push({ target: raw, kind: 'touchpoint', providers: providers.map(p => p.name), consumers: providers.flatMap(p => consumersOf(p, u => sameTp(u, raw))) });
      } else {
        const rel = normPath(path.isAbsolute(raw) ? path.relative(project, raw) : raw);
        const providers = modules.filter(m => owns(m, rel));
        if (!providers.length) unowned.push(rel);
        results.push({ target: rel, kind: 'path', providers: providers.map(p => p.name), consumers: providers.flatMap(p => consumersOf(p, () => true)) });
      }
    }

    // Indirect: anything that depends (transitively) on a direct consumer.
    const direct = new Set(results.flatMap(r => [...r.providers, ...r.consumers.map(c => c.module)]));
    const indirect = new Set();
    const queue = results.flatMap(r => r.consumers.map(c => c.module));
    while (queue.length) {
      const name = queue.shift();
      for (const m of modules) {
        if (m.dependsOn.some(d => d.module === name) && !direct.has(m.name) && !indirect.has(m.name)) {
          indirect.add(m.name);
          queue.push(m.name);
        }
      }
    }
    const owners = new Set([...direct, ...indirect].map(n => (byName.get(n) || {}).owner).filter(Boolean));
    return { targets: results, affectedModules: [...direct], indirect: [...indirect], owners: [...owners], unowned, unknownTouchpoints };
  },

  drift(project) {
    const { modules } = loadModules(project);
    git(project, ['rev-parse', '--verify', 'HEAD']);
    const porcelain = git(project, ['status', '--porcelain=v1', '-uall'])
      .split('\n').filter(Boolean)
      .map(l => normPath(l.slice(3).split(' -> ').pop().replace(/^"|"$/g, '')));
    const changedAnywhere = new Set(porcelain);
    const report = modules.map(m => {
      if (!m.syncedAt) return { module: m.name, state: 'never-synced', changed: [] };
      if (git(project, ['cat-file', '-e', `${m.syncedAt}^{commit}`], { allowFail: true }) === null) {
        return { module: m.name, state: 'unknown-sync-point', syncedAt: m.syncedAt, changed: [] };
      }
      git(project, ['diff', '--name-only', m.syncedAt, 'HEAD']).split('\n').filter(Boolean).forEach(f => changedAnywhere.add(normPath(f)));
      const committed = m.paths.length ? git(project, ['diff', '--name-only', m.syncedAt, 'HEAD', '--', ...m.paths]).split('\n').filter(Boolean).map(normPath) : [];
      const uncommitted = porcelain.filter(f => owns(m, f));
      const changed = [...new Set([...committed, ...uncommitted])];
      return { module: m.name, state: changed.length ? 'drifted' : 'in-sync', syncedAt: m.syncedAt, changed };
    });
    const unowned = [...changedAnywhere].filter(f => !f.startsWith('docs/system/') && !modules.some(m => owns(m, f)));
    const capped = capRows(unowned, { maxRows: 100 });
    return { modules: report, unownedChanged: capped.rows, unownedTruncated: capped.truncated };
  },

  synced(project, name, commit) {
    const { modules } = loadModules(project);
    const mod = getModule(modules, name);
    const sha = git(project, ['rev-parse', '--short=10', commit || 'HEAD']);
    write(mod.readmePath, setFrontmatterKey(read(mod.readmePath), 'synced_at', sha));
    return { module: name, syncedAt: sha };
  },

  gate(project, name) {
    const { modules } = loadModules(project);
    const mod = getModule(modules, name);
    const blocking = blockingOf(mod).map(q => ({ id: q.id, status: effectiveStatus(q), question: q.title }));
    const pass = mod.status === 'approved' && blocking.length === 0;
    const reason = pass ? null : blocking.length ? `${blocking.length} question(s) still open, conflicting or shelved` : `doc status is "${mod.status}", needs approval`;
    return { module: name, pass, status: mod.status, reason, blocking };
  },

  approve(project, name, by) {
    if (!by) fail('approve needs the approver\'s name');
    if (name === 'layers') {
      const file = path.join(docsRoot(project), 'layers.md');
      let text = read(file);
      if (text == null) fail('no docs/system/layers.md — run init first');
      text = setFrontmatterKey(setFrontmatterKey(setFrontmatterKey(text, 'status', 'approved'), 'approved_by', by), 'approved_at', today());
      write(file, text);
      return { approved: true, target: 'layers', approvedBy: by };
    }
    const { modules } = loadModules(project);
    const mod = getModule(modules, name);
    const blocking = blockingOf(mod);
    if (blocking.length) {
      return { approved: false, module: name, reason: 'answer or resolve these first', blocking: blocking.map(q => ({ id: q.id, status: effectiveStatus(q), question: q.title })) };
    }
    if (mod.questions.entries.length) saveQuestions(mod.questions);
    let text = read(mod.readmePath);
    text = setFrontmatterKey(setFrontmatterKey(setFrontmatterKey(text, 'status', 'approved'), 'approved_by', by), 'approved_at', today());
    write(mod.readmePath, text);
    runIndex(project);
    return { approved: true, module: name, approvedBy: by };
  },

  questions(project, name) {
    const { modules } = loadModules(project);
    const scope = name ? [getModule(modules, name)] : modules;
    const wanted = name ? BLOCKING : ['open', 'conflict'];
    const list = scope.flatMap(m => m.questions.entries.filter(q => wanted.includes(effectiveStatus(q))).map(q => summarize(q, m)));
    const capped = capRows(list, { maxRows: 40, maxChars: 30000 });
    return { total: capped.total, truncated: capped.truncated, questions: capped.rows };
  },

  ask(project, name, input) {
    const parsed = JSON.parse(readInput(input) || 'null');
    const ids = appendQuestions(project, name, Array.isArray(parsed) ? parsed : [parsed]);
    runIndex(project);
    return { module: name, added: ids };
  },

  answer(project, qid, by, ...rest) {
    const final = rest.includes('--final');
    const text = readInput(rest.filter(a => a !== '--final').join(' ')).trim();
    if (!by || !text) fail('answer needs <qid> <name> <text>');
    const { modules } = loadModules(project);
    const { mod, q } = findQuestion(modules, qid);
    const existing = q.answer.trim();
    let status;
    if (final) {
      q.history = q.history.map(h => Object.assign(h, { kind: 'Earlier' }));
      if (existing && existing !== text) q.history.push({ kind: 'Earlier', by: q.answeredBy || 'unsigned', at: q.answeredAt || today(), text: existing.replace(/\s+/g, ' ') });
      Object.assign(q, { answer: text, answeredBy: by, answeredAt: today() });
      status = 'answered';
    } else if (!existing) {
      Object.assign(q, { answer: text, answeredBy: by, answeredAt: today() });
      status = 'answered';
    } else if (existing === text) {
      status = effectiveStatus(q) === 'conflict' ? 'conflict' : 'answered';
    } else {
      q.history.push({ kind: 'Conflicting', by, at: today(), text: text.replace(/\s+/g, ' ') });
      status = 'conflict';
    }
    q.meta.status = status;
    delete q.meta.deferred_by;
    delete q.meta.deferred_at;
    saveQuestions(mod.questions);
    runIndex(project);
    return { id: qid, module: mod.name, status, conflicts: q.history.filter(h => h.kind === 'Conflicting') };
  },

  defer(project, qid, by) {
    if (!by) fail('defer needs the name of who shelved it');
    const { modules } = loadModules(project);
    const { mod, q } = findQuestion(modules, qid);
    if (q.answer) fail(`${qid} already has an answer; use answer --final to change it`);
    Object.assign(q.meta, { status: 'deferred', deferred_by: by, deferred_at: today() });
    saveQuestions(mod.questions);
    runIndex(project);
    return { id: qid, module: mod.name, status: 'deferred' };
  },

  team(project) {
    const { rows } = loadTeam(project);
    const known = new Set(rows.map(r => r.email));
    const log = git(project, ['log', '--all', '--format=%ae%x09%an'], { allowFail: true }) || '';
    const seen = new Map();
    for (const line of log.split('\n').filter(Boolean)) {
      const [email, gitName] = line.split('\t');
      const key = email.toLowerCase();
      if (!known.has(key) && !seen.has(key)) seen.set(key, { email: key, gitName });
    }
    return { known: rows, unknown: [...seen.values()] };
  },

  'team-add'(project, email, name, role) {
    if (!email || !email.includes('@') || !name) fail('team-add needs <email> <name> [role]');
    const file = path.join(docsRoot(project), 'team.md');
    const { text, rows } = loadTeam(project);
    const key = email.toLowerCase();
    const row = `| ${key} | ${name} | ${role || ''} |`;
    const base = text || template('team.md', {});
    const exists = rows.some(r => r.email === key);
    const next = exists
      ? base.split(/\r?\n/).map(l => (l.split('|').slice(1, -1).map(c => c.trim().toLowerCase())[0] === key ? row : l)).join('\n')
      : `${base.trimEnd()}\n${row}\n`;
    write(file, next);
    return { email: key, name, role: role || '', updated: exists };
  },
};

// ─── main ────────────────────────────────────────────────────────────────────
if (require.main === module) {
  const [command, project, ...rest] = process.argv.slice(2);
  try {
    if (!Object.prototype.hasOwnProperty.call(commands, command)) fail(`Unknown command: ${command}. See file header for usage.`);
    if (!project) fail(`${command} needs a project path`);
    const result = commands[command](path.resolve(project), ...rest);
    console.log(JSON.stringify(result));
    if (result && Array.isArray(result.errors) && result.errors.length) process.exit(1);
  } catch (err) {
    console.error(JSON.stringify(err.usage ? { error: err.message } : { error: err.message, stack: err.stack }));
    process.exit(1);
  }
}

module.exports = { parseYaml, frontmatter, setFrontmatterKey, parseEntry, renderEntry, effectiveStatus, loadModules, owns, normPath, commands };
