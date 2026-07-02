export const meta = {
  name: 'requirements',
  description: 'Requirements agent — synthesizes signals into user stories and a spec that every downstream domain agent follows',
  phases: [
    { title: 'Gather Signals', detail: 'Task text, prior SRE feedback, logs/bug reports, onboarding context' },
    { title: 'Draft Spec', detail: 'User stories + specification + per-domain task breakdown' },
    { title: 'Persist', detail: 'Write spec + stories to the vault, log decisions' },
  ],
}

// args: { sessionId, taskText, projectPath, agentsDir, clarifications? }
const AGENTS_DIR  = (args && args.agentsDir)   || 'C:/Users/Hp/Desktop/Ideas/Agents'
const sessionId   = (args && args.sessionId)   || 'no-session'
const taskText    = (args && args.taskText)    || ''
const projectPath = (args && args.projectPath) || ''

// ─── Phase: Gather Signals ───────────────────────────────────────────────────
phase('Gather Signals')

const signals = await agent(
  `You are the signal-analyst sub-agent of the Requirements Agent (session: ${sessionId}).\n\n` +
  `First read your instructions: ${AGENTS_DIR}/agents/requirements/CLAUDE.md and\n` +
  `${AGENTS_DIR}/agents/requirements/vault/signals/signal-synthesis.md\n\n` +
  `Task text:\n"${taskText}"\n\n` +
  `Gather every available signal:\n` +
  `1. SRE feedback from the previous cycle — read recent files in ${AGENTS_DIR}/agents/sre/vault/diagnostics/ ` +
  `and run: cd "${AGENTS_DIR}"; node shared/lib/db-cli.js --as requirements get-decisions sre feedback 5\n` +
  `2. Project signals — look in "${projectPath}" for logs, issue/bug-report exports, user-feedback files ` +
  `(e.g. logs/, *.log, ISSUES.md, feedback/). Read only what exists; do not invent sources.\n` +
  `3. Onboarding context — run: cd "${AGENTS_DIR}"; node shared/lib/db-cli.js --as requirements get-decisions requirements project-context 5\n\n` +
  `For symptoms found in logs/bug reports, trace symptom → root cause → evidence.\n\n` +
  `Return JSON: { signalsAnalyzed: [{source: "task-text"|"logs"|"bug-reports"|"user-feedback"|"stakeholder-notes"|"sre-feedback"|"codebase", finding: string}], ` +
  `rootCauses: [{symptom, cause, evidence}] }`,
  {
    label: 'signal-analyst',
    schema: {
      type: 'object',
      required: ['signalsAnalyzed', 'rootCauses'],
      properties: {
        signalsAnalyzed: { type: 'array', items: { type: 'object' } },
        rootCauses:      { type: 'array', items: { type: 'object' } },
      },
    },
  }
)

log(`${signals.signalsAnalyzed.length} signal(s), ${signals.rootCauses.length} root cause(s)`)

// ─── Phase: Draft Spec ───────────────────────────────────────────────────────
phase('Draft Spec')

const draft = await agent(
  `You are the story-writer and spec-author sub-agents of the Requirements Agent (session: ${sessionId}).\n\n` +
  `Read the formats first:\n` +
  `- ${AGENTS_DIR}/agents/requirements/vault/user-stories/story-format.md\n` +
  `- ${AGENTS_DIR}/agents/requirements/vault/specs/spec-template.md\n\n` +
  `Task text:\n"${taskText}"\n\n` +
  `Signals gathered:\n${JSON.stringify(signals, null, 2)}\n\n` +
  `Produce spec-driven requirements:\n` +
  `1. User stories — small and testable, each with Given/When/Then acceptance criteria ` +
  `(the testing agent generates test data directly from these). Split anything needing more than ~5 criteria.\n` +
  `2. A specification — summary, inScope, outOfScope, an explicit Decisions table for every ` +
  `choice a domain agent would otherwise guess (auth scheme, payments, ID types, soft deletes...), ` +
  `and openQuestions for anything undecidable from the signals. Never silently guess.\n` +
  `3. A per-domain task breakdown — small well-defined tasks mapped to database|backend|frontend|testing|calls, ` +
  `each linked to a story.\n\n` +
  `Return JSON: { userStories: [{id, asA, iWant, soThat, acceptanceCriteria: [string], priority: "must"|"should"|"could"}], ` +
  `spec: {summary, inScope: [string], outOfScope: [string], decisions: [{topic, decision, rationale}], openQuestions: [string]}, ` +
  `tasks: [{id, title, domain, storyId, description}] }`,
  {
    label: 'spec-author',
    schema: {
      type: 'object',
      required: ['userStories', 'spec', 'tasks'],
      properties: {
        userStories: { type: 'array', items: { type: 'object' } },
        spec:        { type: 'object' },
        tasks:       { type: 'array', items: { type: 'object' } },
      },
    },
  }
)

log(`${draft.userStories.length} stor(ies), ${draft.tasks.length} task(s), ${(draft.spec.openQuestions || []).length} open question(s)`)

// ─── Phase: Persist ──────────────────────────────────────────────────────────
phase('Persist')

const specFile = `${AGENTS_DIR}/agents/requirements/vault/specs/${sessionId}.md`

await agent(
  `Persist the requirements output for session ${sessionId}.\n\n` +
  `1. Write the full specification (Markdown, following the spec template: summary, in scope, ` +
  `out of scope, decisions table, open questions, then every user story with its acceptance criteria) to:\n` +
  `${specFile}\n\n` +
  `Spec data:\n${JSON.stringify(draft, null, 2)}\n\n` +
  `2. Save each spec decision, e.g. for the first one:\n` +
  `cd "${AGENTS_DIR}"; node shared/lib/db-cli.js --as requirements save-decision requirements "${sessionId}" "spec" "<decision summary>" "<rationale>"\n` +
  `(repeat per decision, max 10)\n\n` +
  `3. Log the session event:\n` +
  `cd "${AGENTS_DIR}"; node shared/lib/db-cli.js --as requirements log-session-event requirements "${sessionId}" "complete" "completed" "${draft.userStories.length} stories, ${draft.tasks.length} tasks"\n\n` +
  `Return "done".`,
  { label: 'persist-spec', model: 'haiku' }
)

return {
  sessionId,
  agentName: 'requirements',
  status: 'completed',
  signalsAnalyzed: signals.signalsAnalyzed,
  rootCauses: signals.rootCauses,
  userStories: draft.userStories,
  spec: Object.assign({}, draft.spec, { specFile }),
  tasks: draft.tasks,
  errors: [],
}
