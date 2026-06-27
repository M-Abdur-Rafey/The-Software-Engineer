# Twilio Integration

## Install
```bash
npm install twilio
```

## Client singleton (src/integrations/twilio.client.js)
```js
'use strict'
const twilio = require('twilio')
let _client = null
function getClient() {
  if (!_client) _client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
  return _client
}
module.exports = { getClient }
```

## Environment variables required
```
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_PHONE_NUMBER=+15551234567
BASE_URL=https://your-domain.com
```

## Webhook signature validation (MANDATORY on every route)
```js
const twilio = require('twilio')

function validateTwilioSignature(req, res, next) {
  const valid = twilio.validateRequest(
    process.env.TWILIO_AUTH_TOKEN,
    req.headers['x-twilio-signature'],
    `${process.env.BASE_URL}${req.originalUrl}`,
    req.body  // must be urlencoded body, not JSON — use express.urlencoded()
  )
  if (!valid) return res.status(403).json({ success: false, code: 'ERR_INVALID_SIGNATURE' })
  next()
}
module.exports = { validateTwilioSignature }
```

**Important:** Twilio webhooks send urlencoded POST bodies, not JSON. Use:
`app.use('/webhooks/twilio', express.urlencoded({ extended: false }))`

## Make an outbound call
```js
const { getClient } = require('../integrations/twilio.client')

async function dial({ to, twimlUrl, statusCallbackUrl }) {
  return getClient().calls.create({
    to,
    from: process.env.TWILIO_PHONE_NUMBER,
    url: twimlUrl,                            // TwiML for call flow
    statusCallback: statusCallbackUrl,         // receives call status updates
    statusCallbackMethod: 'POST',
    machineDetection: 'Enable',               // AMD
    asyncAmd: true,
    asyncAmdStatusCallback: statusCallbackUrl,
  })
}
```

## Inbound TwiML response (Express handler)
```js
const { VoiceResponse } = require('twilio').twiml

function greetCaller(req, res) {
  const response = new VoiceResponse()
  response.say({ voice: 'Polly.Joanna' }, 'Thank you for calling. This call may be recorded.')
  const gather = response.gather({ numDigits: 1, timeout: 5, action: '/webhooks/twilio/menu' })
  gather.say({ voice: 'Polly.Joanna' }, 'Press 1 for support. Press 2 for billing. Press 3 to leave a message.')
  response.redirect('/webhooks/twilio/inbound')  // timeout fallback: repeat
  res.type('text/xml').send(response.toString())
}
```
