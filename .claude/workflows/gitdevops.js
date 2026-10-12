export const meta = {
  name: 'gitdevops',
  description: 'Git/DevOps agent — security scan, branch creation, conventional commit',
  phases: [
    { title: 'Load Context', detail: 'Read security checklist and commit format rules' },
    { title: 'Security Scan', detail: 'Run 10-point scan on staged changes' },
    { title: 'Branch + Commit', detail: 'Create branch, write commit, verify no sensitive files' },
    { title: 'Persist', detail: 'Save scan results and session log' },
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

// ─── Phase: Load Context ──────────────────────────────────────────────────────
phase('Load Context')

const context = await agent(
  `Load context for the Git/DevOps Agent (session: ${sessionId}).\n\n` +
  `Read these files:\n` +
  `1. ${AGENTS_DIR}/agents/gitdevops/vault/security-scans/checklist.md\n` +
  `2. ${AGENTS_DIR}/agents/gitdevops/vault/commit-format/examples.md\n` +
  `3. ${AGENTS_DIR}/shared/standards/commit-format.md\n\n` +
  `Also verify that the bridge validation passed. Bridge output:\n${JSON.stringify(bridgeOutput && bridgeOutput.contractValidation)}\n\n` +
  `If contractValidation.passed is false, return: { abort: true, reason: "Bridge validation failed" }\n\n` +
  `Otherwise return: { checklist: "<text of checklist.md>", commitFormat: "<text of commit-format.md>", abort: false }`,
  {
    label: 'load-context',
    schema: {
      type: 'object',
      required: ['abort'],
      properties: {
        abort:        { type: 'boolean' },
        reason:       { type: 'string' },
        checklist:    { type: 'string' },
        commitFormat: { type: 'string' },
      },
    },
  }
)

if (context.abort) {
  log(`ABORTED: ${context.reason}`)
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
    errors:       [context.reason || 'Bridge validation failed'],
  }
}

const branchName = `${taskType}/${taskSlug.slice(0, 30)}-${sessionId.slice(0, 8)}`

// ─── Phase: Security Scan ─────────────────────────────────────────────────────
phase('Security Scan')

const scan = await agent(
  `You are running the security scan for the Git/DevOps Agent.\n\n` +
  `Target project: ${projectPath}\n` +
  `Files changed this session: ${JSON.stringify(filesChanged)}\n\n` +
  `Security checklist:\n${context.checklist || 'See shared/standards/security-rules.md'}\n\n` +
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
  `Commit format:\n${context.commitFormat || 'type(scope): subject\\n\\nbody'}\n\n` +
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

// ─── Phase: Persist ───────────────────────────────────────────────────────────
phase('Persist')

await agent(
  `Persist git/devops state for session ${sessionId}.\n\n` +
  `1. Write scan results:\n` +
  `Write to: ${AGENTS_DIR}/agents/gitdevops/vault/security-scans/scan-results/${sessionId}.md\n` +
  `Content:\n# Security Scan — PASSED — Session ${sessionId}\n\n**Branch:** ${branchName}\n**Commit:** ${commit.commitHash}\n\n` +
  scan.securityFlags.map(f => `- [${f.passed?'PASS':'FAIL'}] ${f.check}: ${f.detail||'ok'}`).join('\n') +
  `\n\n2. Log agent run:\n` +
  `cd "${AGENTS_DIR}" && node shared/lib/db-cli.js log-agent-run "${sessionId}" "gitdevops" "completed" '{"branch":"${branchName}","commit":"${commit.commitHash}"}'\n\n` +
  `Return "done".`,
  { label: 'persist-state' }
)

return {
  sessionId,
  agentName:    'gitdevops',
  status:       'completed',
  branch:       branchName,
  commitHash:   commit.commitHash,
  commitMessage: commit.commitMessage,
  filesCommitted: commit.filesCommitted,
  securityFlags: scan.securityFlags,
  blockedBy:    [],
  errors:       [],
}
