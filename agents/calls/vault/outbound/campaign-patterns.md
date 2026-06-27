# Outbound Call Campaign Patterns

## Pre-dial checklist (run before every outbound call)

```js
async function preDialCheck(phoneNumber) {
  // 1. Normalize number to E.164 format
  const e164 = normalizeToE164(phoneNumber)
  // 2. Check internal DNC list
  const isDNC = await db.query('SELECT 1 FROM dnc_list WHERE phone = ?', [e164])
  if (isDNC) throw new Error('DNC_BLOCKED')
  // 3. Check calling hours (callee's local timezone)
  const tz = await lookupTimezone(e164)  // use twilio lookup or ip-timezone
  if (!isCallingHours(tz)) throw new Error('OUTSIDE_CALLING_HOURS')
  // 4. Check retry count
  const attempts = await db.query('SELECT count FROM call_attempts WHERE phone = ?', [e164])
  if (attempts >= 3) throw new Error('MAX_RETRIES_REACHED')
  return { e164, tz }
}
```

## Answering Machine Detection (AMD)

```js
// Initial call with AMD enabled
const call = await client.calls.create({
  to: e164,
  from: process.env.TWILIO_PHONE_NUMBER,
  url: `${BASE_URL}/webhooks/twilio/outbound-twiml`,
  machineDetection: 'Enable',
  asyncAmd: true,
  asyncAmdStatusCallback: `${BASE_URL}/webhooks/twilio/amd-result`,
})

// AMD result webhook handler
function handleAmdResult(req, res) {
  const { AnsweredBy, CallSid } = req.body
  // AnsweredBy: "human" | "machine_start" | "machine_end_beep" | "fax" | "unknown"
  if (AnsweredBy === 'human') {
    // Update call with human-answered TwiML
    client.calls(CallSid).update({ url: `${BASE_URL}/webhooks/twilio/human-script` })
  } else if (AnsweredBy.startsWith('machine')) {
    // Update call with voicemail TwiML
    client.calls(CallSid).update({ url: `${BASE_URL}/webhooks/twilio/voicemail-script` })
  }
  res.sendStatus(200)
}
```

## Call result tracking

```js
// Status callback handler — records every state transition
async function handleStatusCallback(req, res) {
  const { CallSid, CallStatus, CallDuration, To } = req.body
  // CallStatus: initiated | ringing | in-progress | completed | busy | no-answer | canceled | failed
  await db.query(
    'INSERT OR REPLACE INTO call_logs (id, phone_number, status, duration_ms) VALUES (?, ?, ?, ?)',
    [CallSid, To.slice(-4), CallStatus, (CallDuration || 0) * 1000]  // store last 4 digits only
  )
  res.sendStatus(200)
}
```

## Retry schedule

```js
async function scheduleRetry(phoneNumber, attemptNumber) {
  if (attemptNumber >= 3) return  // max 3 attempts
  const delayHours = attemptNumber === 1 ? 1 : 4  // 1h after first, 4h after second
  const retryAt = Date.now() + delayHours * 3600 * 1000
  await db.query(
    'INSERT INTO retry_queue (phone, retry_at, attempt) VALUES (?, ?, ?)',
    [phoneNumber, retryAt, attemptNumber + 1]
  )
}
```
