// backend/controllers/authController.js
// ─────────────────────────────────────────────────────────────────────────────
// PURPOSE: Handles all authentication HTTP requests.
// Backend developer: implement the function bodies below.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /api/auth/send-otp
 * Request body:  { phoneNumber: "9876543210" }
 * Response:      { success: true, data: { message: "OTP sent" } }
 *                { success: false, error: "Phone number already registered" }
 *
 * Implementation steps:
 * 1. Validate phoneNumber format (10-digit Indian mobile)
 * 2. Check rate limit (max 3 OTP requests per phone per 10 minutes)
 * 3. Generate 6-digit OTP
 * 4. Store OTP in Redis/DB with 10-minute expiry
 * 5. Send OTP via SMS (Twilio / MSG91 / AWS SNS)
 * 6. Return success response
 */
export const sendOtp = async (req, res) => {
  // TODO: implement
};

/**
 * POST /api/auth/verify-otp
 * Request body:  { phoneNumber: "9876543210", otp: "123456" }
 * Response:      { success: true, data: { token: "jwt", userId: "..." } }
 *                { success: false, error: "Invalid OTP" }
 *                { success: false, error: "OTP expired" }
 *
 * Implementation steps:
 * 1. Fetch stored OTP for this phoneNumber from Redis/DB
 * 2. Check if OTP has expired
 * 3. Compare submitted OTP with stored OTP
 * 4. If match: create or fetch user, generate JWT token, return token
 * 5. If no match: increment failure count, return error
 * 6. After 5 failed attempts: lock phone for 15 minutes
 */
export const verifyOtp = async (req, res) => {
  // TODO: implement
};
