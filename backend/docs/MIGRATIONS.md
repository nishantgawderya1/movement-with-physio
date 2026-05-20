# Backend migrations

Append-only log of schema-affecting changes. Each entry lists the date,
the field/index changed, and the runtime impact on existing data.

---

- **2026-05-20** — `User.painLocation` field added (Phase 3A).
  Enum: `leg | knee | back | neck | shoulder | ankle | general`.
  Indexed (sparse since nullable). Default: `null`.
  **Impact on existing users:** existing User docs have `painLocation: null`
  after the migration. The Phase 2B booking flow falls back to `'general'`
  template when `painLocation` is null, so booked-video assessments still
  receive a valid question set. New patients capture this during onboarding
  (`PATCH /api/v1/patient/profile` from `AvailabilityScreen`); existing
  patients can set it from `ProfileScreen` → "Primary body part".
