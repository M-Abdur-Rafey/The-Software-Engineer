export const meta = {
  name: 'gitdevops',
  description: 'Git/DevOps agent — security scan, branch creation, conventional commit',
  phases: [
    { title: 'Security Scan', detail: 'Run 10-point scan on staged changes' },
    { title: 'Branch + Commit', detail: 'Create branch, write commit, verify no sensitive files' },
  ],
}

const AGENTS_DIR    = (args && args.agentsDir) || 'C:/Users/Hp/Desktop/Ideas/Agents'
const sessionId     = (args && args.sessionId)    || 'no-session'
const taskText      = (args && args.taskText)     || ''
const projectPath   = (args && args.projectPath)  || ''
const taskType      = (args && args.taskType)     || 'feat'
const taskSlug      = (args && args.taskSlug)     || 'task'
const backendOutput = (args && args.backendOutput) || null
const bridgeOutput  = (args && args.bridgeOutput) || null

const filesChanged = [
  ...((backendOutput  && backendOutput.filesChanged)  || []),
  ...((args && args.frontendOutput  && args.frontendOutput.filesChanged)  || []),
  ...((args && args.databaseOutput  && args.databaseOutput.migrationFile ? [args.databaseOutput.migrationFile] : [])),
  ...((args && args.extraFiles) || []),   // e.g. docs/system when System Docs updated module docs
]
const commitNotes = (args && args.commitNotes) || ''

// Bookkeeping is returned as data (persistOps) and run by shared/lib/persist.js
// (design/agent-consolidation.md): orchestrate defers it to the skill; a direct run uses one agent.
async function flushPersist(ops) {
  if (!ops.length || (args && args.deferPersist)) return
  const opsFile = `${AGENTS_DIR}/agents/orchestrator/vault/sessions/${sessionId}.gitdevops.persist.json`
  await agent(
    `Write this JSON array exactly, with the Write tool, to ${opsFile}:\n${JSON.stringify(ops)}\n\n` +
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

// ─── Phase: Security Scan ─────────────────────────────────────────────────────
phase('Security Scan')

const scan = await agent(
  `You are running the security scan for the Git/DevOps Agent.\n\n` +
  `Target project: ${projectPath}\n` +
  `Files changed this session: ${JSON.stringify(filesChanged)}\n\n` +
  `Security checklist: read ${AGENTS_DIR}/agents/gitdevops/vault/security-scans/checklist.md (if missing: ${AGENTS_DIR}/shared/standards/security-rules.md)\n\n` +
  `Run these checks against the staged changes in ${projectPath}.\n` +
  `For each check, run the appropriate git grep or file search command.\n\n` +
  `Checks (in order):\n` +
  `1. [blocking] No .env files staged — git diff --staged --name-only | grep -E "\\.env"\n` +
  `2. [blocking] No hardcoded secrets — git diff --staged | grep -iE "(API_KEY|SECRET|PASSWORD|PRIVATE_KEY)=.+"\n` +
  `3. [blocking] No raw bearer tokens — git diff --staged | grep -E "Bearer [A-Za-z0-9._-]{20,}"\n` +
  `4. [blocking] No localhost in non-test files — grep in staged non-test files for localhost|127\\.0\\.0\\.1\n` +
  `5. [blocking] No auth token from localStorage — grep staged files for localStorage.*[Tt]oken\n` +
  `6. [blocking] No DB credentials in .js/.json — grep staged files for (DB_PASSWORD|DATABASE_URL.*password)\n` +
  `7. [blocking] CSP headers exist if frontend files changed — check backend middleware for CSP\n` +
  `8. [warning] No console.log in non-test production files\n` +
  `9. [warning] No commented-out credential strings\n` +
  `10. [info] New files have README or JSDoc header\n\n` +
  `Return JSON: { securityFlags: [{check:string, passed:boolean, severity:"blocking"|"warning"|"info", detail:string}], blockingFailures: [string] }`,
  {
    label: 'security-scan',
    phase: 'Security Scan',
    schema: {
      type: 'object',
      required: ['securityFlags', 'blockingFailures'],
      properties: {
        securityFlags:   { type: 'array' },
        blockingFailures: { type: 'array', items: { type: 'string' } },
      },
    },
  }
)

log(`Security: ${scan.securityFlags.length} checks, ${scan.blockingFailures.length} blocking failure(s)`)

if (scan.blockingFailures.length > 0) {
  log(`BLOCKED: ${scan.blockingFailures.join(', ')}`)

  await agent(
    `Write security scan failure report to: ${AGENTS_DIR}/agents/gitdevops/vault/security-scans/scan-results/${sessionId}.md\n\n` +
    `# Security Scan — FAILED — Session ${sessionId}\n\n` +
    `**Task:** ${taskText}\n` +
    `**Branch would have been:** ${branchName}\n\n` +
    `## Blocking failures\n` +
    scan.blockingFailures.map(f => `- ${f}`).join('\n') + '\n\n' +
    `## All checks\n` +
    scan.securityFlags.map(f => `- [${f.passed ? 'PASS' : 'FAIL'}] ${f.check} (${f.severity}): ${f.detail || ''}`).join('\n') +
    `\n\nReturn "done".`,
    { label: 'write-scan-fail-report' }
  )

  return {
    sessionId,
    agentName:    'gitdevops',
    status:       'failed',
    branch:       branchName,
    commitHash:   null,
    commitMessage: '',
    filesCommitted: [],
    securityFlags: scan.securityFlags,
    blockedBy:    scan.blockingFailures,
    errors:       scan.blockingFailures,
  }
}

// ─── Phase: Branch + Commit ───────────────────────────────────────────────────
phase('Branch + Commit')

const commit = await agent(
  `You are creating a git branch and commit for the Git/DevOps Agent.\n\n` +
  `Project: ${projectPath}\n` +
  `Branch name: ${branchName}\n` +
  `Files changed: ${JSON.stringify(filesChanged)}\n` +
  `Task: "${taskText}"\n` +
  `Commit format: read ${AGENTS_DIR}/shared/standards/commit-format.md and ${AGENTS_DIR}/agents/gitdevops/vault/commit-format/examples.md (if missing: type(scope): subject, blank line, body)\n\n` +
  `IMPORTANT rules:\n` +
  `- NEVER push to main or master — use branch ${branchName}\n` +
  `- Subject: max 50 chars, imperative, no trailing period\n` +
  `- Type: ${taskType}, scope: feature name (from task)\n` +
  (commitNotes ? `- Append this section verbatim to the commit body:\n${commitNotes}\n` : '') +
  `\nSteps:\n` +
  `1. cd ${projectPath}\n` +
  `2. git checkout -b ${branchName}  (or git switch -c ${branchName})\n` +
  `3. git add <the changed files only — not all files, only the ones listed>\n` +
  `4. Write a commit message following the format\n` +
  `5. git commit -m "<message>"\n` +
  `6. Report the commit hash: git rev-parse HEAD\n\n` +
  `Return JSON: { branchCreated: boolean, commitHash: string, commitMessage: string, filesCommitted: [string] }`,
  {
    label: 'branch-and-commit',
    phase: 'Branch + Commit',
    schema: {
      type: 'object',
      required: ['branchCreated', 'commitHash', 'commitMessage', 'filesCommitted'],
      properties: {
        branchCreated:  { type: 'boolean' },
        commitHash:     { type: 'string' },
        commitMessage:  { type: 'string' },
        filesCommitted: { type: 'array', items: { type: 'string' } },
      },
    },
  }
)

log(`Branch: ${branchName} | Commit: ${commit.commitHash}`)

const persistOps = [
  { write: `agents/gitdevops/vault/security-scans/scan-results/${sessionId}.md`,
    content: `# Security Scan — PASSED — Session ${sessionId}\n\n**Branch:** ${branchName}\n**Commit:** ${commit.commitHash}\n\n` +
      scan.securityFlags.map(f => `- [${f.passed ? 'PASS' : 'FAIL'}] ${f.check}: ${f.detail || 'ok'}`).join('\n') + '\n' },
  { db: ['log-agent-run', sessionId, 'gitdevops', 'completed', JSON.stringify({ branch: branchName, commit: commit.commitHash })] },
]
await flushPersist(persistOps)

return {
  sessionId,
  agentName:    'gitdevops',
  persistOps,
  status:       'completed',
  branch:       branchName,
  commitHash:   commit.commitHash,
  commitMessage: commit.commitMessage,
  filesCommitted: commit.filesCommitted,
  securityFlags: scan.securityFlags,
  blockedBy:    [],
  errors:       [],
}
