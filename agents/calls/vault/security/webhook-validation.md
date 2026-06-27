# Webhook Security

## Twilio signature validation

Every Twilio webhook MUST validate the X-Twilio-Signature header.
Without this, anyone can POST fake call events to your endpoints.

```js
const twilio = require('twilio')

function validateTwilioSignature(req, res, next) {
  const authToken = process.env.TWILIO_AUTH_TOKEN
  const signature = req.headers['x-twilio-signature']
  const url       = `${process.env.BASE_URL}${req.originalUrl}`
  const params    = req.body  // must be urlencoded body

  if (!twilio.validateRequest(authToken, signature, url, params)) {
    return res.status(403).json({ success: false, code: 'ERR_INVALID_SIGNATURE', message: 'Invalid Twilio signature' })
  }
  next()
}
```

**Critical:** Twilio sends urlencoded bodies, not JSON. The route must use:
```js
router.use(express.urlencoded({ extended: false }))
```
If you use `express.json()` on a Twilio route, the signature validation will fail.

## Vonage signature validation

```js
const crypto = require('crypto')

function validateVonageSignature(req, res, next) {
  const received = req.headers['x-nexmo-signature']
  const computed = crypto
    .createHmac('sha256', process.env.VONAGE_SIGNATURE_SECRET)
    .update(JSON.stringify(req.body))
    .digest('hex')
  if (received !== computed) {
    return res.status(403).json({ success: false, code: 'ERR_INVALID_SIGNATURE' })
  }
  next()
}
```

## General security rules

- Never log full phone numbers — store and log the last 4 digits only
- Never log full transcript text without encryption-at-rest confirmation
- Call recordings must be served via presigned URLs, never public URLs
- Rotate TWILIO_AUTH_TOKEN immediately if leaked (generates a new token in Twilio console)
- Use separate Twilio subaccounts for prod vs staging
