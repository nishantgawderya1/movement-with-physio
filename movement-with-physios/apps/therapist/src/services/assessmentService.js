/**
 * assessmentService — therapist-driven assessment endpoints.
 * RBAC is enforced server-side; this is just the transport layer.
 */

import { apiClient } from '../lib/apiClient';

/**
 * GET /api/v1/assessments/:id
 * For therapist on a therapist_driven assessment → returns the full doc
 * (questions + responses). For patient_self → also full, since the
 * therapist is one of the participants.
 */
export async function getAssessment(assessmentId) {
  var response = await apiClient.get(`/assessments/${assessmentId}`);
  if (!response.success) {
    return { success: false, error: response.error || 'Failed to load assessment' };
  }
  return { success: true, data: response.data };
}

/**
 * POST /api/v1/assessments/:id/respond
 * Records the therapist's answer for one question. Idempotent — re-submitting
 * the same questionId overwrites the previous answer.
 *
 * Server validates answer shape against question.answerType.
 *
 * @param {string} assessmentId
 * @param {{ questionId: string, answer: any }} body
 */
export async function respond(assessmentId, { questionId, answer }) {
  var response = await apiClient.post(
    `/assessments/${assessmentId}/respond`,
    { questionId, answer }
  );
  if (!response.success) {
    return { success: false, error: response.error || 'Failed to save response' };
  }
  return { success: true, data: response.data };
}

/**
 * PATCH /api/v1/assessments/:id/complete
 * Marks the assessment completed and enqueues the PDF generation worker
 * (idempotent BullMQ jobId on the assessment).
 */
export async function complete(assessmentId) {
  var response = await apiClient.patch(`/assessments/${assessmentId}/complete`, {});
  if (!response.success) {
    return { success: false, error: response.error || 'Failed to complete assessment' };
  }
  return { success: true, data: response.data };
}

/**
 * GET /api/v1/assessments/:id/pdf
 * Returns { status: 'generating' } (HTTP 202) while the worker is running,
 * or { status: 'ready', url, generatedAt } (HTTP 200) once persisted.
 * Callers should poll on the 'generating' state.
 */
export async function getPdf(assessmentId) {
  var response = await apiClient.get(`/assessments/${assessmentId}/pdf`);
  if (!response.success) {
    return { success: false, error: response.error || 'Failed to fetch PDF' };
  }
  return { success: true, data: response.data };
}
