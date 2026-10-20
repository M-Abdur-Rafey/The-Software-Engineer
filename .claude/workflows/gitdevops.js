export const meta = {
  name: 'gitdevops',
  description: 'Git/DevOps agent — security scan, branch creation, conventional commit',
  phases: [
    { title: 'Scan + Commit', detail: '10-point scan script (shared/lib/scan.js), then branch + commit, or explain what blocks it' },
  ],
}

const AGENTS_DIR    = (args && args.agentsDir) || 'C:/Users/Hp/Desktop/Ideas/Agents'
const sessionId     = (args && args.sessionId)    || 'no-session'
const taskText      = (args && args.taskText)     || ''
const projectPath   = (args && args.projectPath)  || ''

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
const taskType      = (args && args.taskType)     || 'feat'
const taskSlug      = (args && args.taskSlug)     || 'task'
const backendOutput = (args && args.backendOutput) || null
const bridgeOutput  = (args && args.bridgeOutput) || null

const filesChanged = uniquePaths([
  ...((backendOutput  && backendOutput.filesChanged)  || []),
  ...((args && args.frontendOutput  && args.frontendOutput.filesChanged)  || []),
  ...((args && args.databaseOutput  && args.databaseOutput.migrationFile ? [args.databaseOutput.migrationFile] : [])),
  ...((args && args.extraFiles) || []),   // e.g. docs/system when System Docs updated module docs
])
const commitNotes = (args && args.commitNotes) || ''

// Bookkeeping is returned as data (persistOps) and run by shared/lib/persist.js
// (design/agent-consolidation.md): orchestrate defers it to the skill; a direct run uses one agent.
async function flushPersist(ops) {
  if (!ops.length || (args && args.deferPersist)) return
  const opsFile = `${AGENTS_DIR}/agents/orchestrator/vault/sessions/${sessionId}.gitdevops.persist.json`
  await agent(
    `This is the software-engineer pipeline's own bookkeeping step for the session the user started: it records the ` +
    `session's results (decisions, vault notes, session status) in the pipeline's knowledge base under ${AGENTS_DIR}/agents. ` +
    `Every pipeline run ends with it. Write this JSON array exactly, with the Write tool, to ${opsFile}:\n${JSON.stringify(ops)}\n\n` +
    `Then run: node "${AGENTS_DIR}/shared/lib/persist.js" "${opsFile}" and return its output.`,
    { label: 'persist', model: 'haiku', effort: 'low' }
  )
}

// The bridge result is plain data: no agent needed to check it.
if (!(bridgeOutput && bridgeOutput.contractValidation && bridgeOutput.contractValidation.passed)) {
  log('ABORTED: Bridge validation failed')
  return {
    sessionId,
    agentName:    'gitdevops',
    status:       'failed',
    branch:       '',
    commitHash:   null,
    commitMessage: '',
    filesCommitted: [],
    securityFlags: [],
    blockedBy:    ['bridge_validation_failed'],
    errors:       ['Bridge validation failed'],
  }
}

const branchName = `${taskType}/${taskSlug.slice(0, 30)}-${sessionId.slice(0, 8)}`

// ─── Phase: Scan + Commit ─────────────────────────────────────────────────────
// The 10-point scan is a deterministic script (shared/lib/scan.js, no override); one agent
// runs it and then either commits or explains the blocking findings in plain language.
phase('Scan + Commit')

const quoted = filesChanged.map(f => `"${f}"`).join(' ')
const result = await agent(
  `You are the Git/DevOps Agent for the project at ${projectPath}.\n\n` +
  `1. Run the security scan: node "${AGENTS_DIR}/shared/lib/scan.js" "${projectPath}" ${quoted}\n` +
  `   It prints { passed, securityFlags, blockingFailures, notFound }. Return that object unchanged as "scan". Its result ` +
  `is final: never edit code to make it pass and never commit when it fails.\n` +
  `2. If passed is false: create no branch and no commit. Set committed=false and write "explanation": for each ` +
  `blocking failure, in plain language, what was found (file and line), why it blocks the commit, and how to fix it.\n` +
  `3. If passed is true: in ${projectPath}, run git switch -c ${branchName} (never commit on main or master), git add ` +
  `only these paths: ${quoted}, then commit. Commit format: read ${AGENTS_DIR}/shared/standards/commit-format.md and ` +
  `${AGENTS_DIR}/agents/gitdevops/vault/commit-format/examples.md (if missing: type(scope): subject, blank line, body). ` +
  `Type ${taskType}; scope from the task; subject max 50 chars, imperative, no trailing period.` +
  (commitNotes ? ` Append this section verbatim to the commit body:\n${commitNotes}\n` : '\n') +
  `   Task: "${taskText}"\n` +
  `   Set committed=true, branchCreated, commitHash (git rev-parse HEAD), commitMessage, filesCommitted.\n\n` +
  `Return { scan, committed, explanation?, branchCreated?, commitHash?, commitMessage?, filesCommitted? }.`,
  {
    label: 'scan-and-commit',
    phase: 'Scan + Commit',
    model: 'haiku',
    schema: {
      type: 'object',
      required: ['scan', 'committed'],
      properties: {
        scan: {
          type: 'object',
          required: ['passed', 'securityFlags', 'blockingFailures'],
          properties: {
            passed:           { type: 'boolean' },
            securityFlags:    { type: 'array' },
            blockingFailures: { type: 'array', items: { type: 'string' } },
            notFound:         { type: 'array', items: { type: 'string' } },
          },
        },
        committed:      { type: 'boolean' },
        explanation:    { type: 'string' },
        branchCreated:  { type: 'boolean' },
        commitHash:     { type: 'string' },
        commitMessage:  { type: 'string' },
        filesCommitted: { type: 'array', items: { type: 'string' } },
      },
    },
  }
)

const scan = result.scan
log(`Security: ${scan.securityFlags.length} checks, ${scan.blockingFailures.length} blocking failure(s)`)
const checks = scan.securityFlags.map(f => `- [${f.passed ? 'PASS' : 'FAIL'}] ${f.check} (${f.severity}): ${f.detail || 'ok'}`).join('\n')

if (!scan.passed || !result.committed) {
  log(`BLOCKED: ${scan.blockingFailures.join(', ') || 'commit not created'}`)
  const persistOps = [
    { write: `agents/gitdevops/vault/security-scans/scan-results/${sessionId}.md`,
      content: `# Security Scan — FAILED — Session ${sessionId}\n\n**Task:** ${taskText}\n**Branch would have been:** ${branchName}\n\n` +
        `## Blocking failures\n${scan.blockingFailures.map(f => `- ${f}`).join('\n') || '- none (commit not created)'}\n\n` +
        `## What to do\n${result.explanation || ''}\n\n## All checks\n${checks}\n` },
    { db: ['log-agent-run', sessionId, 'gitdevops', 'failed', JSON.stringify({ branch: branchName, blockedBy: scan.blockingFailures })] },
  ]
  await flushPersist(persistOps)
  return {
    sessionId,
    agentName:    'gitdevops',
    persistOps,
    status:       'failed',
    branch:       branchName,
    commitHash:   null,
    commitMessage: '',
    filesCommitted: [],
    securityFlags: scan.securityFlags,
    blockedBy:    scan.blockingFailures,
    explanation:  result.explanation || '',
    errors:       scan.blockingFailures.length ? scan.blockingFailures : ['commit not created'],
  }
}

log(`Branch: ${branchName} | Commit: ${result.commitHash}`)

const persistOps = [
  { write: `agents/gitdevops/vault/security-scans/scan-results/${sessionId}.md`,
    content: `# Security Scan — PASSED — Session ${sessionId}\n\n**Branch:** ${branchName}\n**Commit:** ${result.commitHash}\n\n${checks}\n` },
  { db: ['log-agent-run', sessionId, 'gitdevops', 'completed', JSON.stringify({ branch: branchName, commit: result.commitHash })] },
]
await flushPersist(persistOps)

return {
  sessionId,
  agentName:    'gitdevops',
  persistOps,
  status:       'completed',
  branch:       branchName,
  commitHash:   result.commitHash,
  commitMessage: result.commitMessage,
  filesCommitted: result.filesCommitted || [],
  securityFlags: scan.securityFlags,
  blockedBy:    [],
  errors:       [],
}
