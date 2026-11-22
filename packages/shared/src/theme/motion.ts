/**
 * Motion tokens (ms unless noted). Source of truth: docs/BRAND.md → "Motion".
 * Ambient motion is slow and quiet; reactive motion is quick and clear.
 * When Reduce Motion is on: no drift, spin, float or confetti; shakes and pops become fades.
 */
export const motion = {
  /** Background atoms cross the screen; each gets its own duration in the range. */
  drift: { minDuration: 36_000, maxDuration: 56_000, fromX: -120, toX: 460 },
  spinAtom: { duration: 11_000, minDuration: 9_000, maxDuration: 14_000 },
  spinSunburst: { duration: 34_000 },
  twinkle: { minDuration: 2_000, maxDuration: 3_000, minOpacity: 0.15, scaleFrom: 0.7 },
  float: { duration: 4_000, translateY: -8, rotateFrom: -2, rotateTo: -1 },
  listenRing: { duration: 1_300, scaleTo: 1.75, fromOpacity: 0.6, offset: 450 },
  shake: { duration: 400, distance: 6, repeat: 2 },
  pop: { duration: 500, stagger: 60, scaleFrom: 0.4, overshoot: 1.18, rotate: -8 },
  rise: { duration: 1_600, distance: 60 },
  /** Confetti falls with a little sideways sway and spin. */
  confetti: { pieces: 22, minDuration: 2_200, maxDuration: 3_400, sway: 24, spins: 2 },
  breathe: { duration: 1_800, scaleTo: 1.04 },
  /** The wordmark's "!" wiggles (degrees, lift in px). */
  wiggle: { duration: 1_600, from: 8, to: -6, lift: -3 },
  /** Daily card's fanned mini cards sway a little. */
  fan: { duration: 3_000, sway: 4 },
  /** Current progress segment pulsing white. */
  pulse: { duration: 1_200, minOpacity: 0.35 },
  /** Mic waveform bars while listening. */
  waveform: { duration: 500, bars: 5, minScale: 0.3 },
  /** Fallback used instead of shake/pop when Reduce Motion is on. */
  fade: { duration: 200 },
} as const;

export type MotionToken = keyof typeof motion;
