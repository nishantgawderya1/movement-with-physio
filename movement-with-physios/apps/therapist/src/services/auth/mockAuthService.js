// src/services/auth/mockAuthService.js
// ─────────────────────────────────────────────────────────────────────────────
// PURPOSE:
//   Simulates backend OTP authentication for development and testing.
//   This file is a MOCK ONLY. When the real backend is ready, the backend
//   developer replaces this file with a real API service.
//   The screen (MobileVerificationScreen.jsx) will NOT need to change
//   because the function names and return shapes stay identical.
//
// MOCK TEST CREDENTIALS:
//   Phone Number : 9876543210
//   Correct OTP  : 123456
//
// RETURN SHAPE CONTRACT (never change this — screen depends on it):
//   Success : { success: true,  data: { ... } }
//   Failure : { success: false, message: "Human readable error" }
// ─────────────────────────────────────────────────────────────────────────────


/**
 * sendOTP
 * ───────
 * Simulates sending an OTP to the provided phone number.
 * Adds a realistic 1 second network delay.
 *
 * @param {string} phoneNumber - 10-digit mobile number (no country code)
 * @returns {Promise<{ success: boolean, message: string }>}
 *
 * Real backend replacement:
 *   POST /api/auth/send-otp
 *   Body: { phoneNumber }
 *   Response: { success: true, message: "OTP sent successfully" }
 */
export const sendOTP = async (phoneNumber) => {
  console.log('[MOCK] sendOTP called →', phoneNumber);

  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Basic format validation (frontend safety check)
  if (!phoneNumber || phoneNumber.length !== 10) {
    return { success: false, message: 'Please enter a valid 10-digit number.' };
  }

  // Mock always succeeds for any valid number
  return { success: true, message: 'OTP sent successfully' };
};


/**
 * verifyOTP
 * ─────────
 * Verifies the OTP entered by the user against mock credentials.
 * Adds a realistic 1.5 second network delay.
 *
 * MOCK LOGIC:
 *   Phone : 9876543210  +  OTP : 123456  →  success
 *   Any other combination                →  failure
 *
 * @param {string} phoneNumber - Same number used in sendOTP
 * @param {string} otp         - OTP entered by user
 * @returns {Promise<{ success: boolean, data?: object, message?: string }>}
 *
 * Real backend replacement:
 *   POST /api/auth/verify-otp
 *   Body: { phoneNumber, otp }
 *   Response: { success: true, data: { token, userId } }
 */
export const verifyOTP = async (phoneNumber, otp) => {
  console.log('[MOCK] verifyOTP called →', phoneNumber, otp);

  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 1500));

  // Mock verification logic
  const isCorrect =
    phoneNumber === '9876543210' &&
    otp === '123456';

  if (isCorrect) {
    return {
      success: true,
      data: {
        token: 'mock_token_abc123',
        userId: 'mock_user_001',
      },
    };
  }

  return {
    success: false,
    message: 'Incorrect OTP. Please try again.',
  };
};
