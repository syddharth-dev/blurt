/**
 * Motion tokens (docs/BRAND.md → "Motion"). Every animation must check Reduce Motion
 * (Reanimated's `useReducedMotion()`): drift, spin, float and confetti turn off,
 * shakes and pops become `motion.fade`.
 */
export { motion } from '@blurt/shared/theme';
export type { MotionToken } from '@blurt/shared/theme';
