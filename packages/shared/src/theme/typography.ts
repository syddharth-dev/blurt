/**
 * Type tokens. Source of truth: docs/BRAND.md → "Typography".
 * Font family names match the @expo-google-fonts exports so the app can load them by these keys.
 */
export const fontFamilies = {
  display: 'BricolageGrotesque_800ExtraBold',
  body: 'DMSans_400Regular',
  bodyMedium: 'DMSans_500Medium',
  bodyBold: 'DMSans_700Bold',
} as const;

/** Web (dashboard) font stacks. */
export const webFontFamilies = {
  display: '"Bricolage Grotesque", system-ui, sans-serif',
  body: '"DM Sans", system-ui, sans-serif',
} as const;

type TextRole = {
  family: keyof typeof fontFamilies;
  /** pt in the app, px on the web */
  size: number;
  /** multiplier of size */
  lineHeight?: number;
  /** em, e.g. -0.03 = −3 % */
  tracking?: number;
  uppercase?: boolean;
};

export const textRoles = {
  wordmark: { family: 'display', size: 56, lineHeight: 1.0, tracking: -0.03 },
  display: { family: 'display', size: 48, lineHeight: 1.0 },
  title: { family: 'display', size: 22, lineHeight: 1.1 },
  button: { family: 'display', size: 18 },
  tile: { family: 'display', size: 24 },
  body: { family: 'body', size: 15, lineHeight: 1.4 },
  bodyMedium: { family: 'bodyMedium', size: 15, lineHeight: 1.4 },
  label: { family: 'bodyBold', size: 12, tracking: 0.07, uppercase: true },
  chip: { family: 'bodyBold', size: 12 },
} as const satisfies Record<string, TextRole>;

export type TextRoleName = keyof typeof textRoles;
