import { useEffect } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { colors, motion } from '@/theme';
import { between, seeded } from './random';

const PALETTE = [
  colors.sunny,
  colors.coral,
  colors.mint,
  colors.violet,
  colors.white,
  colors.lilac,
];
const PIECE = { w: 8, h: 12, r: 2 };
const MAX_DELAY = 250;

/**
 * Confetti (BRAND.md): 22 pieces falling for 2.2–3.4 s. Bursts each time `burst` changes
 * (null = none). Nothing renders with Reduce Motion.
 */
export function Confetti({ burst }: { burst: number | null }) {
  const reduced = useReducedMotion();
  if (burst === null || reduced) return null;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {Array.from({ length: motion.confetti.pieces }, (_, i) => (
        <Piece key={`${burst}-${i}`} seed={burst * 101 + i} />
      ))}
    </View>
  );
}

function Piece({ seed }: { seed: number }) {
  const { width, height } = useWindowDimensions();
  const rand = seeded(seed);
  const x = rand() * width;
  const duration = between(rand, motion.confetti.minDuration, motion.confetti.maxDuration);
  const delay = rand() * MAX_DELAY;
  const sway = (rand() - 0.5) * 2 * motion.confetti.sway;
  const spin = (rand() > 0.5 ? 1 : -1) * 360 * motion.confetti.spins;
  const color = PALETTE[Math.floor(rand() * PALETTE.length)]!;

  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withDelay(delay, withTiming(1, { duration, easing: Easing.in(Easing.quad) }));
  }, [t, delay, duration]);
  const style = useAnimatedStyle(() => ({
    opacity: 1 - t.value * t.value,
    transform: [
      { translateX: x + sway * Math.sin(t.value * Math.PI * 2) },
      { translateY: -PIECE.h * 2 + (height + PIECE.h * 4) * t.value },
      { rotate: `${spin * t.value}deg` },
    ],
  }));
  return <Animated.View style={[styles.piece, { backgroundColor: color }, style]} />;
}

const styles = StyleSheet.create({
  piece: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: PIECE.w,
    height: PIECE.h,
    borderRadius: PIECE.r,
  },
});
