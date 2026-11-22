import { useEffect, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { colors, elevation, motion, radius, sizes, space, textStyle } from '@/theme';

type Props = {
  label: string;
  onPress: () => void;
  accessibilityHint?: string;
  /** Breathe (scale 1 → 1.04) when this is the main next step (BRAND.md). */
  breathe?: boolean;
  /** Optional icon before the label (e.g. the mic on "Let's blurt"). */
  icon?: ReactNode;
};

/** Sunny 3D button (docs/BRAND.md → "Primary button"). */
export function PrimaryButton({ label, onPress, accessibilityHint, breathe = false, icon }: Props) {
  const reduced = useReducedMotion();
  const scale = useSharedValue(1);
  useEffect(() => {
    if (!breathe || reduced) {
      cancelAnimation(scale);
      scale.value = 1;
      return;
    }
    const half = motion.breathe.duration / 2;
    scale.value = withRepeat(
      withSequence(
        withTiming(motion.breathe.scaleTo, { duration: half }),
        withTiming(1, { duration: half }),
      ),
      -1,
    );
    return () => cancelAnimation(scale);
  }, [breathe, reduced, scale]);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Animated.View style={style}>
      <Pressable
        accessibilityRole="button"
        accessibilityHint={accessibilityHint}
        onPress={onPress}
        style={({ pressed }) => [
          styles.button,
          pressed && {
            transform: [{ translateY: elevation.button3d.pressTravel }],
            boxShadow: `0 ${elevation.button3d.pressedOffsetY}px 0 ${colors.sunnyShadow}`,
          },
        ]}
      >
        {icon}
        <Text style={styles.label}>{label}</Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: sizes.primaryButtonHeight,
    paddingHorizontal: space.s24,
    borderRadius: radius.button,
    backgroundColor: colors.sunny,
    boxShadow: `0 ${elevation.button3d.offsetY}px 0 ${colors.sunnyShadow}`,
    flexDirection: 'row',
    gap: space.s10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { ...textStyle('button'), color: colors.night },
});
