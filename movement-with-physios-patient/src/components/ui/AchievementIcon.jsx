import React from 'react';
import Svg, { Path, Circle, G } from 'react-native-svg';

// ─── FlameIcon — "Consistent — 7 Days" ───────────────────────────────────────
function FlameIcon({ size }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      {/* Outer warm amber flame body */}
      <Path
        d="M24 4C24 4 14 16 14 26C14 31.523 18.477 36 24 36C29.523 36 34 31.523 34 26C34 16 24 4 24 4Z"
        fill="#F6AD55"
      />
      {/* Inner teal core flame */}
      <Path
        d="M24 18C24 18 19 25 19 29C19 31.761 21.239 34 24 34C26.761 34 29 31.761 29 29C29 25 24 18 24 18Z"
        fill="#00B894"
      />
      {/* Base glow dot */}
      <Circle cx="24" cy="40" r="4" fill="#F6AD55" opacity="0.4" />
    </Svg>
  );
}

// ─── StarIcon — "Streak — Level 2" ───────────────────────────────────────────
function StarIcon({ size }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      {/* Outer amber 5-point star */}
      <Path
        d="M24 4L28.944 16.18L42 17.639L32.4 26.82L35.056 40L24 33.36L12.944 40L15.6 26.82L6 17.639L19.056 16.18L24 4Z"
        fill="#F6AD55"
        stroke="#ED8936"
        strokeWidth="1"
        strokeLinejoin="round"
      />
      {/* Inner teal accent overlay */}
      <Path
        d="M24 10L27.09 18.41L36 19.27L29.7 25.14L31.64 34L24 29.77L16.36 34L18.3 25.14L12 19.27L20.91 18.41L24 10Z"
        fill="#00B894"
        opacity="0.3"
      />
    </Svg>
  );
}

// ─── TrophyIcon — "Milestone — 1 Month" ──────────────────────────────────────
function TrophyIcon({ size }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      {/* Cup body — teal */}
      <Path
        d="M14 6H34V26C34 32.627 29.627 38 24 38C18.373 38 14 32.627 14 26V6Z"
        fill="#00B894"
      />
      {/* Left handle — amber */}
      <Path
        d="M14 10H8C8 10 8 22 14 22"
        stroke="#F6AD55"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
      />
      {/* Right handle — amber */}
      <Path
        d="M34 10H40C40 10 40 22 34 22"
        stroke="#F6AD55"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
      />
      {/* Base stem */}
      <Path
        d="M18 38H30V42H18V38Z"
        fill="#00B894"
        opacity="0.7"
      />
      {/* Base bar */}
      <Path
        d="M14 42H34"
        stroke="#00B894"
        strokeWidth="3"
        strokeLinecap="round"
      />
      {/* White checkmark inside cup */}
      <Path
        d="M20 20L23 25L28 17"
        stroke="white"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
}

// ─── Public component ─────────────────────────────────────────────────────────
/**
 * Renders a premium SVG achievement icon.
 *
 * @param {{ type: 'flame' | 'star' | 'trophy', size?: number }} props
 */
const AchievementIcon = ({ type, size = 48 }) => {
  if (type === 'flame')  return <FlameIcon  size={size} />;
  if (type === 'star')   return <StarIcon   size={size} />;
  if (type === 'trophy') return <TrophyIcon size={size} />;
  return null;
};

export default AchievementIcon;
