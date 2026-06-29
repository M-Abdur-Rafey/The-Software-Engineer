export const meta = {
  name: 'calls',
  description: 'Calls domain agent — inbound IVR, outbound campaigns, webhook handlers, voice scripts, compliance',
  phases: [
    { title: 'Load Context', detail: 'Read telephony vault notes and prior decisions' },
    { title: 'Design Flow', detail: 'flow-designer maps IVR tree (inbound) or campaign logic (outbound)' },
    { title: 'Build Integration', detail: 'telephony-integrator writes webhook handlers and TwiML/NCCO' },
    { title: 'Voice Scripts', detail: 'voice-script-writer writes all TTS prompts and messages' },
    { title: 'Compliance', detail: 'compliance-checker validates TCPA, GDPR, DNC, recording consent' },
    { title: 'Persist', detail: 'Save decisions and vault notes' },
  ],
}

const AGENTS_DIR      = (args && args.agentsDir) || 'C:/Users/Hp/Desktop/Ideas/Agents'
const sessionId       = (args && args.sessionId)       || 'no-session'
const taskText        = (args && args.taskText)        || ''
const projectPath     = (args && args.projectPath)     || ''
const backendOutput   = (args && args.backendOutput)   || null
const databaseOutput  = (args && args.databaseOutput)  || null
const callPreferences = (args && args.callPreferences) || null

const callDirection = (callPreferences && callPreferences.callDirection) || 'both'
const provider      = (callPreferences && callPreferences.provider)      || 'twilio'
const hasRecording  = (callPreferences && callPreferences.callRecording) != null
  ? callPreferences.callRecording : true
const callType      = (callPreferences && callPreferences.callType)      || 'automated-ivr'

const providerBrief = `Provider: ${provider}. Direction: ${callDirection}. Call type: ${callType}. Recording: ${hasRecording ? 'yes (include spoken consent)' : 'no'}.`

// ─── Phase: Load Context ──────────────────────────────────────────────────────
phase('Load Context')

const context = await agent(
  `Load context for the Calls Agent (session: ${sessionId}).\n\n` +
  `Run: cd "${AGENTS_DIR}" && node shared/lib/db-cli.js --as calls get-decisions calls telephony-patterns 10\n\n` +
  `Then read:\n` +
  `- ${AGENTS_DIR}/agents/calls/vault/INDEX.md\n` +
  `- ${AGENTS_DIR}/agents/calls/vault/providers/twilio-setup.md\n` +
  `- ${AGENTS_DIR}/agents/calls/vault/compliance/tcpa-gdpr.md\n\n` +
  `Return JSON: { decisions: <array from command>, twilioSetup: "<text>", compliance: "<text>" }`,
  {
    label: 'load-context',
    schema: {
      type: 'object',
      required: ['decisions'],
      properties: {
        decisions:   { type: 'array' },
        twilioSetup: { type: 'string' },
        compliance:  { type: 'string' },
      },
    },
  }
)

log(`Loaded ${context.decisions.length} prior decisions. Provider: ${provider}`)

const tableContext = databaseOutput ? JSON.stringify(databaseOutput.tables || []) : '[]'

// ─── Phase: Design Flow ───────────────────────────────────────────────────────
phase('Design Flow')

const flow = await agent(
  `You are the flow-designer sub-agent of the Calls Agent.\n\n` +
  `Task: "${taskText}"\n` +
  `Project: ${projectPath}\n` +
  `${providerBrief}\n` +
  `Database tables available: ${tableContext}\n` +
  `Prior decisions: ${JSON.stringify(context.decisions.slice(0, 5))}\n\n` +
  `Read the project at ${projectPath} to understand any existing telephony code.\n\n` +

  (callDirection === 'inbound' || callDirection === 'both'
    ? `INBOUND IVR DESIGN — design a complete IVR call flow:\n` +
      `- Greeting message (spoken on call connect)\n` +
      `- Menu structure (press 1 for X, press 2 for Y) — maximum 3 levels deep\n` +
      `- Each menu option leads to one of: sub-menu, transfer-to-agent, voicemail, message-and-hangup\n` +
      `- Timeout handling: if caller presses nothing → repeat menu once → fallback to agent/voicemail\n` +
      `- Invalid input handling: say "I didn't understand that" → repeat menu once → fallback\n` +
      `- Business hours check: route to voicemail after hours\n` +
      `${hasRecording ? '- Recording consent: announce at call start that the call may be recorded\n' : ''}\n`
    : '') +

  (callDirection === 'outbound' || callDirection === 'both'
    ? `OUTBOUND CAMPAIGN DESIGN — design the outbound call flow:\n` +
      `- Pre-dial compliance check: verify number is not on DNC list\n` +
      `- Calling hours check: 8am–9pm local time for the callee's timezone\n` +
      `- Call initiation: dial number, set caller ID, set timeout (30s)\n` +
      `- AMD (Answering Machine Detection): define script for human answer vs voicemail\n` +
      `- Human-answered script: introduction → purpose → action (transfer/info/collect)\n` +
      `- Machine-answered: leave a voicemail message with callback number\n` +
      `- Retry logic: busy/no-answer → retry up to 3 times, wait 1+ hour between attempts\n` +
      `- Call result tracking: record outcome (answered, voicemail, busy, no-answer, failed)\n\n`
    : '') +

  `Return JSON: {\n` +
  `  callDirection: "inbound"|"outbound"|"both",\n` +
  `  inboundFlow: { greeting: string, menuOptions: [{key,label,action,subMenu?}], timeoutFallback: string, afterHoursFallback: string } | null,\n` +
  `  outboundFlow: { preDialChecks: [string], humanScript: string, voicemailScript: string, retryConfig: {maxAttempts,waitHours}, resultStates: [string] } | null,\n` +
  `  webhookEndpoints: [{method,path,description,eventType}],\n` +
  `  featureName: string\n` +
  `}`,
  {
    label: 'flow-designer',
    phase: 'Design Flow',
    schema: {
      type: 'object',
      required: ['callDirection', 'webhookEndpoints', 'featureName'],
      properties: {
        callDirection:    { type: 'string' },
        inboundFlow:      { type: ['object', 'null'] },
        outboundFlow:     { type: ['object', 'null'] },
        webhookEndpoints: { type: 'array' },
        featureName:      { type: 'string' },
      },
    },
  }
)

log(`Designed flow: ${flow.featureName}, ${flow.webhookEndpoints.length} webhook endpoint(s)`)

// ─── Phase: Build Integration ─────────────────────────────────────────────────
phase('Build Integration')

const integration = await agent(
  `You are the telephony-integrator sub-agent of the Calls Agent.\n\n` +
  `Task: "${taskText}"\n` +
  `Project: ${projectPath}\n` +
  `${providerBrief}\n` +
  `Call flow design: ${JSON.stringify(flow)}\n` +
  `Twilio setup reference: ${context.twilioSetup || 'Use twilio npm package. Auth token from TWILIO_AUTH_TOKEN env var.'}\n\n` +

  `Create the telephony integration files at ${projectPath}/src/features/${flow.featureName}/:\n\n` +

  `FILES TO CREATE:\n` +
  `  webhook.routes.js  — Express routes for all webhook endpoints listed below\n` +
  `  webhook.controller.js — thin controller, calls service\n` +
  `  telephony.service.js — business logic: IVR routing, campaign dialing, call logging\n` +
  `  twiml.js (or ncco.js for Vonage) — generates provider response XML/JSON\n` +
  `  ${provider === 'twilio' ? 'twilio.client.js' : 'vonage.client.js'} — SDK singleton, env vars only\n\n` +

  `WEBHOOK ENDPOINTS TO IMPLEMENT:\n` +
  JSON.stringify(flow.webhookEndpoints) + '\n\n' +

  `MANDATORY SECURITY (non-negotiable):\n` +
  `- Validate ${provider === 'twilio' ? 'X-Twilio-Signature header using twilio.validateRequest()' : 'X-Nexmo-Signature header using HMAC-SHA256'} on EVERY webhook route\n` +
  `- Return 403 with { success: false, code: 'ERR_INVALID_SIGNATURE' } for invalid signatures\n` +
  `- All credentials from env vars: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER (or VONAGE equivalents)\n` +
  `- Never log full call audio, full phone numbers (last 4 digits only in logs), or transcripts in plain text\n\n` +

  (flow.inboundFlow
    ? `INBOUND TwiML PATTERNS:\n` +
      `- Use <Response><Say> for TTS messages (voice: "Polly.Joanna" for natural sound)\n` +
      `- Use <Gather input="dtmf" timeout="5" numDigits="1"> for menu input\n` +
      `- Use <Dial> to transfer to agent (with action webhook for call completion)\n` +
      `- Use <Record> for voicemail (maxLength: 120s, transcribe: true)\n` +
      `- Wrap in <Redirect> for timeout/invalid loops\n\n`
    : '') +

  (flow.outboundFlow
    ? `OUTBOUND SDK PATTERNS:\n` +
      `- Use twilio.calls.create({ to, from, twiml, machineDetection: "Enable", asyncAmd: true })\n` +
      `- AMD webhook (AnsweredBy): check "human" vs "machine" and respond with correct TwiML\n` +
      `- Status callback webhook: track call progress (initiated → ringing → in-progress → completed)\n` +
      `- Store call_logs record on every status update\n\n`
    : '') +

  `ERROR HANDLING:\n` +
  `- All errors return: { success: false, code: 'ERR_X', message: '...' }\n` +
  `- No stack traces in responses\n` +
  `- Webhook must always return a valid TwiML response (even on error) or provider will retry\n\n` +

  `Return JSON: { filesCreated: [string], filesUpdated: [string], webhookRoutes: [{method,path,handler,authRequired,description}] }`,
  {
    label: 'telephony-integrator',
    phase: 'Build Integration',
    schema: {
      type: 'object',
      required: ['filesCreated', 'filesUpdated', 'webhookRoutes'],
      properties: {
        filesCreated:   { type: 'array', items: { type: 'string' } },
        filesUpdated:   { type: 'array', items: { type: 'string' } },
        webhookRoutes:  { type: 'array' },
      },
    },
  }
)

log(`Created ${integration.filesCreated.length} file(s), ${integration.webhookRoutes.length} route(s)`)

// ─── Phase: Voice Scripts ─────────────────────────────────────────────────────
phase('Voice Scripts')

const scripts = await agent(
  `You are the voice-script-writer sub-agent of the Calls Agent.\n\n` +
  `Task: "${taskText}"\n` +
  `${providerBrief}\n` +
  `Call flow: ${JSON.stringify(flow)}\n\n` +
  `Write all TTS (text-to-speech) scripts for this telephony feature. Rules for great voice scripts:\n\n` +
  `WRITING RULES:\n` +
  `- Sentences must be short (under 20 words). Long sentences cause TTS to rush or stumble.\n` +
  `- Use natural spoken language, not written language ("you'll" not "you will", "we've" not "we have")\n` +
  `- Spell out numbers in words for TTS: "eight hundred" not "800"\n` +
  `- For phone numbers, say each digit individually: "call us at 5-5-5, 1-2-3-4"\n` +
  `- Avoid punctuation that TTS reads aloud: no em dashes, no parentheses in speech\n` +
  `- Keep greetings under 8 seconds at normal TTS speed (~130 words/min)\n` +
  `- Include phonetic spellings in brackets for brand names TTS mispronounces: "Aris[trull]"\n\n` +
  `REQUIRED SCRIPTS (write all that apply):\n` +
  `- greeting: what caller hears when call connects\n` +
  `- main_menu: menu options read aloud\n` +
  `- hold: message played while caller waits for agent\n` +
  `- transfer: "please hold while I connect you"\n` +
  `- voicemail_prompt: ask caller to leave a message\n` +
  `- voicemail_closed: after-hours message\n` +
  `- error: "I didn't understand that. Let me repeat..."\n` +
  `- goodbye: end-of-call message\n` +
  (hasRecording ? `- recording_consent: "This call may be recorded for quality and training purposes."\n` : '') +
  (flow.outboundFlow ? `- outbound_intro: opening line for outbound calls (must identify company immediately)\n` : '') +
  (flow.outboundFlow ? `- voicemail_leave: message to leave on answering machine with callback number\n` : '') +
  `\nReturn JSON: { scripts: [{id, context, text, estimatedSeconds, ttsVoice}] }`,
  {
    label: 'voice-script-writer',
    phase: 'Voice Scripts',
    schema: {
      type: 'object',
      required: ['scripts'],
      properties: {
        scripts: {
          type: 'array',
          items: {
            type: 'object',
            required: ['id', 'context', 'text'],
            properties: {
              id:               { type: 'string' },
              context:          { type: 'string' },
              text:             { type: 'string' },
              estimatedSeconds: { type: 'number' },
              ttsVoice:         { type: 'string' },
            },
          },
        },
      },
    },
  }
)

log(`Wrote ${scripts.scripts.length} voice script(s)`)

// ─── Phase: Compliance ────────────────────────────────────────────────────────
phase('Compliance')

const compliance = await agent(
  `You are the compliance-checker sub-agent of the Calls Agent.\n\n` +
  `Task: "${taskText}"\n` +
  `${providerBrief}\n` +
  `Call flow: ${JSON.stringify(flow)}\n` +
  `Voice scripts: ${JSON.stringify(scripts.scripts.map(s => ({ id: s.id, text: s.text })))}\n` +
  `Compliance reference: ${context.compliance || 'Apply TCPA, GDPR, and FTC DNC rules'}\n\n` +
  `Audit the call system for compliance violations:\n\n` +
  `TCPA (US — Telephone Consumer Protection Act):\n` +
  `- [blocking] Outbound to mobile phones: is prior written consent documented or a consent-collection step included?\n` +
  `- [blocking] Calling hours: is the 8am–9pm local-time restriction enforced per timezone?\n` +
  `- [blocking] DNC list: is the federal and state DNC list checked before every outbound dial?\n` +
  `- [blocking] Caller ID: is a real, working phone number presented as caller ID?\n` +
  `- [warning] Auto-dialer: if using predictive/power dialing, is abandonment rate tracked (< 3%)?\n\n` +
  `GDPR (EU — General Data Protection Regulation):\n` +
  `- [blocking] Call recordings: if recording, is a lawful basis documented (consent or legitimate interest)?\n` +
  `- [blocking] Transcript storage: are transcripts encrypted at rest and subject to retention limits?\n` +
  `- [warning] Phone numbers: are they stored as PII with appropriate access controls?\n` +
  `- [warning] Data minimisation: are only necessary call details logged (not full audio in plain text)?\n\n` +
  `GENERAL:\n` +
  `- [blocking] Recording consent: if recording, is the spoken consent script present and played before recording starts?\n` +
  `- [warning] Voicemail message: does the outbound voicemail clearly identify the company and provide an opt-out?\n` +
  `- [info] Webhook signature: is provider signature validation implemented on all webhook routes?\n\n` +
  `Return JSON: { checks: [{rule, severity: "blocking"|"warning"|"info", passed: boolean, detail: string}], passed: boolean }`,
  {
    label: 'compliance-checker',
    phase: 'Compliance',
    schema: {
      type: 'object',
      required: ['checks', 'passed'],
      properties: {
        checks: {
          type: 'array',
          items: {
            type: 'object',
            required: ['rule', 'severity', 'passed'],
            properties: {
              rule:     { type: 'string' },
              severity: { type: 'string' },
              passed:   { type: 'boolean' },
              detail:   { type: 'string' },
            },
          },
        },
        passed: { type: 'boolean' },
      },
    },
  }
)

const blockingFailures = compliance.checks.filter(c => !c.passed && c.severity === 'blocking')
log(`Compliance: ${compliance.checks.length} checks, ${blockingFailures.length} blocking failure(s), passed=${compliance.passed}`)

// ─── Phase: Persist ───────────────────────────────────────────────────────────
phase('Persist')

await agent(
  `Save calls agent state for session ${sessionId}.\n\n` +
  `Run:\n` +
  `cd "${AGENTS_DIR}" && node shared/lib/db-cli.js --as calls save-decision calls "${sessionId}" "telephony-patterns" ` +
  `"Built ${flow.callDirection} call system with ${integration.webhookRoutes.length} webhooks for: ${taskText.slice(0, 60).replace(/"/g, '')}" ` +
  `"Provider: ${provider}, compliance passed: ${compliance.passed}"\n\n` +
  `Then write a vault note to: ${AGENTS_DIR}/agents/calls/vault/decisions/${flow.featureName}.md\n` +
  `Content: call direction, provider, IVR flow summary, webhook routes, compliance status, voice script IDs.\n\n` +
  `Return "done".`,
  { label: 'persist-state' }
)

const allFiles = [
  ...integration.filesCreated,
  ...integration.filesUpdated,
]

return {
  sessionId,
  agentName:       'calls',
  status:          compliance.passed ? 'completed' : 'failed',
  provider,
  callDirection:   flow.callDirection,
  webhookRoutes:   integration.webhookRoutes,
  ivrFlow:         flow.inboundFlow   || null,
  campaignConfig:  flow.outboundFlow  || null,
  voiceScripts:    scripts.scripts,
  complianceChecks: compliance.checks,
  filesChanged:    allFiles,
  errors:          blockingFailures.map(c => `${c.rule}: ${c.detail}`),
}
