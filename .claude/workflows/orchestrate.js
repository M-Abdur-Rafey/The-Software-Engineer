export const meta = {
  name: 'orchestrate',
  description: 'Main orchestration entry point — routes dev tasks to domain agents in dependency order. Auto-onboards new projects on first use.',
  phases: [
    { title: 'Init', detail: 'Create session, classify task' },
    { title: 'Onboard', detail: 'Deep project scan (first use only — reads entire codebase)' },
    { title: 'Database', detail: 'Schema and migration work' },
    { title: 'Backend', detail: 'Routes, controllers, services' },
    { title: 'Frontend + Testing + Calls', detail: 'Components, Postman collections, and telephony (parallel)' },
    { title: 'Ponytail', detail: 'Lazy-senior-dev pass — trims over-engineering from generated code' },
    { title: 'Bridge', detail: 'Contract validation across all domains' },
    { title: 'Git', detail: 'Branch, security scan, commit' },
  ],
}

// args: { task, projectPath, agentsDir?, clarifications?: { designPreferences, archPreferences, dbPreferences, callPreferences } }
//
// Model policy (orchestrator = main model, sub-agents = cheaper):
//   - Orchestrator-level reasoning (task classification) runs on the host's main/default model.
//   - Mechanical command-runner agents (session init, onboard check, status updates) run on 'haiku'.
//   - Domain sub-workflows pick their own per-phase model (e.g. frontend 3D design uses Opus).
// Sub-agents always use whatever models the host IDE provides — no API keys, no local Ollama.
const AGENTS_DIR      = (args && args.agentsDir) || 'C:/Users/Hp/Desktop/Ideas/Agents'
const taskText        = (args && args.task)           || ''
const projectPath     = (args && args.projectPath)    || ''
const clarifications  = (args && args.clarifications) || {}

// ─── Phase: Init ─────────────────────────────────────────────────────────────
phase('Init')

const sessionResult = await agent(
  `Initialize an orchestration session by running this command exactly in PowerShell:\n\n` +
  `cd "${AGENTS_DIR}"; node shared/lib/db-cli.js init-session "${taskText.replace(/"/g, '\\"')}" "${projectPath.replace(/"/g, '\\"')}"\n\n` +
  `The command prints JSON like: {"sessionId":"...","startedAt":...}\n` +
  `Return that JSON object.`,
  {
    label: 'init-session',
    model: 'haiku',
    schema: {
      type: 'object',
      required: ['sessionId', 'startedAt'],
      properties: {
        sessionId:  { type: 'string' },
        startedAt:  { type: 'number' },
      },
    },
  }
)

const sessionId = sessionResult.sessionId
log(`Session ${sessionId} started`)

// ─── Auto-onboard: first time this project is used, scan entire codebase ─────
const isOnboardTask = taskText.trim().toUpperCase().startsWith('ONBOARD')

if (!isOnboardTask && projectPath) {
  const onboardCheck = await agent(
    `Check if this project has been onboarded. Run this command:\n\n` +
    `cd "${AGENTS_DIR}"; node shared/lib/db-cli.js check-onboarded "${projectPath.replace(/"/g, '\\"')}"\n\n` +
    `The command prints JSON. Return it as-is.`,
    {
      label: 'check-onboarded',
      model: 'haiku',
      schema: {
        type: 'object',
        required: ['onboarded'],
        properties: {
          onboarded:   { type: 'boolean' },
          onboardedAt: { type: ['number', 'null'] },
          techStack:   { type: ['string', 'null'] },
        },
      },
    }
  )

  if (!onboardCheck.onboarded) {
    phase('Onboard')
    log('First use on this project — running deep codebase scan before starting work...')
    log('This happens once per project. All future sessions skip this step.')
    await workflow(
      { scriptPath: `${AGENTS_DIR}/.claude/workflows/onboard.js` },
      { sessionId, projectPath, agentsDir: AGENTS_DIR }
    )
    log('Onboarding complete — all agents now have full context for this project')
  } else {
    log(`Project already onboarded (${onboardCheck.techStack || 'stack unknown'}) — skipping scan`)
  }
}

const classification = await agent(
  `Classify this software development task:\n"${taskText}"\n\n` +
  `Rules:\n` +
  `- requiresDatabase: true if new tables, schema changes, or data model work is needed\n` +
  `- requiresBackend: true if API routes, controllers, or server logic is needed\n` +
  `- requiresFrontend: true if UI components, pages, or client-side code is needed\n` +
  `- requiresCalls: true if inbound or outbound phone/voice calls, IVR, telephony, Twilio, Vonage, dialing, or voicemail is involved\n` +
  `- taskType: one of feat | fix | chore | test | docs | refactor | security\n` +
  `- taskSlug: lowercase kebab-case, max 30 chars, derived from the task`,
  {
    label: 'classify-task',
    schema: {
      type: 'object',
      required: ['requiresDatabase', 'requiresBackend', 'requiresFrontend', 'requiresCalls', 'taskType', 'taskSlug'],
      properties: {
        requiresDatabase:  { type: 'boolean' },
        requiresBackend:   { type: 'boolean' },
        requiresFrontend:  { type: 'boolean' },
        requiresCalls:     { type: 'boolean' },
        taskType:          { type: 'string' },
        taskSlug:          { type: 'string' },
      },
    },
  }
)

log(`db=${classification.requiresDatabase} be=${classification.requiresBackend} fe=${classification.requiresFrontend} calls=${classification.requiresCalls} type=${classification.taskType}`)

let databaseOutput = null
let backendOutput  = null
let frontendOutput = null
let testingOutput  = null
let callsOutput    = null
let ponytailOutput = null
let bridgeOutput   = null
let gitOutput      = null

// ─── Phase: Database ─────────────────────────────────────────────────────────
if (classification.requiresDatabase) {
  phase('Database')
  databaseOutput = await workflow(
    { scriptPath: `${AGENTS_DIR}/.claude/workflows/database.js` },
    { agentsDir: AGENTS_DIR, sessionId, taskText, projectPath, dbPreferences: clarifications.dbPreferences || null }
  )
  log(`database → ${databaseOutput && databaseOutput.status}`)
}

// ─── Phase: Backend ───────────────────────────────────────────────────────────
if (classification.requiresBackend) {
  phase('Backend')
  backendOutput = await workflow(
    { scriptPath: `${AGENTS_DIR}/.claude/workflows/backend.js` },
    { agentsDir: AGENTS_DIR, sessionId, taskText, projectPath, databaseOutput, archPreferences: clarifications.archPreferences || null }
  )
  log(`backend → ${backendOutput && backendOutput.status}`)
}

// ─── Phase: Frontend + Testing + Calls (parallel) ────────────────────────────
phase('Frontend + Testing + Calls')
{
  const parallelTasks = []

  if (classification.requiresFrontend && backendOutput) {
    parallelTasks.push(() => workflow(
      { scriptPath: `${AGENTS_DIR}/.claude/workflows/frontend.js` },
      { agentsDir: AGENTS_DIR, sessionId, taskText, projectPath, backendOutput, designPreferences: clarifications.designPreferences || null }
    ))
  }

  if (backendOutput) {
    parallelTasks.push(() => workflow(
      { scriptPath: `${AGENTS_DIR}/.claude/workflows/testing.js` },
      { agentsDir: AGENTS_DIR, sessionId, taskText, projectPath, backendOutput }
    ))
  }

  if (classification.requiresCalls) {
    parallelTasks.push(() => workflow(
      { scriptPath: `${AGENTS_DIR}/.claude/workflows/calls.js` },
      { agentsDir: AGENTS_DIR, sessionId, taskText, projectPath, backendOutput, databaseOutput, callPreferences: clarifications.callPreferences || null }
    ))
  }

  if (parallelTasks.length > 0) {
    const results = await parallel(parallelTasks)
    let idx = 0
    if (classification.requiresFrontend && backendOutput) { frontendOutput = results[idx++] }
    if (backendOutput)                                    { testingOutput  = results[idx++] }
    if (classification.requiresCalls)                     { callsOutput    = results[idx++] }
    log(`frontend → ${frontendOutput && frontendOutput.status} | testing → ${testingOutput && testingOutput.status} | calls → ${callsOutput && callsOutput.status}`)
  }
}

// ─── Phase: Ponytail ─────────────────────────────────────────────────────────
// Lazy-senior-dev refinement: trim over-engineering from the code that backend /
// frontend / calls just generated, BEFORE the bridge re-validates contracts.
// Advisory — never blocks the pipeline. Vendored from github.com/DietrichGebert/ponytail.
if (backendOutput || frontendOutput || callsOutput || (databaseOutput && databaseOutput.migrationFile)) {
  phase('Ponytail')
  ponytailOutput = await workflow(
    { scriptPath: `${AGENTS_DIR}/.claude/workflows/ponytail.js` },
    {
      agentsDir: AGENTS_DIR,
      sessionId,
      taskText,
      projectPath,
      mode: clarifications.ponytailMode || 'full',
      backendOutput,
      frontendOutput,
      callsOutput,
      databaseOutput,
    }
  )
  log(`ponytail → ${ponytailOutput && ponytailOutput.status} (${ponytailOutput && ponytailOutput.metrics && ponytailOutput.metrics.simplificationsApplied} applied, ~${ponytailOutput && ponytailOutput.metrics && ponytailOutput.metrics.estimatedLinesRemoved} lines removed)`)
}

// ─── Phase: Bridge ────────────────────────────────────────────────────────────
phase('Bridge')
bridgeOutput = await workflow(
  { scriptPath: `${AGENTS_DIR}/.claude/workflows/mcpbridge.js` },
  { agentsDir: AGENTS_DIR, sessionId, taskText, projectPath, backendOutput, frontendOutput, databaseOutput, callsOutput }
)
const bridgePassed = bridgeOutput && bridgeOutput.contractValidation && bridgeOutput.contractValidation.passed
log(`bridge → passed=${bridgePassed}`)

if (!bridgePassed) {
  const violations = (bridgeOutput && bridgeOutput.contractValidation && bridgeOutput.contractValidation.violations) || []
  log(`BLOCKED by ${violations.length} contract violation(s)`)
  await agent(
    `Mark this session as failed. Run:\n\ncd "${AGENTS_DIR}"; node shared/lib/db-cli.js update-session-status "${sessionId}" "failed"\n\nReturn "done".`,
    { label: 'session-failed', model: 'haiku' }
  )
  return {
    sessionId,
    status: 'blocked',
    reason: 'contract_violations',
    violations: (bridgeOutput && bridgeOutput.contractValidation && bridgeOutput.contractValidation.violations) || [],
  }
}

// ─── Phase: Git ───────────────────────────────────────────────────────────────
phase('Git')
gitOutput = await workflow(
  { scriptPath: `${AGENTS_DIR}/.claude/workflows/gitdevops.js` },
  {
    agentsDir: AGENTS_DIR,
    sessionId,
    taskText,
    projectPath,
    taskType: classification.taskType,
    taskSlug: classification.taskSlug,
    backendOutput,
    frontendOutput,
    databaseOutput,
    testingOutput,
    bridgeOutput,
  }
)
log(`git → ${gitOutput && gitOutput.status} branch=${gitOutput && gitOutput.branch}`)

const finalStatus = gitOutput && gitOutput.status === 'completed' ? 'completed' : 'failed'
await agent(
  `Mark this session as ${finalStatus}. Run:\n\ncd "${AGENTS_DIR}"; node shared/lib/db-cli.js update-session-status "${sessionId}" "${finalStatus}"\n\nReturn "done".`,
  { label: 'session-final', model: 'haiku' }
)

// Real-time: write this run's summary into the orchestrator's own vault (git-ignored).
await agent(
  `Write a session summary note to this exact path (create parent folders if needed):\n` +
  `${AGENTS_DIR}/agents/orchestrator/vault/sessions/${sessionId}.md\n\n` +
  `File content (Markdown):\n\n` +
  `# Session ${sessionId}\n\n` +
  `- Task: ${taskText.replace(/`/g, "'").slice(0, 300)}\n` +
  `- Project: ${projectPath}\n` +
  `- Status: ${finalStatus}\n` +
  `- Domains: ${['database', 'backend', 'frontend', 'testing', 'calls', 'ponytail', 'mcpbridge', 'gitdevops']
    .filter((_, i) => [databaseOutput, backendOutput, frontendOutput, testingOutput, callsOutput, ponytailOutput, bridgeOutput, gitOutput][i])
    .map((d) => '[[' + d + ']]').join(' · ')}\n` +
  `- Branch: ${(gitOutput && gitOutput.branch) || 'n/a'}\n` +
  `- Orchestrated by: [[orchestrator]]\n\n` +
  `Return "done".`,
  { label: 'orchestrator-session-note', model: 'haiku' }
)

return {
  sessionId,
  status: finalStatus,
  completedAgents: [
    databaseOutput && 'database',
    backendOutput  && 'backend',
    frontendOutput && 'frontend',
    testingOutput  && 'testing',
    callsOutput    && 'calls',
    ponytailOutput && 'ponytail',
    bridgeOutput   && 'mcpbridge',
    gitOutput      && 'gitdevops',
  ].filter(Boolean),
  branch:          gitOutput && gitOutput.branch,
  commitHash:      gitOutput && gitOutput.commitHash,
  ponytail:        ponytailOutput && ponytailOutput.metrics,
  contractsPassed: bridgePassed,
  securityPassed:  gitOutput && !(gitOutput.blockedBy && gitOutput.blockedBy.length),
}
