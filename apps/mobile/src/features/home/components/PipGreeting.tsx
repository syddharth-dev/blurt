import { StyleSheet, Text, View } from 'react-native';
import { Pip } from '@/shared/mascot';
import { colors, elevation, radius, sizes, space, surfaces, textStyle } from '@/theme';

/** Pip (wave) with a speech bubble: "Hey, I'm Pip." / "Ready to name some science?" */
export function PipGreeting({ title, sub }: { title: string; sub: string }) {
  return (
    <View style={styles.row}>
      {/* On Home, Pip waves (MASCOT.md mood mapping). */}
      <Pip mood="wave" size={sizes.pip.home} />
      <View style={styles.bubble} accessible accessibilityLiveRegion="polite">
        <View style={styles.tail} />
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.sub}>{sub}</Text>
      </View>
    </View>
  );
}

const TAIL = 16;
const BUBBLE_MAX = 180;

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.s6 },
  bubble: {
    maxWidth: BUBBLE_MAX,
    backgroundColor: colors.white,
    borderRadius: radius.bubble - 2,
    paddingHorizontal: space.s14,
    paddingVertical: space.s12,
    boxShadow: `0 ${elevation.card.offsetY - 4}px ${elevation.card.blur - 8}px ${surfaces.cardShadow}`,
  },
  tail: {
    position: 'absolute',
    left: -TAIL / 2 + 1,
    top: space.s24,
    width: TAIL,
    height: TAIL,
    borderRadius: 3,
    backgroundColor: colors.white,
    transform: [{ rotate: '45deg' }],
  },
  title: { ...textStyle('title'), color: colors.night },
  sub: { ...textStyle('body'), color: colors.ink2, marginTop: 2 },
});
