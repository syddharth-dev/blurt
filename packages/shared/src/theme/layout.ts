/** Spacing, radius and elevation. Source of truth: docs/BRAND.md → "Spacing, radius, elevation". */

export const space = {
  s4: 4,
  s6: 6,
  s8: 8,
  s10: 10,
  s12: 12,
  s14: 14,
  s16: 16,
  s20: 20,
  s24: 24,
  /** Screen side padding */
  screen: 20,
} as const;

export const radius = {
  chip: 14,
  tile: 12,
  button: 22,
  card: 24,
  pictureCard: 34,
  dock: 32,
  dockButton: 20,
  bubble: 22,
  full: 9999,
} as const;

export const sizes = {
  /** Minimum touch target (AGENTS.md rule 6) */
  minTouch: 44,
  mic: 92,
  dockButton: 56,
  primaryButtonHeight: 60,
  tileWidth: 40,
  tileHeight: 48,
  topicCardWidth: 136,
  topicCardPanel: 76,
  pictureCard: 250,
  /** Count badge on the dock's side buttons */
  badge: 22,
  progressHeight: 8,
  icon: 24,
  iconSmall: 18,
  tileGap: 6,
  pip: { home: 120, play: 104, summary: 112, icon: 124 },
} as const;

export const elevation = {
  /** 3D button: box-shadow 0 6px 0 <shadowToken>; pressed moves down 4 and shadow shrinks to 2. */
  button3d: { offsetY: 6, pressedOffsetY: 2, pressTravel: 4 },
  /** Letter tile bottom edge */
  tile: { offsetY: 4 },
  /** Card shadow: 0 10–18px 24–40px rgba(22,12,58,0.3). */
  card: { offsetY: 14, blur: 32, opacity: 0.3 },
} as const;
