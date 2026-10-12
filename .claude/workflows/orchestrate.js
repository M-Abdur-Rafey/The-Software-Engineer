export const meta = {
  name: 'orchestrate',
  description: 'Main orchestration entry point — routes dev tasks to domain agents in dependency order. Auto-onboards new projects on first use.',
  phases: [
    { title: 'Init', detail: 'Create session, classify task' },
    { title: 'Onboard', detail: 'Deep project scan (first use only — reads entire codebase)' },
    { title: 'System Docs', detail: 'Sync docs with manual edits, impact analysis, approval gate (skipped when the project has no docs/system)' },
    { title: 'Requirements', detail: 'Spec-driven: signals → user stories → specification' },
    { title: 'Database', detail: 'Schema and migration work' },
    { title: 'Backend', detail: 'Routes, controllers, services' },
    { title: 'Frontend + Testing + Calls', detail: 'Components, Postman collections, and telephony (parallel)' },
    { title: 'Ponytail', detail: 'Lazy-senior-dev pass — trims over-engineering from generated code' },
    { title: 'Bridge', detail: 'Contract validation across all domains' },
    { title: 'Docs Update', detail: 'Record what changed in each touched module doc' },
    { title: 'Git', detail: 'Branch, security scan, commit' },
    { title: 'SRE', detail: 'Operate: health checks, diagnostics, outcome metrics, feedback loop (advisory)' },
  ],
}

// args: { task, projectPath, agentsDir?, clarifications?: { designPreferences, archPreferences, dbPreferences, callPreferences },
//         systemDocs?: false to skip System Docs even if docs/system exists, modules?: [target module names] }
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

// ─── Phase: System Docs ──────────────────────────────────────────────────────
// When the project has docs/system (see design/system-docs.md): sync docs with
// manual edits, find which modules the task touches and who depends on them,
// stop for answers if a target module's doc isn't approved, and hand every
// domain agent a compact briefing so it doesn't break linked features.
const SYSDOCS = { scriptPath: `${AGENTS_DIR}/.claude/workflows/sysdocs.js` }
const CLI = `node "${AGENTS_DIR}/shared/lib/sysdocs.js"`
const DOCS = `${projectPath}/docs/system`
let docs = null
let domainTask = taskText

if (args && args.systemDocs !== false && projectPath) {
  phase('System Docs')
  const sync = await workflow(SYSDOCS, { mode: 'sync', projectPath, agentsDir: AGENTS_DIR, sessionId })

  if (sync && sync.initialized) {
    const fixedTargets = (args && args.modules) || []
    const IMPACT_SCHEMA = {
      type: 'object',
      required: ['targetModules', 'newModules', 'consumers', 'otherOwners', 'chainReaction', 'questionsAdded', 'briefing'],
      properties: {
        targetModules:  { type: 'array', items: { type: 'string' } },
        newModules:     { type: 'array', items: { type: 'string' } },
        consumers:      { type: 'array', items: { type: 'object', required: ['module', 'uses'], properties: { module: { type: 'string' }, owner: { type: 'string' }, uses: { type: 'array', items: { type: 'string' } }, risk: { type: 'string' } } } },
        otherOwners:    { type: 'array', items: { type: 'object', required: ['owner', 'module', 'how'], properties: { owner: { type: 'string' }, module: { type: 'string' }, how: { type: 'string' } } } },
        chainReaction:  { type: 'string' },
        questionsAdded: { type: 'array', items: { type: 'string' } },
        briefing:       { type: 'string' },
      },
    }
    const impact = await agent(
      `You are the Impact Analyst. Before any code changes, work out what this task touches and what could break.\n\n` +
      `Task (${classification.taskType}):\n"""\n${taskText}\n"""\n\n` +
      `Read ${DOCS}/INDEX.md and ${DOCS}/dependencies.md first. Open a module's README/questions.md ONLY if it is a target ` +
      `or a direct consumer: never read the whole tree.\n` +
      (fixedTargets.length ? `The target modules are fixed: ${fixedTargets.join(', ')}.\n` : '') +
      `\n1. Target modules: existing modules this task changes. If the task needs a module that does not exist, create it: ` +
      `write {"modules":[{name, layer, owner:"", paths, provides, dependsOn}]} to a JSON file and run ${CLI} apply-plan "${projectPath}" @<file>. ` +
      `Touchpoints look like api:METHOD /path, fn:name, table:name.column, config:KEY, event:name, ui:Component.\n` +
      `2. Run ${CLI} impact "${projectPath}" <every touchpoint the task adds/changes/removes and every file it will edit>. ` +
      `This lists the provider, direct consumers (with exactly what they use), indirect consumers and owners.\n` +
      `3. Read answered questions in the targets' questions.md: those are decisions. Never re-ask them.\n` +
      `4. If the task needs a decision that is not recorded (including how consumers should behave after the change), ` +
      `add questions: write a JSON array to a file and run ${CLI} ask "${projectPath}" <module> @<file>. Each item needs ` +
      `question, chainReaction (plain language: which modules/features change), technical (concrete example), plain ` +
      `(everyday example for a non-developer), data (realistic record/payload as a JSON string), options (recommended first), touches. ` +
      `Ask only what changes behaviour or data. When a question touches auth, secrets, storage or hosts, read the blocking ` +
      `rules first (${AGENTS_DIR}/shared/standards/security-rules.md, ${AGENTS_DIR}/agents/gitdevops/vault/security-scans/checklist.md, ` +
      `${AGENTS_DIR}/agents/frontend/vault/security/bearer-token-rules.md) and never offer an option they forbid.\n\n` +
      `Return:\n- targetModules, newModules\n- consumers: [{module, owner, uses, risk: how this change could break it}]\n` +
      `- otherOwners: consumers whose owner differs from the targets' owners (skip blank owners)\n` +
      `- chainReaction: 2-6 plain-language sentences on what else changes\n- questionsAdded: ids\n` +
      `- briefing: <= 3000 chars for the coding agents: per target module its purpose, the recorded decisions to follow, ` +
      `the touchpoints it provides that others use (who uses them and how) which MUST keep working or be updated together with ` +
      `their consumers, and the exact doc paths to read for details.`,
      { label: 'impact-analyst', schema: IMPACT_SCHEMA }
    )
    log(`impact: targets=${impact.targetModules.join(',')} new=${impact.newModules.join(',') || '-'} consumers=${impact.consumers.map(c => c.module).join(',') || '-'} questions=${impact.questionsAdded.length}`)

    const targets = [...new Set([...impact.targetModules, ...impact.newModules])]
    const GATE_SCHEMA = {
      type: 'object',
      required: ['results'],
      properties: { results: { type: 'array', items: { type: 'object', required: ['module', 'pass'], properties: { module: { type: 'string' }, pass: { type: 'boolean' }, reason: { type: ['string', 'null'] }, blocking: { type: 'array', items: { type: 'object' } } } } } },
    }
    const gate = await agent(
      `Run each command and collect the printed JSON:\n` + targets.map(t => `${CLI} gate "${projectPath}" ${t}`).join('\n') +
      `\n\nReturn { results: [<each printed object: module, pass, reason, blocking>] }.`,
      { label: 'docs-gate', model: 'haiku', schema: GATE_SCHEMA }
    )
    const failing = gate.results.filter(r => !r.pass)
    // Impact-based bug fixes: no approval round when nothing else depends on what changes.
    const lightFix = classification.taskType === 'fix' && impact.consumers.length === 0

    if ((failing.length && !lightFix) || (sync.questionsAdded || []).length) {
      log(`waiting for answers/approval: ${failing.map(f => `${f.module} (${f.reason})`).join('; ') || 'doc/code conflicts from manual edits'}`)
      await agent(
        `Run: cd "${AGENTS_DIR}"; node shared/lib/db-cli.js update-session-status "${sessionId}" "awaiting-answers"\nReturn "done".`,
        { label: 'session-awaiting', model: 'haiku' }
      )
      return {
        sessionId,
        status: 'awaiting-answers',
        targets,
        blocking: failing,
        syncConflicts: sync.questionsAdded || [],
        chainReaction: impact.chainReaction,
        consumers: impact.consumers,
        questionsAdded: impact.questionsAdded,
        next: `Ask the user the open questions (${CLI} questions "${projectPath}" <module>), record answers with sysdocs answer/defer, approve each target with sysdocs approve, then re-run this task.`,
      }
    }

    docs = { targets, impact }
    domainTask =
      `${taskText}\n\n---\nSYSTEM DOCS BRIEFING (the project's source of truth in ${DOCS}; follow its decisions and do not break ` +
      `the listed consumers; if a consumer must change, change it in the same session):\n${impact.briefing}`
  } else {
    log('No docs/system in this project: running without System Docs')
  }
}

let requirementsOutput = null
let databaseOutput = null
let backendOutput  = null
let frontendOutput = null
let testingOutput  = null
let callsOutput    = null
let ponytailOutput = null
let bridgeOutput   = null
let gitOutput      = null
let sreOutput      = null

// ─── Phase: Requirements ─────────────────────────────────────────────────────
// Spec-driven development: synthesize signals (task text, prior SRE feedback,
// logs/bug reports, user feedback) into user stories + a specification with
// explicit decisions, so no domain agent has to guess at unstated requirements.
phase('Requirements')
requirementsOutput = await workflow(
  { scriptPath: `${AGENTS_DIR}/.claude/workflows/requirements.js` },
  { agentsDir: AGENTS_DIR, sessionId, taskText: domainTask, projectPath, clarifications }
)
log(`requirements → ${requirementsOutput && requirementsOutput.status} (${requirementsOutput && requirementsOutput.userStories && requirementsOutput.userStories.length} stories, ${requirementsOutput && requirementsOutput.spec && requirementsOutput.spec.openQuestions && requirementsOutput.spec.openQuestions.length} open questions)`)

// ─── Phase: Database ─────────────────────────────────────────────────────────
if (classification.requiresDatabase) {
  phase('Database')
  databaseOutput = await workflow(
    { scriptPath: `${AGENTS_DIR}/.claude/workflows/database.js` },
    { agentsDir: AGENTS_DIR, sessionId, taskText: domainTask, projectPath, requirementsOutput, dbPreferences: clarifications.dbPreferences || null }
  )
  log(`database → ${databaseOutput && databaseOutput.status}`)
}

// ─── Phase: Backend ───────────────────────────────────────────────────────────
if (classification.requiresBackend) {
  phase('Backend')
  backendOutput = await workflow(
    { scriptPath: `${AGENTS_DIR}/.claude/workflows/backend.js` },
    { agentsDir: AGENTS_DIR, sessionId, taskText: domainTask, projectPath, requirementsOutput, databaseOutput, archPreferences: clarifications.archPreferences || null }
  )
  log(`backend → ${backendOutput && backendOutput.status}`)
}

// ─── Phase: Frontend + Testing + Calls (parallel) ────────────────────────────
phase('Frontend + Testing + Calls')
{
  const parallelTasks = []

  // Frontend-only tasks (no backend change) still need the frontend agent; it copes with backendOutput = null.
  if (classification.requiresFrontend) {
    parallelTasks.push(() => workflow(
      { scriptPath: `${AGENTS_DIR}/.claude/workflows/frontend.js` },
      { agentsDir: AGENTS_DIR, sessionId, taskText: domainTask, projectPath, requirementsOutput, backendOutput, designPreferences: clarifications.designPreferences || null }
    ))
  }

  if (backendOutput) {
    parallelTasks.push(() => workflow(
      { scriptPath: `${AGENTS_DIR}/.claude/workflows/testing.js` },
      { agentsDir: AGENTS_DIR, sessionId, taskText: domainTask, projectPath, requirementsOutput, backendOutput }
    ))
  }

  if (classification.requiresCalls) {
    parallelTasks.push(() => workflow(
      { scriptPath: `${AGENTS_DIR}/.claude/workflows/calls.js` },
      { agentsDir: AGENTS_DIR, sessionId, taskText: domainTask, projectPath, requirementsOutput, backendOutput, databaseOutput, callPreferences: clarifications.callPreferences || null }
    ))
  }

  if (parallelTasks.length > 0) {
    const results = await parallel(parallelTasks)
    let idx = 0
    if (classification.requiresFrontend)                  { frontendOutput = results[idx++] }
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
      taskText: domainTask,
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

// ─── Phase: Docs Update ──────────────────────────────────────────────────────
let docsUpdate = null
if (docs) {
  phase('Docs Update')
  const changedFiles = [
    ...((backendOutput && backendOutput.filesChanged) || []),
    ...((frontendOutput && frontendOutput.filesChanged) || []),
    ...((callsOutput && callsOutput.filesChanged) || []),
    ...((databaseOutput && databaseOutput.migrationFile) ? [databaseOutput.migrationFile] : []),
  ]
  docsUpdate = await workflow(SYSDOCS, { mode: 'update', projectPath, agentsDir: AGENTS_DIR, sessionId, modules: docs.targets, taskText, changedFiles })
  log(`docs updated for ${(docsUpdate && docsUpdate.modules || []).join(', ')}`)
}

// ─── Phase: Git ───────────────────────────────────────────────────────────────
phase('Git')
const otherOwners = (docs && docs.impact.otherOwners) || []
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
    extraFiles: docs ? ['docs/system'] : [],
    commitNotes: otherOwners.length
      ? `Affects other owners:\n${otherOwners.map(o => `- ${o.owner} (${o.module}): ${o.how}`).join('\n')}`
      : '',
  }
)
log(`git → ${gitOutput && gitOutput.status} branch=${gitOutput && gitOutput.branch}`)

// Docs now match the committed code: record that commit as each module's sync
// point, in a follow-up docs-only commit so the sync point itself never drifts.
if (docs && gitOutput && gitOutput.status === 'completed') {
  await agent(
    docs.targets.map(t => `${CLI} synced "${projectPath}" ${t}`).join('\n') + `\n` +
    `${CLI} index "${projectPath}"\n` +
    `git -C "${projectPath}" add docs/system\n` +
    `git -C "${projectPath}" commit -m "docs(system): mark ${docs.targets.join(', ').slice(0, 30)} synced"\n\n` +
    `Run the commands above in order (the commit may report nothing to commit; that is fine). Return "done".`,
    { label: 'docs-synced', model: 'haiku' }
  )
}

// ─── Phase: SRE ───────────────────────────────────────────────────────────────
// Operate phase: health checks, log/root-cause diagnostics, IaC review, and
// outcome metrics (system health, coverage, violations — never lines of code).
// Advisory — never blocks. Its feedback is read by requirements next session,
// closing the lifecycle loop.
phase('SRE')
sreOutput = await workflow(
  { scriptPath: `${AGENTS_DIR}/.claude/workflows/sre.js` },
  {
    agentsDir: AGENTS_DIR,
    sessionId,
    taskText,
    projectPath,
    backendOutput,
    frontendOutput,
    databaseOutput,
    testingOutput,
    callsOutput,
    ponytailOutput,
    bridgeOutput,
    gitOutput,
  }
)
log(`sre → ${sreOutput && sreOutput.status} (${sreOutput && sreOutput.diagnostics && sreOutput.diagnostics.length} diagnostics, ${sreOutput && sreOutput.feedback && sreOutput.feedback.length} feedback items)`)

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
  `- Domains: ${['requirements', 'database', 'backend', 'frontend', 'testing', 'calls', 'ponytail', 'mcpbridge', 'gitdevops', 'sre']
    .filter((_, i) => [requirementsOutput, databaseOutput, backendOutput, frontendOutput, testingOutput, callsOutput, ponytailOutput, bridgeOutput, gitOutput, sreOutput][i])
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
    requirementsOutput && 'requirements',
    databaseOutput && 'database',
    backendOutput  && 'backend',
    frontendOutput && 'frontend',
    testingOutput  && 'testing',
    callsOutput    && 'calls',
    ponytailOutput && 'ponytail',
    bridgeOutput   && 'mcpbridge',
    gitOutput      && 'gitdevops',
    sreOutput      && 'sre',
  ].filter(Boolean),
  branch:          gitOutput && gitOutput.branch,
  commitHash:      gitOutput && gitOutput.commitHash,
  ponytail:        ponytailOutput && ponytailOutput.metrics,
  spec:            requirementsOutput && requirementsOutput.spec,
  openQuestions:   (requirementsOutput && requirementsOutput.spec && requirementsOutput.spec.openQuestions) || [],
  outcomeMetrics:  sreOutput && sreOutput.outcomeMetrics,
  sreFeedback:     (sreOutput && sreOutput.feedback) || [],
  contractsPassed: bridgePassed,
  systemDocs:      docs ? { targets: docs.targets, consumers: docs.impact.consumers, chainReaction: docs.impact.chainReaction, otherOwners, updated: docsUpdate && docsUpdate.modules } : null,
  securityPassed:  gitOutput && !(gitOutput.blockedBy && gitOutput.blockedBy.length),
}
