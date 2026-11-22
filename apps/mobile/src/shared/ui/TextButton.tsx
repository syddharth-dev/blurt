import { Pressable, StyleSheet, Text } from 'react-native';
import { colors, sizes, textStyle } from '@/theme';

type Props = { label: string; onPress: () => void; tone?: 'onDark' | 'onLight' };

/** Text-only button: sunny on dark scenes, violet on white cards. 44 pt touch target. */
export function TextButton({ label, onPress, tone = 'onDark' }: Props) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.button}>
      <Text style={[styles.label, { color: tone === 'onDark' ? colors.sunny : colors.violet }]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { minHeight: sizes.minTouch, minWidth: sizes.minTouch, justifyContent: 'center' },
  label: { ...textStyle('chip') },
});
