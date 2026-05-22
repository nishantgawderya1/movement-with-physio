'use strict';

const { connect, close, clearDb } = require('../../../../tests/setup');
const mongoose = require('mongoose');
const User = require('../../../models/User.model');
const TrackingSession = require('../../../models/TrackingSession.model');
const { ROLES } = require('../../../core/utils/constants');
const { createController } = require('../progress.controller');

const progressService = require('../progress.service')({});
const controller = createController(progressService);

// Mock req/res — supports res.send(), res.status().json(), and
// res.setHeader() for the /export Content-Disposition path. Captures
// headers separately so the regression test can assert presence/absence.
function runController(handler, req) {
  return new Promise((resolve, reject) => {
    const headers = {};
    const res = {
      _status: 200,
      status(code) { this._status = code; return this; },
      json(body) { resolve({ status: this._status, body, headers }); return this; },
      send(body) { resolve({ status: this._status, body, headers }); return this; },
      setHeader(name, value) { headers[name.toLowerCase()] = value; },
    };
    Promise.resolve(handler(req, res, (err) => reject(err))).catch(reject);
  });
}

function makeReq(clerkId, query = {}) {
  return {
    user: { id: clerkId, mongoId: 'unused-by-progress-service', role: ROLES.PATIENT },
    query,
  };
}

describe('progress patient-facing controllers — strictly self-scoped', () => {
  let alice, bob;

  beforeAll(async () => { await connect(); });
  afterAll(async () => { await close(); });

  beforeEach(async () => {
    await clearDb();
    alice = await User.create({
      clerkId: 'clerk_alice', email: 'alice@example.com', name: 'Alice', role: ROLES.PATIENT,
    });
    bob = await User.create({
      clerkId: 'clerk_bob', email: 'bob@example.com', name: 'Bob', role: ROLES.PATIENT,
    });
    // Alice owns 1 completed session; Bob owns 1 completed session. Pre-S7
    // the cross-tenant query would have leaked Bob's row to Alice.
    await TrackingSession.create([
      {
        patientId: alice._id,
        exercises: [{ exerciseId: new mongoose.Types.ObjectId(), completedSets: 3, completedReps: 10, completedAt: new Date() }],
        painScoreBefore: 5, painScoreAfter: 2,
        status: 'completed', completedAt: new Date(),
      },
      {
        patientId: bob._id,
        exercises: [{ exerciseId: new mongoose.Types.ObjectId(), completedSets: 8, completedReps: 20, completedAt: new Date() }],
        painScoreBefore: 9, painScoreAfter: 1,
        status: 'completed', completedAt: new Date(),
      },
    ]);
  });

  describe.each([
    ['summary',   'getSummary',       'totalSessions'],
    ['exercises', 'getExerciseStats', null],  // returns array
    ['trends',    'getTrends',        null],  // returns array
    ['export',    'exportProgress',   'summary'],
  ])('%s endpoint', (label, handlerName, ownDataKey) => {
    test('authed patient → returns own data only (Bob\'s row NOT leaked)', async () => {
      const { status, body } = await runController(controller[handlerName], makeReq(alice.clerkId));
      expect(status).toBe(200);
      expect(body.success).toBe(true);
      if (label === 'summary') {
        // Alice's session: avgPainBefore=5, avgPainAfter=2, reduction=3
        expect(body.data.totalSessions).toBe(1);
        expect(body.data.avgPainReduction).toBe(3);
      }
      if (label === 'exercises' || label === 'trends') {
        expect(Array.isArray(body.data)).toBe(true);
        expect(body.data.length).toBeGreaterThan(0);
      }
      if (label === 'export') {
        // Export composes summary + exerciseStats + trends. Bob's data
        // must not leak into any of them.
        expect(body.data.patientId).toBe(alice.clerkId);
        expect(body.data.summary.totalSessions).toBe(1);
        // Bob's pain reduction was 8 (9 - 1); Alice's was 3. If we leaked
        // Bob's data, avgPainReduction would be ~5.5 (mean of 3 and 8).
        expect(body.data.summary.avgPainReduction).toBe(3);
      }
    });

    test('?patientId=otherClerk is IGNORED (sanity: query param no longer poisons result)', async () => {
      const { body } = await runController(
        controller[handlerName],
        makeReq(alice.clerkId, { patientId: bob.clerkId })
      );
      // Result must be identical to alice's own data (Bob's reduction was 8,
      // Alice's is 3). If the query param were honored, summary would
      // report Bob's numbers.
      if (label === 'summary') {
        expect(body.data.avgPainReduction).toBe(3);
        expect(body.data.totalSessions).toBe(1);
      }
      if (label === 'export') {
        expect(body.data.patientId).toBe(alice.clerkId);
        expect(body.data.summary.avgPainReduction).toBe(3);
      }
    });
  });

  describe('/export — Content-Disposition filename hygiene', () => {
    test('filename uses generic date stamp, never echoes a clerkId', async () => {
      const { headers } = await runController(controller.exportProgress, makeReq(alice.clerkId));
      const cd = headers['content-disposition'];
      expect(cd).toBeDefined();
      // Exact pattern: progress-YYYY-MM-DD.json — no clerkId anywhere.
      expect(cd).toMatch(/^attachment; filename="progress-\d{4}-\d{2}-\d{2}\.json"$/);
      expect(cd).not.toContain('clerk_');
      expect(cd).not.toContain(alice.clerkId);
    });

    test('?patientId=otherClerk attempt does NOT cause filename to echo any clerkId', async () => {
      const { headers } = await runController(
        controller.exportProgress,
        makeReq(alice.clerkId, { patientId: bob.clerkId })
      );
      const cd = headers['content-disposition'];
      expect(cd).not.toContain('clerk_');
      expect(cd).not.toContain(bob.clerkId);
      expect(cd).not.toContain(alice.clerkId);
    });
  });
});
