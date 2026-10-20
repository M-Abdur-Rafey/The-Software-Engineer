export const meta = {
  name: 'ponytail',
  description: 'Lazy-senior-dev refinement gate — reviews this session\'s generated code against the minimal-code decision ladder and applies safe simplifications before the bridge. The best code is the code you never wrote.',
  phases: [
    { title: 'Review', detail: 'Score each changed file for over-engineering against the ladder' },
    { title: 'Simplify', detail: 'Apply behavior-preserving simplifications (mode-gated)' },
  ],
}

// args: { agentsDir?, sessionId, taskText, projectPath, mode?,
//         backendOutput?, frontendOutput?, callsOutput?, databaseOutput? }
//
// Position in the pipeline: runs AFTER code generation (backend/frontend/calls)
// and BEFORE mcpbridge — so the bridge still validates contracts on whatever
// ponytail simplified. This agent is ADVISORY: it never blocks the pipeline.
// Vendored from the "ponytail" philosophy (github.com/DietrichGebert/ponytail, MIT).
const AGENTS_DIR     = (args && args.agentsDir) || 'C:/Users/Hp/Desktop/Ideas/Agents'
const sessionId      = (args && args.sessionId)      || 'no-session'
const taskText       = (args && args.taskText)       || ''
const projectPath    = (args && args.projectPath)    || ''
const mode           = (args && args.mode)           || 'full'   // lite | full | ultra
const backendOutput  = (args && args.backendOutput)  || null
const frontendOutput = (args && args.frontendOutput) || null
const callsOutput    = (args && args.callsOutput)    || null
const databaseOutput = (args && args.databaseOutput) || null

const filesChanged = [
  ...((backendOutput  && backendOutput.filesChanged)  || []),
  ...((frontendOutput && frontendOutput.filesChanged) || []),
  ...((callsOutput    && callsOutput.filesChanged)    || []),
  ...((databaseOutput && databaseOutput.migrationFile) ? [databaseOutput.migrationFile] : []),
]

// Nothing was generated this session — nothing to simplify.
if (filesChanged.length === 0) {
  log('No files changed this session — ponytail has nothing to review')
  return {
    sessionId,
    agentName:          'ponytail',
    status:             'skipped',
    mode,
    filesReviewed:      [],
    simplifications:    [],
    skippedSuggestions: [],
    metrics:            { filesReviewed: 0, simplificationsApplied: 0, estimatedLinesRemoved: 0 },
    errors:             [],
  }
}

// Bookkeeping is returned as data (persistOps) and run by shared/lib/persist.js
// (design/agent-consolidation.md): orchestrate defers it to the skill; a direct run uses one agent.
async function flushPersist(ops) {
  if (!ops.length || (args && args.deferPersist)) return
  const opsFile = `${AGENTS_DIR}/agents/orchestrator/vault/sessions/${sessionId}.ponytail.persist.json`
  await agent(
    `This is the software-engineer pipeline's own bookkeeping step for the session the user started: it records the ` +
    `session's results (decisions, vault notes, session status) in the pipeline's knowledge base under ${AGENTS_DIR}/agents. ` +
    `Every pipeline run ends with it. Write this JSON array exactly, with the Write tool, to ${opsFile}:\n${JSON.stringify(ops)}\n\n` +
    `Then run: node "${AGENTS_DIR}/shared/lib/persist.js" "${opsFile}" and return its output.`,
    { label: 'persist', model: 'haiku', effort: 'low' }
  )
}


// ─── Phase: Review ────────────────────────────────────────────────────────────
phase('Review')

const review = await agent(
  `You are the Ponytail Agent — the laziest senior dev in the room. The best code is the code never written.\n\n` +
  `Mode: ${mode.toUpperCase()} ` +
  `(lite = suggest only; full = enforce the ladder; ultra = YAGNI extremist, challenge the requirement itself).\n\n` +
  `Task that produced this code: "${taskText}"\n` +
  `Project: ${projectPath}\n` +
  `Files generated/changed this session (review ONLY these):\n${JSON.stringify(filesChanged, null, 2)}\n\n` +
  `Decision ladder to judge against: read ${AGENTS_DIR}/agents/ponytail/vault/philosophy/decision-ladder.md and modes.md (if missing: reuse > stdlib > native > installed dep > one-liner > minimal code)\n\n` +
  `NEVER flag what ${AGENTS_DIR}/agents/ponytail/vault/philosophy/never-simplify.md protects (if missing: input validation, error handling, security, accessibility, or explicitly requested features)\n\n` +
  `Read each changed file in ${projectPath} and judge it against the ladder. Look for:\n` +
  `- Speculative code / abstractions nobody asked for (YAGNI)\n` +
  `- Hand-rolled code that duplicates the stdlib, a native platform feature, or an already-installed dependency\n` +
  `- Multi-line blocks that collapse to a clean one-liner\n` +
  `- Dead code, unused exports, needless indirection or wrapper layers\n\n` +
  `For each opportunity decide: is the simplification BEHAVIOR-PRESERVING and high-confidence? If it touches a never-simplify area, put it in skippedSuggestions with the reason.\n\n` +
  `Return JSON: { simplifications: [{file, location, before, after, rationale, estimatedLinesRemoved}], ` +
  `skippedSuggestions: [{file, suggestion, reason}] }`,
  {
    label: 'review-changes',
    phase: 'Review',
    schema: {
      type: 'object',
      required: ['simplifications', 'skippedSuggestions'],
      properties: {
        simplifications: {
          type: 'array',
          items: {
            type: 'object',
            required: ['file', 'rationale'],
            properties: {
              file:                  { type: 'string' },
              location:              { type: 'string' },
              before:                { type: 'string' },
              after:                 { type: 'string' },
              rationale:             { type: 'string' },
              estimatedLinesRemoved: { type: 'number' },
            },
          },
        },
        skippedSuggestions: {
          type: 'array',
          items: {
            type: 'object',
            required: ['file', 'suggestion', 'reason'],
            properties: {
              file:       { type: 'string' },
              suggestion: { type: 'string' },
              reason:     { type: 'string' },
            },
          },
        },
      },
    },
  }
)

log(`Review: ${review.simplifications.length} simplification(s), ${review.skippedSuggestions.length} skipped (protected)`)

// In 'lite' mode we suggest but never touch the files.
let applied = []
let estimatedLinesRemoved = 0

if (mode === 'lite') {
  log('lite mode — reporting suggestions only, no edits applied')
  applied = []
} else if (review.simplifications.length === 0) {
  log('Code is already lean — nothing to simplify')
} else {
  // ─── Phase: Simplify ────────────────────────────────────────────────────────
  phase('Simplify')

  const apply = await agent(
    `You are the Ponytail Agent applying simplifications in ${mode.toUpperCase()} mode.\n\n` +
    `Project: ${projectPath}\n\n` +
    `Apply ONLY these reviewed, behavior-preserving simplifications to the real files:\n` +
    `${JSON.stringify(review.simplifications, null, 2)}\n\n` +
    `Rules:\n` +
    `1. Edit the actual files in ${projectPath} using the Edit/Write tools.\n` +
    `2. NEVER remove input validation, error handling, security checks, accessibility, or explicitly requested features.\n` +
    `3. Deletion over addition; boring over clever. Fix root cause, not symptoms.\n` +
    `4. Where you make a deliberate simplification a future reader might question, leave a short \`ponytail:\` comment explaining what was skipped and when to add it back.\n` +
    `5. If applying a simplification is risky or would change behavior, SKIP it and report why — do not force it.\n` +
    `6. Do not reformat or touch anything outside the listed simplifications.\n\n` +
    `After editing, return JSON: { applied: [{file, rationale, linesRemoved}], notApplied: [{file, reason}] }`,
    {
      label: 'apply-simplifications',
      phase: 'Simplify',
      schema: {
        type: 'object',
        required: ['applied'],
        properties: {
          applied: {
            type: 'array',
            items: {
              type: 'object',
              required: ['file', 'rationale'],
              properties: {
                file:        { type: 'string' },
                rationale:   { type: 'string' },
                linesRemoved: { type: 'number' },
              },
            },
          },
          notApplied: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                file:   { type: 'string' },
                reason: { type: 'string' },
              },
            },
          },
        },
      },
    }
  )

  applied = apply.applied || []
  estimatedLinesRemoved = applied.reduce((sum, a) => sum + (a.linesRemoved || 0), 0)
  log(`Applied ${applied.length} simplification(s) — ~${estimatedLinesRemoved} line(s) removed`)
}

const reportLines = [
  `# Ponytail Review — Session ${sessionId}`,
  '',
  `**Mode:** ${mode}`,
  `**Task:** ${taskText.replace(/`/g, "'").slice(0, 300)}`,
  `**Files reviewed:** ${filesChanged.length}`,
  `**Simplifications applied:** ${applied.length}`,
  `**Estimated lines removed:** ~${estimatedLinesRemoved}`,
  '',
  '## Applied',
  applied.length
    ? applied.map(a => `- \`${a.file}\` — ${a.rationale} (~${a.linesRemoved || 0} lines)`).join('\n')
    : '- none',
  '',
  '## Skipped (protected — never simplified)',
  review.skippedSuggestions.length
    ? review.skippedSuggestions.map(s => `- \`${s.file}\` — ${s.suggestion} → kept because ${s.reason}`).join('\n')
    : '- none',
  '',
  'Orchestrated by [[orchestrator]] · part of [[ponytail]].',
  '',
].join('\n')

const persistOps = [
  { write: `agents/ponytail/vault/reviews/${sessionId}.md`, content: reportLines },
  { db: ['log-agent-run', sessionId, 'ponytail', 'completed', JSON.stringify({ mode, applied: applied.length, linesRemoved: estimatedLinesRemoved })] },
]
await flushPersist(persistOps)

return {
  sessionId,
  agentName:          'ponytail',
  persistOps,
  status:             'completed',
  mode,
  filesReviewed:      filesChanged,
  simplifications:    applied,
  skippedSuggestions: review.skippedSuggestions,
  metrics: {
    filesReviewed:          filesChanged.length,
    simplificationsApplied: applied.length,
    estimatedLinesRemoved:  estimatedLinesRemoved,
  },
  errors: [],
}
