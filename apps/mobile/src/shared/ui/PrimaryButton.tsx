import { Pressable, StyleSheet, Text } from 'react-native';
import { colors, elevation, radius, sizes, space, textStyle } from '@/theme';

type Props = { label: string; onPress: () => void; accessibilityHint?: string };

/** Sunny 3D button (docs/BRAND.md → "Primary button"). Breathing motion comes in Phase 2. */
export function PrimaryButton({ label, onPress, accessibilityHint }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityHint={accessibilityHint}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        pressed && {
          transform: [{ translateY: elevation.button3d.pressTravel }],
          boxShadow: `0 ${elevation.button3d.pressedOffsetY}px 0 ${colors.sunnyShadow}`,
        },
      ]}
    >
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: sizes.primaryButtonHeight,
    paddingHorizontal: space.s24,
    borderRadius: radius.button,
    backgroundColor: colors.sunny,
    boxShadow: `0 ${elevation.button3d.offsetY}px 0 ${colors.sunnyShadow}`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { ...textStyle('button'), color: colors.night },
});
