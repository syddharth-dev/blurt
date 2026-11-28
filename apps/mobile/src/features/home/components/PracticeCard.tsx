import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, sizes, space, surfaces, textStyle } from '@/theme';

type Props = { dueCount: number; onPractise: () => void };

/**
 * "Practice · N due" (Phase 5): terms coming back for review (spaced repetition). A quiet
 * white card under the daily challenge; the daily card keeps the one breathing button.
 */
export function PracticeCard({ dueCount, onPractise }: Props) {
  const label = `${dueCount} ${dueCount === 1 ? 'term is' : 'terms are'} back for review`;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Practice. ${label}.`}
      accessibilityHint="Starts a short practice round"
      onPress={onPractise}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.info}>
        <Text style={styles.tag}>PRACTICE · {Math.min(dueCount, 99)} DUE</Text>
        <Text style={styles.title}>{label}</Text>
        <Text style={styles.sub}>A quick review keeps them fresh.</Text>
      </View>
      <View style={styles.go}>
        <Text style={styles.goText}>Practise</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.s12,
    backgroundColor: colors.white,
    borderRadius: radius.card,
    padding: space.s14,
    minHeight: sizes.minTouch,
    boxShadow: `0 10px 24px ${surfaces.cardShadow}`,
  },
  pressed: { opacity: 0.85 },
  info: { flex: 1, minWidth: 0, gap: space.s4 },
  tag: {
    ...textStyle('label'),
    alignSelf: 'flex-start',
    color: colors.violetInk,
    backgroundColor: colors.violetTint,
    borderRadius: radius.chip,
    paddingHorizontal: space.s8,
    paddingVertical: space.s4,
    overflow: 'hidden',
  },
  title: { ...textStyle('title'), color: colors.night },
  sub: { ...textStyle('body'), color: colors.ink2 },
  go: {
    minHeight: sizes.minTouch,
    justifyContent: 'center',
    borderRadius: radius.button,
    backgroundColor: colors.violet,
    paddingHorizontal: space.s16,
  },
  goText: { ...textStyle('button'), color: colors.white },
});
