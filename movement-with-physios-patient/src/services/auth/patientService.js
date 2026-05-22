/**
 * Real-backend patient profile/onboarding service.
 *
 * Mock-first envelope contract — returns { success: true, data } or
 * { success: false, error }. Mirrors the chatService / mockOnboardingService
 * shape so callers don't branch on the underlying transport.
 *
 * Auth: apiClient attaches the current Clerk session token automatically.
 */

import { apiClient } from '../../lib/apiClient';

/**
 * Backend painLocation enum — kept here so the mapping below can validate.
 * Must mirror User.painLocation enum + AssessmentQuestionTemplate.bodyPart values.
 */
export var BACKEND_BODY_PARTS = [
  'leg', 'knee', 'back', 'neck', 'shoulder', 'ankle', 'general',
];

/**
 * Map a UI-facing pain-location label (e.g. from the multi-select grid on
 * PainLocationScreen) to the closest backend enum value. Unmappable labels
 * (Arm, Pelvic Physio, Fracture) fall back to 'general' so booking
 * assessments still get the general fallback question set.
 *
 * Designed to be additive — adding new backend body parts (e.g. 'hip') only
 * requires adding entries here, not editing the screen.
 *
 * @param {string} uiLabel - label exactly as shown on PainLocationScreen
 * @returns {'leg'|'knee'|'back'|'neck'|'shoulder'|'ankle'|'general'}
 */
export function mapUiLabelToBodyPart(uiLabel) {
  if (!uiLabel) return 'general';
  switch (String(uiLabel).trim().toLowerCase()) {
    case 'back':          return 'back';
    case 'neck':          return 'neck';
    case 'leg':           return 'leg';
    case 'shoulder':      return 'shoulder';
    case 'knee':          return 'knee';
    case 'ankle':         return 'ankle';
    case 'spine':         return 'back';   // anatomical proxy
    case 'arm':           return 'general';
    case 'pelvic physio': return 'general';
    case 'fracture':      return 'general';
    default:              return 'general';
  }
}

/**
 * Update the authenticated patient's profile (used for ongoing edits AND for
 * pushing painLocation at the end of onboarding).
 *
 * @param {{ painLocation?: string|null, name?: string, phone?: string }} fields
 * @returns {Promise<{ success: boolean, data?: Object, error?: string }>}
 */
export async function updatePatientProfile(fields) {
  return apiClient.patch('/patient/profile', fields);
}
