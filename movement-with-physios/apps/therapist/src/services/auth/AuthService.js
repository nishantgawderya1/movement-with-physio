// ─────────────────────────────────────────────────────────────────────────────
// AuthService — Mock authentication API layer for Movement With Physios
// Backend developer: replace each mock function body with a real fetch() call.
// Do NOT change function signatures or return shapes — the frontend depends on them.
// ─────────────────────────────────────────────────────────────────────────────

const API_BASE_URL = 'https://your-api-domain.com/api'; // TODO: Set real base URL

/**
 * Authenticate a therapist with email and password.
 *
 * @param {string} email    — therapist's email address
 * @param {string} password — therapist's password (plain text over HTTPS)
 * @returns {Promise<Object>} Resolves to one of:
 *
 *   Success:
 *   {
 *     success: true,
 *     data: {
 *       token: "eyJhbGciOiJIUzI1NiIs...",
 *       therapist: {
 *         id: "t_001",
 *         name: "Dr. Sarah Mitchell",
 *         email: "sarah@movementwithphysios.com",
 *         role: "therapist"
 *       }
 *     }
 *   }
 *
 *   Failure:
 *   {
 *     success: false,
 *     error: "Invalid credentials"
 *   }
 */
export async function login(email, password) {
  // TODO: Replace this entire block with a real API call:
  // ─────────────────────────────────────────────────────
  // const response = await fetch(`${API_BASE_URL}/auth/login`, {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify({ email, password }),
  // });
  // const json = await response.json();
  // if (!response.ok) {
  //   return { success: false, error: json.error || 'Login failed' };
  // }
  // return { success: true, data: json.data };
  // ─────────────────────────────────────────────────────

  return new Promise((resolve) => {
    setTimeout(() => {
      if (email === 'test@mwp.com' && password === 'password123') {
        resolve({
          success: true,
          data: {
            token: 'mock_jwt_token_abc123xyz',
            therapist: {
              id: 't_001',
              name: 'Dr. Sarah Mitchell',
              email: 'test@mwp.com',
              role: 'therapist',
            },
          },
        });
      } else {
        resolve({
          success: false,
          error: 'Invalid credentials. Please check your email and password.',
        });
      }
    }, 1500);
  });
}

/**
 * Request a password reset email for the given therapist email.
 *
 * @param {string} email — therapist's registered email address
 * @returns {Promise<Object>} Resolves to one of:
 *
 *   Success:
 *   {
 *     success: true,
 *     data: {
 *       message: "Password reset email sent to sarah@movementwithphysios.com"
 *     }
 *   }
 *
 *   Failure:
 *   {
 *     success: false,
 *     error: "No account found with that email address"
 *   }
 */
export async function forgotPassword(email) {
  // TODO: Replace this entire block with a real API call:
  // ─────────────────────────────────────────────────────
  // const response = await fetch(`${API_BASE_URL}/auth/forgot`, {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify({ email }),
  // });
  // const json = await response.json();
  // if (!response.ok) {
  //   return { success: false, error: json.error || 'Request failed' };
  // }
  // return { success: true, data: json.data };
  // ─────────────────────────────────────────────────────

  return new Promise((resolve) => {
    setTimeout(() => {
      if (email === 'test@mwp.com') {
        resolve({
          success: true,
          data: {
            message: `Password reset email sent to ${email}`,
          },
        });
      } else {
        resolve({
          success: false,
          error: 'No account found with that email address.',
        });
      }
    }, 1500);
  });
}

/**
 * Register a new therapist account.
 *
 * @param {Object} therapistData
 * @param {string} therapistData.name            — full name, e.g. "Dr. Sarah Mitchell"
 * @param {string} therapistData.email           — email address
 * @param {string} therapistData.password        — chosen password (min 6 chars)
 * @param {string} therapistData.specialization  — e.g. "Sports Physiotherapy"
 * @returns {Promise<Object>} Resolves to one of:
 *
 *   Success:
 *   {
 *     success: true,
 *     data: {
 *       token: "eyJhbGciOiJIUzI1NiIs...",
 *       therapist: {
 *         id: "t_002",
 *         name: "Dr. Sarah Mitchell",
 *         email: "sarah@movementwithphysios.com",
 *         role: "therapist"
 *       }
 *     }
 *   }
 *
 *   Failure:
 *   {
 *     success: false,
 *     error: "An account with this email already exists"
 *   }
 */
export async function register(therapistData) {
  // TODO: Replace this entire block with a real API call:
  // ─────────────────────────────────────────────────────
  // const response = await fetch(`${API_BASE_URL}/auth/register`, {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify(therapistData),
  // });
  // const json = await response.json();
  // if (!response.ok) {
  //   return { success: false, error: json.error || 'Registration failed' };
  // }
  // return { success: true, data: json.data };
  // ─────────────────────────────────────────────────────

  return new Promise((resolve) => {
    setTimeout(() => {
      if (therapistData.email === 'test@mwp.com') {
        resolve({
          success: false,
          error: 'An account with this email already exists.',
        });
      } else {
        resolve({
          success: true,
          data: {
            token: 'mock_jwt_token_new_user_456',
            therapist: {
              id: 't_002',
              name: therapistData.name,
              email: therapistData.email,
              role: 'therapist',
            },
          },
        });
      }
    }, 1500);
  });
}
