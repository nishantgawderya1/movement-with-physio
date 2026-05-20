# Phase 3B — Therapist app smoke test plan

The therapist app's video calling UI lands in Phase 3B but a full end-to-end
call needs the patient app on a second device (Phase 4). Until then this
doc describes what a human operator can verify with the therapist app
alone on a single iPhone, and what stays untested until Phase 4.

## What can be verified solo (iPhone + backend)

1. **Boot.** Backend running (`make dev-bg` in `backend/`). Therapist
   app launched in the dev client. Bootstrap → Dashboard renders without
   crash.

2. **Availability toggle.** On Dashboard, flip the "Available for
   instant calls" switch. Check backend logs for
   `PATCH /api/v1/therapists/me/instant-availability` returning 200.
   Reload the app — the switch should remember its last position
   (loaded from `/therapists/me/profile.availableNow`).

3. **Bookings tab.** Calendar icon in the bottom tab bar navigates to
   Bookings. Two top tabs: Upcoming / Past. Empty state copy appears
   when there are no bookings. Pull-to-refresh works.

4. **Manual seed of a video booking** (for the Join flow). From the host:
   ```bash
   cd backend && node scripts/_seed-test-video-booking.tmp.js
   ```
   (Or insert via mongosh — see "Manual seed snippet" below.)
   After reload, the booking shows in Upcoming with the video-camera icon
   and a green "Join" button (once the slot is within
   `VIDEO_CALL_JOIN_WINDOW_MINUTES` of the scheduled time).

5. **Pre-call lobby.** Tap "Join" or open BookingDetail → "Join Call".
   The local camera preview should display (front camera). The body part
   badge and patient name appear in the meta card. "Join Call" button
   is disabled when `canJoin` is false.

6. **Video call screen mounts.** Tap "Join Call" in the lobby. The
   screen transitions to the full-screen call layout:
   - Local PiP visible (110×150, draggable via long-press + drag)
   - Remote area shows "Waiting for patient to join…" (no peer connected)
   - Top status bar with patient name + 0:00 timer (timer ticks once
     status reaches 'active' — won't happen without the patient side)
   - AssessmentPanel mounted at the bottom (28% screen height by default)
   - 4 control buttons at the bottom (mute / camera / end / switch)

7. **AssessmentPanel mechanics** (no patient required):
   - Tap drag handle → collapses to 44px strip
   - Tap collapsed strip → re-expands
   - Drag down past 60px → snaps to collapsed
   - 4 answer types render correctly: text (TextInput), scale (11 circles),
     boolean (Yes/No), multiselect (option pills)
   - "Next" button — POST /api/v1/assessments/:id/respond returns 200
     (check backend logs); panel advances to the next question
   - "Complete Assessment" on the last question — POST /complete returns
     200; panel transitions to "Generating PDF…" and polls every 2s
   - PDF eventually appears as "View PDF"; tap → opens URL in browser

8. **End call.** Tap the red end button. Hook calls `leave()` (socket
   `end_call` + HTTP `/leave` backstop). Navigates to SessionEnded.

9. **SessionEnded.** Shows "Session ended" + duration. If the assessment
   completed during the call, shows "View Assessment PDF" CTA. Back to
   Bookings → the booking moves to Past tab.

10. **No regressions** on existing screens — Dashboard stats still load,
    Messages tab still navigates, AllClients still loads.

## What CANNOT be verified solo (needs Phase 4 patient device)

- **Full peer connection.** Without the patient app sending an `offer`,
  the therapist hook stays in `connecting` → 30s timeout → 'failed'
  with error `OTHER_PARTY_NOT_ANSWERING`.
- **Remote stream rendering.** RTCView is wired but no remote stream
  exists.
- **Answer/ICE exchange.** Socket handlers for `offer` / `answer` /
  `ice_candidate` are registered but never fire.
- **call_ended event from the other side.** Patient hangs up first.
- **Incoming instant-call modal.** Backend currently sends FCM push only
  for VIDEO_CALL_REQUESTED — it does NOT emit a socket event on the
  `/video` namespace. The subscriber is wired and waiting; firing
  requires a one-line addition on the backend's instant-booking flow
  (`socket.to('user:<therapistId>').emit('video_call_requested', payload)`).

## Manual seed snippet (mongosh)

If you don't want to run a node script, this works in mongosh inside
the docker container:

```js
use mwp
// Find IDs first
const therapist = db.users.findOne({ role: 'therapist', email: '<your therapist email>' });
const patient   = db.users.findOne({ role: 'patient' });
// Create video booking 1 minute from now
const slotStart = new Date(Date.now() + 60 * 1000);
const booking = db.bookings.insertOne({
  therapistId: therapist._id, patientId: patient._id, slotStart,
  durationMinutes: 30, timezone: 'Asia/Kolkata',
  status: 'confirmed', meetingType: 'video', scheduledMode: 'slot_booking',
  isDeleted: false, createdAt: new Date(), updatedAt: new Date(),
});
// Create linked video call
const call = db.videocalls.insertOne({
  participants: [patient._id, therapist._id],
  initiatedBy: patient._id, status: 'scheduled',
  scheduledAt: slotStart, bookingId: booking.insertedId,
  joinState: {}, metadata: {},
  createdAt: new Date(), updatedAt: new Date(),
});
// Create linked therapist_driven assessment (snapshot 2 general questions)
const generalQs = db.assessmentquestiontemplates
  .find({ bodyPart: 'general', isActive: true })
  .sort({ order: 1 })
  .toArray();
const assessment = db.assessments.insertOne({
  patientId: patient._id, therapistId: therapist._id,
  bodyParts: ['general'],
  mode: 'therapist_driven',
  bookingId: booking.insertedId,
  videoCallId: call.insertedId,
  status: 'pending',
  questions: generalQs.map(q => ({
    questionId: q.questionId, questionText: q.questionText,
    answerType: q.answerType, options: q.options || [],
  })),
  responses: [],
  isDeleted: false, createdAt: new Date(), updatedAt: new Date(),
});
// Link back
db.bookings.updateOne(
  { _id: booking.insertedId },
  { $set: { videoCallId: call.insertedId, assessmentId: assessment.insertedId } }
);
db.videocalls.updateOne(
  { _id: call.insertedId },
  { $set: { assessmentId: assessment.insertedId } }
);
```

After this insert, reload the therapist app; the booking appears in
Upcoming with a green "Join" button once `now > slotStart - 10min`.
