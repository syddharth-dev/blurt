import { useEffect, type ReactNode } from 'react';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { motion } from '@/theme';

/** Float (BRAND.md): translateY 0 ↔ −8, rotate −2° ↔ −1°, 4 s. Off with Reduce Motion. */
export function Float({ children }: { children: ReactNode }) {
  const reduced = useReducedMotion();
  const t = useSharedValue(0);
  useEffect(() => {
    if (reduced) {
      cancelAnimation(t);
      t.value = 0;
      return;
    }
    const half = motion.float.duration / 2;
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
  const { translateY, rotateFrom, rotateTo } = motion.float;
  const style = useAnimatedStyle(() => ({
    transform: [
      { translateY: translateY * t.value },
      { rotate: `${reduced ? 0 : rotateFrom + (rotateTo - rotateFrom) * t.value}deg` },
    ],
  }));
  return <Animated.View style={style}>{children}</Animated.View>;
}
