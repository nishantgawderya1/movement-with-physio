# Session Proposals — Build Plan

Last updated: 2026-05-23. Branch: feat/session-proposals @ 4a7d6bd.

## Locked decisions (no re-questioning)

### Backend
- Separate `BookingProposal` model (not extending Booking)
- Routes: POST /api/v1/bookings/proposals, POST /:id/accept, POST /:id/decline, GET /, DELETE /:id
- S2 relationship gate: therapist must have prior confirmed/completed Booking with patient. Error code `NO_PRIOR_RELATIONSHIP`
- Conflict matrix: therapist own confirmed/pending blocks; patient blocks only on confirmed bookings (concurrent proposals from multiple therapists allowed)
- Past-slot validation: reject at create with `PROPOSAL_SLOT_IN_PAST` (400), reject at accept with `PROPOSAL_SLOT_NOW_PAST` (409)
- 24h expiry via BullMQ periodic sweep (mirrors `handleExpireInstantRequests` pattern)
- `findOneAndUpdate` with state predicate for accept/decline/delete race resolution. Patient-accept wins simultaneous race
- `PROPOSAL_RECEIVED` joins `CRITICAL_NOTIFICATION_TYPES` (email fallback for patients without FCM token)
- FCMAdapter extended with `apns.payload.aps.category` plumbing (prerequisite for action buttons)
- Decline reason sanitized per S-followup-6 pattern (never raw text in push body)
- Typed error codes following `<MODULE>_<CONDITION>` UPPERCASE_SNAKE
- Test surface: 6 `.security.test.js` + 3 `.regression.test.js` files

### Therapist app
- Remove video button + smart-join probe + dead state/imports/styles from `ChatScreen.jsx`
- "Propose session" via header right `+` button on BookingsScreen (mirrors MessagesScreen new-chat pattern)
- Single-screen propose flow: patient bottom-sheet picker + reused CalendarPicker + hand-built hour/minute pill time picker + PillSelector meeting type + multi-line notes (max 500)
- Patient picker source: `chatService.listMyClients()` with `includeAll: false`
- Pending + declined proposals as new section inside Upcoming tab of BookingsScreen
- Decline auto-hide: 24h
- Bottom-sheet detail view (no separate ProposalDetailScreen)
- New `proposalService.js`
- Foreground notification: `shouldShowBanner: true` WITH VideoCallScreen suppression via AppState/route check
- Push tap-action data fields: type, proposalId, bookingId (accept only), patientName, slotStart, reason (decline only, sanitized)
- Dependencies to install: `expo-notifications`, `expo-device`
- Architecture rules: services pattern, mock-first, `{success, data}|{success, error}`, useNativeDriver:true

### Patient app
- Remove video button + smart-join probe + dead state/imports/styles + InstantCallModal from `ChatRoomScreen.jsx`
- Convert Book tab into Appointments hub by inserting new `AppointmentsRootScreen` as BookStack root
- Rename tab "Book" → "Appointments"
- AppointmentsRootScreen sections: Pending Proposals (when ≥1) + Upcoming Sessions + Past Sessions (collapsed) + floating "Book new session" CTA
- Proposal row: avatar/name/slot/meeting-type/notes-preview + Accept (PrimaryButton) + Decline (OutlineButton), borderRadius:12 height:52
- DeclineProposalSheet (bottom-sheet, mirrors AttachmentSheet)
- Decline UX: single "Decline" button (always enabled) + Cancel
- New `proposalService.js`: listProposals, acceptProposal, declineProposal
- Push notification setup:
  - `setNotificationHandler` with type-aware config
  - `setNotificationCategoryAsync('PROPOSAL', [ACCEPT_PROPOSAL, DECLINE_PROPOSAL])` with `opensAppToForeground: true`
  - `addNotificationResponseReceivedListener` in App.jsx
  - VideoCallScreen suppression matching therapist app
- Push permission request: on first launch after onboarding completes
- Accept tap navigation: open app → land in Appointments tab → silent API fire → 3s banner "Session confirmed"
- Decline tap: open app → land in Appointments tab → open DeclineProposalSheet
- NSE, custom push sound, HomeScreen mini-card: deferred to post-MVP
- Dependencies to install: `expo-notifications`, `expo-device`

## Critical infrastructure gaps to resolve

Both apps lack push infrastructure entirely. Build order MUST address:
1. Backend FCM token storage endpoint (`PATCH /api/v1/users/me/fcm-token` or equivalent) — verify or add
2. FCMAdapter APNs category plumbing
3. Therapist app push infrastructure
4. Patient app push infrastructure with action button categories

## Commit sequence — 4 days, parallel where safe

### Day 1: Backend foundation
- P1.1 + P1.2 parallel (FCM token endpoint + FCMAdapter category) — different files, safe parallel
- P1.3 serial (BookingProposal model) — foundation for P2
- P2.1 serial (POST /proposals create)

### Day 2: Backend routes + therapist/patient chat cleanup
- P2.2 + P2.3 serial within service file, but tests can be drafted by parallel agents
- P2.4 (expiry sweep) + P3.1 (therapist chat) + P4.1 (patient chat) — THREE PARALLEL, zero overlap
- P3.2 + P4.2 parallel (both apps push infra) — different repos

### Day 3: Frontend feature work
- P3.3 + P4.3 parallel (proposalService + scaffolds)
- P3.4 + P4.4 parallel (propose flow + accept/decline)
- P3.5 serial (therapist pending/declined section)

### Day 4: Integration + cleanup
- E2E on real device — therapist proposes, patient receives, accept/decline/expiry all paths
- Bug fixes from E2E
- Merge to main with --no-ff

## Out of scope — tracked followups

- DM Sans body font gap (therapist app uses system default)
- IncomingInstantCallModal not mounted (therapist instant-call flow broken)
- Patient instant-call entry point relocation (after InstantCallModal removal)
- Dead `pending` enum value on Booking model
- SlotSelectionScreen hardcoded mocks (patient booking flow not yet wired to real backend)
- HomeScreen pending-proposals mini-card (polish iteration)
- NSE for silent background actions
- Custom push sound asset
- PluginManager error swallowing
- Lying `/health` endpoint (returns 200 with plugins dead)
- lru-cache transitive dep overrides
- Secrets-in-compose-config plaintext leak

## Risk register

- Free Apple Personal Team 7-day cert rotation — may interrupt mid-development
- Bun stability — crashed once already this session
- SlotSelectionScreen mocks — proposal-accept will be first real backend booking creation from patient side
- expo-notifications + free Personal Team signing — additional Xcode target risk (only NSE problematic; we defer NSE)
- 24h expiry timing in dev — configurable EXPIRY_HOURS env var, default 24, set to ~36s in tests

