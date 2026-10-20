export const meta = {
  name: 'ponytail',
  description: 'Lazy-senior-dev refinement gate — reviews this session\'s generated code against the minimal-code decision ladder and applies safe simplifications before the bridge. The best code is the code you never wrote.',
  phases: [
    { title: 'Review', detail: 'Judge each changed file against the ladder and apply safe simplifications in one pass (none in lite mode)' },
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

// The shared project map (design/agent-consolidation.md, change 4): read it instead of exploring the repo.
const projectMapBrief = (args && args.projectMap)
  ? `Project map (trust it; open only the files you need):\n${args.projectMap}\n\n`
  : (args && args.projectMapFile)
    ? `Project map: read ${args.projectMapFile} first if it exists, and trust it instead of exploring the repo.\n\n`
    : ''
const sessionId      = (args && args.sessionId)      || 'no-session'
const taskText       = (args && args.taskText)       || ''
const projectPath    = (args && args.projectPath)    || ''

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
const mode           = (args && args.mode)           || 'full'   // lite | full | ultra
const backendOutput  = (args && args.backendOutput)  || null
const frontendOutput = (args && args.frontendOutput) || null
const callsOutput    = (args && args.callsOutput)    || null
const databaseOutput = (args && args.databaseOutput) || null

const filesChanged = uniquePaths([
  ...((backendOutput  && backendOutput.filesChanged)  || []),
  ...((frontendOutput && frontendOutput.filesChanged) || []),
  ...((callsOutput    && callsOutput.filesChanged)    || []),
  ...((databaseOutput && databaseOutput.migrationFile) ? [databaseOutput.migrationFile] : []),
])

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

// One pass: judge each changed file against the ladder and, unless mode is lite, apply the
// safe simplifications right away (design/agent-consolidation.md, phase 2).
const result = await agent(
  `You are the Ponytail Agent — the laziest senior dev in the room. The best code is the code never written.\n\n` +
  `Mode: ${mode.toUpperCase()} ` +
  `(lite = suggest only, edit nothing; full = enforce the ladder; ultra = YAGNI extremist, challenge the requirement itself).\n\n` +
  `Task that produced this code: "${taskText}"\n` +
  `Project: ${projectPath}\n` +
  projectMapBrief +
  `Files generated/changed this session (review ONLY these):\n${JSON.stringify(filesChanged, null, 2)}\n\n` +
  `Decision ladder to judge against: read ${AGENTS_DIR}/agents/ponytail/vault/philosophy/decision-ladder.md and modes.md (if missing: reuse > stdlib > native > installed dep > one-liner > minimal code)\n\n` +
  `NEVER touch what ${AGENTS_DIR}/agents/ponytail/vault/philosophy/never-simplify.md protects (if missing: input validation, error handling, security, accessibility, or explicitly requested features)\n\n` +
  `1. Read each changed file and look for: speculative code or abstractions nobody asked for (YAGNI); hand-rolled code duplicating ` +
  `the stdlib, a native platform feature or an installed dependency; multi-line blocks that collapse to a clean one-liner; dead ` +
  `code, unused exports, needless indirection or wrapper layers.\n` +
  `2. Keep only simplifications that are BEHAVIOR-PRESERVING and high-confidence. Anything touching a never-simplify area goes to ` +
  `skippedSuggestions with the reason.\n` +
  (mode === 'lite'
    ? `3. Lite mode: do NOT edit any file. Report the simplifications only; applied stays empty.\n\n`
    : `3. Apply the kept simplifications to the real files with the Edit/Write tools. Deletion over addition; boring over clever. ` +
      `Where a reader might question a deliberate simplification, leave a short "ponytail:" comment saying what was skipped and ` +
      `when to add it back. Skip (and list in notApplied) anything that turns out risky or behavior-changing. Touch nothing else.\n\n`) +
  `Return { simplifications: [{file, location, before, after, rationale, estimatedLinesRemoved}], ` +
  `applied: [{file, rationale, linesRemoved}], notApplied: [{file, reason}], skippedSuggestions: [{file, suggestion, reason}] }`,
  {
    label: 'ponytail',
    phase: 'Review',
    schema: {
      type: 'object',
      required: ['simplifications', 'applied', 'skippedSuggestions'],
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
        applied: {
          type: 'array',
          items: {
            type: 'object',
            required: ['file', 'rationale'],
            properties: {
              file:         { type: 'string' },
              rationale:    { type: 'string' },
              linesRemoved: { type: 'number' },
            },
          },
        },
        notApplied: {
          type: 'array',
          items: { type: 'object', properties: { file: { type: 'string' }, reason: { type: 'string' } } },
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

const review = { simplifications: result.simplifications, skippedSuggestions: result.skippedSuggestions }
// Lite mode never edits, whatever the agent reports.
const applied = mode === 'lite' ? [] : (result.applied || [])
const estimatedLinesRemoved = applied.reduce((sum, a) => sum + (a.linesRemoved || 0), 0)
log(`Ponytail: ${review.simplifications.length} simplification(s), ${applied.length} applied (~${estimatedLinesRemoved} lines), ${review.skippedSuggestions.length} skipped (protected)`)

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
