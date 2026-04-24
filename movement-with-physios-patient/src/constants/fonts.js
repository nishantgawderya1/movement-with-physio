/**
 * Font constants — single source of truth for all typography in MWP Patient.
 *
 * Font pairs:
 *   Heading → Lora (serif, warm & readable)
 *   Body    → Nunito (rounded sans-serif, friendly & legible)
 *
 * Use `fonts.heading.*` for screen titles, section headings, plan card titles.
 * Use `fonts.body.*` for all other text (labels, buttons, body copy, tabs, pills).
 */

// ── Numeric scale (unchanged) ──────────────────────────────────────────────
export const fontSizes = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 20,
  xxl: 26,
  xxxl: 32,
};

// ── Font-weight shorthands (unchanged) ────────────────────────────────────
export const fontWeights = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
  extrabold: '800',
};

// ── Family references (google-fonts key names, Expo-loaded) ───────────────
export const fonts = {
  // Size scale — kept at top level for backward compatibility
  xs: 11,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 20,
  xxl: 26,
  xxxl: 32,

  // Weight shorthands — kept at top level for backward compatibility
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
  extrabold: '800',

  // ── Heading (Lora) ──
  heading: {
    regular: 'Lora_400Regular',
    italic: 'Lora_400Regular_Italic',
    semibold: 'Lora_600SemiBold',
  },

  // ── Body (Nunito) ──
  body: {
    regular: 'Nunito_400Regular',
    medium: 'Nunito_500Medium',
    semibold: 'Nunito_600SemiBold',
  },
};
