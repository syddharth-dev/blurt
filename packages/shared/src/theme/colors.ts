/**
 * Colour tokens. Source of truth: docs/BRAND.md → "Colour tokens".
 * Never hard-code a colour anywhere else; import from here (mobile: `src/theme`).
 */
export const colors = {
  violet: '#5B2EFF',
  night: '#160C3A',
  sunny: '#FFC93C',
  sunnyShadow: '#C98F00',
  coral: '#FF6B4A',
  coralShadow: '#C2410C',
  mint: '#7FE0C0',
  lilac: '#EFE9FF',
  lilacLine: '#E4DCFF',
  ink2: '#4B4370',
  white: '#FFFFFF',
} as const;

export type ColorToken = keyof typeof colors;

/** Translucent surfaces. BRAND.md gives ranges; these are the defaults inside them. */
export const surfaces = {
  /** Controls on scenes. rgba(255,255,255,0.12–0.16) + 14–18 px blur. */
  glass: 'rgba(255,255,255,0.14)',
  glassStrong: 'rgba(255,255,255,0.16)',
  glassBorder: 'rgba(255,255,255,0.28)',
  glassBlur: 16,
  /** Chips and fact card on scenes. rgba(22,12,58,0.35–0.6) + blur. */
  scrim: 'rgba(22,12,58,0.45)',
  scrimStrong: 'rgba(22,12,58,0.6)',
  /** Card shadow colour: rgba(22,12,58,0.3). */
  cardShadow: 'rgba(22,12,58,0.3)',
} as const;

/**
 * Pip's palette. Source of truth: docs/MASCOT.md → "Anatomy" and docs/BRAND.md → "Pip colours".
 * Only the mascot uses these.
 */
export const pipColors = {
  body: '#FFC93C',
  belly: '#FFE59A',
  limb: '#F5B21E',
  inner: '#FF7A59',
  ink: '#160C3A',
  lens: '#8FD8FF',
  white: '#FFFFFF',
  shadow: '#0B0424',
} as const;
