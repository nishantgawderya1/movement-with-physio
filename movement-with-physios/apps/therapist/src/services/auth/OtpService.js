// src/services/auth/OtpService.js
// ─────────────────────────────────────────────────────────────────────────────
// PURPOSE: Frontend API layer for OTP send and verify operations.
// Backend developer: replace the mock blocks inside each function.
// Do NOT change function names or return shapes — screen depends on them.
//
// RETURN SHAPE CONTRACT (must not change):
//   Success: { success: true, data: { ... } }
//   Failure: { success: false, error: "Human readable message" }
// ─────────────────────────────────────────────────────────────────────────────

/**
 * sendOTP
 * ───────
 * Sends an OTP to the provided phone number.
 *
 * @param {string} phoneNumber - 10-digit Indian mobile number (no country code)
 * @returns {Promise<{ success: boolean, data?: object, error?: string }>}
 *
 * Expected backend endpoint:
 *   POST /api/auth/send-otp
 *   Body: { phoneNumber: "9876543210" }
 *   Response: { success: true, data: { message: "OTP sent" } }
 */
export const sendOTP = async (phoneNumber) => {
  // ── MOCK — Backend developer: replace this block only ──────────────────
  console.log('[MOCK] sendOTP called for:', phoneNumber);
  return new Promise(resolve =>
    setTimeout(() =>
      resolve({ success: true, data: { message: 'OTP sent' } }), 1000)
  );
  // ── END MOCK ────────────────────────────────────────────────────────────

  // TODO: Replace mock above with:
  // try {
  //   const response = await fetch('https://your-api.com/api/auth/send-otp', {
  //     method: 'POST',
  //     headers: { 'Content-Type': 'application/json' },
  //     body: JSON.stringify({ phoneNumber }),
  //   });
  //   const data = await response.json();
  //   if (!response.ok) return { success: false, error: data.message };
  //   return { success: true, data };
  // } catch (e) {
  //   return { success: false, error: 'Network error. Please try again.' };
  // }
};

/**
 * verifyOTP
 * ─────────
 * Verifies the OTP entered by the user.
 *
 * @param {string} phoneNumber - Same number used in sendOTP
 * @param {string} otp         - OTP entered by user (4–6 digits)
 * @returns {Promise<{ success: boolean, data?: { token: string }, error?: string }>}
 *
 * Expected backend endpoint:
 *   POST /api/auth/verify-otp
 *   Body: { phoneNumber: "9876543210", otp: "123456" }
 *   Response: { success: true, data: { token: "jwt_token_here", userId: "..." } }
 */
export const verifyOTP = async (phoneNumber, otp) => {
  // ── MOCK — Backend developer: replace this block only ──────────────────
  console.log('[MOCK] verifyOTP called — Phone:', phoneNumber, 'OTP:', otp);
  return new Promise(resolve =>
    setTimeout(() => {
      if (otp === '123456') {
        resolve({ success: true, data: { token: 'mock_token_xyz', userId: 'mock_user_001' } });
      } else {
        resolve({ success: false, error: 'Invalid OTP. Please try again.' });
      }
    }, 1500)
  );
  // ── END MOCK ────────────────────────────────────────────────────────────

  // TODO: Replace mock above with:
  // try {
  //   const response = await fetch('https://your-api.com/api/auth/verify-otp', {
  //     method: 'POST',
  //     headers: { 'Content-Type': 'application/json' },
  //     body: JSON.stringify({ phoneNumber, otp }),
  //   });
  //   const data = await response.json();
  //   if (!response.ok) return { success: false, error: data.message };
  //   return { success: true, data };
  // } catch (e) {
  //   return { success: false, error: 'Network error. Please try again.' };
  // }
};
