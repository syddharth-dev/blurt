import { useEffect } from 'react';
import { StyleSheet, useWindowDimensions } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { AtomIcon } from '@/shared/ui/icons';
import { colors, motion } from '@/theme';
import { between, seeded } from './random';

const ATOM_SIZE = 44;
const ATOM_OPACITY = 0.3;
const DESIGN_WIDTH = 390;

/**
 * Ambient motion (BRAND.md → Motion): atoms drift across and spin; sparkles twinkle.
 * Slow and quiet. With Reduce Motion, atoms stay put and don't spin.
 */
export function Ambient({ atoms, sparkles }: { atoms: number; sparkles: number }) {
  const rand = seeded(7);
  const atomList = Array.from({ length: atoms }, (_, i) => ({
    y: between(rand, 0.12, 0.85),
    duration: between(rand, motion.drift.minDuration, motion.drift.maxDuration),
    spin: between(rand, motion.spinAtom.minDuration, motion.spinAtom.maxDuration),
    start: rand(),
    key: i,
  }));
  const sparkleList = Array.from({ length: sparkles }, (_, i) => ({
    x: between(rand, 0.05, 0.95),
    y: between(rand, 0.03, 0.45),
    size: between(rand, 8, 14),
    duration: between(rand, motion.twinkle.minDuration, motion.twinkle.maxDuration),
    delay: rand() * motion.twinkle.maxDuration,
    key: i,
  }));
  return (
    <>
      {atomList.map(({ key, ...a }) => (
        <DriftingAtom key={key} {...a} />
      ))}
      {sparkleList.map(({ key, ...s }) => (
        <Sparkle key={key} {...s} />
      ))}
    </>
  );
}

function DriftingAtom(p: { y: number; duration: number; spin: number; start: number }) {
  const { width, height } = useWindowDimensions();
  const reduced = useReducedMotion();
  // Design coordinates (−120 → +460 on a 390-wide phone) scaled to this screen.
  const k = width / DESIGN_WIDTH;
  const from = motion.drift.fromX * k;
  const to = motion.drift.toX * k;
  const x = useSharedValue(from + (to - from) * p.start);
  const rot = useSharedValue(0);

  useEffect(() => {
    if (reduced) {
      cancelAnimation(x);
      cancelAnimation(rot);
      return;
    }
    // Finish the current pass from the starting point, then loop full passes.
    const firstLeg = p.duration * (1 - p.start);
    x.value = withSequence(
      withTiming(to, { duration: firstLeg, easing: Easing.linear }),
      withRepeat(
        withSequence(
          withTiming(from, { duration: 0 }),
          withTiming(to, { duration: p.duration, easing: Easing.linear }),
        ),
        -1,
      ),
    );
    rot.value = withRepeat(withTiming(360, { duration: p.spin, easing: Easing.linear }), -1);
    return () => {
      cancelAnimation(x);
      cancelAnimation(rot);
    };
  }, [reduced, x, rot, from, to, p.duration, p.spin, p.start]);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value }, { rotate: `${rot.value}deg` }],
  }));
  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.atom, { top: p.y * height, opacity: ATOM_OPACITY }, style]}
    >
      <AtomIcon color={colors.white} size={ATOM_SIZE} />
    </Animated.View>
  );
}

function Sparkle(p: { x: number; y: number; size: number; duration: number; delay: number }) {
  const { width, height } = useWindowDimensions();
  const reduced = useReducedMotion();
  const t = useSharedValue(1);
  useEffect(() => {
    if (reduced) {
      t.value = 1;
      return;
    }
    const half = p.duration / 2;
    t.value = withDelay(
      p.delay,
      withRepeat(
        withSequence(withTiming(0, { duration: half }), withTiming(1, { duration: half })),
        -1,
      ),
    );
    return () => cancelAnimation(t);
  }, [reduced, t, p.duration, p.delay]);
  const style = useAnimatedStyle(() => ({
    opacity: motion.twinkle.minOpacity + (1 - motion.twinkle.minOpacity) * t.value,
    transform: [{ scale: motion.twinkle.scaleFrom + (1 - motion.twinkle.scaleFrom) * t.value }],
  }));
  const s = p.size;
  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.sparkle, { left: p.x * width, top: p.y * height }, style]}
    >
      <Svg width={s} height={s} viewBox="0 0 10 10">
        <Path d="M5 0 L6 4 L10 5 L6 6 L5 10 L4 6 L0 5 L4 4 Z" fill={colors.white} />
      </Svg>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  atom: { position: 'absolute', left: 0 },
  sparkle: { position: 'absolute' },
});
