'use strict';

const Joi = require('joi');

// FCM/expo tokens are opaque, URL-safe base64-ish identifiers issued by
// the platform messaging service. Length is not formally capped by FCM;
// the [32, 512] bound is a defensive envelope around current observed
// shapes (~150-200 chars) with room for future SDK drift.
//
// NOTE: the shared validate middleware (src/core/middleware/validate.js)
// uses { abortEarly: false, stripUnknown: true } and surfaces 422 with a
// generic "Validation error" message — it does NOT thread Joi's typed
// `code` field through to the response. So FCM_TOKEN_INVALID_FORMAT
// lives in spec, not on the wire. Tightening that is a cross-cutting
// middleware change tracked as a separate followup.
//
// Side effect of stripUnknown: unknown body fields are silently dropped
// rather than rejected — `.unknown(false)` below is moot under that
// middleware. The actual privilege-escalation surface (e.g. injecting
// role into the body) is closed by `User.findByIdAndUpdate(id, { fcmToken })`
// in users.service.js, which writes only the whitelisted field regardless
// of what reaches the controller. The schema is kept strict here so a
// future middleware change (or direct schema-level call) preserves intent.
const setFcmTokenSchema = Joi.object({
  fcmToken: Joi.string()
    .trim()
    .pattern(/^[A-Za-z0-9_\-:]{32,512}$/)
    .allow(null)
    .required(),
}).unknown(false);

module.exports = { setFcmTokenSchema };
