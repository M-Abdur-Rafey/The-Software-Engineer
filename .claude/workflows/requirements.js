export const meta = {
  name: 'requirements',
  description: 'Requirements agent — synthesizes signals into user stories and a spec that every downstream domain agent follows',
  phases: [
    { title: 'Gather Signals', detail: 'Task text, prior SRE feedback, logs/bug reports, onboarding context' },
    { title: 'Draft Spec', detail: 'User stories + specification + per-domain task breakdown' },
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

// Bookkeeping is returned as data (persistOps) and run by shared/lib/persist.js
// (design/agent-consolidation.md): orchestrate defers it to the skill; a direct run uses one agent.
async function flushPersist(ops) {
  if (!ops.length || (args && args.deferPersist)) return
  const opsFile = `${AGENTS_DIR}/agents/orchestrator/vault/sessions/${sessionId}.requirements.persist.json`
  await agent(
    `This is the software-engineer pipeline's own bookkeeping step for the session the user started: it records the ` +
    `session's results (decisions, vault notes, session status) in the pipeline's knowledge base under ${AGENTS_DIR}/agents. ` +
    `Every pipeline run ends with it. Write this JSON array exactly, with the Write tool, to ${opsFile}:\n${JSON.stringify(ops)}\n\n` +
    `Then run: node "${AGENTS_DIR}/shared/lib/persist.js" "${opsFile}" and return its output.`,
    { label: 'persist', model: 'haiku', effort: 'low' }
  )
}

const specFile = `${AGENTS_DIR}/agents/requirements/vault/specs/${sessionId}.md`
const list = (items) => (items && items.length ? items.map(x => `- ${x}`) : ['- none'])
const spec = draft.spec || {}
// Rendered here instead of by an agent: the layout follows vault/specs/spec-template.md.
const specMarkdown = [
  `# Spec: session ${sessionId}`,
  '',
  '## Summary', '', spec.summary || '', '',
  '## In scope', '', ...list(spec.inScope), '',
  '## Out of scope', '', ...list(spec.outOfScope), '',
  '## Decisions', '', '| Topic | Decision | Rationale |', '|---|---|---|',
  ...(spec.decisions || []).map(d => `| ${d.topic || ''} | ${String(d.decision || '').replace(/\|/g, '/')} | ${String(d.rationale || '').replace(/\|/g, '/')} |`), '',
  '## Open questions', '', ...list(spec.openQuestions), '',
  '## User stories', '',
  ...draft.userStories.flatMap(u => [
    `### ${u.id || ''} (${u.priority || 'should'})`,
    `As ${u.asA}, I want ${u.iWant}, so that ${u.soThat}.`, '',
    ...(u.acceptanceCriteria || []).map(c => `- ${c}`), '',
  ]),
  '## Tasks', '',
  ...draft.tasks.map(t => `- [${t.domain}] ${t.title}${t.storyId ? ` (${t.storyId})` : ''}: ${t.description || ''}`),
  '',
].join('\n')

const persistOps = [
  { write: `agents/requirements/vault/specs/${sessionId}.md`, content: specMarkdown },
  ...(spec.decisions || []).slice(0, 10).map(d => ({ db: ['--as', 'requirements', 'save-decision', 'requirements', sessionId, 'spec', `${d.topic}: ${d.decision}`, d.rationale || ''] })),
  { db: ['--as', 'requirements', 'log-session-event', 'requirements', sessionId, 'complete', 'completed', `${draft.userStories.length} stories, ${draft.tasks.length} tasks`] },
]
await flushPersist(persistOps)

return {
  sessionId,
  agentName: 'requirements',
  persistOps,
  status: 'completed',
  signalsAnalyzed: signals.signalsAnalyzed,
  rootCauses: signals.rootCauses,
  userStories: draft.userStories,
  spec: Object.assign({}, draft.spec, { specFile }),
  tasks: draft.tasks,
  errors: [],
}
