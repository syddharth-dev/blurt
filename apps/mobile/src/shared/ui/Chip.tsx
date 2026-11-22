import { Pressable, StyleSheet, Text } from 'react-native';
import { colors, radius, sizes, space, surfaces, textStyle } from '@/theme';

type Props = { label: string; selected: boolean; onPress: () => void };

/** Selectable glass chip for use on dark scenes. Meets the 44 pt touch target. */
export function Chip({ label, selected, onPress }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.chip, selected && styles.selected]}
    >
      <Text style={[styles.text, selected && styles.textSelected]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    minHeight: sizes.minTouch,
    justifyContent: 'center',
    paddingHorizontal: space.s14,
    borderRadius: radius.chip,
    backgroundColor: surfaces.glass,
  },
  selected: { backgroundColor: colors.sunny },
  text: { ...textStyle('chip'), color: colors.white },
  textSelected: { color: colors.night },
});
