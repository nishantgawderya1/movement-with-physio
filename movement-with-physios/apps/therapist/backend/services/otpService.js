// backend/services/otpService.js
// ─────────────────────────────────────────────────────────────────────────────
// PURPOSE: Business logic for OTP generation, storage, and SMS delivery.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * generateOTP
 * Returns a random 6-digit OTP string.
 * TODO: implement — use crypto.randomInt(100000, 999999).toString()
 */
export const generateOTP = () => {
  // TODO: implement
};

/**
 * storeOTP
 * Saves OTP against phone number with 10-minute TTL.
 * TODO: use Redis SETEX or equivalent DB with expiry
 * @param {string} phoneNumber
 * @param {string} otp
 */
export const storeOTP = async (phoneNumber, otp) => {
  // TODO: implement
  // Redis example: await redis.setex(`otp:${phoneNumber}`, 600, otp);
};

/**
 * getStoredOTP
 * Retrieves stored OTP for a phone number.
 * Returns null if expired or not found.
 * @param {string} phoneNumber
 * @returns {Promise<string|null>}
 */
export const getStoredOTP = async (phoneNumber) => {
  // TODO: implement
};

/**
 * sendOTPviaSMS
 * Sends OTP to phone number via SMS provider.
 * Recommended providers: MSG91 (India), Twilio, AWS SNS
 * @param {string} phoneNumber
 * @param {string} otp
 */
export const sendOTPviaSMS = async (phoneNumber, otp) => {
  // TODO: implement
  // MSG91 example:
  // await msg91.sendOTP({ mobile: `91${phoneNumber}`, otp });
};
