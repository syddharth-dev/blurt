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

const RAYS = 8;
const RAY_OPACITY = 0.2;
/** Ray width as a fraction of the gap between rays. */
const RAY_WIDTH = 0.12;
/** The sunburst is dimmer until a correct answer brightens it. */
const DIM = 0.6;

/**
 * Slowly spinning sunburst behind the picture card and on Summary (still with Reduce Motion).
 * The rays run past the edges, like the canvas.
 */
export function Sunburst({ size, bright = false }: { size: number; bright?: boolean }) {
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
  const half = (Math.PI / RAYS) * RAY_WIDTH;
  const rays = Array.from({ length: RAYS }, (_, i) => {
    const a = (i / RAYS) * Math.PI * 2;
    const r = c * 1.42; // reach the corners
    const p1 = `${c + r * Math.cos(a - half)},${c + r * Math.sin(a - half)}`;
    const p2 = `${c + r * Math.cos(a + half)},${c + r * Math.sin(a + half)}`;
    return `M${c},${c} L${p1} L${p2} Z`;
  }).join(' ');

  return (
    <Animated.View
      pointerEvents="none"
      style={[{ width: size, height: size, opacity: bright ? 1 : DIM }, style]}
    >
      <Svg width={size} height={size}>
        <Path d={rays} fill={colors.sunny} opacity={RAY_OPACITY} />
      </Svg>
    </Animated.View>
  );
}
