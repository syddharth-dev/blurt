import { useEffect } from 'react';
import { StyleSheet, Text } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { colors, motion, textStyle } from '@/theme';

/**
 * Rise (BRAND.md): "+100" moves up 60 px and fades over 1.6 s. Remount (key) to replay.
 * With Reduce Motion it only fades.
 */
export function Rise({ text }: { text: string }) {
  const reduced = useReducedMotion();
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withTiming(1, { duration: motion.rise.duration, easing: Easing.out(Easing.quad) });
  }, [t]);
  const style = useAnimatedStyle(() => ({
    opacity: 1 - t.value,
    transform: [{ translateY: reduced ? 0 : -motion.rise.distance * t.value }],
  }));
  return (
    <Animated.View pointerEvents="none" style={[styles.wrap, style]} accessibilityElementsHidden>
      <Text style={styles.text}>{text}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', alignSelf: 'center' },
  text: {
    ...textStyle('display'),
    color: colors.sunny,
    textShadowColor: colors.night,
    textShadowRadius: 6,
  },
});
