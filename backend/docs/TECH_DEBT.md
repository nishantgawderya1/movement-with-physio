# Tech debt

Tracking known limitations, planned cleanups, and load-bearing workarounds.
Sister of `docs/MIGRATIONS.md` (which is append-only schema changes).

---

## Phase 3A.1 — encryption rewrite (2026-05-20)

- Replaced `mongoose-field-encryption@4.0.7` (incompatible with Mongoose 8;
  uses removed `this.update()` in pre-save hooks) with an in-house AES-GCM
  helper at `src/core/security/fieldCrypto.js` + a Mongoose plugin at
  `src/core/security/mongooseFieldCryptoPlugin.js`.
- Encryption format includes a version prefix (`v1:...`) for future key
  rotation without bulk re-encryption.
- Dev DB was wiped during this migration. No production data existed at the
  time (user confirmed).
- The new plugin covers `pre('save')`, `pre('insertMany')`,
  `pre('findOneAndUpdate')`, `pre('updateOne')`, `pre('updateMany')`, and
  `post('init')`. The original sketch in the Phase 3A.1 spec deliberately
  did NOT cover update operators; we added them because
  `patient.service.completeOnboarding` calls `User.findOneAndUpdate(...)`
  with a `phone` field — without the hook, that path silently writes
  plaintext.

## Known limitations of in-house field encryption

- **No queries against encrypted fields.** Ciphertext is randomized per
  write (random IV), so `User.findOne({ phone: '...' })` never matches.
  If lookup by phone is needed in future (e.g. SMS deep-link → user
  resolution), add a sibling `phoneHash` field with a deterministic HMAC
  for indexed equality lookups. Keep the existing `phone` field for the
  authoritative ciphertext; the hash is search-only.
- **`.lean()` queries bypass Mongoose middleware** — `phone` comes back
  as ciphertext. The codebase does not currently `.lean()` on User reads
  that need `phone`. Audit before introducing one; if needed, decrypt
  inline at the call site via the exported `decrypt()` helper.
- **`Model.bulkWrite()`, `Model.replaceOne()`** — not covered. None of
  the existing service code uses them on User; if added, extend the
  plugin or call `encrypt()` manually in the payload.
- **Single key.** All ciphertext is `v1:...`. Key rotation is supported
  by the version-prefix design but no rotation tooling exists yet.

## Future work

- When approaching production launch, evaluate MongoDB's native
  Client-Side Field-Level Encryption (CSFLE) as a replacement. CSFLE
  handles queries against encrypted fields via deterministic encryption
  mode and integrates with KMS providers (AWS KMS, GCP KMS, Azure Key
  Vault) for proper key management. Out of scope for MVP.
- Add key rotation tooling (`npm run rotate:field-key`) when a second
  key version is introduced. Migration shape: enumerate User docs with
  any `phone` field starting `v1:`, decrypt with old key, re-encrypt
  with v2 key, write back. Should be runnable as a background job.
- If/when more encrypted fields land on other models, lift the
  shared `mongooseFieldCryptoPlugin` config into a project-wide
  registry of `{ model: [...fields] }` for visibility.
