import type { TextStyle } from 'react-native';
import { fontFamilies, textRoles, type TextRoleName } from '@blurt/shared/theme';
// Per-weight imports so only the four weights we use are bundled.
import { BricolageGrotesque_800ExtraBold } from '@expo-google-fonts/bricolage-grotesque/800ExtraBold';
import { DMSans_400Regular } from '@expo-google-fonts/dm-sans/400Regular';
import { DMSans_500Medium } from '@expo-google-fonts/dm-sans/500Medium';
import { DMSans_700Bold } from '@expo-google-fonts/dm-sans/700Bold';

export { fontFamilies };

/** Pass to `useFonts` in the root layout. Keys match `fontFamilies`. */
export const fontAssets = {
  [fontFamilies.display]: BricolageGrotesque_800ExtraBold,
  [fontFamilies.body]: DMSans_400Regular,
  [fontFamilies.bodyMedium]: DMSans_500Medium,
  [fontFamilies.bodyBold]: DMSans_700Bold,
};

/** React Native text style for a brand text role (docs/BRAND.md → "Typography"). */
export function textStyle(role: TextRoleName): TextStyle {
  const r: (typeof textRoles)[TextRoleName] = textRoles[role];
  return {
    fontFamily: fontFamilies[r.family],
    fontSize: r.size,
    ...('lineHeight' in r ? { lineHeight: r.size * r.lineHeight } : {}),
    ...('tracking' in r ? { letterSpacing: r.size * r.tracking } : {}),
    ...('uppercase' in r ? { textTransform: 'uppercase' as const } : {}),
  };
}
