# IVR Design Patterns

## Core principles

1. **Maximum 3 levels deep** — callers abandon after 3 menu levels
2. **Every path terminates** — transfer / voicemail / message-and-hangup (no dead ends)
3. **Timeout fallback** — always: no key pressed → repeat once → fallback action
4. **Invalid input** → say "I didn't understand" → repeat menu once → fallback

## Standard IVR state machine

```
CALL_IN
  └─ greeting + recording_consent (if recording)
      └─ MAIN_MENU
          ├─ [1] → SUPPORT_SUBMENU
          │     ├─ [1] → transfer_to_agent
          │     ├─ [2] → voicemail
          │     └─ [timeout/invalid] → transfer_to_agent
          ├─ [2] → BILLING_SUBMENU
          │     └─ ...
          ├─ [0] → transfer_to_agent (always offer 0 = human)
          └─ [timeout/invalid] → repeat_menu → transfer_to_agent
```

## Business hours check pattern

```js
function isBusinessHours(timezone = 'America/New_York') {
  const now = new Date()
  const local = new Date(now.toLocaleString('en-US', { timeZone: timezone }))
  const hour = local.getHours()
  const day  = local.getDay()  // 0 = Sunday
  return day >= 1 && day <= 5 && hour >= 8 && hour < 18
}

// In IVR handler
if (!isBusinessHours()) {
  // respond with after-hours TwiML → voicemail
}
```

## Call transfer (warm transfer)
```js
const response = new VoiceResponse()
response.say({ voice: 'Polly.Joanna' }, 'Please hold while I connect you to an agent.')
const dial = response.dial({ callerId: process.env.TWILIO_PHONE_NUMBER, timeout: 30 })
dial.number(process.env.AGENT_PHONE_NUMBER)
// Add statusCallbackEvent to detect if agent doesn't answer → redirect to voicemail
```

## Voicemail
```js
const response = new VoiceResponse()
response.say({ voice: 'Polly.Joanna' }, 'No one is available. Please leave a message after the tone.')
response.record({
  maxLength: 120,
  transcribe: true,
  transcribeCallback: '/webhooks/twilio/voicemail-transcription',
  action: '/webhooks/twilio/voicemail-done',
  playBeep: true,
})
```
