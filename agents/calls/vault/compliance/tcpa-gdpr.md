# Compliance Rules — TCPA & GDPR

## TCPA (US — Telephone Consumer Protection Act)

### Blocking violations (commit blocked if not resolved)

| Rule | Requirement |
|------|------------|
| Prior consent | Automated calls to US mobile numbers require prior written consent |
| Calling hours | 8am–9pm in the CALLEE's local timezone — not the caller's |
| DNC list | Must check federal + state DNC list before EVERY outbound call |
| Caller ID | Present a real working phone number — cannot spoof or hide |
| Abandoned calls | Predictive dialer abandonment rate must stay < 3% per campaign |

### Implementation requirements

```js
// Consent must be recorded before dialing mobile numbers
const consent = await db.query(
  'SELECT given_at FROM consents WHERE phone = ? AND type = ?',
  [phone, 'outbound_call']
)
if (!consent) throw new Error('NO_CONSENT_RECORDED')

// Calling hours (CALLEE timezone)
const tz = await client.lookups.v2.phoneNumbers(phone).fetch({ fields: 'line_type_intelligence' })
// Use tz.callerName.callerType + tz to calculate local time
```

## GDPR (EU — General Data Protection Regulation)

| Rule | Requirement |
|------|------------|
| Lawful basis | Document why you are calling (consent / legitimate interest / contract) |
| Data minimisation | Store only what is necessary — last 4 digits in logs, not full number |
| Transcript encryption | Transcripts must be encrypted at rest; set retention limit (e.g. 90 days) |
| Right to erasure | Deleting a contact must delete all call logs and recordings |
| Recording consent | Spoken consent at the start of the call if recording (not just a notice) |

## Recording consent script (required in UK, EU, many US states)

> "This call may be recorded for quality and training purposes. By continuing, you consent to this recording. If you do not wish to be recorded, please press 9 now."

## DNC list integration

```js
// Minimum: internal DNC list
// Recommended: integrate with National DNC Registry (FTC) via Data.com or Synapse API

async function checkDNC(phone) {
  const internal = await db.query('SELECT 1 FROM dnc_list WHERE phone = ?', [phone])
  if (internal) return { blocked: true, reason: 'internal_dnc' }
  // Add external DNC API check here
  return { blocked: false }
}

// Opt-out handler — any caller pressing 9 or saying "stop" is added to DNC
async function handleOptOut(phone) {
  await db.query(
    'INSERT OR IGNORE INTO dnc_list (phone, added_at, reason) VALUES (?, ?, ?)',
    [phone, Date.now(), 'caller_request']
  )
}
```
