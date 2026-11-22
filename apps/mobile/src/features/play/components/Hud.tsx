import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { CloseIcon, HeartIcon } from '@/shared/ui/icons';
import { colors, motion, radius, sizes, space, surfaces, textStyle } from '@/theme';

type Props = {
  topicTitle: string;
  progress: string;
  /** Terms finished so far (sunny segments) */
  done: number;
  total: number;
  lives: number;
  onQuit: () => void;
};

/** HUD: quit, topic + "3 / 10", segmented progress, lives (docs/SCREENS.md). */
export function Hud({ topicTitle, progress, done, total, lives, onQuit }: Props) {
  return (
    <View style={styles.hud}>
      <View style={styles.row}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Quit round"
          onPress={onQuit}
          style={styles.quit}
          hitSlop={space.s8}
        >
          <CloseIcon color={colors.white} />
        </Pressable>
        <View style={styles.titleBox}>
          <Text style={styles.title} numberOfLines={1}>
            {topicTitle}
          </Text>
          <Text style={styles.progress}>{progress}</Text>
        </View>
        <View
          style={styles.lives}
          accessible
          accessibilityLabel={`${lives} ${lives === 1 ? 'life' : 'lives'} left`}
        >
          <HeartIcon color={colors.coral} />
          <Text style={styles.livesText}>{lives}</Text>
        </View>
      </View>
      <ProgressBar done={done} total={total} />
    </View>
  );
}

function ProgressBar({ done, total }: { done: number; total: number }) {
  return (
    <View
      style={styles.bar}
      accessible
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: total, now: done }}
    >
      {Array.from({ length: total }, (_, i) =>
        i === done ? (
          <CurrentSegment key={i} />
        ) : (
          <View key={i} style={[styles.segment, i < done && styles.segmentDone]} />
        ),
      )}
    </View>
  );
}

/** The current term's segment pulses white (static with Reduce Motion). */
function CurrentSegment() {
  const reduced = useReducedMotion();
  const opacity = useSharedValue(1);
  useEffect(() => {
    if (reduced) {
      opacity.value = 1;
      return;
    }
    const half = motion.pulse.duration / 2;
    opacity.value = withRepeat(
      withSequence(
        withTiming(motion.pulse.minOpacity, { duration: half }),
        withTiming(1, { duration: half }),
      ),
      -1,
    );
    return () => cancelAnimation(opacity);
  }, [reduced, opacity]);
  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return <Animated.View style={[styles.segment, styles.segmentCurrent, style]} />;
}

const styles = StyleSheet.create({
  hud: { gap: space.s10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.s12 },
  quit: {
    width: sizes.minTouch,
    height: sizes.minTouch,
    borderRadius: radius.full,
    backgroundColor: surfaces.glass,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleBox: { flex: 1, alignItems: 'center' },
  title: { ...textStyle('bodyMedium'), color: colors.white },
  progress: { ...textStyle('label'), color: colors.lilac },
  lives: {
    minWidth: sizes.minTouch,
    height: sizes.minTouch,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.s4,
    borderRadius: radius.chip,
    backgroundColor: surfaces.glass,
    paddingHorizontal: space.s10,
  },
  livesText: { ...textStyle('button'), color: colors.white },
  bar: { flexDirection: 'row', gap: space.s4 },
  segment: {
    flex: 1,
    height: sizes.progressHeight,
    borderRadius: radius.full,
    backgroundColor: surfaces.glass,
  },
  segmentDone: { backgroundColor: colors.sunny },
  segmentCurrent: { backgroundColor: colors.white },
});
