export const meta = {
  name: 'mcpbridge',
  description: 'MCP Bridge — validates frontend↔backend↔database contracts and stubs third-party integrations',
  phases: [
    { title: 'Validate', detail: 'One check: routes, tables, auth consistency, integration stubs' },
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

// ─── Phase: Validate ──────────────────────────────────────────────────────────
// One independent check (design/agent-consolidation.md, phase 2). It never wrote the code it checks.
phase('Validate')

const check = await agent(
  `You are the MCP Bridge: you validate the contracts between this session's domain outputs. You did not write any of this code.\n\n` +
  `Session ${sessionId} · Task: "${taskText}" · Project: ${projectPath}\n\n` +
  `Backend contract exports (routes touched THIS session):\n${JSON.stringify(contractExports, null, 2)}\n\n` +
  `Frontend API bindings:\n${JSON.stringify(apiBindings, null, 2)}\n\n` +
  `Frontend security flags with severity "error":\n${JSON.stringify(securityFlags.filter(f => f.severity === 'error'))}\n\n` +
  `Database tables:\n${JSON.stringify(dbTables.map(t => t.name), null, 2)}\n\n` +
  `1. Frontend -> backend route match (BLOCKING). For each binding, find an export with the same method and path. No match -> ` +
  `MISSING_BACKEND_ROUTE; method differs -> METHOD_MISMATCH; path differs -> PATH_MISMATCH. Before reporting any of these, check ` +
  `whether the route already exists in the project: an "api:<METHOD> <path>" row in ${projectPath}/docs/system/dependencies.md if ` +
  `that file exists, otherwise the route registration in the backend source. A route that exists with the same method and path is ` +
  `NOT a violation (pre-existing, unchanged); frontend-only sessions with no exports are judged entirely this way.\n` +
  `2. Backend -> database (WARNING only): a table named in a backend handler or description that is not in the table list -> DB_TABLE_MISSING.\n` +
  `3. Auth consistency (BLOCKING): a bearer-auth route whose frontend binding carries an error-severity security flag -> AUTH_SCHEME_VIOLATION.\n` +
  `4. Third-party integrations: if the task needs payment, email, SMS, push, OAuth, webhooks, maps, analytics, storage or CDN and no ` +
  `client exists yet, create stubs per ${AGENTS_DIR}/agents/mcpbridge/vault/templates/api-stub-template.md at ` +
  `${projectPath}/src/integrations/<service-name>.js (credentials from process.env, declared authStrategy, // TODO: implement). Otherwise none.\n\n` +
  `For every violation write a plain-language detail: the concrete failure a user would hit.\n` +
  `Return { violations: [{ type, frontendBinding, backendRoute, severity: "blocking"|"warning", detail }], ` +
  `integrations: [{ serviceName, stubFilePath, authStrategy, endpointsStubbed: [string] }] }.`,
  {
    label: 'bridge',
    phase: 'Validate',
    schema: {
      type: 'object',
      required: ['violations', 'integrations'],
      properties: {
        violations: {
          type: 'array',
          items: {
            type: 'object',
            required: ['type', 'severity', 'detail'],
            properties: {
              type:            { type: 'string' },
              frontendBinding: { type: ['string', 'null'] },
              backendRoute:    { type: ['string', 'null'] },
              severity:        { type: 'string', enum: ['blocking', 'warning'] },
              detail:          { type: 'string' },
            },
          },
        },
        integrations: { type: 'array' },
      },
    },
  }
)

const allViolations = check.violations
const integrationStubs = { integrations: check.integrations || [] }
const totalBlocking = allViolations.filter(v => v.severity === 'blocking').length
const contractCheck = { warningCount: allViolations.filter(v => v.severity === 'warning').length }
log(`Bridge: ${totalBlocking} blocking, ${contractCheck.warningCount} warning, ${integrationStubs.integrations.length} integration stub(s)`)
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
