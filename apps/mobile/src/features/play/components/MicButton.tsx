import { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
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
import { MicIcon } from '@/shared/ui/icons';
import { colors, elevation, motion, radius, sizes, surfaces } from '@/theme';

type Props = {
  look: 'idle' | 'listening' | 'disabled';
  onPress: () => void;
  accessibilityLabel: string;
};

/**
 * Mic button (BRAND.md): 92 circle. Idle = sunny with a night mic. Listening = coral with
 * a 5-bar waveform and two expanding rings. Reduce Motion: no rings, still bars.
 */
export function MicButton({ look, onPress, accessibilityLabel }: Props) {
  const listening = look === 'listening';
  return (
    <View style={styles.wrap}>
      {listening ? (
        <>
          <Ring delay={0} />
          <Ring delay={motion.listenRing.offset} />
        </>
      ) : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityState={{ disabled: look === 'disabled', busy: listening }}
        disabled={look === 'disabled'}
        onPress={onPress}
        style={({ pressed }) => [
          styles.mic,
          listening ? styles.live : styles.idle,
          look === 'disabled' && styles.disabled,
          pressed && styles.pressed,
        ]}
      >
        {listening ? <Waveform /> : <MicIcon color={colors.night} />}
      </Pressable>
    </View>
  );
}

function Ring({ delay }: { delay: number }) {
  const reduced = useReducedMotion();
  const t = useSharedValue(0);
  useEffect(() => {
    if (reduced) return;
    t.value = withDelay(
      delay,
      withRepeat(
        withTiming(1, { duration: motion.listenRing.duration, easing: Easing.out(Easing.quad) }),
        -1,
      ),
    );
    return () => cancelAnimation(t);
  }, [reduced, delay, t]);
  const style = useAnimatedStyle(() => ({
    opacity: motion.listenRing.fromOpacity * (1 - t.value),
    transform: [{ scale: 1 + (motion.listenRing.scaleTo - 1) * t.value }],
  }));
  if (reduced) return null;
  return <Animated.View pointerEvents="none" style={[styles.ring, style]} />;
}

function Waveform() {
  return (
    <View style={styles.bars}>
      {Array.from({ length: motion.waveform.bars }, (_, i) => (
        <Bar key={i} index={i} />
      ))}
    </View>
  );
}

function Bar({ index }: { index: number }) {
  const reduced = useReducedMotion();
  const s = useSharedValue(1);
  useEffect(() => {
    if (reduced) return;
    const half = motion.waveform.duration / 2;
    s.value = withDelay(
      index * (half / motion.waveform.bars),
      withRepeat(
        withSequence(
          withTiming(motion.waveform.minScale, { duration: half }),
          withTiming(1, { duration: half }),
        ),
        -1,
      ),
    );
    return () => cancelAnimation(s);
  }, [reduced, index, s]);
  const style = useAnimatedStyle(() => ({ transform: [{ scaleY: s.value }] }));
  return <Animated.View style={[styles.bar, style]} />;
}

const BAR_W = 5;

const styles = StyleSheet.create({
  wrap: { width: sizes.mic, height: sizes.mic, alignItems: 'center', justifyContent: 'center' },
  mic: {
    width: sizes.mic,
    height: sizes.mic,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  idle: {
    backgroundColor: colors.sunny,
    boxShadow: `0 ${elevation.button3d.offsetY}px 0 ${colors.sunnyShadow}, 0 14px 30px ${surfaces.cardShadow}`,
  },
  live: {
    backgroundColor: colors.coral,
    boxShadow: `0 ${elevation.button3d.offsetY}px 0 ${colors.coralShadow}, 0 14px 30px ${surfaces.cardShadow}`,
  },
  disabled: { opacity: 0.6 },
  pressed: { transform: [{ translateY: elevation.button3d.pressTravel }] },
  ring: {
    position: 'absolute',
    width: sizes.mic,
    height: sizes.mic,
    borderRadius: radius.full,
    borderWidth: 3,
    borderColor: colors.coral,
  },
  bars: { flexDirection: 'row', alignItems: 'center', gap: BAR_W - 1, height: sizes.icon * 1.6 },
  bar: { width: BAR_W, height: '100%', borderRadius: radius.full, backgroundColor: colors.night },
});
