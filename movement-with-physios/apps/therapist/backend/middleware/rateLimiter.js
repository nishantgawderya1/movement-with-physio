// backend/middleware/rateLimiter.js
// ─────────────────────────────────────────────────────────────────────────────
// PURPOSE: Prevents OTP abuse and brute-force attacks.
//
// SECURITY RULES TO IMPLEMENT:
// 1. Max 3 OTP send requests per phone number per 10 minutes
// 2. Max 5 failed OTP verify attempts → lock phone for 15 minutes
// 3. Max 10 requests per IP per minute (general rate limit)
// 4. Log suspicious patterns (same IP, many different numbers)
//
// RECOMMENDED PACKAGE: express-rate-limit + rate-limit-redis
// ─────────────────────────────────────────────────────────────────────────────

export const otpRateLimiter = (req, res, next) => {
  // TODO: implement rate limiting
  next(); // remove this line when implemented
};
