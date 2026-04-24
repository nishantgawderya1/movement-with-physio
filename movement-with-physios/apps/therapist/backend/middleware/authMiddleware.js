// backend/middleware/authMiddleware.js
// ─────────────────────────────────────────────────────────────────────────────
// PURPOSE: Validates JWT token on protected routes.
//
// HOW IT WORKS:
// 1. Read Authorization header: "Bearer <token>"
// 2. Verify token using JWT_SECRET from environment variables
// 3. Attach decoded user data to req.user
// 4. Call next() if valid, return 401 if invalid or expired
//
// TODO: implement using jsonwebtoken package
// ─────────────────────────────────────────────────────────────────────────────

export const authMiddleware = (req, res, next) => {
  // TODO: implement
  next(); // remove this line when implemented
};
