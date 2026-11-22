import type { ContentTerm } from '@blurt/shared/content';
import { StyleSheet, Text, View } from 'react-native';
import { colors, elevation, radius, sizes, space, surfaces, textStyle } from '@/theme';

type Props = { term: ContentTerm; solved: boolean };

/**
 * Picture card. Step 3 placeholder: shows the clue (every term starts without a picture).
 * Step 4 draws the diagram with the highlight glow, dashed ring, leader line and "?" badge.
 */
export function PictureCard({ term, solved }: Props) {
  return (
    <View style={styles.card} accessible accessibilityLabel={`Clue: ${term.clue}`}>
      <View style={styles.tag}>
        <Text style={styles.tagText}>{`Grade 8 · ${term.subject}`.toUpperCase()}</Text>
      </View>
      <Text style={styles.clue}>{term.clue}</Text>
      {solved ? <Text style={styles.answer}>{term.display}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    alignSelf: 'center',
    width: sizes.pictureCard,
    minHeight: sizes.pictureCard * 0.72,
    backgroundColor: colors.lilac,
    borderRadius: radius.pictureCard,
    padding: space.s20,
    paddingTop: space.s24 + space.s20,
    gap: space.s10,
    justifyContent: 'center',
    boxShadow: `0 ${elevation.card.offsetY}px ${elevation.card.blur}px ${surfaces.cardShadow}`,
  },
  tag: {
    position: 'absolute',
    top: space.s16,
    left: space.s16,
    backgroundColor: colors.coral,
    borderRadius: radius.chip,
    paddingHorizontal: space.s10,
    paddingVertical: space.s4,
  },
  tagText: { ...textStyle('label'), color: colors.night },
  clue: { ...textStyle('title'), color: colors.night, textAlign: 'center' },
  answer: { ...textStyle('bodyMedium'), color: colors.violet, textAlign: 'center' },
});
