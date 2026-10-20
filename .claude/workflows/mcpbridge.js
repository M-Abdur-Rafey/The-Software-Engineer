export const meta = {
  name: 'mcpbridge',
  description: 'MCP Bridge — validates frontend↔backend↔database contracts and stubs third-party integrations',
  phases: [
    { title: 'Validate Contracts', detail: 'Check frontend bindings against backend exports' },
    { title: 'Check Auth Consistency', detail: 'Verify auth scheme matches security flags' },
    { title: 'Integration Stubs', detail: 'Generate third-party API stubs if needed' },
  ],
}

const AGENTS_DIR      = (args && args.agentsDir) || 'C:/Users/Hp/Desktop/Ideas/Agents'
const sessionId       = (args && args.sessionId)      || 'no-session'
const taskText        = (args && args.taskText)       || ''
const projectPath     = (args && args.projectPath)    || ''
const backendOutput   = (args && args.backendOutput)  || null
const frontendOutput  = (args && args.frontendOutput) || null
const databaseOutput  = (args && args.databaseOutput) || null

const contractExports = (backendOutput && backendOutput.contractExports) || []
const apiBindings     = (frontendOutput && frontendOutput.apiBindings)   || []
const securityFlags   = (frontendOutput && frontendOutput.securityFlags) || []
const dbTables        = (databaseOutput && databaseOutput.tables)        || []

// Bookkeeping is returned as data (persistOps) and run by shared/lib/persist.js
// (design/agent-consolidation.md): orchestrate defers it to the skill; a direct run uses one agent.
async function flushPersist(ops) {
  if (!ops.length || (args && args.deferPersist)) return
  const opsFile = `${AGENTS_DIR}/agents/orchestrator/vault/sessions/${sessionId}.mcpbridge.persist.json`
  await agent(
    `This is the software-engineer pipeline's own bookkeeping step for the session the user started: it records the ` +
    `session's results (decisions, vault notes, session status) in the pipeline's knowledge base under ${AGENTS_DIR}/agents. ` +
    `Every pipeline run ends with it. Write this JSON array exactly, with the Write tool, to ${opsFile}:\n${JSON.stringify(ops)}\n\n` +
    `Then run: node "${AGENTS_DIR}/shared/lib/persist.js" "${opsFile}" and return its output.`,
    { label: 'persist', model: 'haiku', effort: 'low' }
  )
}


log(`Checking: ${apiBindings.length} frontend bindings vs ${contractExports.length} backend exports vs ${dbTables.length} DB tables`)

// ─── Phase: Validate Contracts ────────────────────────────────────────────────
phase('Validate Contracts')

const contractCheck = await agent(
  `You are the contract validator for the MCP Bridge Agent.\n\n` +
  `Validate inter-agent contracts for session ${sessionId}.\n\n` +
  `Backend contract exports:\n${JSON.stringify(contractExports, null, 2)}\n\n` +
  `Frontend API bindings:\n${JSON.stringify(apiBindings, null, 2)}\n\n` +
  `Database tables:\n${JSON.stringify(dbTables.map(t => t.name), null, 2)}\n\n` +
  `Perform these checks:\n\n` +
  `STEP 1 — Frontend → Backend route match (BLOCKING violations):\n` +
  `For each frontend apiBinding, find a matching contractExport where routeMethod === binding.method AND routePath === binding.routePath.\n` +
  `- No match → type: MISSING_BACKEND_ROUTE (BLOCKING)\n` +
  `- Method mismatch → type: METHOD_MISMATCH (BLOCKING)\n` +
  `- Path mismatch → type: PATH_MISMATCH (BLOCKING)\n` +
  `The exports above list only routes the backend touched THIS session. Before reporting any of these three, check ` +
  `whether the route already exists in the project: look for an "api:<METHOD> <path>" row in ${projectPath}/docs/system/dependencies.md ` +
  `if that file exists, otherwise search the backend source in ${projectPath} for the route registration. A route that exists ` +
  `with the same method and path is NOT a violation (it is pre-existing and was not changed), and frontend-only sessions ` +
  `with no exports at all are judged entirely this way.\n\n` +
  `STEP 2 — Backend → Database table match (WARNING only):\n` +
  `If a backend handler description mentions a table name, check it exists in dbTables.\n` +
  `- Missing → type: DB_TABLE_MISSING (WARNING, not blocking)\n\n` +
  `Return JSON: {\n` +
  `  violations: [{type:"MISSING_BACKEND_ROUTE"|"METHOD_MISMATCH"|"PATH_MISMATCH"|"DB_TABLE_MISSING", frontendBinding:string, backendRoute:string|null, severity:"blocking"|"warning", detail:string}],\n` +
  `  blockingCount: number,\n` +
  `  warningCount: number\n` +
  `}`,
  {
    label: 'validate-contracts',
    phase: 'Validate Contracts',
    schema: {
      type: 'object',
      required: ['violations', 'blockingCount', 'warningCount'],
      properties: {
        violations:    { type: 'array' },
        blockingCount: { type: 'number' },
        warningCount:  { type: 'number' },
      },
    },
  }
)

log(`Contract check: ${contractCheck.blockingCount} blocking, ${contractCheck.warningCount} warning`)

// ─── Phase: Check Auth Consistency ────────────────────────────────────────────
phase('Check Auth Consistency')

const authCheck = await agent(
  `Check auth scheme consistency for session ${sessionId}.\n\n` +
  `Backend routes with authScheme "bearer":\n` +
  `${JSON.stringify(contractExports.filter(e => e.authScheme === 'bearer'))}\n\n` +
  `Frontend security flags with severity "error":\n` +
  `${JSON.stringify(securityFlags.filter(f => f.severity === 'error'))}\n\n` +
  `For each bearer-auth route, check if there is an error-severity security flag in the frontend output for that route's binding.\n` +
  `- If yes: emit AUTH_SCHEME_VIOLATION (BLOCKING)\n\n` +
  `Return JSON: { authViolations: [{routePath:string, flagMessage:string}] }`,
  {
    label: 'auth-consistency',
    phase: 'Check Auth Consistency',
    schema: {
      type: 'object',
      required: ['authViolations'],
      properties: {
        authViolations: { type: 'array' },
      },
    },
  }
)

log(`Auth check: ${authCheck.authViolations.length} auth violation(s)`)

// ─── Phase: Integration Stubs ─────────────────────────────────────────────────
phase('Integration Stubs')

const integrationStubs = await agent(
  `Check if the task requires any third-party API integrations.\n\n` +
  `Task: "${taskText}"\n` +
  `Project: ${projectPath}\n\n` +
  `Look for keywords: payment, email, SMS, push notification, OAuth, webhook, maps, analytics, storage, CDN.\n\n` +
  `If integrations are needed:\n` +
  `- Read the stub template: ${AGENTS_DIR}/agents/mcpbridge/vault/templates/api-stub-template.md\n` +
  `- Create stub files at: ${projectPath}/src/integrations/<service-name>.js\n` +
  `- Each stub must: use process.env for credentials, declare authStrategy, have // TODO: implement comments\n\n` +
  `If no integrations are needed, return empty arrays.\n\n` +
  `Return JSON: { integrations: [{serviceName,stubFilePath,authStrategy:"apiKey"|"oauth2"|"bearerToken"|"webhook-secret",endpointsStubbed:[string]}] }`,
  {
    label: 'integration-stubs',
    phase: 'Integration Stubs',
    schema: {
      type: 'object',
      required: ['integrations'],
      properties: {
        integrations: { type: 'array' },
      },
    },
  }
)

log(`Integration stubs: ${integrationStubs.integrations.length}`)

const allViolations = [
  ...contractCheck.violations,
  ...authCheck.authViolations.map(v => ({
    type: 'AUTH_SCHEME_VIOLATION',
    frontendBinding: v.routePath,
    backendRoute: v.routePath,
    severity: 'blocking',
    detail: v.flagMessage,
  })),
]

const totalBlocking = contractCheck.blockingCount + authCheck.authViolations.length
const contractsPassed = totalBlocking === 0

const persistOps = [
  ...(totalBlocking > 0
    ? [{ db: ['--as', 'mcpbridge', 'save-decision', 'mcpbridge', sessionId, 'contract-violations', `${totalBlocking} blocking violation(s) found for: ${taskText.slice(0, 50)}`, `Types: ${[...new Set(allViolations.map(v => v.type))].join(', ')}`] }]
    : []),
  { write: `agents/mcpbridge/vault/contracts/${sessionId}.md`,
    content: `# Contract Validation — Session ${sessionId}\n\n**Task:** ${taskText}\n**Result:** ${contractsPassed ? 'PASSED' : 'FAILED'}\n**Blocking violations:** ${totalBlocking}\n**Warnings:** ${contractCheck.warningCount}\n` },
]
await flushPersist(persistOps)

return {
  sessionId,
  agentName:    'mcpbridge',
  persistOps,
  status:       contractsPassed ? 'completed' : 'failed',
  integrations: integrationStubs.integrations,
  contractValidation: {
    passed:     contractsPassed,
    violations: allViolations,
  },
  errors: allViolations.filter(v => v.severity === 'blocking').map(v => `${v.type}: ${v.detail}`),
}
