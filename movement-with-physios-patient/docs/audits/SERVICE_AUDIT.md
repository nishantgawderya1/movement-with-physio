# MWP Service Audit — Frontend services ↔ Backend cross-check (Read-Only)

**Date:** 2026-05-26
**Output location:** patient repo root (`movement-with-physios-patient/SERVICE_AUDIT.md`)
**Backend checked:** `/Users/gouravshokeen/Downloads/backend-repo/backend` (`src/modules/*/`, `src/plugins/*/`, routes + controllers + services)

## Scope — `src/services/**/*.js` globbed across BOTH apps

**Patient** (`movement-with-physios-patient/src/services/`):
- `bookingService.js`
- `proposalService.js`
- `chatService.js`
- `videoCallService.js`
- `notificationService.js`
- `auth/patientService.js`
- `auth/mockOnboardingService.js`

**Therapist** (`movement-with-physios/apps/therapist/src/services/`):
- `bookingService.js`
- `proposalService.js`
- `chatService.js`
- `videoCallService.js`
- `assessmentService.js`
- `availabilityService.js`
- `notificationService.js`
- `auth/AuthService.js`        *(mock REST login/register/forgot)*
- `AuthService.js`             *(Clerk abstraction — stubs)*
- `auth/OtpService.js`         *(mock OTP)*
- `auth/mockAuthService.js`    *(mock OTP)*
- `auth/tokenStorage.js`       *(in-memory token mock)*

**Backend envelope** (`src/core/utils/apiResponse.js`): `success(res,data,status=200)`→`{success:true,data}` · `paginated(res,data,pagination)`→`{success:true,data,pagination:{hasNext,cursor}}` (always 200) · `error(res,msg,status,corrId,code)`→`{success:false,error:<string>,correlationId?,code?}`.

**Auth header note:** in BOTH apps `apiClient` attaches `Authorization: Bearer <Clerk session JWT>` (via `tokenProvider.getToken()`) to every request, plus `ngrok-skip-browser-warning`. Writes that need idempotency add an `Idempotency-Key` header. Mock services and `expo-notifications` helpers make no HTTP call → no auth header.

---

# ▲ TOP SUMMARY

## ENDPOINT_MISSING (frontend calls an endpoint the backend does not expose)
**None for live/wired service functions.** Every REST endpoint hit by an actually-imported service function exists on the backend at the expected method+path:
- `/bookings`, `/bookings/:id`, `/bookings/instant`, `/bookings/:id/{cancel,accept,decline}` ✓
- `/bookings/proposals`, `/bookings/proposals/:id/{accept,decline}`, `DELETE /bookings/proposals/:id` ✓
- `/chat/rooms`, `/chat/rooms/:id/messages`, `/chat/rooms/:id/read` ✓
- `/video/calls/:id`, `/video/calls/:id/{join,leave}`, `/video/ice-config` ✓
- `/assessments/:id`, `/assessments/:id/respond`, `/assessments/:id/complete`, `/assessments/:id/pdf` ✓
- `/therapists`, `/therapists/me/clients`, `/therapists/me/instant-availability` ✓
- `/users/me/fcm-token`, `/patient/profile` ✓

*Dead mock services point at non-existent / fictional endpoints, but they are unwired so they cause no live call:* `therapist auth/AuthService.js` targets `https://your-api-domain.com/api/auth/*` (not this backend); `therapist auth/OtpService.js`/`mockAuthService.js` model `/api/auth/send-otp|verify-otp` — the backend **does** expose `POST /auth/send-otp` + `POST /auth/verify-otp`, but the mocks don't call them (see STILL_MOCKED).

## SHAPE_MISMATCH (controller output diverges from frontend expectation)
1. **`videoCallService.getIceConfig` (both apps) — error envelope is non-standard.** `iceConfig.controller.js` uses **raw `res.json`** and on TURN failure returns `{success:false, error:{code:'TURN_PROVIDER_ERROR'}}` — `error` is an **object**, whereas the standard envelope (and `apiClient`'s `json.error` read) expects `error` to be a **string**. On that path the FE surfaces a malformed/object error. (Success path `{iceServers,ttlSeconds}` is fine.)
2. **`chatService.getConversations` / `createRoom` (patient) — `avatarUrl` never present.** Patient `normalizeRoom` reads `therapist.avatarUrl`, but backend `getMyRooms`/`createRoom` populate participants with `name email role` only → `therapistAvatar` is always `null`. Non-fatal (FE has a null fallback). *(Therapist app is unaffected — it derives avatars from a local hash.)*
3. **`videoCallService.getCall` (both apps) — `participants[].profilePhoto` always null.** `videoCall.controller.js` maps `p.profilePhoto`, but the User query `.select('name role')` never includes it → dead mapping, field always `null`.
4. **`assessmentService.getAssessment` (therapist) — dual shape.** Returns the **full** assessment doc (questions+responses) for an authorized owner/therapist, but a **redacted metadata view** (`toMetadataView`) for metadata-scope actors. A caller expecting questions+responses gets a stripped object in the metadata case.
5. *(Minor / FE-tolerated)* `chatService.getMessages` returns `sender` **populated**, while `sendMessage` returns `sender` as a **raw ObjectId** — asymmetric; both FE `normalizeMessage` impls tolerate either. `chatService.getMessages` also returns a **plain array with NO `pagination` object** (seq-based via `?afterSeq`); booking/proposal lists use a cursor `pagination` object — FE pages chat by tracking max `sequenceNumber` itself.

## STILL_MOCKED (real capability/route exists, but the frontend function returns mock)
1. **`patient chatService.getTypingStatus`** — returns a hardcoded `{ success:true, data:{ isTyping:false } }` no-op. Real typing **is** available via the `/chat` socket (`subscribeToRoom`→`onTyping`, `setTyping`). Legacy stub, superseded but still exported.
2. **`therapist auth/OtpService.js` + `auth/mockAuthService.js`** (`sendOTP`/`verifyOTP`) — return canned `OTP 123456` mock responses. The backend **does** expose `POST /auth/send-otp` + `POST /auth/verify-otp`, yet these mocks are **never imported** and the live auth path uses the **Clerk SDK directly** in `ClerkAuthScreen`. Mock + dead despite real routes existing.
3. **`patient auth/mockOnboardingService.submitOnboarding`** — pure mock (`setTimeout`, returns `pat_mock_001`). There is no single onboarding-submit route; the real partial equivalent `PATCH /patient/profile` **exists and is used** by `patientService.updatePatientProfile` (pushes `painLocation` only). The rest of the onboarding payload is never persisted.
4. **`therapist auth/AuthService.js`** (`login`/`forgotPassword`/`register`) — mock `setTimeout`. No backend email/password endpoints exist (auth is Clerk-based), and the service is **unimported** → dead mock, no live call.

## Services NOT following the `{ success, data }` convention
1. **`therapist auth/mockAuthService.js`** — failure path returns `{ success:false, message:... }` (uses **`message`**, not `error`). Success uses `{ success:true, data }`. Inconsistent failure key.
2. **`therapist AuthService.js`** (root Clerk abstraction) — non-enveloped, mixed returns: `isAuthenticated()`→`false` (bool), `getCurrentUser()`→`null`, `getSessionToken()`→`null`, `sendOtp()`→`{success:true}` (no data/error), `verifyOtp()`→`{success,sessionId}`. All stubs.
3. **`therapist auth/tokenStorage.js`** — non-enveloped storage util: `saveToken()`→`void`, `getToken()`→`string|null`, `removeToken()`→`void`. (Utility, not an API service, but does not follow the contract.)
4. *(N/A — pure helpers, no envelope expected)* `patient auth/patientService.js` `mapUiLabelToBodyPart()` (returns enum string) and `BACKEND_BODY_PARTS` (const array).

## Other latent contract risks (verified against backend validation)
- **`notificationService.registerPushToken` (both apps) — FCM token regex may reject Expo tokens.** Backend `setFcmTokenSchema` requires `fcmToken` to match `/^[A-Za-z0-9_\-:]{32,512}$/`. Expo tokens look like `ExponentPushToken[xxxxxxxx]` — the `[` and `]` are **outside** the allowed charset → a real device registration would 422. Only fires on a physical device (simulator path returns early). `clearPushToken` (`{fcmToken:null}`) is fine (`.allow(null)`).
- **`patient patientService.updatePatientProfile` — `painLocation` is enum-bounded** to `['leg','knee','back','neck','shoulder','ankle','general']` or `null`; out-of-enum values 422. `mapUiLabelToBodyPart` already maps UI labels into this enum, so the wired path is safe.
- **Checked & OK (not a mismatch):** `POST /auth/email-status` requires `{ email, expectedRole }`; both apps' `ClerkAuthScreen` send `expectedRole` (`'patient'`/`'therapist'`). *(These are inline screen `apiClient` calls, not service functions — out of the per-function scope below.)*
- **Booking list `canJoin` is not returned** by `GET /bookings`/`GET /bookings/proposals` (not on the model); the therapist booking screens derive it client-side from `status`+`meetingType`+`videoCallId`+`slotStart`. Frontend booking *services* don't depend on it, so no service-level mismatch.
- **Populate asymmetry on booking writes:** `GET /bookings/:id` populates `therapistId`/`patientId`; `cancel`/`accept`/`decline`/`instant` return **un-populated** bookings (raw ObjectIds). Services pass the object through untouched, so any screen rendering names off those responses sees bare ids.

---

# PATIENT — per-function

## bookingService.js

### listBookings — `bookingService.js:44`
- Method + endpoint: `GET /api/v1/bookings` (query `status?,cursor?,limit?`)
- Auth header: Bearer (Clerk)
- Return shape: matches {success,data}? **Y** (`{success,data:[],pagination?}`)
- Mock status: **REAL**
- Cross-check: route exists ✓ (`booking.routes.js:55`, `controller.listBookings` → `paginated()`). Data = array of full Booking docs (`therapistId{name,specialty}`,`patientId{name}` populated; `videoCallId` raw). No mismatch (FE reads `data`+`pagination`).

### getBooking — `bookingService.js:72`
- Method + endpoint: `GET /api/v1/bookings/:id`
- Auth header: Bearer
- Return shape matches {success,data}? **Y**
- Mock status: **REAL**
- Cross-check: route exists ✓ (`:111`, `success()`). Data = single Booking, populated `therapistId{name,specialty,rating}`,`patientId{name,email}`. No mismatch.

### requestInstantCall — `bookingService.js:98`
- Method + endpoint: `POST /api/v1/bookings/instant` (`{therapistId,instantDelayMinutes}`)
- Auth header: Bearer + **Idempotency-Key** (auto-minted)
- Return shape matches {success,data}? **Y**
- Mock status: **REAL**
- Cross-check: route exists ✓ (`:91`, `requestInstantBooking` → `success(…,201)`). Data = `{booking, videoCall, assessment}` — `videoCall`/`assessment` are **`null` on this path** (created later on therapist accept). FE shape OK; must not assume non-null.

### cancelBooking — `bookingService.js:124`
- Method + endpoint: `PATCH /api/v1/bookings/:id/cancel` (`{reason}`)
- Auth header: Bearer
- Return shape matches {success,data}? **Y**
- Mock status: **REAL**
- Cross-check: route exists ✓ (`:122`, `success()`). Data = Booking (un-populated — raw therapist/patient ids). No envelope mismatch.

## proposalService.js

### listProposals — `proposalService.js:41`
- Method + endpoint: `GET /api/v1/bookings/proposals` (query `status?,cursor?,limit?`)
- Auth header: Bearer
- Return shape matches {success,data}? **Y** (`{success,data:[],pagination?}`)
- Mock status: **REAL**
- Cross-check: route exists ✓ (`proposal.routes.js:120`, `paginated()`). Data = array of proposals; names **nested** under `therapistId.name`/`patientId.name` (populated); `declineReason` present (null unless declined). Patient sees own pending non-expired only.

### acceptProposal — `proposalService.js:76`
- Method + endpoint: `POST /api/v1/bookings/proposals/:id/accept`
- Auth header: Bearer + **Idempotency-Key**
- Return shape matches {success,data}? **Y**
- Mock status: **REAL**
- Cross-check: route exists ✓ (`:62`, `success(…,201)`). Data = `{proposal, booking}` (created VideoCall/Assessment are side-effects, **not** in the response — reach video via `booking.videoCallId`). Status **201**.

### declineProposal — `proposalService.js:102`
- Method + endpoint: `POST /api/v1/bookings/proposals/:id/decline` (`{reason}`)
- Auth header: Bearer + **Idempotency-Key**
- Return shape matches {success,data}? **Y**
- Mock status: **REAL**
- Cross-check: route exists ✓ (`:90`, `success()` → 200). Data = `{proposal}`.

## chatService.js  *(exported as object literal, `chatService.js:326`)*

### getConversations — `chatService.js:132`
- Method + endpoint: `GET /api/v1/chat/rooms`
- Auth header: Bearer
- Return shape matches {success,data}? **Y** (`{success,data:[normalizedRooms]}`)
- Mock status: **REAL**
- Cross-check: route exists ✓ (`chat/index.js:27`, `getMyRooms`→`success()`). Data = array of rooms; participants populated `{_id,name,email,role}`. **SHAPE_MISMATCH (minor):** FE reads `therapist.avatarUrl` which the backend never selects → `therapistAvatar` always `null`.

### getMessages — `chatService.js:152`
- Method + endpoint: `GET /api/v1/chat/rooms/:roomId/messages` (query `afterSeq,limit`)
- Auth header: Bearer
- Return shape matches {success,data}? **Y** (normalizes to `{success,data:{messages,hasMore,total}}`)
- Mock status: **REAL**
- Cross-check: route exists ✓ (`index.js:31`, `getMessages`→`success()`, plain array). `sender` populated. **No `pagination` object** (seq-based; FE computes `hasMore` from page length). OK.

### sendMessage — `chatService.js:189`
- Method + endpoint: `POST /api/v1/chat/rooms/:roomId/messages` (`{text, replyTo?}`)
- Auth header: Bearer
- Return shape matches {success,data}? **Y**
- Mock status: **REAL**
- Cross-check: route exists ✓ (`index.js:32`, `sendMessage`→`success(…,201)`). Data = single Message; `sender` **raw ObjectId** here (vs populated on GET) — FE `normalizeMessage` tolerates. Backend ignores `replyTo` (not in schema write).

### markAsRead — `chatService.js:205`
- Method + endpoint: `POST /api/v1/chat/rooms/:roomId/read` (+ socket emit `mark_read`)
- Auth header: Bearer
- Return shape matches {success,data}? **Y** (`{success:true}`)
- Mock status: **REAL**
- Cross-check: route exists ✓ (`index.js:33`, `markRead`→`success({message})`). FE ignores body. OK.

### createRoom — `chatService.js:218`
- Method + endpoint: `POST /api/v1/chat/rooms` (`{participantIds:[therapistId]}`)
- Auth header: Bearer
- Return shape matches {success,data}? **Y**
- Mock status: **REAL**
- Cross-check: route exists ✓ (`index.js:28`, `createRoom`→`success(…,201)`). Data = single room, participants **populated** (`name email role`). NOTE: the in-file TODO claiming POST returns unpopulated participants is **STALE** — backend now populates on both branches. Same `avatarUrl`-absent caveat as `getConversations`.

### listAvailableTherapists — `chatService.js:232`
- Method + endpoint: `GET /api/v1/therapists?limit=50&includeUnverified=true`
- Auth header: Bearer
- Return shape matches {success,data}? **Y** (maps to `{success,data:[{id,name,email,specialty}]}`)
- Mock status: **REAL**
- Cross-check: route exists ✓ (`therapist.routes.js:152`, `listTherapists`→`paginated()`). `includeUnverified` honored & validation-allowed; select includes `name,email,specialty,rating,isVerified`. FE handles both `data.data` and `data` array. OK.

### subscribeToRoom — `chatService.js:265`
- Method + endpoint: **socket `/chat`** (`connect`, emit `join_room`; on `new_message`/`typing`/`read_by`)
- Auth header: Clerk handshake auth (`socketAuthMiddleware`)
- Return shape matches {success,data}? **N/A** (returns an unsubscribe fn)
- Mock status: **REAL** (socket)
- Cross-check: handlers exist ✓ (`chat/index.js:73-97`). OK.

### setTyping — `chatService.js:312`
- Method + endpoint: **socket `/chat`** emit `typing`
- Auth header: socket handshake
- Return shape matches {success,data}? **N/A** (void)
- Mock status: **REAL** (socket)
- Cross-check: handler exists ✓ (`chat/index.js:78`). OK.

### getTypingStatus — `chatService.js:322`
- Method + endpoint: **none** (returns hardcoded `{isTyping:false}`)
- Auth header: none
- Return shape matches {success,data}? **Y** (`{success:true,data:{isTyping:false}}`)
- Mock status: **MOCK** → **STILL_MOCKED** (real typing exists via socket; legacy no-op)

## videoCallService.js

### getCall — `videoCallService.js:23`
- Method + endpoint: `GET /api/v1/video/calls/:callId`
- Auth header: Bearer
- Return shape matches {success,data}? **Y**
- Mock status: **REAL**
- Cross-check: route exists ✓ (`video/index.js:36`, `videoCall.controller.getCall`→`success()`). Data = hand-built `{id,status,scheduledAt,...,participants[],otherParty,canJoin,assessmentId,assessmentMode}`. **SHAPE_MISMATCH (minor):** `participants[].profilePhoto` always `null` (query selects `name role` only).

### joinCall — `videoCallService.js:39`
- Method + endpoint: `POST /api/v1/video/calls/:callId/join`
- Auth header: Bearer
- Return shape matches {success,data}? **Y**
- Mock status: **REAL**
- Cross-check: route exists ✓ (`index.js:44`, `joinCall`→delegates to `getIceConfig`). Data = `{iceServers,ttlSeconds}`. Gate fail → **409** `CALL_NOT_JOINABLE`.

### leaveCall — `videoCallService.js:55`
- Method + endpoint: `POST /api/v1/video/calls/:callId/leave`
- Auth header: Bearer
- Return shape matches {success,data}? **Y**
- Mock status: **REAL**
- Cross-check: route exists ✓ (`index.js:45`, `leaveCall`→`success()`). Data = `{id,status,endedAt,durationSeconds}`, plus `alreadyEnded:true` on the idempotent branch (absent, not `false`, otherwise). OK.

### getIceConfig — `videoCallService.js:70`
- Method + endpoint: `GET /api/v1/video/ice-config`
- Auth header: Bearer
- Return shape matches {success,data}? **Y** (success path)
- Mock status: **REAL**
- Cross-check: route exists ✓ (`index.js:40`, `getIceConfig`). Uses **raw `res.json`** (bypasses helper). Success `{success:true,data:{iceServers,ttlSeconds}}` OK. **SHAPE_MISMATCH:** error path returns `error` as an **object** `{code:'TURN_PROVIDER_ERROR'}` (502), not a string → `apiClient` `json.error` mishandles it.

## notificationService.js

### requestPermissions — `notificationService.js:26`
- Method + endpoint: **none** (`expo-notifications` device API)
- Auth header: none
- Return shape matches {success,data}? **Y**
- Mock status: **REAL** (device, not backend)

### registerPushToken — `notificationService.js:60`
- Method + endpoint: `PATCH /api/v1/users/me/fcm-token` (`{fcmToken}`)
- Auth header: Bearer
- Return shape matches {success,data}? **Y** (`{success,data:{token,updated}}`)
- Mock status: **REAL**
- Cross-check: route exists ✓ (`users.routes.js:39`, `setFcmToken`→`success({updated})`). **RISK:** backend regex `/^[A-Za-z0-9_\-:]{32,512}$/` rejects Expo tokens containing `[`/`]` → 422 on a real device.

### clearPushToken — `notificationService.js:95`
- Method + endpoint: `PATCH /api/v1/users/me/fcm-token` (`{fcmToken:null}`)
- Auth header: Bearer
- Return shape matches {success,data}? **Y**
- Mock status: **REAL**
- Cross-check: route exists ✓; schema `.allow(null)` → OK.

### registerProposalCategory — `notificationService.js:123`
- Method + endpoint: **none** (`expo-notifications` iOS category)
- Auth header: none
- Return shape matches {success,data}? **Y** (`{success:true}`)
- Mock status: **REAL** (device, not backend)

## auth/patientService.js

### BACKEND_BODY_PARTS — `auth/patientService.js:17`
- Method + endpoint: **none** (exported const array)
- Return shape matches {success,data}? **N/A** (constant)
- Mock status: **N/A** (pure data — mirrors backend `painLocation` enum)

### mapUiLabelToBodyPart — `auth/patientService.js:33`
- Method + endpoint: **none** (pure mapping fn)
- Return shape matches {success,data}? **N/A** (returns enum string)
- Mock status: **N/A** (pure helper)

### updatePatientProfile — `auth/patientService.js:57`
- Method + endpoint: `PATCH /api/v1/patient/profile` (`{painLocation?,name?,phone?}`)
- Auth header: Bearer
- Return shape matches {success,data}? **Y** (returns `apiClient.patch(...)` envelope directly)
- Mock status: **REAL**
- Cross-check: route exists ✓ (`patient.routes.js:37`, `updateProfile`→`success(User)`). Caveat: `painLocation` enum-bounded (7 values | null) → 422 otherwise; `mapUiLabelToBodyPart` keeps it valid.

## auth/mockOnboardingService.js

### submitOnboarding — `auth/mockOnboardingService.js:18`
- Method + endpoint: **none** (`setTimeout` mock, returns `{patientId:'pat_mock_001',status:'pending_match'}`)
- Auth header: none
- Return shape matches {success,data}? **Y** (`{success,data}|{success:false,error}`)
- Mock status: **MOCK** → **STILL_MOCKED-adjacent** (no single submit route; `PATCH /patient/profile` exists and is used by `updatePatientProfile` for `painLocation` only; rest of payload dropped)

---

# THERAPIST — per-function

## bookingService.js

### listBookings — `bookingService.js:17`
- Method + endpoint: `GET /api/v1/bookings` (query `status?,meetingType?,cursor?,limit=20`)
- Auth header: Bearer · Return shape {success,data}? **Y** · Mock: **REAL**
- Cross-check: route exists ✓ (`paginated()`). Array of bookings; `canJoin` not on list items (screens derive). OK.

### getBooking — `bookingService.js:41`
- Method + endpoint: `GET /api/v1/bookings/:id`
- Auth header: Bearer · Return shape {success,data}? **Y** · Mock: **REAL**
- Cross-check: route exists ✓ (`success()`, populated). OK.

### acceptInstant — `bookingService.js:52`
- Method + endpoint: `POST /api/v1/bookings/:id/accept`
- Auth header: Bearer · Return shape {success,data}? **Y** · Mock: **REAL**
- Cross-check: route exists ✓ (`acceptInstantBooking`→`success()` 200). Data = `{booking,videoCall,assessment}` (all populated here). OK.

### declineInstant — `bookingService.js:63`
- Method + endpoint: `POST /api/v1/bookings/:id/decline`
- Auth header: Bearer · Return shape {success,data}? **Y** · Mock: **REAL**
- Cross-check: route exists ✓ (`declineInstantBooking`→`success()` 200). Data = `{booking}` only (asymmetric with accept). OK.

### cancelBooking — `bookingService.js:74`
- Method + endpoint: `PATCH /api/v1/bookings/:id/cancel` (`{reason}`)
- Auth header: Bearer · Return shape {success,data}? **Y** · Mock: **REAL**
- Cross-check: route exists ✓. Data = Booking (un-populated). OK.

## proposalService.js

### createProposal — `proposalService.js:43`
- Method + endpoint: `POST /api/v1/bookings/proposals` (`{patientId,slotStart,durationMinutes,timezone,meetingType,notes?}`)
- Auth header: Bearer + **Idempotency-Key** (auto)
- Return shape {success,data}? **Y** · Mock: **REAL**
- Cross-check: route exists ✓ (`proposal.routes.js:33`, `createProposal`→`success(…,201)`). Data = `{proposal}` (un-populated, status `pending`). OK.

### listProposals — `proposalService.js:63`
- Method + endpoint: `GET /api/v1/bookings/proposals` (query `status?,cursor?,limit?`)
- Auth header: Bearer · Return shape {success,data}? **Y** (`{success,data:[],pagination?}`) · Mock: **REAL**
- Cross-check: route exists ✓ (`paginated()`). Therapist view = own pending + declined-within-24h. Names nested under populated subdocs. OK.

### cancelProposal — `proposalService.js:99`
- Method + endpoint: `DELETE /api/v1/bookings/proposals/:id`
- Auth header: Bearer · Return shape {success,data}? **Y** · Mock: **REAL**
- Cross-check: route exists ✓ (`proposal.routes.js:143`, `deleteProposal`→`success()` 200). Data = `{proposal}` (soft status-flip `cancelled_by_therapist`; no patient notification). OK.

## chatService.js  *(exported as object, `chatService.js:256`)*

### getConversations — `chatService.js:123`
- Method + endpoint: `GET /api/v1/chat/rooms`
- Auth header: Bearer · Return shape {success,data}? **Y** · Mock: **REAL**
- Cross-check: route exists ✓. Avatars derived locally (hash) — **no `avatarUrl` dependency**, so the patient-app avatar mismatch does NOT apply here. OK.

### getMessages — `chatService.js:134`
- Method + endpoint: `GET /api/v1/chat/rooms/:roomId/messages` (query `afterSeq,limit`)
- Auth header: Bearer · Return shape {success,data}? **Y** · Mock: **REAL**
- Cross-check: route exists ✓ (plain array, seq-based). OK.

### sendMessage — `chatService.js:154`
- Method + endpoint: `POST /api/v1/chat/rooms/:roomId/messages` (`{text}` — TEXT ONLY)
- Auth header: Bearer · Return shape {success,data}? **Y** · Mock: **REAL**
- Cross-check: route exists ✓ (`success(…,201)`). `sender` raw on POST. NOTE: backend supports text only — chat image/voice/exercise/reactions in the UI are not persisted.

### markAsRead — `chatService.js:161`
- Method + endpoint: `POST /api/v1/chat/rooms/:roomId/read` (+ socket `mark_read`)
- Auth header: Bearer · Return shape {success,data}? **Y** · Mock: **REAL**
- Cross-check: route exists ✓. OK.

### createRoomWithPatient — `chatService.js:172`
- Method + endpoint: `POST /api/v1/chat/rooms` (`{participantIds:[patientId]}`)
- Auth header: Bearer · Return shape {success,data}? **Y** · Mock: **REAL**
- Cross-check: route exists ✓ (`success(…,201)`, populated). OK.

### listMyClients — `chatService.js:193`
- Method + endpoint: `GET /api/v1/therapists/me/clients?limit=50&includeAll=<bool>`
- Auth header: Bearer · Return shape {success,data}? **Y** · Mock: **REAL**
- Cross-check: route exists ✓ (`therapist.routes.js:54`, `getMyClients`→`paginated()`). `includeAll` honored (true=all patients; false=only confirmed/completed-booking patients). select `name email onboardingCompleted`. OK.

### subscribeToRoom — `chatService.js:215`
- Method + endpoint: **socket `/chat`** (`join_room`/`new_message`/`typing`/`read_by`)
- Return shape {success,data}? **N/A** (unsubscribe fn) · Mock: **REAL** (socket) · handlers exist ✓.

### setTyping — `chatService.js:252`
- Method + endpoint: **socket `/chat`** emit `typing`
- Return shape {success,data}? **N/A** (void) · Mock: **REAL** (socket) · handler exists ✓.

## videoCallService.js
*(identical surface to patient — same backend endpoints, same findings)*

### getCall — `videoCallService.js:13`
- `GET /api/v1/video/calls/:callId` · Bearer · {success,data}? **Y** · **REAL**
- Cross-check: route exists ✓. **SHAPE_MISMATCH (minor):** `participants[].profilePhoto` always null.

### joinCall — `videoCallService.js:26`
- `POST /api/v1/video/calls/:callId/join` · Bearer · {success,data}? **Y** · **REAL**
- Cross-check: route exists ✓; `{iceServers,ttlSeconds}`; 409 on gate fail.

### leaveCall — `videoCallService.js:39`
- `POST /api/v1/video/calls/:callId/leave` · Bearer · {success,data}? **Y** · **REAL**
- Cross-check: route exists ✓; `{id,status,endedAt,durationSeconds, alreadyEnded?}`.

### getIceConfig — `videoCallService.js:52`
- `GET /api/v1/video/ice-config` · Bearer · {success,data}? **Y** (success path) · **REAL**
- Cross-check: route exists ✓ (raw `res.json`). **SHAPE_MISMATCH:** error path `error` is an object `{code}`, not a string.

## assessmentService.js

### getAssessment — `assessmentService.js:14`
- Method + endpoint: `GET /api/v1/assessments/:id`
- Auth header: Bearer · Return shape {success,data}? **Y** · Mock: **REAL**
- Cross-check: route exists ✓ (`assessment.routes.js:72`, `success()`). **SHAPE_MISMATCH (conditional):** returns full doc for owner/therapist, but a redacted `toMetadataView` for metadata-scope actors.

### respond — `assessmentService.js:32`
- Method + endpoint: `POST /api/v1/assessments/:id/respond` (`{questionId,answer}`)
- Auth header: Bearer · Return shape {success,data}? **Y** · Mock: **REAL**
- Cross-check: route exists ✓ (`:86`, `success(updated)` 200). OK. (Patient on therapist_driven → 403 `THERAPIST_ONLY`.)

### complete — `assessmentService.js:48`
- Method + endpoint: `PATCH /api/v1/assessments/:id/complete`
- Auth header: Bearer · Return shape {success,data}? **Y** · Mock: **REAL**
- Cross-check: route exists ✓ (`:98`, **PATCH**, `success(updated)`). OK.

### getPdf — `assessmentService.js:62`
- Method + endpoint: `GET /api/v1/assessments/:id/pdf`
- Auth header: Bearer · Return shape {success,data}? **Y** · Mock: **REAL**
- Cross-check: route exists ✓ (`:111`). Two branches: **202** `{status:'generating'}` (raw `res.json`, bypasses helper) / **200** `success({status:'ready',url,generatedAt})` (url is a 5-min signed URL). FE polls on `generating`. OK.

## availabilityService.js

### toggleAvailability — `availabilityService.js:18`
- Method + endpoint: `PATCH /api/v1/therapists/me/instant-availability` (`{availableNow}`)
- Auth header: Bearer · Return shape {success,data}? **Y** · Mock: **REAL**
- Cross-check: route exists ✓ (`therapist.routes.js:97`, `setInstantAvailability`→`success({availableNow,availableNowSince})`). Exact match. OK.

## notificationService.js

### requestPermissions — `notificationService.js:23`
- Method + endpoint: **none** (`expo-notifications`) · {success,data}? **Y** · Mock: **REAL** (device)

### registerPushToken — `notificationService.js:54`
- Method + endpoint: `PATCH /api/v1/users/me/fcm-token` (`{fcmToken}`)
- Auth header: Bearer · Return shape {success,data}? **Y** · Mock: **REAL**
- Cross-check: route exists ✓ (`{updated}`). Same Expo-token regex 422 RISK as patient.

### clearPushToken — `notificationService.js:89`
- Method + endpoint: `PATCH /api/v1/users/me/fcm-token` (`{fcmToken:null}`)
- Auth header: Bearer · Return shape {success,data}? **Y** · Mock: **REAL**
- Cross-check: route exists ✓ (`.allow(null)`). OK.

## auth/AuthService.js  *(mock REST — UNIMPORTED / dead)*

### login — `auth/AuthService.js:36`
- Method + endpoint: **none** (mock `setTimeout`; comment targets `https://your-api-domain.com/api/auth/login`)
- Auth header: none · Return shape {success,data}? **Y** (`{success,data}|{success:false,error}`) · Mock: **MOCK** (dead — no importer; backend has no email/password login route — Clerk-based)

### forgotPassword — `auth/AuthService.js:96`
- Method + endpoint: **none** (mock `setTimeout`)
- Return shape {success,data}? **Y** · Mock: **MOCK** (dead; no backend `/auth/forgot`)

### register — `auth/AuthService.js:160`
- Method + endpoint: **none** (mock `setTimeout`)
- Return shape {success,data}? **Y** · Mock: **MOCK** (dead; no backend `/auth/register`)

## AuthService.js  *(root Clerk abstraction — UNIMPORTED / stubs)*

### isAuthenticated — `AuthService.js:41`
- Method + endpoint: **none** (returns `false`) · {success,data}? **N (bool)** · Mock: **MOCK/STUB**

### sendOtp — `AuthService.js:58`
- Method + endpoint: **none** (`console.warn` stub, returns `{success:true}`) · {success,data}? **partial (no data/error)** · Mock: **MOCK/STUB**

### verifyOtp — `AuthService.js:76`
- Method + endpoint: **none** (stub, `{success:true,sessionId:'stub-session'}`) · {success,data}? **N (uses sessionId)** · Mock: **MOCK/STUB**

### signOut — `AuthService.js:89`
- Method + endpoint: **none** (`console.warn` stub, void) · {success,data}? **N/A** · Mock: **MOCK/STUB**

### getCurrentUser — `AuthService.js:101`
- Method + endpoint: **none** (returns `null`) · {success,data}? **N** · Mock: **MOCK/STUB**

### getSessionToken — `AuthService.js:120`
- Method + endpoint: **none** (returns `null`) · {success,data}? **N** · Mock: **MOCK/STUB**

> Live auth uses the **Clerk SDK directly** in `ClerkAuthScreen` + `tokenProvider`/`ClerkTokenBridge`; this abstraction is dead.

## auth/OtpService.js  *(mock — UNIMPORTED)*

### sendOTP — `auth/OtpService.js:25`
- Method + endpoint: **none** (mock; `console.log('[MOCK]')` + `setTimeout`; comment models `POST /api/auth/send-otp`)
- Return shape {success,data}? **Y** · Mock: **MOCK** → STILL_MOCKED context (backend `POST /auth/send-otp` exists but unused; Clerk is live path)

### verifyOTP — `auth/OtpService.js:63`
- Method + endpoint: **none** (mock; OTP `123456` → `{token}`)
- Return shape {success,data}? **Y** · Mock: **MOCK** (backend `POST /auth/verify-otp` exists but unused)

## auth/mockAuthService.js  *(mock — UNIMPORTED)*

### sendOTP — `auth/mockAuthService.js:34`
- Method + endpoint: **none** (mock; `console.log('[MOCK]')`)
- Return shape {success,data}? **N** — failure returns `{success:false,message}` (**uses `message`, not `error`** → convention violation) · Mock: **MOCK**

### verifyOTP — `auth/mockAuthService.js:69`
- Method + endpoint: **none** (mock; phone `9876543210`+OTP `123456`)
- Return shape {success,data}? **N** (success `{success,data}`; failure `{success,message}`) · Mock: **MOCK**

## auth/tokenStorage.js  *(in-memory mock — UNIMPORTED)*

### saveToken — `auth/tokenStorage.js:22`
- Method + endpoint: **none** (in-memory `_token=token`; `console.log` mock) · {success,data}? **N (void)** · Mock: **MOCK**

### getToken — `auth/tokenStorage.js:38`
- Method + endpoint: **none** (returns `_token`) · {success,data}? **N (string|null)** · Mock: **MOCK**

### removeToken — `auth/tokenStorage.js:53`
- Method + endpoint: **none** (`_token=null`; `console.log`) · {success,data}? **N (void)** · Mock: **MOCK**

---

*End of audit. No files were modified; no fixes proposed.*
