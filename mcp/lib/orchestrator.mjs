// Cross-IDE orchestration pipeline for the MCP server.
//
// Mirrors the Claude Code workflow dependency order
//   database → backend → frontend / testing / calls → bridge
// but runs entirely through the model abstraction (sampling or API key) so it
// works in Cursor, Windsurf, VS Code, etc. — anywhere that speaks MCP.
//
// Reuses the existing knowledge infrastructure: shared/lib/db-cli.js for the
// session log and agents/<name>/vault for grounding context.
import { fileURLToPath } from 'url'
import { dirname, join, resolve, sep } from 'path'
import { existsSync, readFileSync, mkdirSync, writeFileSync } from 'fs'
import { execFileSync } from 'child_process'
import { createRequire } from 'module'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..', '..') // mcp/lib -> install root

// The shared project map (shared/lib/projectmap.js), built by onboarding in Claude Code.
const projectmap = createRequire(import.meta.url)('../../shared/lib/projectmap.js')

const AGENTS = ['backend', 'frontend', 'database', 'testing', 'gitdevops', 'mcpbridge', 'calls']
const CONTRACTS = ['task', 'backend', 'frontend', 'database', 'testing', 'gitdevops', 'mcpbridge', 'calls']

function dbCli(...args) {
  return execFileSync('node', [join(ROOT, 'shared', 'lib', 'db-cli.js'), ...args], {
    encoding: 'utf8',
  }).trim()
}

function vaultContext(agent) {
  const idx = join(ROOT, 'agents', agent, 'vault', 'INDEX.md')
  return existsSync(idx) ? readFileSync(idx, 'utf8').slice(0, 2000) : ''
}

// ── health ────────────────────────────────────────────────────────────────────
export async function health({ model }) {
  const checks = []
  for (const c of CONTRACTS) checks.push({ check: `contract:${c}`, ok: existsSync(join(ROOT, 'shared', 'contracts', `${c}.schema.json`)) })
  for (const a of AGENTS) checks.push({ check: `vault:${a}`, ok: existsSync(join(ROOT, 'agents', a, 'vault', 'INDEX.md')) })
  checks.push({ check: 'orchestrator.db', ok: existsSync(join(ROOT, 'shared', 'orchestrator.db')) })
  const failed = checks.filter((c) => !c.ok).map((c) => c.check)
  return {
    installRoot: ROOT,
    healthy: failed.length === 0,
    failed,
    model: model.availability(),
    note: failed.length
      ? 'Run `npm run init` in the install root to provision missing knowledge bases.'
      : 'All knowledge bases and contracts present.',
  }
}

// ── classify ───────────────────────────────────────────────────────────────────
const CLASSIFY_SCHEMA = {
  type: 'object',
  required: ['requiresDatabase', 'requiresBackend', 'requiresFrontend', 'requiresCalls', 'taskType', 'taskSlug'],
  properties: {
    requiresDatabase: { type: 'boolean' },
    requiresBackend: { type: 'boolean' },
    requiresFrontend: { type: 'boolean' },
    requiresCalls: { type: 'boolean' },
    taskType: { type: 'string' },
    taskSlug: { type: 'string' },
  },
}

export async function classify({ task, model }) {
  if (!task) throw new Error('task is required')
  return model.generate({
    system: 'You are a senior software architect that classifies development tasks.',
    tier: 'main',
    schema: CLASSIFY_SCHEMA,
    prompt:
      `Classify this software development task:\n"${task}"\n\n` +
      `- requiresDatabase: new tables / schema / data-model work\n` +
      `- requiresBackend: API routes / controllers / server logic\n` +
      `- requiresFrontend: UI components / pages / client code\n` +
      `- requiresCalls: phone / voice / IVR / telephony (Twilio, Vonage, dialing, voicemail)\n` +
      `- taskType: one of feat | fix | chore | test | docs | refactor | security\n` +
      `- taskSlug: lowercase kebab-case, max 30 chars`,
  })
}

// ── per-domain generation ────────────────────────────────────────────────────────
const DOMAIN_SYS = {
  database: 'You are a database engineer. Produce migration SQL and schema files. Add created_at/updated_at, sane indexes, and prefer soft deletes unless told otherwise.',
  backend: 'You are a backend engineer. Produce routes, controllers, and services. Use a clear route contract, structured error responses, and never leak secrets or stack traces.',
  frontend: 'You are a frontend engineer. Produce components and API wiring. Keep auth tokens out of localStorage, respect the existing design system, and add CSP-friendly code.',
  calls: 'You are a telephony engineer. Produce IVR/campaign webhook handlers, voice (TTS) scripts, and compliance checks (TCPA/GDPR/DNC, recording consent). Validate provider webhook signatures.',
}

const FILES_SCHEMA = {
  type: 'object',
  required: ['summary', 'files'],
  properties: {
    summary: { type: 'string' },
    files: {
      type: 'array',
      items: {
        type: 'object',
        required: ['path', 'content'],
        properties: { path: { type: 'string' }, content: { type: 'string' } },
      },
    },
    notes: { type: 'string' },
  },
}

async function runDomain(agent, { task, projectPath, prior, clarifications, model }) {
  const ctx = vaultContext(agent)
  let map = null
  try { map = projectmap.read(projectPath, ROOT) } catch { map = null }
  const out = await model.generate({
    system: DOMAIN_SYS[agent],
    tier: 'main',
    schema: FILES_SCHEMA,
    prompt:
      `Task: ${task}\nProject root: ${projectPath}\n` +
      `Preferences: ${JSON.stringify(clarifications || {})}\n\n` +
      (map ? `Project map (trust it instead of exploring the repo):\n${map}\n\n` : '') +
      `Team knowledge (vault index for ${agent}):\n${ctx}\n\n` +
      `Prior domain outputs (summaries): ${JSON.stringify(
        Object.fromEntries(Object.entries(prior).map(([k, v]) => [k, v.summary]))
      )}\n\n` +
      `Produce the files for the ${agent} part of this task. Use paths relative to the project root.`,
  })
  return { agent, ...out }
}

// ── orchestrate ──────────────────────────────────────────────────────────────────
export async function orchestrate({ task, projectPath, clarifications, apply = false, model, log }) {
  if (!task || !projectPath) throw new Error('task and projectPath are required')

  let sessionId = 'no-session'
  try {
    sessionId = JSON.parse(dbCli('init-session', task, projectPath)).sessionId
    log?.(`session ${sessionId} started`)
  } catch (e) {
    log?.(`warning: could not open session log (${e.message}); continuing`)
  }

  const cls = await classify({ task, model })
  const order = []
  if (cls.requiresDatabase) order.push('database')
  if (cls.requiresBackend) order.push('backend')
  if (cls.requiresFrontend) order.push('frontend')
  if (cls.requiresCalls) order.push('calls')

  const outputs = {}
  for (const agent of order) {
    log?.(`running ${agent}…`)
    outputs[agent] = await runDomain(agent, { task, projectPath, prior: outputs, clarifications, model })
  }

  const projRoot = resolve(projectPath)
  const written = []
  const skipped = []
  if (apply) {
    for (const agent of order) {
      for (const f of outputs[agent].files || []) {
        const dest = resolve(projRoot, f.path)
        if (dest !== projRoot && !dest.startsWith(projRoot + sep)) {
          skipped.push(f.path) // path-traversal guard
          continue
        }
        mkdirSync(dirname(dest), { recursive: true })
        writeFileSync(dest, f.content, 'utf8')
        written.push(f.path)
      }
    }
    try { dbCli('update-session-status', sessionId, 'completed') } catch { /* non-fatal */ }
  }

  return {
    sessionId,
    classification: cls,
    domains: order,
    plan: Object.fromEntries(
      order.map((a) => [a, { summary: outputs[a].summary, files: (outputs[a].files || []).map((f) => f.path), notes: outputs[a].notes || '' }])
    ),
    applied: apply,
    filesWritten: written,
    filesSkipped: skipped,
    next: apply
      ? 'Review the written files, run your tests, and commit when satisfied.'
      : 'Re-run with apply=true to write these files into the project.',
  }
}
