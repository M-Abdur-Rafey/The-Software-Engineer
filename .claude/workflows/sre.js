export const meta = {
  name: 'sre',
  description: 'SRE agent — operate phase: health checks, log/root-cause diagnostics, IaC review, outcome metrics. Advisory — never blocks.',
  phases: [
    { title: 'Collect', detail: 'Session outputs + project logs and deployment artifacts' },
    { title: 'Diagnose', detail: 'Root-cause analysis, health checks, outcome metrics' },
    { title: 'Feedback', detail: 'Persist diagnostics + feedback for the next requirements cycle' },
  ],
}

// args: { sessionId, taskText, projectPath, agentsDir, backendOutput?, frontendOutput?,
//         databaseOutput?, testingOutput?, callsOutput?, ponytailOutput?, bridgeOutput?, gitOutput? }
const AGENTS_DIR     = (args && args.agentsDir)      || 'C:/Users/Hp/Desktop/Ideas/Agents'
const sessionId      = (args && args.sessionId)      || 'no-session'
const taskText       = (args && args.taskText)       || ''
const projectPath    = (args && args.projectPath)    || ''
const backendOutput  = (args && args.backendOutput)  || null
const frontendOutput = (args && args.frontendOutput) || null
const databaseOutput = (args && args.databaseOutput) || null
const testingOutput  = (args && args.testingOutput)  || null
const callsOutput    = (args && args.callsOutput)    || null
const ponytailOutput = (args && args.ponytailOutput) || null
const bridgeOutput   = (args && args.bridgeOutput)   || null
const gitOutput      = (args && args.gitOutput)      || null

// Outcome metrics — computed deterministically from contracts, not by a model.
// Measure outcomes, never lines of code.
const filesChanged = []
  .concat((backendOutput  && backendOutput.filesChanged)  || [])
  .concat((frontendOutput && frontendOutput.filesChanged) || [])
  .concat((callsOutput    && callsOutput.filesChanged)    || [])

const outcomeMetrics = {
  filesChangedCount:      filesChanged.length,
  routesAdded:            (backendOutput && backendOutput.routes && backendOutput.routes.length) || 0,
  testCoveragePercent:    (testingOutput && testingOutput.coverage && testingOutput.coverage.percentCovered) || 0,
  contractViolations:     (bridgeOutput && bridgeOutput.contractValidation && bridgeOutput.contractValidation.violations && bridgeOutput.contractValidation.violations.length) || 0,
  securityBlocks:         (gitOutput && gitOutput.blockedBy && gitOutput.blockedBy.length) || 0,
  simplificationsApplied: (ponytailOutput && ponytailOutput.metrics && ponytailOutput.metrics.simplificationsApplied) || 0,
}

// ─── Phase: Collect + Diagnose ───────────────────────────────────────────────
phase('Diagnose')

const diagnosis = await agent(
  `You are the SRE Agent (session: ${sessionId}) — the operate phase of the lifecycle.\n\n` +
  `First read: ${AGENTS_DIR}/agents/sre/CLAUDE.md, ` +
  `${AGENTS_DIR}/agents/sre/vault/runbooks/root-cause-analysis.md and ` +
  `${AGENTS_DIR}/agents/sre/vault/runbooks/iac-review.md\n\n` +
  `Task: "${taskText}"\nProject: "${projectPath}"\n\n` +
  `Session outcome metrics (already computed):\n${JSON.stringify(outcomeMetrics, null, 2)}\n\n` +
  `Session summary:\n` +
  `- git: ${JSON.stringify(gitOutput && { status: gitOutput.status, branch: gitOutput.branch, blockedBy: gitOutput.blockedBy })}\n` +
  `- bridge violations: ${JSON.stringify((bridgeOutput && bridgeOutput.contractValidation && bridgeOutput.contractValidation.violations) || [])}\n` +
  `- errors reported by domain agents: ${JSON.stringify([backendOutput, frontendOutput, databaseOutput, testingOutput, callsOutput].filter(Boolean).flatMap(o => o.errors || []))}\n\n` +
  `Do the following (READ-ONLY — you never modify code):\n` +
  `1. Health checks — in "${projectPath}", check what applies: dependency lockfile present, ` +
  `tests/collection generated, migrations present when schema changed, no obvious broken imports in changed files ` +
  `(changed files: ${JSON.stringify(filesChanged.slice(0, 40))}).\n` +
  `2. Diagnostics — scan project logs / recent stack traces if they exist (logs/, *.log). ` +
  `For each failure signal: symptom → rootCause → evidence → suggestedFix → severity (critical|major|minor). ` +
  `Diagnose, don't describe.\n` +
  `3. IaC review — if the project has Dockerfile/compose/k8s/Ansible/CI files, review them against the runbook and list them.\n` +
  `4. Feedback — for each finding, write a note addressed to the agent that should act on it next cycle ` +
  `(usually "requirements"; use the domain agent name for domain-specific debt).\n\n` +
  `Return JSON: { healthChecks: [{name, status: "pass"|"warn"|"fail", detail}], ` +
  `diagnostics: [{symptom, rootCause, evidence, suggestedFix, severity}], ` +
  `iacArtifacts: [{type: "dockerfile"|"compose"|"kubernetes"|"ansible"|"ci", path, description}], ` +
  `feedback: [{forAgent, note}] }`,
  {
    label: 'sre-diagnose',
    schema: {
      type: 'object',
      required: ['healthChecks', 'diagnostics', 'iacArtifacts', 'feedback'],
      properties: {
        healthChecks: { type: 'array', items: { type: 'object' } },
        diagnostics:  { type: 'array', items: { type: 'object' } },
        iacArtifacts: { type: 'array', items: { type: 'object' } },
        feedback:     { type: 'array', items: { type: 'object' } },
      },
    },
  }
)

log(`health: ${diagnosis.healthChecks.length} check(s) | diagnostics: ${diagnosis.diagnostics.length} | feedback: ${diagnosis.feedback.length}`)

// ─── Phase: Feedback ─────────────────────────────────────────────────────────
phase('Feedback')

await agent(
  `Persist the SRE session output for session ${sessionId}.\n\n` +
  `1. Write the diagnostics report (Markdown: health checks table, each diagnostic with ` +
  `symptom/root cause/evidence/fix/severity, outcome metrics table, feedback list) to:\n` +
  `${AGENTS_DIR}/agents/sre/vault/diagnostics/${sessionId}.md\n\n` +
  `Data:\n${JSON.stringify({ outcomeMetrics, ...diagnosis }, null, 2)}\n\n` +
  `2. Save each feedback item as a decision so the requirements agent finds it next cycle:\n` +
  `cd "${AGENTS_DIR}"; node shared/lib/db-cli.js --as sre save-decision sre "${sessionId}" "feedback" "<forAgent>: <note>" "session ${sessionId}"\n` +
  `(one command per feedback item, max 10)\n\n` +
  `3. Log the session event:\n` +
  `cd "${AGENTS_DIR}"; node shared/lib/db-cli.js --as sre log-session-event sre "${sessionId}" "complete" "completed" "${diagnosis.diagnostics.length} diagnostics, ${diagnosis.feedback.length} feedback items"\n\n` +
  `Return "done".`,
  { label: 'persist-diagnostics', model: 'haiku' }
)

return {
  sessionId,
  agentName: 'sre',
  status: 'completed',
  healthChecks: diagnosis.healthChecks,
  diagnostics: diagnosis.diagnostics,
  outcomeMetrics,
  iacArtifacts: diagnosis.iacArtifacts,
  feedback: diagnosis.feedback,
  errors: [],
}
