/**
 * Mock onboarding service.
 * Always resolves — never rejects.
 * Success: resolve({ success: true, data: { ... } })
 * Error:   resolve({ success: false, error: 'message' })
 */

/**
 * Submits the completed onboarding payload.
 * Valid if payload.name is non-empty and painLocations has at least one item.
 *
 * @param {{ name: string, age: string|number, painLocations: string[],
 *   painSeverity: number|null, painDuration: string,
 *   hadPreviousTreatment: boolean|null, previousTreatmentDetails: string,
 *   recoveryGoals: string[], availability: string[] }} payload
 * @returns {Promise<{ success: boolean, data?: { patientId: string, status: string }, error?: string }>}
 */
export function submitOnboarding(payload) {
  return new Promise(function (resolve) {
    setTimeout(function () {
      var isValid =
        payload.name &&
        payload.name.trim().length > 0 &&
        Array.isArray(payload.painLocations) &&
        payload.painLocations.length > 0;

      if (isValid) {
        resolve({
          success: true,
          data: {
            patientId: 'pat_mock_001',
            status: 'pending_match',
          },
        });
      } else {
        resolve({
          success: false,
          error: 'Missing required profile information',
        });
      }
    }, 1500);
  });
}
