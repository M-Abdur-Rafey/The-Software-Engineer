export const meta = {
  name: 'sysdocs',
  description: 'System Docs: plan a new project, bootstrap docs for existing code, sync docs with manual edits, or update docs after a change',
  phases: [
    { title: 'Plan', detail: 'Idea or existing code -> modules, layers, touchpoints, questions' },
    { title: 'Write Docs', detail: 'One writer per module, in parallel' },
    { title: 'Sync', detail: 'Bring drifted module docs in line with the code' },
    { title: 'Update', detail: 'Record what this session changed in each touched module' },
    { title: 'Index', detail: 'Regenerate INDEX.md and dependencies.md' },
  ],
}

// args: { mode: 'plan'|'bootstrap'|'sync'|'update', projectPath, agentsDir, sessionId?,
//         idea?          (plan: what to build)
//         modules?       (bootstrap: only these modules; update: modules this session touched)
//         taskText?      (update: what the session did)
//         owner? }
// All file-format work goes through shared/lib/sysdocs.js so agents never hand-edit
// frontmatter or question entries. Mechanical command runs use haiku.
const AGENTS_DIR  = (args && args.agentsDir)   || 'C:/Users/Hp/Desktop/Ideas/Agents'
const projectPath = (args && args.projectPath) || ''
const sessionId   = (args && args.sessionId)   || 'sysdocs'
const mode        = (args && args.mode)        || 'sync'
const CLI   = `node "${AGENTS_DIR}/shared/lib/sysdocs.js"`
const DOCS  = `${projectPath}/docs/system`
const PLAN_FILE = `${projectPath}/.sysdocs-plan.json`

const TOUCHPOINT_RULES =
  `Touchpoints are how modules depend on each other. Format kind:name with kinds ` +
  `api:METHOD /path, fn:name, table:name or table:name.column, config:KEY, event:name, ui:Component. ` +
  `A consumer may use a sub-field: api:GET /api/users/:id#email. A module may only depend on its own or LOWER layers, ` +
  `and modules in the same layer should not depend on each other (they build in parallel).`

const QUESTION_RULES =
  `Questions: ask ONLY about decisions that change behaviour or data and are not already pinned down. ` +
  `Every question MUST have: question, chainReaction (which other modules/features change depending on the answer, plain language), ` +
  `technical (a concrete technical example), plain (a plain-language everyday example a non-developer understands), ` +
  `data (a realistic example record or payload as a JSON string), options (2-4 labelled choices, recommended first), ` +
  `touches (touchpoints involved). Prefer a few high-value questions over many trivial ones.`

const PLAN_FORMAT =
  `Write the plan as JSON to ${PLAN_FILE} with the Write tool, shaped exactly:\n` +
  `{ "layers": [{ "layer": 1, "name": "Foundation", "why": "..." }],\n` +
  `  "modules": [{ "name": "kebab-case", "layer": 1, "owner": "", "paths": ["src/..."], "provides": ["fn:..."],\n` +
  `                "dependsOn": [{ "module": "other", "uses": ["fn:..."] }],\n` +
  `                "questions": [{ "question": "", "chainReaction": "", "technical": "", "plain": "", "data": "{...}", "options": [""], "touches": [""] }] }] }\n`

const SUMMARY_SCHEMA = {
  type: 'object',
  required: ['modules'],
  properties: {
    modules: {
      type: 'array',
      items: {
        type: 'object',
        required: ['name', 'layer'],
        properties: {
          name:   { type: 'string' },
          layer:  { type: 'integer' },
          flows:  { type: 'array', items: { type: 'string' } },
        },
      },
    },
  },
}

const CLI_RESULT_SCHEMA = {
  type: 'object',
  required: ['ok'],
  properties: {
    ok:     { type: 'boolean' },
    output: { type: 'string' },
    errors: { type: 'array', items: { type: 'string' } },
  },
}

async function runCli(label, commands) {
  return agent(
    `Run these shell commands in order from any directory and capture their stdout/stderr (each prints JSON):\n\n` +
    commands.map(c => `${c}`).join('\n') + `\n\n` +
    `Return { ok: true if every command exited 0, output: <the last command's stdout>, errors: [<any stderr error messages or validation errors from the JSON>] }.`,
    { label, model: 'haiku', schema: CLI_RESULT_SCHEMA }
  )
}

function writerPrompt(mod, source) {
  return (
    `You are the doc-writer for module "${mod.name}" (layer ${mod.layer}) in ${DOCS}/modules/${mod.name}/.\n\n` +
    `Source of facts: ${source}\n\n` +
    `1. Edit ${DOCS}/modules/${mod.name}/README.md. Do NOT touch the frontmatter block between the --- lines ` +
    `(it is managed by sysdocs.js). Replace the placeholder text (in _italics_) of every section:\n` +
    `   - What it does: one plain-language paragraph, then a technical paragraph\n` +
    `   - Flows: a bullet link per flow file\n` +
    `   - APIs: for each endpoint: method + path, auth, a JSON request example, a JSON response example, errors\n` +
    `   - Data: for each record: where it comes from (DB table / third-party API / user input), stored format with a real example record, and how it is created, edited and deleted\n` +
    `   - Decisions: one line per answered question in questions.md (skip if none)\n` +
    `2. For each flow (${(mod.flows || []).join(', ') || 'derive 1-3 main flows'}): run\n` +
    `   ${CLI} add-flow "${projectPath}" ${mod.name} <flow-name>\n` +
    `   then fill ${DOCS}/modules/${mod.name}/flows/<flow-name>.md: plain-language summary, numbered steps user -> frontend -> backend -> DB, ` +
    `a Mermaid sequenceDiagram, example data at each step, failure cases.\n\n` +
    `Keep it factual and compact: no filler, ASCII only. Only write files inside ${DOCS}/modules/${mod.name}/.\n` +
    `Return "done".`
  )
}

// ─── mode: plan (new project) / bootstrap (existing code) ────────────────────
if (mode === 'plan' || mode === 'bootstrap') {
  phase('Plan')
  const idea = (args && args.idea) || ''
  const only = (args && args.modules) || []
  const owner = (args && args.owner) || ''

  const planPrompt = mode === 'plan'
    ? `You are the System Architect. Plan a NEW project as layered modules. No code is written yet.\n\n` +
      `Project path: ${projectPath}\nIdea:\n"""\n${idea}\n"""\n\n` +
      `Layering: build foundation first so each layer can call real, tested functions from the layers below. Typical order: ` +
      `1 foundation (config, DB connection, app shell, error handling), 2 authentication, 3 core data CRUD modules, 4 access control / permissions, ` +
      `then anything built on top. Split CRUD into one module per main record type so they build in parallel.\n` +
      `For each module give the planned paths (files/directories it will own), provides and dependsOn.\n${TOUCHPOINT_RULES}\n\n` +
      `${QUESTION_RULES} Anything the idea already specifies is decided: do not ask about it.\n\n` +
      `Set "owner": "${owner}" on every module.\n\n${PLAN_FORMAT}\n` +
      `Then return the summary: { modules: [{ name, layer, flows: [kebab-case flow names] }] }.`
    : `You are the System Cartographer. Document an EXISTING codebase as modules. Read the code; never invent.\n\n` +
      `Project path: ${projectPath}\n` +
      `If they exist, read prior scan notes first: ${AGENTS_DIR}/agents/{backend,frontend,database}/vault/projects/*.md\n` +
      (only.length ? `Only document these modules (plus minimal entries for modules they depend on): ${only.join(', ')}\n` : '') +
      `\nGroup code into cohesive modules (feature folders, route groups, related tables). For each: the real paths it owns, the real ` +
      `routes/functions/tables it provides, and what it really uses from other modules (from imports, calls, foreign keys).\n${TOUCHPOINT_RULES}\n` +
      `Assign layers by dependency depth (a module with no dependencies is layer 1).\n\n` +
      `${QUESTION_RULES} Here, ask only where the code's intended behaviour is genuinely unclear or contradictory.\n\n` +
      `Set "owner": "${owner}" on every module.\n\n${PLAN_FORMAT}\n` +
      `Then return the summary: { modules: [{ name, layer, flows: [kebab-case names of the main existing flows] }] }.`

  const summary = await agent(planPrompt, { label: mode === 'plan' ? 'system-architect' : 'system-cartographer', schema: SUMMARY_SCHEMA })
  log(`${summary.modules.length} module(s) planned: ${summary.modules.map(m => `${m.name}(L${m.layer})`).join(', ')}`)

  const applied = await runCli('apply-plan', [
    `${CLI} apply-plan "${projectPath}" "@${PLAN_FILE}"${mode === 'bootstrap' ? ' --synced' : ''}`,
  ])
  if (!applied.ok) log(`apply-plan reported problems: ${(applied.errors || []).join(' | ')}`)

  phase('Write Docs')
  const source = mode === 'plan'
    ? `the plan in ${PLAN_FILE} (your module's entry) and this idea:\n"""\n${idea}\n"""`
    : `the real code under the module's paths (see the README frontmatter) in ${projectPath}`
  await pipeline(summary.modules, m => agent(writerPrompt(m, source), { label: `write:${m.name}`, phase: 'Write Docs' }))

  phase('Index')
  const finalCheck = await runCli('index', [
    `${CLI} index "${projectPath}"`,
    `${CLI} questions "${projectPath}"`,
  ])
  await runCli('cleanup', [`node -e "require('fs').rmSync(process.argv[1], { force: true })" "${PLAN_FILE}"`])

  let open = 0
  try { open = JSON.parse(finalCheck.output).total || 0 } catch (e) { open = -1 }
  return {
    mode,
    status: open > 0 ? 'awaiting-answers' : 'ready',
    modules: summary.modules,
    openQuestions: open,
    errors: [...(applied.errors || []), ...(finalCheck.errors || [])],
  }
}

// ─── mode: sync (manual edits since synced_at) ───────────────────────────────
if (mode === 'sync') {
  phase('Sync')
  const DRIFT_SCHEMA = {
    type: 'object',
    required: ['initialized', 'drifted'],
    properties: {
      initialized:    { type: 'boolean' },
      drifted:        { type: 'array', items: { type: 'object', required: ['module', 'syncedAt', 'changed'], properties: { module: { type: 'string' }, syncedAt: { type: 'string' }, changed: { type: 'array', items: { type: 'string' } } } } },
      unownedChanged: { type: 'array', items: { type: 'string' } },
    },
  }
  const drift = await agent(
    `Run: ${CLI} drift "${projectPath}"\n\n` +
    `If it fails because docs/system/modules does not exist, return { initialized: false, drifted: [] }.\n` +
    `Otherwise it prints { modules: [{module, state, syncedAt, changed}], unownedChanged }. Return { initialized: true, ` +
    `drifted: <only entries with state "drifted">, unownedChanged }.`,
    { label: 'drift-check', model: 'haiku', schema: DRIFT_SCHEMA }
  )
  if (!drift.initialized) return { mode, initialized: false, drifted: [], questionsAdded: [] }
  log(`${drift.drifted.length} drifted module(s); ${(drift.unownedChanged || []).length} changed file(s) owned by no module`)

  const SYNC_SCHEMA = {
    type: 'object',
    required: ['module', 'updated', 'questionsAdded'],
    properties: {
      module:         { type: 'string' },
      updated:        { type: 'boolean' },
      questionsAdded: { type: 'array', items: { type: 'string' } },
    },
  }
  const synced = await pipeline(drift.drifted, d => agent(
    `You are the doc-sync agent for module "${d.module}". Code changed since the doc was last verified (commit ${d.syncedAt}), ` +
    `probably by hand.\n\nChanged files: ${d.changed.join(', ')}\n` +
    `See the changes: git -C "${projectPath}" diff ${d.syncedAt} -- ${d.changed.map(f => `"${f}"`).join(' ')} (plus uncommitted changes)\n` +
    `Doc: ${DOCS}/modules/${d.module}/README.md, its flows/ and questions.md.\n\n` +
    `1. If the change is consistent with the doc's recorded decisions (answered questions, Decisions section): update the README ` +
    `body/flows to match the code. If provides/paths/dependsOn changed, write a JSON file and run ` +
    `${CLI} set-meta "${projectPath}" ${d.module} @<file> with keys provides/paths/dependsOn.\n` +
    `2. If the change CONTRADICTS a recorded decision, do not silently update: write the question(s) to a JSON file and run ` +
    `${CLI} ask "${projectPath}" ${d.module} @<file>. ${QUESTION_RULES} The chainReaction must name which modules are affected ` +
    `(see ${DOCS}/dependencies.md).\n` +
    `3. If nothing was contradictory, run: ${CLI} synced "${projectPath}" ${d.module}\n\n` +
    `Return { module, updated, questionsAdded: [question ids] }.`,
    { label: `sync:${d.module}`, phase: 'Sync', schema: SYNC_SCHEMA }
  ))
  await runCli('index', [`${CLI} index "${projectPath}"`])
  const results = synced.filter(Boolean)
  return {
    mode,
    initialized: true,
    drifted: drift.drifted.map(d => d.module),
    unownedChanged: drift.unownedChanged || [],
    questionsAdded: results.flatMap(r => r.questionsAdded),
  }
}

// ─── mode: update (after a pipeline run changed code) ────────────────────────
if (mode === 'update') {
  phase('Update')
  const touched = (args && args.modules) || []
  const taskText = (args && args.taskText) || ''
  const CHANGED_SCHEMA = {
    type: 'object',
    required: ['byModule', 'unowned'],
    properties: {
      byModule: { type: 'array', items: { type: 'object', required: ['module', 'files'], properties: { module: { type: 'string' }, files: { type: 'array', items: { type: 'string' } } } } },
      unowned:  { type: 'array', items: { type: 'string' } },
    },
  }
  const changed = await agent(
    `1. Run: git -C "${projectPath}" status --porcelain -uall   and collect the changed file paths, ignoring anything under docs/system/.\n` +
    `2. Run: ${CLI} impact "${projectPath}" <each changed path, quoted>\n` +
    `   It prints { targets: [{ target, providers: [module names] }], unowned: [...] }.\n` +
    `Return { byModule: [{ module, files }] grouping the changed files by provider module, unowned: [...] }.`,
    { label: 'changed-files', model: 'haiku', schema: CHANGED_SCHEMA }
  )
  const names = [...new Set([...touched, ...changed.byModule.map(b => b.module)])]
  const filesFor = (name) => (changed.byModule.find(b => b.module === name) || { files: [] }).files
  log(`updating docs for ${names.length} module(s): ${names.join(', ')}; ${changed.unowned.length} unowned changed file(s)`)

  await pipeline(names, name => agent(
    `You are the doc-updater for module "${name}". This session's task:\n"""\n${taskText.slice(0, 1500)}\n"""\n\n` +
    `Changed files owned by this module: ${filesFor(name).join(', ') || '(none yet)'}\n` +
    (changed.unowned.length ? `Changed files owned by NO module (claim the ones that belong to "${name}"): ${changed.unowned.join(', ')}\n` : '') +
    `\nMake ${DOCS}/modules/${name}/ match the code as it is NOW:\n` +
    `1. Frontmatter: write a JSON file with the real paths (files/dirs this module owns), provides (real routes, exported ` +
    `functions, tables it owns) and dependsOn (what it really uses from other modules), then run ` +
    `${CLI} set-meta "${projectPath}" ${name} @<file>. ${TOUCHPOINT_RULES}\n` +
    `2. README body (not the frontmatter): APIs with real request/response examples, Data with real stored formats and example ` +
    `records, Decisions (one line per answered question). Replace any remaining _italic_ placeholders.\n` +
    `3. Flows: update or add files under flows/ (use ${CLI} add-flow "${projectPath}" ${name} <flow> for new ones) so steps and ` +
    `Mermaid diagrams match the real code path.\n` +
    `Only edit files under ${DOCS}/modules/${name}/. ASCII only. Return "done".`,
    { label: `update:${name}`, phase: 'Update' }
  ))

  phase('Index')
  const idx = await runCli('index', [`${CLI} index "${projectPath}"`])
  return { mode, modules: names, unowned: changed.unowned, errors: idx.errors || [] }
}

return { mode, error: `unknown mode "${mode}"` }
