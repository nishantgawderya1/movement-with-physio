# Graph Report - /Users/gouravshokeen/Downloads/backend-repo/backend  (2026-04-26)

## Corpus Check
- 87 files · ~17,417 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 244 nodes · 249 edges · 58 communities detected
- Extraction: 69% EXTRACTED · 31% INFERRED · 0% AMBIGUOUS · INFERRED: 77 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 26|Community 26]]
- [[_COMMUNITY_Community 27|Community 27]]
- [[_COMMUNITY_Community 28|Community 28]]
- [[_COMMUNITY_Community 29|Community 29]]
- [[_COMMUNITY_Community 30|Community 30]]
- [[_COMMUNITY_Community 31|Community 31]]
- [[_COMMUNITY_Community 32|Community 32]]
- [[_COMMUNITY_Community 33|Community 33]]
- [[_COMMUNITY_Community 34|Community 34]]
- [[_COMMUNITY_Community 35|Community 35]]
- [[_COMMUNITY_Community 36|Community 36]]
- [[_COMMUNITY_Community 37|Community 37]]
- [[_COMMUNITY_Community 38|Community 38]]
- [[_COMMUNITY_Community 39|Community 39]]
- [[_COMMUNITY_Community 40|Community 40]]
- [[_COMMUNITY_Community 41|Community 41]]
- [[_COMMUNITY_Community 42|Community 42]]
- [[_COMMUNITY_Community 43|Community 43]]
- [[_COMMUNITY_Community 44|Community 44]]
- [[_COMMUNITY_Community 45|Community 45]]
- [[_COMMUNITY_Community 46|Community 46]]
- [[_COMMUNITY_Community 47|Community 47]]
- [[_COMMUNITY_Community 48|Community 48]]
- [[_COMMUNITY_Community 49|Community 49]]
- [[_COMMUNITY_Community 50|Community 50]]
- [[_COMMUNITY_Community 51|Community 51]]
- [[_COMMUNITY_Community 52|Community 52]]
- [[_COMMUNITY_Community 53|Community 53]]
- [[_COMMUNITY_Community 54|Community 54]]
- [[_COMMUNITY_Community 55|Community 55]]
- [[_COMMUNITY_Community 56|Community 56]]
- [[_COMMUNITY_Community 57|Community 57]]

## God Nodes (most connected - your core abstractions)
1. `get()` - 14 edges
2. `error()` - 11 edges
3. `set()` - 10 edges
4. `invalidate()` - 10 edges
5. `bootstrap()` - 8 edges
6. `paginate()` - 8 edges
7. `getClient()` - 6 edges
8. `S3Adapter` - 5 edges
9. `SocketIOAdapter` - 5 edges
10. `ResendAdapter` - 5 edges

## Surprising Connections (you probably didn't know these)
- `listNotifications()` --calls--> `paginate()`  [INFERRED]
  /Users/gouravshokeen/Downloads/backend-repo/backend/src/plugins/notification/notification.service.js → /Users/gouravshokeen/Downloads/backend-repo/backend/src/core/utils/paginator.js
- `listTherapists()` --calls--> `paginate()`  [INFERRED]
  /Users/gouravshokeen/Downloads/backend-repo/backend/src/modules/therapist/therapist.service.js → /Users/gouravshokeen/Downloads/backend-repo/backend/src/core/utils/paginator.js
- `bootstrap()` --calls--> `socketAuthMiddleware()`  [INFERRED]
  /Users/gouravshokeen/Downloads/backend-repo/backend/src/server.js → /Users/gouravshokeen/Downloads/backend-repo/backend/src/core/middleware/socketAuthMiddleware.js
- `bootstrap()` --calls--> `set()`  [INFERRED]
  /Users/gouravshokeen/Downloads/backend-repo/backend/src/server.js → /Users/gouravshokeen/Downloads/backend-repo/backend/src/core/cache/cacheManager.js
- `bootstrap()` --calls--> `startNotificationWorker()`  [INFERRED]
  /Users/gouravshokeen/Downloads/backend-repo/backend/src/server.js → /Users/gouravshokeen/Downloads/backend-repo/backend/src/core/jobs/workers/notificationWorker.js

## Communities

### Community 0 - "Community 0"
Cohesion: 0.09
Nodes (20): get(), invalidate(), set(), createExercise(), deleteExercise(), getExercise(), getVideoSignedUrl(), listExercises() (+12 more)

### Community 1 - "Community 1"
Cohesion: 0.09
Nodes (9): error(), connect(), connectWithRetry(), errorHandler(), FCMAdapter, MSG91Adapter, disconnect(), seed() (+1 more)

### Community 2 - "Community 2"
Cohesion: 0.1
Nodes (7): createApp(), startAuditWorker(), startNotificationWorker(), PluginManager, bootstrap(), socketAuthMiddleware(), SocketIOAdapter

### Community 3 - "Community 3"
Cohesion: 0.11
Nodes (6): asyncHandler(), auditLog(), createController(), ExercisePlugin, NotificationPlugin, rbac()

### Community 4 - "Community 4"
Cohesion: 0.18
Nodes (11): acquireSlotLock(), cancelBooking(), createBooking(), listSlots(), releaseSlotLock(), slotLockKey(), toUTC(), init() (+3 more)

### Community 5 - "Community 5"
Cohesion: 0.16
Nodes (8): createAssessment(), getHistory(), getQuestions(), getQuestionsForBodyPart(), listAssessments(), listTrackingSessions(), listBookings(), paginate()

### Community 6 - "Community 6"
Cohesion: 0.2
Nodes (6): generateOTP(), sendOTP(), verifyOTP(), idempotency(), getClient(), SMSProvider

### Community 7 - "Community 7"
Cohesion: 0.29
Nodes (1): listNotifications()

### Community 8 - "Community 8"
Cohesion: 0.33
Nodes (2): authMiddleware(), AuthProvider

### Community 9 - "Community 9"
Cohesion: 0.4
Nodes (1): S3Adapter

### Community 10 - "Community 10"
Cohesion: 0.4
Nodes (1): ResendAdapter

### Community 11 - "Community 11"
Cohesion: 0.4
Nodes (1): PluginBase

### Community 12 - "Community 12"
Cohesion: 0.5
Nodes (1): ClerkAdapter

### Community 13 - "Community 13"
Cohesion: 0.5
Nodes (1): CircuitBreaker

### Community 14 - "Community 14"
Cohesion: 0.5
Nodes (1): WebRTCAdapter

### Community 15 - "Community 15"
Cohesion: 0.5
Nodes (1): MessagingProvider

### Community 16 - "Community 16"
Cohesion: 0.5
Nodes (1): EmailProvider

### Community 17 - "Community 17"
Cohesion: 0.67
Nodes (1): NotificationProvider

### Community 18 - "Community 18"
Cohesion: 0.67
Nodes (1): VideoProvider

### Community 19 - "Community 19"
Cohesion: 1.0
Nodes (0): 

### Community 20 - "Community 20"
Cohesion: 1.0
Nodes (0): 

### Community 21 - "Community 21"
Cohesion: 1.0
Nodes (0): 

### Community 22 - "Community 22"
Cohesion: 1.0
Nodes (0): 

### Community 23 - "Community 23"
Cohesion: 1.0
Nodes (0): 

### Community 24 - "Community 24"
Cohesion: 1.0
Nodes (0): 

### Community 25 - "Community 25"
Cohesion: 1.0
Nodes (0): 

### Community 26 - "Community 26"
Cohesion: 1.0
Nodes (0): 

### Community 27 - "Community 27"
Cohesion: 1.0
Nodes (0): 

### Community 28 - "Community 28"
Cohesion: 1.0
Nodes (0): 

### Community 29 - "Community 29"
Cohesion: 1.0
Nodes (0): 

### Community 30 - "Community 30"
Cohesion: 1.0
Nodes (0): 

### Community 31 - "Community 31"
Cohesion: 1.0
Nodes (0): 

### Community 32 - "Community 32"
Cohesion: 1.0
Nodes (0): 

### Community 33 - "Community 33"
Cohesion: 1.0
Nodes (0): 

### Community 34 - "Community 34"
Cohesion: 1.0
Nodes (0): 

### Community 35 - "Community 35"
Cohesion: 1.0
Nodes (0): 

### Community 36 - "Community 36"
Cohesion: 1.0
Nodes (0): 

### Community 37 - "Community 37"
Cohesion: 1.0
Nodes (0): 

### Community 38 - "Community 38"
Cohesion: 1.0
Nodes (0): 

### Community 39 - "Community 39"
Cohesion: 1.0
Nodes (0): 

### Community 40 - "Community 40"
Cohesion: 1.0
Nodes (0): 

### Community 41 - "Community 41"
Cohesion: 1.0
Nodes (0): 

### Community 42 - "Community 42"
Cohesion: 1.0
Nodes (0): 

### Community 43 - "Community 43"
Cohesion: 1.0
Nodes (0): 

### Community 44 - "Community 44"
Cohesion: 1.0
Nodes (0): 

### Community 45 - "Community 45"
Cohesion: 1.0
Nodes (0): 

### Community 46 - "Community 46"
Cohesion: 1.0
Nodes (0): 

### Community 47 - "Community 47"
Cohesion: 1.0
Nodes (0): 

### Community 48 - "Community 48"
Cohesion: 1.0
Nodes (0): 

### Community 49 - "Community 49"
Cohesion: 1.0
Nodes (0): 

### Community 50 - "Community 50"
Cohesion: 1.0
Nodes (0): 

### Community 51 - "Community 51"
Cohesion: 1.0
Nodes (0): 

### Community 52 - "Community 52"
Cohesion: 1.0
Nodes (0): 

### Community 53 - "Community 53"
Cohesion: 1.0
Nodes (0): 

### Community 54 - "Community 54"
Cohesion: 1.0
Nodes (0): 

### Community 55 - "Community 55"
Cohesion: 1.0
Nodes (0): 

### Community 56 - "Community 56"
Cohesion: 1.0
Nodes (0): 

### Community 57 - "Community 57"
Cohesion: 1.0
Nodes (0): 

## Knowledge Gaps
- **Thin community `Community 19`** (2 nodes): `fileUpload()`, `fileUpload.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 20`** (2 nodes): `correlationId()`, `correlationId.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 21`** (2 nodes): `ownership()`, `ownership.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 22`** (2 nodes): `validate.js`, `validate()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 23`** (2 nodes): `responseTimer()`, `responseTimer.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 24`** (2 nodes): `softDeletePlugin()`, `softDelete.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 25`** (1 nodes): `jest.config.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 26`** (1 nodes): `rateLimiter.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 27`** (1 nodes): `requestLogger.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 28`** (1 nodes): `constants.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 29`** (1 nodes): `logger.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 30`** (1 nodes): `swagger.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 31`** (1 nodes): `cors.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 32`** (1 nodes): `env.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 33`** (1 nodes): `providers.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 34`** (1 nodes): `notification.controller.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 35`** (1 nodes): `Assessment.model.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 36`** (1 nodes): `OTP.model.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 37`** (1 nodes): `OnboardingDraft.model.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 38`** (1 nodes): `AuditLog.model.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 39`** (1 nodes): `Notification.model.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 40`** (1 nodes): `User.model.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 41`** (1 nodes): `TrackingSession.model.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 42`** (1 nodes): `Exercise.model.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 43`** (1 nodes): `Booking.model.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 44`** (1 nodes): `auth.routes.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 45`** (1 nodes): `auth.validation.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 46`** (1 nodes): `auth.controller.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 47`** (1 nodes): `booking.controller.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 48`** (1 nodes): `booking.routes.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 49`** (1 nodes): `booking.validation.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 50`** (1 nodes): `admin.controller.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 51`** (1 nodes): `admin.routes.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 52`** (1 nodes): `assessment.routes.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 53`** (1 nodes): `assessment.controller.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 54`** (1 nodes): `patient.routes.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 55`** (1 nodes): `patient.controller.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 56`** (1 nodes): `therapist.routes.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 57`** (1 nodes): `therapist.controller.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `get()` connect `Community 0` to `Community 2`, `Community 3`, `Community 4`, `Community 5`, `Community 6`?**
  _High betweenness centrality (0.195) - this node is a cross-community bridge._
- **Why does `error()` connect `Community 1` to `Community 8`, `Community 2`, `Community 10`, `Community 6`?**
  _High betweenness centrality (0.155) - this node is a cross-community bridge._
- **Why does `idempotency()` connect `Community 6` to `Community 0`, `Community 1`?**
  _High betweenness centrality (0.104) - this node is a cross-community bridge._
- **Are the 13 inferred relationships involving `get()` (e.g. with `createApp()` and `idempotency()`) actually correct?**
  _`get()` has 13 INFERRED edges - model-reasoned connections that need verification._
- **Are the 10 inferred relationships involving `error()` (e.g. with `seed()` and `authMiddleware()`) actually correct?**
  _`error()` has 10 INFERRED edges - model-reasoned connections that need verification._
- **Are the 9 inferred relationships involving `set()` (e.g. with `bootstrap()` and `setFlag()`) actually correct?**
  _`set()` has 9 INFERRED edges - model-reasoned connections that need verification._
- **Are the 9 inferred relationships involving `invalidate()` (e.g. with `createExercise()` and `updateExercise()`) actually correct?**
  _`invalidate()` has 9 INFERRED edges - model-reasoned connections that need verification._