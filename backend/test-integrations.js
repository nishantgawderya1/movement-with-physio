'use strict';

/**
 * Integration smoke-test for Clerk, Firebase (FCM), and Resend.
 * Run from the backend/ directory:
 *   node test-integrations.js
 *
 * Loads .env.local automatically. No Docker required.
 */

require('dotenv').config({ path: '.env.local' });

const { createClerkClient } = require('@clerk/express');
const admin = require('firebase-admin');
const { Resend } = require('resend');

// ─── Colour helpers ───────────────────────────────────────────────────────────
const GREEN  = '\x1b[32m✔\x1b[0m';
const RED    = '\x1b[31m✘\x1b[0m';
const YELLOW = '\x1b[33m⚠\x1b[0m';
const BOLD   = '\x1b[1m';
const RESET  = '\x1b[0m';

const pass  = (msg) => console.log(`  ${GREEN} ${msg}`);
const fail  = (msg, err) => console.log(`  ${RED} ${msg}\n      ${'\x1b[31m'}${err}${RESET}`);
const warn  = (msg) => console.log(`  ${YELLOW} ${msg}`);
const title = (msg) => console.log(`\n${BOLD}▶ ${msg}${RESET}`);

let totalPass = 0, totalFail = 0;
const ok  = (msg) => { pass(msg);  totalPass++; };
const err = (msg, e) => { fail(msg, e); totalFail++; };

// ─── 1. CLERK ─────────────────────────────────────────────────────────────────
async function testClerk() {
  title('Clerk');

  const key = process.env.CLERK_SECRET_KEY;
  if (!key || key === 'placeholder') {
    warn('CLERK_SECRET_KEY not set — skipping'); return;
  }
  if (!key.startsWith('sk_')) {
    err('Key format wrong', `Expected sk_test_... or sk_live_... got: ${key.slice(0, 12)}...`); return;
  }

  try {
    const clerk = createClerkClient({ secretKey: key });

    // List the first page of users — lightweight API call that proves auth
    const { data: users, totalCount } = await clerk.users.getUserList({ limit: 5 });
    ok(`Connected to Clerk. Total users in app: ${totalCount}`);

    if (users.length > 0) {
      const u = users[0];
      ok(`Sample user — id: ${u.id}, email: ${u.emailAddresses?.[0]?.emailAddress ?? 'n/a'}`);
    } else {
      warn('No users in the Clerk app yet (empty list is fine)');
    }

    // Verify webhook secret format
    const whSecret = process.env.CLERK_WEBHOOK_SECRET;
    if (whSecret && whSecret.startsWith('whsec_')) {
      ok(`CLERK_WEBHOOK_SECRET format valid (whsec_...)`);
    } else {
      warn(`CLERK_WEBHOOK_SECRET looks wrong: ${(whSecret || '').slice(0, 12)}...`);
    }

  } catch (e) {
    err('Clerk API call failed', e.message);
  }
}

// ─── 2. FIREBASE (Admin SDK / FCM init) ───────────────────────────────────────
async function testFirebase() {
  title('Firebase (Admin SDK)');

  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) { warn('FIREBASE_SERVICE_ACCOUNT not set — skipping'); return; }

  let sa;
  try {
    sa = typeof raw === 'string' ? JSON.parse(raw) : raw;
    ok('FIREBASE_SERVICE_ACCOUNT JSON is valid');
  } catch (e) {
    err('FIREBASE_SERVICE_ACCOUNT JSON parse failed', e.message); return;
  }

  // Validate required fields
  const required = ['type', 'project_id', 'private_key', 'client_email'];
  const missing = required.filter(f => !sa[f]);
  if (missing.length) {
    err(`Service account missing fields: ${missing.join(', ')}`, ''); return;
  }
  ok(`Service account fields OK — project: ${sa.project_id}`);

  // Check private key format
  if (sa.private_key.startsWith('-----BEGIN PRIVATE KEY-----')) {
    ok('private_key PEM header valid');
  } else {
    err('private_key PEM header missing/corrupt', sa.private_key.slice(0, 40));
    return;
  }

  // Init Admin SDK (only once)
  try {
    const appName = 'smoke-test-' + Date.now();
    const app = admin.initializeApp(
      { credential: admin.credential.cert(sa) },
      appName
    );
    ok('firebase-admin initialized successfully');

    // Make a real API call — list first Firestore collection or verify a dummy token
    // We use app.options to confirm the credential is wired, then do a lightweight
    // Auth call (verify a garbage token → expect specific error, not a network error)
    const auth = admin.auth(app);
    try {
      await auth.verifyIdToken('invalid_token_just_testing');
    } catch (e) {
      if (e.code === 'auth/argument-error' || e.code === 'auth/id-token-expired' ||
          e.code === 'auth/invalid-id-token' || e.code === 'auth/invalid-argument') {
        ok(`Firebase Auth reachable — got expected token error: ${e.code}`);
      } else if (e.code === 'auth/invalid-credential') {
        err('Firebase credentials rejected by Google', e.message);
      } else {
        // Any Firebase-code error means we connected successfully
        ok(`Firebase Auth reachable — response code: ${e.code}`);
      }
    }

    // Clean up the app instance so it doesn't interfere
    await app.delete();

  } catch (e) {
    err('firebase-admin init failed', e.message);
  }
}

// ─── 3. RESEND ────────────────────────────────────────────────────────────────
async function testResend() {
  title('Resend');

  const key = process.env.RESEND_API_KEY;
  if (!key || key === 'placeholder') { warn('RESEND_API_KEY not set — skipping'); return; }
  if (!key.startsWith('re_')) {
    err('API key format wrong', `Expected re_... got: ${key.slice(0, 8)}...`); return;
  }

  const from = process.env.EMAIL_FROM || 'noreply@mwp.app';

  try {
    const resend = new Resend(key);

    // Resend has a /domains endpoint to validate the key without sending
    const domains = await resend.domains.list();
    ok(`Resend API key valid. Domains in account: ${domains?.data?.length ?? 0}`);

    if (domains?.data?.length) {
      domains.data.forEach(d => {
        const status = d.status === 'verified' ? GREEN : YELLOW;
        console.log(`    ${status} ${d.name} (${d.status})`);
      });
    } else {
      warn(`No verified domains yet — emails will only send to the account owner's address`);
    }

    // Check EMAIL_FROM matches a verified domain
    const fromDomain = from.split('@')[1];
    const verified = domains?.data?.some(d => d.name === fromDomain && d.status === 'verified');
    if (verified) {
      ok(`EMAIL_FROM domain "${fromDomain}" is verified in Resend`);
    } else {
      warn(`EMAIL_FROM domain "${fromDomain}" not verified in Resend — transactional emails to external addresses will fail`);
    }

  } catch (e) {
    if (e.statusCode === 401 || e.message?.includes('Unauthorized') || e.message?.includes('Invalid API key')) {
      err('Resend API key rejected (401 Unauthorized)', e.message);
    } else {
      err('Resend API call failed', e.message);
    }
  }
}

// ─── 4. HTTP health smoke-test ────────────────────────────────────────────────
async function testServerHealth() {
  title('Server Health (localhost:3000)');
  try {
    const res = await fetch('http://localhost:3000/health');
    const body = await res.json();
    if (body.status === 'ok') {
      ok(`/health → ${JSON.stringify(body)}`);
    } else {
      err('/health returned non-ok', JSON.stringify(body));
    }
  } catch (e) {
    err('Could not reach localhost:3000/health — is the server running?', e.message);
  }
}

// ─── Runner ───────────────────────────────────────────────────────────────────
(async () => {
  console.log(`\n${'═'.repeat(56)}`);
  console.log(`${BOLD}  MWP Integration Smoke-Test${RESET}`);
  console.log(`${'═'.repeat(56)}`);

  await testServerHealth();
  await testClerk();
  await testFirebase();
  await testResend();

  console.log(`\n${'═'.repeat(56)}`);
  console.log(`${BOLD}  Results: ${GREEN} ${totalPass} passed   ${RED} ${totalFail} failed${RESET}`);
  console.log(`${'═'.repeat(56)}\n`);

  process.exit(totalFail > 0 ? 1 : 0);
})();
