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
  // Tints for chips and tags on white cards (from the design canvas), each with its ink colour.
  violetTint: '#F1ECFF',
  violetInk: '#3A16C9',
  sunnyTint: '#FFF4D1',
  sunnyInk: '#7A4F00',
  coralTint: '#FFE9E3',
  coralInk: '#B23A0A',
  /** Progress-bar track and dividers on white */
  track: '#EEE9FA',
  /** Locked topic panel and its icon/text */
  lockedPanel: '#E6E0F7',
  lockedInk: '#5E5585',
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

/**
 * Illustration colours for the bundled diagrams (BRAND.md → "Diagram colours").
 * Atom particles reuse the brand tokens: protons coral, neutrons lilacLine, electrons violet.
 */
export const diagramColors = {
  outline: '#160C3A',
  leaf: '#4CBF73',
  leafDark: '#2E8B57',
  cellAnimal: '#FFD9CC',
  cellAnimalEdge: '#FF9E80',
  cellPlant: '#E3F7D9',
  cellPlantWall: '#5DAE45',
  nucleus: '#C9B8FF',
  nucleolus: '#5B2EFF',
  vacuole: '#BDE8FF',
  mitochondrion: '#FFB38A',
  water: '#7FC8F8',
  sky: '#D7EEFF',
  soil: '#B07A4F',
  soilDark: '#8A5A36',
  rock: '#A39C9A',
  rockDark: '#6F6866',
  space: '#1F1452',
  sun: '#FFC93C',
  mars: '#E2603F',
  jupiter: '#E8B88A',
  jupiterBand: '#C98B5E',
  cometTail: '#BDE8FF',
  fungus: '#E58C5A',
  stem: '#F3E3C8',
  insect: '#8DC63F',
  frog: '#3FAE5A',
} as const;
