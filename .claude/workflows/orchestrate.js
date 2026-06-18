export const meta = {
  name: 'orchestrate',
  description: 'Main orchestration entry point — routes dev tasks to domain agents in dependency order. Auto-onboards new projects on first use.',
  phases: [
    { title: 'Init', detail: 'Create session, classify task' },
    { title: 'Onboard', detail: 'Deep project scan (first use only — reads entire codebase)' },
    { title: 'Database', detail: 'Schema and migration work' },
    { title: 'Backend', detail: 'Routes, controllers, services' },
    { title: 'Frontend + Testing', detail: 'Components and Postman collections (parallel)' },
    { title: 'Bridge', detail: 'Contract validation across all domains' },
    { title: 'Git', detail: 'Branch, security scan, commit' },
  ],
}

// args: { task: string, projectPath: string }
const AGENTS_DIR = 'C:/Users/Hp/Desktop/Agents'
const taskText    = (args && args.task)        || ''
const projectPath = (args && args.projectPath) || ''

// ─── Phase: Init ─────────────────────────────────────────────────────────────
phase('Init')

const sessionResult = await agent(
  `Initialize an orchestration session by running this command exactly in PowerShell:\n\n` +
  `cd "${AGENTS_DIR}"; node shared/lib/db-cli.js init-session "${taskText.replace(/"/g, '\\"')}" "${projectPath.replace(/"/g, '\\"')}"\n\n` +
  `The command prints JSON like: {"sessionId":"...","startedAt":...}\n` +
  `Return that JSON object.`,
  {
    label: 'init-session',
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
  `- taskType: one of feat | fix | chore | test | docs | refactor | security\n` +
  `- taskSlug: lowercase kebab-case, max 30 chars, derived from the task`,
  {
    label: 'classify-task',
    schema: {
      type: 'object',
      required: ['requiresDatabase', 'requiresBackend', 'requiresFrontend', 'taskType', 'taskSlug'],
      properties: {
        requiresDatabase:  { type: 'boolean' },
        requiresBackend:   { type: 'boolean' },
        requiresFrontend:  { type: 'boolean' },
        taskType:          { type: 'string' },
        taskSlug:          { type: 'string' },
      },
    },
  }
)

log(`db=${classification.requiresDatabase} be=${classification.requiresBackend} fe=${classification.requiresFrontend} type=${classification.taskType}`)

let databaseOutput = null
let backendOutput  = null
let frontendOutput = null
let testingOutput  = null
let bridgeOutput   = null
let gitOutput      = null

// ─── Phase: Database ─────────────────────────────────────────────────────────
if (classification.requiresDatabase) {
  phase('Database')
  databaseOutput = await workflow(
    { scriptPath: `${AGENTS_DIR}/.claude/workflows/database.js` },
    { sessionId, taskText, projectPath }
  )
  log(`database → ${databaseOutput && databaseOutput.status}`)
}

// ─── Phase: Backend ───────────────────────────────────────────────────────────
if (classification.requiresBackend) {
  phase('Backend')
  backendOutput = await workflow(
    { scriptPath: `${AGENTS_DIR}/.claude/workflows/backend.js` },
    { sessionId, taskText, projectPath, databaseOutput }
  )
  log(`backend → ${backendOutput && backendOutput.status}`)
}

// ─── Phase: Frontend + Testing (parallel) ────────────────────────────────────
phase('Frontend + Testing')
if (classification.requiresFrontend && backendOutput) {
  const results = await parallel([
    () => workflow(
      { scriptPath: `${AGENTS_DIR}/.claude/workflows/frontend.js` },
      { sessionId, taskText, projectPath, backendOutput }
    ),
    () => workflow(
      { scriptPath: `${AGENTS_DIR}/.claude/workflows/testing.js` },
      { sessionId, taskText, projectPath, backendOutput }
    ),
  ])
  frontendOutput = results[0]
  testingOutput  = results[1]
  log(`frontend → ${frontendOutput && frontendOutput.status} | testing → ${testingOutput && testingOutput.status}`)
} else if (backendOutput) {
  testingOutput = await workflow(
    { scriptPath: `${AGENTS_DIR}/.claude/workflows/testing.js` },
    { sessionId, taskText, projectPath, backendOutput }
  )
  log(`testing → ${testingOutput && testingOutput.status}`)
}

// ─── Phase: Bridge ────────────────────────────────────────────────────────────
phase('Bridge')
bridgeOutput = await workflow(
  { scriptPath: `${AGENTS_DIR}/.claude/workflows/mcpbridge.js` },
  { sessionId, taskText, projectPath, backendOutput, frontendOutput, databaseOutput }
)
const bridgePassed = bridgeOutput && bridgeOutput.contractValidation && bridgeOutput.contractValidation.passed
log(`bridge → passed=${bridgePassed}`)

if (!bridgePassed) {
  const violations = (bridgeOutput && bridgeOutput.contractValidation && bridgeOutput.contractValidation.violations) || []
  log(`BLOCKED by ${violations.length} contract violation(s)`)
  await agent(
    `Mark this session as failed. Run:\n\ncd "${AGENTS_DIR}"; node shared/lib/db-cli.js update-session-status "${sessionId}" "failed"\n\nReturn "done".`,
    { label: 'session-failed' }
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
  { label: 'session-final' }
)

return {
  sessionId,
  status: finalStatus,
  completedAgents: [
    databaseOutput && 'database',
    backendOutput  && 'backend',
    frontendOutput && 'frontend',
    testingOutput  && 'testing',
    bridgeOutput   && 'mcpbridge',
    gitOutput      && 'gitdevops',
  ].filter(Boolean),
  branch:          gitOutput && gitOutput.branch,
  commitHash:      gitOutput && gitOutput.commitHash,
  contractsPassed: bridgePassed,
  securityPassed:  gitOutput && !(gitOutput.blockedBy && gitOutput.blockedBy.length),
}
