export const meta = {
  name: 'backend',
  description: 'Backend domain agent — one author writes routes, controllers and services to the spec and checklists; one fresh reviewer checks them',
  phases: [
    { title: 'Author', detail: 'Plan the flow and data access, write the code, self-check against the checklists' },
    { title: 'Review', detail: 'Fresh reviewer: spec + changed files + checklists only; fixes violations' },
  ],
}

// Split by independence, not by role (design/agent-consolidation.md, phase 2): the work that
// flow-planner, data-architect, route-creator, prompt-engineer, code-standards and
// folder-structure used to do in sequence is one author's checklist; one reviewer who never sees
// the author's reasoning checks it.
const AGENTS_DIR      = (args && args.agentsDir) || 'C:/Users/Hp/Desktop/Ideas/Agents'
const sessionId       = (args && args.sessionId)       || 'no-session'
const taskText        = (args && args.taskText)        || ''
const projectPath     = (args && args.projectPath)     || ''

// One entry per file: agents report the same file more than once (created, then fixed) and in
// mixed absolute/relative or slash styles, which inflated counts and repeated scan/review work.
function uniquePaths(list) {
  const root = String(projectPath || '').replace(/\\/g, '/').replace(/\/+$/, '')
  const seen = new Map()
  for (const raw of list) {
    if (!raw) continue
    let p = String(raw).replace(/\\/g, '/').replace(/^\.\//, '')
    if (root && p.toLowerCase().startsWith(root.toLowerCase() + '/')) p = p.slice(root.length + 1)
    if (!seen.has(p)) seen.set(p, p)
  }
  return [...seen.values()]
}
const databaseOutput     = (args && args.databaseOutput)     || null
const archPreferences    = (args && args.archPreferences)    || null
const requirementsOutput = (args && args.requirementsOutput) || null

// Build arch brief from user's clarification answers
const archBrief = archPreferences ? [
  archPreferences.authMethod      ? `Authentication method: ${archPreferences.authMethod}` : null,
  archPreferences.useRateLimiting != null ? `Rate limiting: ${archPreferences.useRateLimiting ? 'yes, 100 req/min per IP' : 'no'}` : null,
  archPreferences.apiVersioning   ? `API path prefix: /api/${archPreferences.apiVersioning}/` : null,
].filter(Boolean).join('. ') : 'Follow the existing project conventions.'

// The requirements spec, capped: its Decisions are binding for every domain agent.
function specBrief(domain, max = 3000) {
  const s = requirementsOutput && requirementsOutput.spec
  if (!s) return '(no requirements spec for this session)'
  const tasks = (requirementsOutput.tasks || []).filter(t => t.domain === domain)
  const storyIds = new Set(tasks.map(t => t.storyId).filter(Boolean))
  const stories = (requirementsOutput.userStories || []).filter(u => storyIds.has(u.id))
  const list = (title, items) => (items && items.length ? `${title}:\n${items.map(x => `- ${x}`).join('\n')}` : '')
  const text = [
    s.summary ? `Summary: ${s.summary}` : '',
    list('Decisions (binding)', (s.decisions || []).map(d => `${d.topic}: ${d.decision}`)),
    list('In scope', s.inScope),
    list('Out of scope', s.outOfScope),
    list(`Tasks for ${domain}`, tasks.map(t => `${t.title}${t.description ? `: ${t.description}` : ''}`)),
    list('Acceptance criteria', stories.flatMap(u => (u.acceptanceCriteria || []).map(c => `${u.id}: ${c}`))),
  ].filter(Boolean).join('\n\n')
  if (text.length <= max) return text
  log(`spec brief for ${domain} capped at ${max} of ${text.length} chars; full spec: ${s.specFile || 'n/a'}`)
  return `${text.slice(0, max)}\n[... ${text.length - max} more chars: read ${s.specFile || 'the full spec'}]`
}

// Bookkeeping is returned as data (persistOps) and run by shared/lib/persist.js
// (design/agent-consolidation.md): orchestrate defers it to the skill; a direct run uses one agent.
async function flushPersist(ops) {
  if (!ops.length || (args && args.deferPersist)) return
  const opsFile = `${AGENTS_DIR}/agents/orchestrator/vault/sessions/${sessionId}.backend.persist.json`
  await agent(
    `This is the software-engineer pipeline's own bookkeeping step for the session the user started: it records the ` +
    `session's results (decisions, vault notes, session status) in the pipeline's knowledge base under ${AGENTS_DIR}/agents. ` +
    `Every pipeline run ends with it. Write this JSON array exactly, with the Write tool, to ${opsFile}:\n${JSON.stringify(ops)}\n\n` +
    `Then run: node "${AGENTS_DIR}/shared/lib/persist.js" "${opsFile}" and return its output.`,
    { label: 'persist', model: 'haiku', effort: 'low' }
  )
}

const tableContext = databaseOutput ? JSON.stringify(databaseOutput.tables || []) : '[]'
const VAULT = `${AGENTS_DIR}/agents/backend/vault`
const spec = specBrief('backend')

// The rules every backend change must meet: the author applies them, the reviewer verifies them.
const CHECKLIST =
  `Checklist (from agents/backend/CLAUDE.md and the vault):\n` +
  `- Flow: thin controllers (request/response only); all business logic in services; validation schemas for every input; ` +
  `middleware the task needs (rate limiting only if requested).\n` +
  `- Data access (${VAULT}/architecture/data-access-and-pooling.md, ai-query-discipline.md, caching-and-lookup-tables.md): ONE shared ` +
  `DB pool, reused, never per request; parameterized queries; no N+1, no SELECT *; AI/LLM query tools read-only with LIMIT + time filters; ` +
  `cache and lookup tables where they cut repeated work.\n` +
  `- AI features (only if the task has an LLM component): micro-agents per ${VAULT}/patterns/ai-agent-prompt-template.md, written to ` +
  `src/ai/<agent-name>/ (prompt.md + schema.json).\n` +
  `- Code standards: @param/@returns JSDoc on every exported function; errors as { success: false, code: 'ERR_CODE', message, details }; ` +
  `no stack traces or raw DB errors in responses; no console.log in production paths; no bare catch blocks.\n` +
  `- Structure (Node/Express): feature folder src/features/<name>/ with routes.js (exports the route contract array: ` +
  `{method,path,handler,middleware[],description,requestBodySchema,responseSchema,authRequired}), controller.js, service.js, schema.js, ` +
  `and README.md (description, endpoints table, dependencies). Python projects follow the Python rules in agents/backend/CLAUDE.md instead.\n` +
  `- Precedence: the spec's Decisions are binding. If one conflicts with a rule above (e.g. it places the route inline instead of in a ` +
  `feature folder), follow the spec and report the conflict in specConflicts.\n`

// ─── Phase: Author ───────────────────────────────────────────────────────────
phase('Author')

const ROUTE_CONTRACT = {
  type: 'object',
  required: ['method', 'path', 'description', 'authRequired'],
  properties: {
    method: { type: 'string' }, path: { type: 'string' }, handler: { type: 'string' },
    middleware: { type: 'array' }, description: { type: 'string' },
    requestBodySchema: { type: 'object' }, responseSchema: { type: 'object' },
    authRequired: { type: 'boolean' }, change: { type: 'string', enum: ['new', 'modified'] }, changeSummary: { type: 'string' },
  },
}
const build = await agent(
  `You are the Backend author. You plan, design the data access, and write the code for this task, then check your own work ` +
  `against the checklist before returning. A separate reviewer will check it after you.\n\n` +
  `Task: "${taskText}"\nProject: ${projectPath}\n` +
  `Database tables available: ${tableContext}\n` +
  `Architecture preferences (from the user, follow exactly): ${archBrief}\n\n` +
  `Requirements spec:\n${spec}\n\n` +
  `Context to read first: prior decisions (cd "${AGENTS_DIR}" && node shared/lib/db-cli.js --as backend get-decisions backend express-patterns 5), ` +
  `${VAULT}/INDEX.md and the notes it lists that apply (detect the stack: Node/Express vs Python), and the existing code in ${projectPath}: ` +
  `reuse its DB connection, conventions and helpers.\n\n` +
  CHECKLIST + `\n` +
  `Return:\n- featureName\n- dataAccess: { dbAccess: { singlePool, init, notes }, aiQueryRules: [string], caching: { strategy, lookupTables, invalidation }, summary }\n` +
  `- filesCreated, filesUpdated\n` +
  `- routeContracts: ONLY routes this session created or whose behaviour it changed, each with change "new" | "modified" and, for ` +
  `modified routes, a one-line changeSummary of what behaves differently now\n` +
  `- specConflicts: [ "<decision> vs <rule>: what you did" ] (empty if none)`,
  {
    label: 'author',
    phase: 'Author',
    schema: {
      type: 'object',
      required: ['featureName', 'dataAccess', 'filesCreated', 'filesUpdated', 'routeContracts', 'specConflicts'],
      properties: {
        featureName:    { type: 'string' },
        dataAccess:     { type: 'object' },
        filesCreated:   { type: 'array', items: { type: 'string' } },
        filesUpdated:   { type: 'array', items: { type: 'string' } },
        routeContracts: { type: 'array', items: ROUTE_CONTRACT },
        specConflicts:  { type: 'array', items: { type: 'string' } },
      },
    },
  }
)
const dataAccess = build.dataAccess
const authored = uniquePaths([...build.filesCreated, ...build.filesUpdated])
log(`Author: ${build.routeContracts.length} route(s) for ${build.featureName}, ${authored.length} file(s)${build.specConflicts.length ? `, ${build.specConflicts.length} spec conflict(s)` : ''}`)

// ─── Phase: Review ───────────────────────────────────────────────────────────
// Independent on purpose: the reviewer gets the spec, the changed files and the checklist,
// never the author's plan or reasoning.
phase('Review')

const review = await agent(
  `You are the Backend reviewer. You did not write this code; review it with fresh eyes.\n\n` +
  `Project: ${projectPath}\nTask: "${taskText}"\n` +
  `Files changed this session: ${JSON.stringify(authored)}\n` +
  `Read them (and git -C "${projectPath}" diff for files that existed before).\n\n` +
  `Requirements spec:\n${spec}\n\n` +
  CHECKLIST + `\n` +
  `1. Check every changed file against each checklist item and against the spec's Decisions and acceptance criteria for this task.\n` +
  `2. Fix violations in place when the fix is behaviour-preserving or restores what the spec requires (e.g. missing validation, ` +
  `wrong error shape, missing JSDoc or README). Do not add features the spec doesn't ask for.\n` +
  `3. Check that routes.js (or the route registration) matches these declared contracts: ${JSON.stringify(build.routeContracts.map(r => `${r.method} ${r.path}`))}.\n\n` +
  `Return { violations: [{ file, rule, issue, fixed }], filesFixed: [string], filesCreated: [string], contractMismatches: [string] }.`,
  {
    label: 'reviewer',
    phase: 'Review',
    schema: {
      type: 'object',
      required: ['violations', 'filesFixed', 'filesCreated', 'contractMismatches'],
      properties: {
        violations:         { type: 'array', items: { type: 'object' } },
        filesFixed:         { type: 'array', items: { type: 'string' } },
        filesCreated:       { type: 'array', items: { type: 'string' } },
        contractMismatches: { type: 'array', items: { type: 'string' } },
      },
    },
  }
)
const unfixed = review.violations.filter(v => !v.fixed)
log(`Review: ${review.violations.length} violation(s), ${review.filesFixed.length} file(s) fixed, ${unfixed.length} left, ${review.contractMismatches.length} contract mismatch(es)`)

const persistOps = [
  { db: ['--as', 'backend', 'save-decision', 'backend', sessionId, 'express-patterns', `Created ${build.routeContracts.length} routes for: ${taskText.slice(0, 60)}`, `Feature: ${build.featureName}`] },
]
await flushPersist(persistOps)

const contractExports = build.routeContracts.map(r => ({
  routeMethod:   r.method,
  routePath:     r.path,
  requestShape:  r.requestBodySchema  || {},
  responseShape: r.responseSchema     || {},
  authScheme:    r.authRequired ? 'bearer' : 'none',
}))

const allFiles = uniquePaths([...authored, ...review.filesFixed, ...review.filesCreated])

return {
  sessionId,
  agentName:      'backend',
  persistOps,
  status:         'completed',
  dataAccess,
  routes:         build.routeContracts,
  handlers:       build.filesCreated.map(f => ({ filePath: f, functions: [], feature: build.featureName })),
  filesChanged:   allFiles,
  contractExports,
  specConflicts:  build.specConflicts,
  errors:         [
    ...unfixed.map(v => `${v.file}: ${v.issue}`),
    ...review.contractMismatches.map(m => `contract: ${m}`),
  ],
}
