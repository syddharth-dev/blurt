import { useEffect } from 'react';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { colors, motion } from '@/theme';

const RAYS = 16;
const RAY_OPACITY = 0.08;

/** Slowly spinning sunburst behind the picture card and on Summary (still with Reduce Motion). */
export function Sunburst({ size }: { size: number }) {
  const reduced = useReducedMotion();
  const rot = useSharedValue(0);
  useEffect(() => {
    if (reduced) {
      cancelAnimation(rot);
      return;
    }
    rot.value = withRepeat(
      withTiming(360, { duration: motion.spinSunburst.duration, easing: Easing.linear }),
      -1,
    );
    return () => cancelAnimation(rot);
  }, [reduced, rot]);
  const style = useAnimatedStyle(() => ({ transform: [{ rotate: `${rot.value}deg` }] }));

  const c = size / 2;
  const half = Math.PI / RAYS / 2;
  const rays = Array.from({ length: RAYS }, (_, i) => {
    const a = (i / RAYS) * Math.PI * 2;
    const p1 = `${c + c * Math.cos(a - half)},${c + c * Math.sin(a - half)}`;
    const p2 = `${c + c * Math.cos(a + half)},${c + c * Math.sin(a + half)}`;
    return `M${c},${c} L${p1} L${p2} Z`;
  }).join(' ');

  return (
    <Animated.View pointerEvents="none" style={[{ width: size, height: size }, style]}>
      <Svg width={size} height={size}>
        <Path d={rays} fill={colors.white} opacity={RAY_OPACITY} />
      </Svg>
    </Animated.View>
  );
}
