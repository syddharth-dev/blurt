import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { colors, motion, textStyle } from '@/theme';

/** Wordmark: lowercase `blurt` + a sunny `!` that wiggles (BRAND.md → Identity). */
export function Wordmark() {
  const reduced = useReducedMotion();
  const t = useSharedValue(0);
  useEffect(() => {
    if (reduced) {
      cancelAnimation(t);
      t.value = 0;
      return;
    }
    const half = motion.wiggle.duration / 2;
    const ease = Easing.inOut(Easing.sin);
    t.value = withRepeat(
      withSequence(
        withTiming(1, { duration: half, easing: ease }),
        withTiming(0, { duration: half, easing: ease }),
      ),
      -1,
    );
    return () => cancelAnimation(t);
  }, [reduced, t]);
  const { from, to, lift } = motion.wiggle;
  const bang = useAnimatedStyle(() => ({
    transform: [
      { translateY: lift * t.value },
      { rotate: `${reduced ? 0 : from + (to - from) * t.value}deg` },
    ],
  }));
  return (
    <View style={styles.row} accessible accessibilityRole="header" accessibilityLabel="Blurt!">
      <Text style={styles.word}>blurt</Text>
      <Animated.View style={bang}>
        <Text style={[styles.word, styles.bang]}>!</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: 2 },
  word: { ...textStyle('wordmark'), color: colors.white },
  bang: { color: colors.sunny },
});
