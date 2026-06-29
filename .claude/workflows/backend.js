export const meta = {
  name: 'backend',
  description: 'Backend domain agent — routes, controllers, services, code standards, folder structure',
  phases: [
    { title: 'Load Context', detail: 'Read vault notes and prior decisions' },
    { title: 'Plan', detail: 'flow-planner designs business logic flow' },
    { title: 'Data Architecture', detail: 'data-architect: single shared pool, AI-query discipline, caching' },
    { title: 'Build', detail: 'route-creator generates code files' },
    { title: 'Standards', detail: 'code-standards audits JSDoc, errors, comments' },
    { title: 'Structure', detail: 'folder-structure verifies layout and READMEs' },
  ],
}

const AGENTS_DIR      = (args && args.agentsDir) || 'C:/Users/Hp/Desktop/Ideas/Agents'
const sessionId       = (args && args.sessionId)       || 'no-session'
const taskText        = (args && args.taskText)        || ''
const projectPath     = (args && args.projectPath)     || ''
const databaseOutput  = (args && args.databaseOutput)  || null
const archPreferences = (args && args.archPreferences) || null

// Build arch brief from user's clarification answers
const archBrief = archPreferences ? [
  archPreferences.authMethod      ? `Authentication method: ${archPreferences.authMethod}` : null,
  archPreferences.useRateLimiting != null ? `Rate limiting: ${archPreferences.useRateLimiting ? 'yes, 100 req/min per IP' : 'no'}` : null,
  archPreferences.apiVersioning   ? `API path prefix: /api/${archPreferences.apiVersioning}/` : null,
].filter(Boolean).join('. ') : 'Follow the existing project conventions.'

// ─── Phase: Load Context ─────────────────────────────────────────────────────
phase('Load Context')

const context = await agent(
  `Load context for the Backend Agent (session: ${sessionId}).\n\n` +
  `Run:\ncd "${AGENTS_DIR}" && node shared/lib/db-cli.js --as backend get-decisions backend express-patterns 10\n\n` +
  `Then read: ${AGENTS_DIR}/agents/backend/vault/INDEX.md\n` +
  `Then read any relevant vault notes for the task: "${taskText}"\n\n` +
  `Return JSON: { decisions: <array from command>, relevantNoteCount: <number> }`,
  {
    label: 'load-context',
    schema: {
      type: 'object',
      required: ['decisions'],
      properties: {
        decisions:        { type: 'array' },
        relevantNoteCount: { type: 'number' },
      },
    },
  }
)

log(`Loaded ${context.decisions.length} decisions`)

const tableContext = databaseOutput ? JSON.stringify(databaseOutput.tables || []) : '[]'

// ─── Phase: Plan ─────────────────────────────────────────────────────────────
phase('Plan')

const plan = await agent(
  `You are the flow-planner sub-agent of the Backend Agent.\n\n` +
  `Task: "${taskText}"\n` +
  `Project: ${projectPath}\n` +
  `Available database tables: ${tableContext}\n` +
  `Prior backend decisions: ${JSON.stringify(context.decisions.slice(0, 5))}\n\n` +
  `ARCHITECTURE PREFERENCES (from user clarification — follow these exactly):\n${archBrief}\n\n` +
  `Read the project at ${projectPath} to understand existing structure and conventions.\n\n` +
  `Design the business logic flow:\n` +
  `1. What routes are needed? (method, path, description, auth required?) Apply the auth method preference above.\n` +
  `2. What does each controller function do? (thin — no business logic)\n` +
  `3. What does each service function do? (all business logic here)\n` +
  `4. What validation schemas are needed?\n` +
  `5. What middleware is needed? Include rate limiting middleware if the user requested it.\n\n` +
  `Return JSON: { featureName: string, routes: [{method,path,description,authRequired,controllerFn,serviceFn}], validationSchemas: [{name,fields:[{name,type,required}]}], middleware: [string] }`,
  {
    label: 'flow-planner',
    phase: 'Plan',
    schema: {
      type: 'object',
      required: ['featureName', 'routes', 'validationSchemas', 'middleware'],
      properties: {
        featureName:       { type: 'string' },
        routes:            { type: 'array' },
        validationSchemas: { type: 'array' },
        middleware:        { type: 'array', items: { type: 'string' } },
      },
    },
  }
)

log(`Planned ${plan.routes.length} route(s) for feature: ${plan.featureName}`)

// ─── Phase: Data Architecture ────────────────────────────────────────────────
// Works out the data-access strategy BEFORE any code is written so the feature
// stays lean on the database — one shared pool, disciplined AI queries, caching.
phase('Data Architecture')

const dataAccess = await agent(
  `You are the data-architect sub-agent of the Backend Agent.\n\n` +
  `Task: "${taskText}"\n` +
  `Project: ${projectPath}\n` +
  `Planned routes: ${JSON.stringify(plan.routes)}\n` +
  `Available tables: ${tableContext}\n\n` +
  `Read these vault notes and apply their rules:\n` +
  `- ${AGENTS_DIR}/agents/backend/vault/architecture/data-access-and-pooling.md\n` +
  `- ${AGENTS_DIR}/agents/backend/vault/architecture/ai-query-discipline.md\n` +
  `- ${AGENTS_DIR}/agents/backend/vault/architecture/caching-and-lookup-tables.md\n\n` +
  `Inspect ${projectPath} for an existing DB connection/pool and reuse it.\n\n` +
  `Design the data-access layer so the feature does not overload the database:\n` +
  `1. ONE shared DB connection/pool, initialized once and reused — never a new connection per request, never pool exhaustion. Reuse the project's existing pool; only create one if none exists.\n` +
  `2. AI/LLM query discipline: read-only query tools, always LIMIT + time filters, never SELECT *, parameterized queries, no N+1, no over-selection.\n` +
  `3. Caching + lookup tables: what to cache and where (in-memory/Redis), invalidation strategy, and which reference/lookup tables avoid repeated joins.\n\n` +
  `Return JSON: { dbAccess: {singlePool: boolean, init: string, notes: string}, aiQueryRules: [string], caching: {strategy: string, lookupTables: [string], invalidation: string}, summary: string }`,
  {
    label: 'data-architect',
    phase: 'Data Architecture',
    schema: {
      type: 'object',
      required: ['dbAccess', 'aiQueryRules', 'caching', 'summary'],
      properties: {
        dbAccess:     { type: 'object' },
        aiQueryRules: { type: 'array', items: { type: 'string' } },
        caching:      { type: 'object' },
        summary:      { type: 'string' },
      },
    },
  }
)

log(`Data access: singlePool=${dataAccess.dbAccess && dataAccess.dbAccess.singlePool}, ${dataAccess.aiQueryRules.length} AI-query rule(s)`)

// ─── Phase: Build ─────────────────────────────────────────────────────────────
phase('Build')

const build = await agent(
  `You are the route-creator sub-agent of the Backend Agent.\n\n` +
  `Task: "${taskText}"\n` +
  `Project: ${projectPath}\n` +
  `Feature name: ${plan.featureName}\n` +
  `Routes to implement: ${JSON.stringify(plan.routes)}\n` +
  `Validation schemas: ${JSON.stringify(plan.validationSchemas)}\n\n` +
  `Read the existing code at ${projectPath} to follow its conventions.\n\n` +
  `DATA-ACCESS DESIGN — follow this exactly: ${JSON.stringify(dataAccess)}\n` +
  `All DB access MUST use the single shared pool (never open a connection per request). ` +
  `Any AI/LLM query MUST be read-only with LIMIT + time filters and never SELECT *.\n\n` +
  `Create these files in src/features/${plan.featureName}/:\n` +
  `  routes.js   — MUST export array of: {method,path,handler,middleware[],description,requestBodySchema,responseSchema,authRequired}\n` +
  `  controller.js — thin layer, imports from service.js\n` +
  `  service.js  — all business logic\n` +
  `  schema.js   — validation schemas\n\n` +
  `Error format everywhere: { success: false, code: 'ERR_CODE', message: '...', details: {} }\n\n` +
  `Return JSON: { filesCreated: [string], filesUpdated: [string], routeContracts: [{method,path,handler,middleware,description,requestBodySchema,responseSchema,authRequired}] }`,
  {
    label: 'route-creator',
    phase: 'Build',
    schema: {
      type: 'object',
      required: ['filesCreated', 'filesUpdated', 'routeContracts'],
      properties: {
        filesCreated:   { type: 'array', items: { type: 'string' } },
        filesUpdated:   { type: 'array', items: { type: 'string' } },
        routeContracts: { type: 'array' },
      },
    },
  }
)

log(`Created ${build.filesCreated.length} files, updated ${build.filesUpdated.length}`)

// ─── Phase: Standards ─────────────────────────────────────────────────────────
phase('Standards')

const standards = await agent(
  `You are the code-standards sub-agent of the Backend Agent.\n\n` +
  `Audit and fix these files at ${projectPath}:\n${JSON.stringify([...build.filesCreated, ...build.filesUpdated])}\n\n` +
  `Enforce:\n` +
  `1. Every exported function has @param and @returns JSDoc\n` +
  `2. Error responses use: { success: false, code: 'ERR_X', message: '...', details: {} }\n` +
  `3. No stack traces in error responses\n` +
  `4. No console.log in production paths\n` +
  `5. No bare catch blocks — errors must be handled\n\n` +
  `Fix all violations in-place by editing the files.\n\n` +
  `Return JSON: { violations: [{file,issue,fixed:boolean}], filesFixed: [string] }`,
  {
    label: 'code-standards',
    phase: 'Standards',
    schema: {
      type: 'object',
      required: ['violations', 'filesFixed'],
      properties: {
        violations: { type: 'array' },
        filesFixed: { type: 'array', items: { type: 'string' } },
      },
    },
  }
)

log(`Standards: ${standards.violations.length} violation(s), ${standards.filesFixed.length} fixed`)

// ─── Phase: Structure ─────────────────────────────────────────────────────────
phase('Structure')

const structure = await agent(
  `You are the folder-structure sub-agent of the Backend Agent.\n\n` +
  `Verify and fix the feature folder for "${plan.featureName}" at ${projectPath}/src/features/${plan.featureName}/.\n\n` +
  `Check:\n` +
  `1. routes.js, controller.js, service.js, schema.js all exist\n` +
  `2. README.md exists with: description, endpoints table (method/path/auth/description), dependencies section\n` +
  `3. Files are in the correct folder — not scattered elsewhere\n\n` +
  `Create any missing README.md with proper content.\n\n` +
  `Return JSON: { missingFiles: [string], createdFiles: [string], folderIssues: [string] }`,
  {
    label: 'folder-structure',
    phase: 'Structure',
    schema: {
      type: 'object',
      required: ['missingFiles', 'createdFiles', 'folderIssues'],
      properties: {
        missingFiles: { type: 'array', items: { type: 'string' } },
        createdFiles: { type: 'array', items: { type: 'string' } },
        folderIssues: { type: 'array', items: { type: 'string' } },
      },
    },
  }
)

log(`Structure: created ${structure.createdFiles.length} missing file(s)`)

// Persist state
await agent(
  `Save backend agent state. Run:\n` +
  `cd "${AGENTS_DIR}" && node shared/lib/db-cli.js --as backend save-decision backend "${sessionId}" "express-patterns" ` +
  `"Created ${build.routeContracts.length} routes for: ${taskText.slice(0,60).replace(/"/g,'')}" "Feature: ${plan.featureName}"\n\n` +
  `Return "done".`,
  { label: 'persist-state' }
)

const contractExports = build.routeContracts.map(r => ({
  routeMethod:   r.method,
  routePath:     r.path,
  requestShape:  r.requestBodySchema  || {},
  responseShape: r.responseSchema     || {},
  authScheme:    r.authRequired ? 'bearer' : 'none',
}))

const allFiles = [
  ...build.filesCreated,
  ...build.filesUpdated,
  ...standards.filesFixed,
  ...structure.createdFiles,
]

return {
  sessionId,
  agentName:      'backend',
  status:         'completed',
  dataAccess,
  routes:         build.routeContracts,
  handlers:       build.filesCreated.map(f => ({ filePath: f, functions: [], feature: plan.featureName })),
  filesChanged:   allFiles,
  contractExports,
  errors:         standards.violations.filter(v => !v.fixed).map(v => `${v.file}: ${v.issue}`),
}
