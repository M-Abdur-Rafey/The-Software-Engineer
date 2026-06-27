# Vonage Voice API Integration

## Install
```bash
npm install @vonage/server-sdk
```

## Client singleton
```js
const { Vonage } = require('@vonage/server-sdk')
const vonage = new Vonage({
  apiKey:    process.env.VONAGE_API_KEY,
  apiSecret: process.env.VONAGE_API_SECRET,
  applicationId: process.env.VONAGE_APP_ID,
  privateKey: process.env.VONAGE_PRIVATE_KEY_PATH,
})
module.exports = { vonage }
```

## NCCO (Nexmo Call Control Object) — Vonage equivalent of TwiML
```js
// Inbound answer webhook returns NCCO array
function answerWebhook(req, res) {
  const ncco = [
    { action: 'talk', text: 'Thank you for calling. Press 1 for support.', bargeIn: true },
    {
      action: 'input',
      type: ['dtmf'],
      dtmf: { timeOut: 5, maxDigits: 1 },
      eventUrl: [process.env.BASE_URL + '/webhooks/vonage/input']
    }
  ]
  res.json(ncco)
}
```

## Webhook signature validation
```js
const crypto = require('crypto')

function validateVonageSignature(req, res, next) {
  const sig = req.headers['x-nexmo-signature']
  const expected = crypto
    .createHmac('sha256', process.env.VONAGE_SIGNATURE_SECRET)
    .update(JSON.stringify(req.body))
    .digest('hex')
  if (sig !== expected) return res.status(403).json({ success: false, code: 'ERR_INVALID_SIGNATURE' })
  next()
}
```
