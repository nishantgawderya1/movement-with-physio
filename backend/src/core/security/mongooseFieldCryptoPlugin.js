'use strict';

const { encrypt, decrypt, isEncrypted } = require('./fieldCrypto');

/**
 * Mongoose plugin that transparently encrypts/decrypts named fields.
 *
 * Usage:
 *   schema.plugin(fieldCryptoPlugin, { fields: ['phone'] });
 *
 * Hooks:
 *   pre('save')              — encrypt modified fields before persisting
 *   pre('insertMany')        — encrypt fields on bulk insert
 *   pre('findOneAndUpdate')  — encrypt fields in the update payload (handles
 *                              both top-level updates and $set form)
 *   pre('updateOne')         — same, on model.updateOne(...)
 *   pre('updateMany')        — same, on model.updateMany(...)
 *   post('init')             — decrypt fields after read (findOne, find, etc.)
 *
 * Why we cover update operators too: `patient.service.completeOnboarding`
 *   calls `User.findOneAndUpdate(...)` with `phone` in the payload. Without
 *   this hook the phone would silently land in the DB as plaintext —
 *   exactly the "if that changes, add an updateOne pre-hook" case called out
 *   when this plugin was first sketched. Phase 3A.1 implements it.
 *
 * Why post('init') instead of post('find'): runs once per document on load,
 *   including documents created via Model.hydrate() or fetched via
 *   findOne/findOneAndUpdate. Plain `.lean()` queries BYPASS Mongoose
 *   middleware entirely — callers using `.lean()` will see ciphertext for
 *   encrypted fields. The codebase currently does not `.lean()` on User
 *   reads that need `phone`. Audit before adding any such query.
 */
function fieldCryptoPlugin(schema, options = {}) {
  const fields = Array.isArray(options.fields) ? options.fields : [];
  if (fields.length === 0) return;

  // ── Writes ─────────────────────────────────────────────────────
  schema.pre('save', function (next) {
    for (const field of fields) {
      if (this.isModified(field)) {
        const value = this.get(field);
        if (value != null && !isEncrypted(value)) {
          this.set(field, encrypt(value));
        }
      }
    }
    next();
  });

  schema.pre('insertMany', function (next, docs) {
    if (Array.isArray(docs)) {
      for (const doc of docs) {
        for (const field of fields) {
          if (doc[field] != null && !isEncrypted(doc[field])) {
            doc[field] = encrypt(doc[field]);
          }
        }
      }
    }
    next();
  });

  /**
   * Encrypt a field that appears either as a top-level key or under $set
   * in an update operator object. Idempotent via isEncrypted check.
   */
  function encryptUpdatePayload(update) {
    if (!update || typeof update !== 'object') return;
    for (const field of fields) {
      // Top-level shorthand: { phone: '...' }
      if (Object.prototype.hasOwnProperty.call(update, field)) {
        const v = update[field];
        if (v != null && !isEncrypted(v)) {
          update[field] = encrypt(v);
        }
      }
      // $set form: { $set: { phone: '...' } }
      if (update.$set && Object.prototype.hasOwnProperty.call(update.$set, field)) {
        const v = update.$set[field];
        if (v != null && !isEncrypted(v)) {
          update.$set[field] = encrypt(v);
        }
      }
    }
  }

  // Note: in Mongoose query middleware, `this` is the Query instance.
  // `this.getUpdate()` returns the update payload that will go to the DB.
  function updateHook(next) {
    const update = this.getUpdate();
    encryptUpdatePayload(update);
    next();
  }

  schema.pre('findOneAndUpdate', updateHook);
  schema.pre('updateOne', updateHook);
  schema.pre('updateMany', updateHook);

  // ── Reads ──────────────────────────────────────────────────────
  // Single post('init') handler — decrypt + clear the dirty flag in one pass
  // so the next save() doesn't re-encrypt the already-plaintext value.
  schema.post('init', function () {
    for (const field of fields) {
      const value = this.get(field);
      if (value != null && isEncrypted(value)) {
        try {
          this.set(field, decrypt(value), undefined, { skipMarkModified: true });
        } catch (e) {
          // Decryption failed — leave the ciphertext in place. Surfaces in app
          // logs when the field is read. Common cause: rotated/lost key.
        }
      }
      // Whether we decrypted or not, ensure post-init reads aren't flagged dirty.
      this.unmarkModified(field);
    }
  });
}

module.exports = fieldCryptoPlugin;
