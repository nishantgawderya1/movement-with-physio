# MWP Audits — institutional memory

This folder contains read-only audits produced during Phase 1 (Tier 0
cleanup), Phase 2 (custom Clerk auth UI rebuild), and Phase 3 / 3.5
(convention cleanup + palette completion). They are NOT specification
documents — they are point-in-time investigations that informed the
cleanup commits on `feat/session-proposals`.

| File | Phase | Purpose |
|---|---|---|
| UI_AUDIT_PATIENT.md | Pre-Phase 2 | Every screen × interactive element × backend endpoint, patient app |
| UI_AUDIT_THERAPIST.md | Pre-Phase 2 | Same, therapist app |
| SERVICE_AUDIT.md | Pre-Phase 2 | Frontend service ↔ backend route reality check (both apps) |
| AUTH_AUDIT.md | Pre-Phase 2 | Clerk integration audit (both apps) — confirmed Core 2 SDK, custom flow |
| DESIGN_TOKENS.md | Pre-Phase 2 | Color/font/radius/spacing extraction, both apps |
| GHOST_UI.md | Pre-Phase 2 | Ghost-UI sweep — buttons with no onPress, mock flows, etc. |
| TIER3_INVESTIGATION.md | Pre-Tier 3 | Per-commit reconnaissance for Tier 3 cleanup |
| INTEGRITY_CHECK.md | Post-Tier 3.5 | Static integrity audit of all Phase 2 + Tier 3 + Tier 3.5 commits (zero HIGH / zero MED / 3 LOW findings) — branch declared safe for device-test |

## What's NOT here

- Code conventions → see each repo's CLAUDE.md
- Tier 4 product decisions → not yet documented in this branch
- Backend audit → see the backend repo

## Reading order if you're new

1. AUTH_AUDIT.md (smallest, gives architecture context)
2. DESIGN_TOKENS.md (design system context)
3. UI_AUDIT_PATIENT.md / UI_AUDIT_THERAPIST.md (the bulk)
4. SERVICE_AUDIT.md (where frontend meets backend)
5. GHOST_UI.md (what's broken/mock and why)
6. INTEGRITY_CHECK.md (if you want to see how the cleanup was verified)
