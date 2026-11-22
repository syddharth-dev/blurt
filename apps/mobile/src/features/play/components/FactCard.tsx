import { StyleSheet, Text, View } from 'react-native';
import { AtomIcon } from '@/shared/ui/icons';
import { colors, radius, space, surfaces, textStyle } from '@/theme';

/** Fact card (BRAND.md): scrim glass, atom icon, "QUICK FACT" in sunny, one sentence. */
export function FactCard({ fact }: { fact: string }) {
  return (
    <View style={styles.card} accessible accessibilityLabel={`Quick fact. ${fact}`}>
      <AtomIcon color={colors.sunny} />
      <View style={styles.text}>
        <Text style={styles.label}>QUICK FACT</Text>
        <Text style={styles.fact}>{fact}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    gap: space.s12,
    alignItems: 'flex-start',
    backgroundColor: surfaces.scrimStrong,
    borderRadius: radius.card,
    padding: space.s16,
  },
  text: { flex: 1, gap: space.s4 },
  label: { ...textStyle('label'), color: colors.sunny },
  fact: { ...textStyle('body'), color: colors.white },
});
