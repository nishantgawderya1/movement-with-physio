// backend/controllers/therapistController.js
// ─────────────────────────────────────────────────────────────────────────────
// PURPOSE: Handles therapist onboarding and profile API requests.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /api/therapist/personal-info
 * ───────────────────────────────────
 * Saves therapist's full name during onboarding step 1.
 *
 * Request headers: { Authorization: "Bearer <jwt_token>" }
 * Request body:    { fullName: "Dr. Anjali Sharma" }
 * Response:        { success: true, data: { onboardingStep: 2 } }
 *
 * Steps to implement:
 * 1. Verify JWT token from header
 * 2. Validate fullName (min 3 chars, string only)
 * 3. Update therapist record: fullName + onboardingStep = 2
 * 4. Return updated onboarding progress
 */
export const savePersonalInfo = async (req, res) => {
  // TODO: implement
};

/**
 * GET /api/therapist/profile
 * ───────────────────────────
 * Returns the current therapist's profile and onboarding progress.
 *
 * Request headers: { Authorization: "Bearer <jwt_token>" }
 * Response:        { success: true, data: { therapist: { ...fields } } }
 */
export const getProfile = async (req, res) => {
  // TODO: implement
};
