export const meta = {
  name: 'calls',
  description: 'Calls domain agent — one author builds the IVR/campaign, webhooks and voice scripts; an independent compliance reviewer checks them',
  phases: [
    { title: 'Author', detail: 'Design the call flow, write webhooks + TwiML/NCCO + client, write the voice scripts' },
    { title: 'Compliance', detail: 'Independent compliance reviewer: TCPA, GDPR, DNC, recording consent; fixes clear code gaps' },
  ],
}

const AGENTS_DIR      = (args && args.agentsDir) || 'C:/Users/Hp/Desktop/Ideas/Agents'

// The shared project map (design/agent-consolidation.md, change 4): read it instead of exploring the repo.
const projectMapBrief = (args && args.projectMap)
  ? `Project map (trust it; open only the files you need):\n${args.projectMap}\n\n`
  : (args && args.projectMapFile)
    ? `Project map: read ${args.projectMapFile} first if it exists, and trust it instead of exploring the repo.\n\n`
    : ''
const sessionId       = (args && args.sessionId)       || 'no-session'
const taskText        = (args && args.taskText)        || ''
const projectPath     = (args && args.projectPath)     || ''

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
const backendOutput   = (args && args.backendOutput)   || null
const databaseOutput  = (args && args.databaseOutput)  || null
const callPreferences = (args && args.callPreferences) || null
const requirementsOutput = (args && args.requirementsOutput) || null

// The requirements spec for one domain. Decisions, the domain's tasks and their acceptance criteria are binding
// and always passed in full; only the summary and scope lists are capped. The spec note is written at the end
// of the run, so the brief must stand on its own.
function specBrief(domain, max = 3000) {
  const s = requirementsOutput && requirementsOutput.spec
  if (!s) return '(no separate spec for this session: the task text is the spec)'
  const tasks = (requirementsOutput.tasks || []).filter(t => t.domain === domain)
  const storyIds = new Set(tasks.map(t => t.storyId).filter(Boolean))
  const stories = (requirementsOutput.userStories || []).filter(u => storyIds.has(u.id))
  const list = (title, items) => (items && items.length ? `${title}:\n${items.map(x => `- ${x}`).join('\n')}` : '')
  const binding = [
    list('Decisions (binding)', (s.decisions || []).map(d => `${d.topic}: ${d.decision}`)),
    list(`Tasks for ${domain}`, tasks.map(t => `${t.title}${t.description ? `: ${t.description}` : ''}`)),
    list('Acceptance criteria', stories.flatMap(u => (u.acceptanceCriteria || []).map(c => `${u.id}: ${c}`))),
  ].filter(Boolean).join('\n\n')
  let context = [
    s.summary ? `Summary: ${s.summary}` : '',
    list('In scope', s.inScope),
    list('Out of scope', s.outOfScope),
  ].filter(Boolean).join('\n\n')
  if (context.length > max) {
    log(`spec context for ${domain} capped at ${max} of ${context.length} chars (decisions, tasks and criteria kept in full)`)
    context = `${context.slice(0, max)}\n[... ${context.length - max} more chars of summary and scope omitted]`
  }
  return [context, binding].filter(Boolean).join('\n\n')
}

const callDirection = (callPreferences && callPreferences.callDirection) || 'both'
const provider      = (callPreferences && callPreferences.provider)      || 'twilio'
const hasRecording  = (callPreferences && callPreferences.callRecording) != null
  ? callPreferences.callRecording : true
const callType      = (callPreferences && callPreferences.callType)      || 'automated-ivr'

const providerBrief = `Provider: ${provider}. Direction: ${callDirection}. Call type: ${callType}. Recording: ${hasRecording ? 'yes (include spoken consent)' : 'no'}.`

// Bookkeeping is returned as data (persistOps) and run by shared/lib/persist.js
// (design/agent-consolidation.md): orchestrate defers it to the skill; a direct run uses one agent.
async function flushPersist(ops) {
  if (!ops.length || (args && args.deferPersist)) return
  const opsFile = `${AGENTS_DIR}/agents/orchestrator/vault/sessions/${sessionId}.calls.persist.json`
  await agent(
    `This is the software-engineer pipeline's own bookkeeping step for the session the user started: it records the ` +
    `session's results (decisions, vault notes, session status) in the pipeline's knowledge base under ${AGENTS_DIR}/agents. ` +
    `Every pipeline run ends with it. Write this JSON array exactly, with the Write tool, to ${opsFile}:\n${JSON.stringify(ops)}\n\n` +
    `Then run: node "${AGENTS_DIR}/shared/lib/persist.js" "${opsFile}" and return its output.`,
    { label: 'persist', model: 'haiku', effort: 'low' }
  )
}

log(`Provider: ${provider}`)

const tableContext = databaseOutput ? JSON.stringify(databaseOutput.tables || []) : '[]'

const VAULT = `${AGENTS_DIR}/agents/calls/vault`
const spec = specBrief('calls')
const sigRule = provider === 'twilio' ? 'X-Twilio-Signature via twilio.validateRequest()' : 'X-Nexmo-Signature via HMAC-SHA256'

// ─── Phase: Author ────────────────────────────────────────────────────────────
// flow-designer, telephony-integrator and voice-script-writer worked on one feature in sequence and
// only passed JSON summaries; one author now does all three (design/agent-consolidation.md, phase 2).
phase('Author')

const built = await agent(
  `You are the Calls author: design the call flow, build the telephony integration, and write the voice scripts for this ` +
  `task, then check your own work. An independent compliance reviewer will check it after you.\n\n` +
  `Task: "${taskText}"\nProject: ${projectPath}\n${providerBrief}\nDatabase tables available: ${tableContext}\n\n` +
  projectMapBrief +
  `Requirements spec:\n${spec}\n\n` +
  `Context to read first: prior decisions (cd "${AGENTS_DIR}" && node shared/lib/db-cli.js --as calls get-decisions calls telephony-patterns 5), ` +
  `${VAULT}/INDEX.md and the notes it lists that apply, ${VAULT}/providers/twilio-setup.md (if missing: the twilio npm package, ` +
  `auth token from TWILIO_AUTH_TOKEN), and any existing telephony code in the project.\n\n` +
  `1. CALL FLOW (flow-designer)\n` +
  ((callDirection === 'inbound' || callDirection === 'both')
    ? `   Inbound IVR: greeting on connect; menu at most 3 levels deep, each option -> sub-menu, transfer-to-agent, voicemail or ` +
      `message-and-hangup; timeout -> repeat once -> fallback; invalid input -> "I didn't understand that" -> repeat once -> fallback; ` +
      `business-hours check routing to voicemail after hours${hasRecording ? '; recording consent announced at call start' : ''}.\n`
    : '') +
  ((callDirection === 'outbound' || callDirection === 'both')
    ? `   Outbound campaign: DNC check before every dial; 8am-9pm callee-local calling hours; dial with real caller ID and 30s timeout; ` +
      `answering-machine detection with a human script (intro -> purpose -> action) and a voicemail message with callback number; ` +
      `retry busy/no-answer up to 3 times, 1+ hour apart; record the outcome (answered, voicemail, busy, no-answer, failed).\n`
    : '') +
  `2. INTEGRATION (telephony-integrator) in ${projectPath}/src/features/<featureName>/ (unless the spec decides otherwise): ` +
  `webhook.routes.js, webhook.controller.js (thin), telephony.service.js (IVR routing, dialing, call logging), ` +
  `${provider === 'twilio' ? 'twiml.js and twilio.client.js' : 'ncco.js and vonage.client.js'} (SDK singleton, env vars only).\n` +
  `   Mandatory security: validate ${sigRule} on EVERY webhook route, 403 { success: false, code: 'ERR_INVALID_SIGNATURE' } when ` +
  `invalid; credentials only from env vars; never log full audio, full phone numbers (last 4 digits only) or plain-text transcripts.\n` +
  `   Errors: { success: false, code: 'ERR_X', message }, no stack traces; webhooks always return a valid provider response, even on error.\n` +
  ((callDirection === 'inbound' || callDirection === 'both') ? `   Inbound responses: <Say> (voice Polly.Joanna), <Gather input="dtmf" timeout="5" numDigits="1">, <Dial> with an action webhook, <Record maxLength=120 transcribe>, <Redirect> for loops.\n` : '') +
  ((callDirection === 'outbound' || callDirection === 'both') ? `   Outbound: calls.create with machineDetection "Enable" and asyncAmd; AMD webhook (human vs machine); status callback storing a call_logs record on every update.\n` : '') +
  `3. VOICE SCRIPTS (voice-script-writer, ${VAULT}/scripts/tts-writing-guide.md): sentences under 20 words; spoken contractions; ` +
  `numbers spelled out, phone digits one by one; no punctuation TTS reads aloud; greetings under 8 seconds; phonetic hints for brand ` +
  `names. Write every script that applies: greeting, main_menu, hold, transfer, voicemail_prompt, voicemail_closed, error, goodbye` +
  `${hasRecording ? ', recording_consent' : ''}${(callDirection === 'outbound' || callDirection === 'both') ? ', outbound_intro (identifies the company immediately), voicemail_leave (with callback number)' : ''}.\n\n` +
  `Return { featureName, callDirection: "inbound"|"outbound"|"both", ` +
  `inboundFlow: { greeting, menuOptions: [{key,label,action,subMenu?}], timeoutFallback, afterHoursFallback } | null, ` +
  `outboundFlow: { preDialChecks: [string], humanScript, voicemailScript, retryConfig: {maxAttempts,waitHours}, resultStates: [string] } | null, ` +
  `webhookRoutes: [{method,path,handler,authRequired,description}], scripts: [{id, context, text, estimatedSeconds, ttsVoice}], ` +
  `filesCreated: [string], filesUpdated: [string], specConflicts: [string] }`,
  {
    label: 'author',
    phase: 'Author',
    schema: {
      type: 'object',
      required: ['featureName', 'callDirection', 'webhookRoutes', 'scripts', 'filesCreated', 'filesUpdated', 'specConflicts'],
      properties: {
        featureName:   { type: 'string' },
        callDirection: { type: 'string' },
        inboundFlow:   { type: ['object', 'null'] },
        outboundFlow:  { type: ['object', 'null'] },
        webhookRoutes: { type: 'array' },
        scripts: {
          type: 'array',
          items: {
            type: 'object',
            required: ['id', 'context', 'text'],
            properties: {
              id: { type: 'string' }, context: { type: 'string' }, text: { type: 'string' },
              estimatedSeconds: { type: 'number' }, ttsVoice: { type: 'string' },
            },
          },
        },
        filesCreated:  { type: 'array', items: { type: 'string' } },
        filesUpdated:  { type: 'array', items: { type: 'string' } },
        specConflicts: { type: 'array', items: { type: 'string' } },
      },
    },
  }
)
const flow = { featureName: built.featureName, callDirection: built.callDirection, inboundFlow: built.inboundFlow || null, outboundFlow: built.outboundFlow || null }
const integration = { filesCreated: built.filesCreated, filesUpdated: built.filesUpdated, webhookRoutes: built.webhookRoutes }
const scripts = { scripts: built.scripts }
log(`Author: ${flow.featureName}, ${integration.webhookRoutes.length} webhook route(s), ${scripts.scripts.length} voice script(s)`)

// ─── Phase: Compliance ────────────────────────────────────────────────────────
// Independent on purpose: the compliance reviewer gets the code, the scripts and the rules, never
// the author's reasoning.
phase('Compliance')

const compliance = await agent(
  `You are the Calls compliance reviewer. You did not build this; review it independently.\n\n` +
  `Task: "${taskText}"\n${providerBrief}\nProject: ${projectPath}\n` +
  projectMapBrief +
  `Files built: ${JSON.stringify(uniquePaths([...integration.filesCreated, ...integration.filesUpdated]))}\n` +
  `Call flow: ${JSON.stringify(flow)}\n` +
  `Voice scripts: ${JSON.stringify(scripts.scripts.map(v => ({ id: v.id, text: v.text })))}\n` +
  `Compliance reference: read ${VAULT}/compliance/tcpa-gdpr.md (if missing: apply TCPA, GDPR and FTC DNC rules)\n\n` +
  `Check, reading the code itself:\n` +
  `TCPA: [blocking] prior written consent (or a consent step) before outbound calls to mobiles; [blocking] 8am-9pm local-time ` +
  `calling hours enforced per timezone; [blocking] federal and state DNC checked before every outbound dial; [blocking] a real, ` +
  `working caller ID; [warning] abandonment rate tracked (< 3%) for predictive/power dialing.\n` +
  `GDPR: [blocking] a documented lawful basis for recordings; [blocking] transcripts encrypted at rest with retention limits; ` +
  `[warning] phone numbers treated as PII with access controls; [warning] only necessary call details logged.\n` +
  `General: [blocking] if recording, the spoken consent plays before recording starts; [warning] outbound voicemail identifies the ` +
  `company and offers an opt-out; [info] provider signature validation on every webhook route.\n\n` +
  `Fix clear code gaps in place (a missing signature check, consent script, calling-hours or DNC check, logging of full numbers) and ` +
  `mark those checks passed with what you changed in detail. Legal or business choices (which lawful basis, retention period) are ` +
  `reported, never decided by you.\n` +
  `Return { checks: [{rule, severity: "blocking"|"warning"|"info", passed, detail}], passed, filesFixed: [string] }`,
  {
    label: 'compliance',
    phase: 'Compliance',
    schema: {
      type: 'object',
      required: ['checks', 'passed', 'filesFixed'],
      properties: {
        checks: {
          type: 'array',
          items: {
            type: 'object',
            required: ['rule', 'severity', 'passed'],
            properties: { rule: { type: 'string' }, severity: { type: 'string' }, passed: { type: 'boolean' }, detail: { type: 'string' } },
          },
        },
        passed:     { type: 'boolean' },
        filesFixed: { type: 'array', items: { type: 'string' } },
      },
    },
  }
)

// Pass/fail comes from the checks themselves, not the model's summary flag.
const blockingFailures = compliance.checks.filter(c => !c.passed && c.severity === 'blocking')
compliance.passed = blockingFailures.length === 0
log(`Compliance: ${compliance.checks.length} checks, ${blockingFailures.length} blocking failure(s), passed=${compliance.passed}`)

const callsNote = [
  `# ${flow.featureName}`,
  '',
  `- Direction: ${flow.callDirection}`,
  `- Provider: ${provider}`,
  `- Compliance: ${compliance.passed ? 'passed' : 'FAILED'}`,
  `- Webhooks: ${integration.webhookRoutes.map(w => `${w.method} ${w.path}`).join(', ') || 'none'}`,
  `- Voice scripts: ${(scripts.scripts || []).map(v => v.id).join(', ') || 'none'}`,
  flow.inboundFlow ? `- IVR menu: ${(flow.inboundFlow.menuOptions || []).map(o => `${o.key}=${o.label}`).join(', ')}` : null,
  flow.outboundFlow ? `- Outbound results: ${(flow.outboundFlow.resultStates || []).join(', ')}` : null,
].filter(Boolean).join('\n')
const persistOps = [
  { db: ['--as', 'calls', 'save-decision', 'calls', sessionId, 'telephony-patterns', `Built ${flow.callDirection} call system with ${integration.webhookRoutes.length} webhooks for: ${taskText.slice(0, 60)}`, `Provider: ${provider}, compliance passed: ${compliance.passed}`] },
  { write: `agents/calls/vault/decisions/${flow.featureName}.md`, content: callsNote },
]
await flushPersist(persistOps)

const allFiles = uniquePaths([
  ...integration.filesCreated,
  ...integration.filesUpdated,
  ...(compliance.filesFixed || []),
])

return {
  sessionId,
  agentName:       'calls',
  persistOps,
  status:          compliance.passed ? 'completed' : 'failed',
  provider,
  callDirection:   flow.callDirection,
  webhookRoutes:   integration.webhookRoutes,
  ivrFlow:         flow.inboundFlow   || null,
  campaignConfig:  flow.outboundFlow  || null,
  voiceScripts:    scripts.scripts,
  complianceChecks: compliance.checks,
  filesChanged:    allFiles,
  specConflicts:   built.specConflicts,
  errors:          blockingFailures.map(c => `${c.rule}: ${c.detail}`),
}
