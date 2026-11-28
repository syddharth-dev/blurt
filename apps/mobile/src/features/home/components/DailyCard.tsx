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
import { CellIcon, ClockIcon, FlaskIcon, MicIcon } from '@/shared/ui/icons';
import { PrimaryButton } from '@/shared/ui/PrimaryButton';
import { colors, elevation, motion, radius, space, surfaces, textStyle } from '@/theme';

type Props = {
  title: string;
  terms: number;
  timeLeft: string;
  bonusXp: number;
  /** Today's bonus is already earned: the card says so, and it can still be played. */
  done?: boolean;
  onPlay: () => void;
};

/**
 * Daily challenge card (SCREENS.md → Home): coral "Daily · 6h left" tag, topic title, chips,
 * a fanned stack of three mini picture cards (the front one shows "?"), and "Let's blurt".
 */
export function DailyCard({ title, terms, timeLeft, bonusXp, done = false, onPlay }: Props) {
  return (
    <View style={styles.card}>
      <View style={styles.top}>
        <View style={styles.info}>
          <View style={styles.tag}>
            <ClockIcon color={colors.coralInk} />
            <Text style={styles.tagText}>
              {(done ? 'Daily · done today' : `Daily · ${timeLeft}`).toUpperCase()}
            </Text>
          </View>
          <Text style={styles.title}>{title}</Text>
          <View style={styles.chips}>
            <Text style={[styles.chip, styles.chipViolet]}>{terms} terms</Text>
            <Text style={[styles.chip, styles.chipViolet]}>Grade 8</Text>
            <Text style={[styles.chip, styles.chipSunny]}>
              {done ? 'Bonus earned' : `+${bonusXp} XP`}
            </Text>
          </View>
        </View>
        <Fan />
      </View>
      <PrimaryButton
        breathe={!done}
        label={done ? 'Play again' : "Let's blurt"}
        icon={<MicIcon color={colors.night} size={22} />}
        accessibilityHint={`Starts today's challenge: ${title}`}
        onPress={onPlay}
      />
    </View>
  );
}

const MINI = { w: 54, h: 68 };

/** Three fanned mini cards that sway gently (still with Reduce Motion). */
function Fan() {
  const reduced = useReducedMotion();
  const t = useSharedValue(0);
  useEffect(() => {
    if (reduced) {
      cancelAnimation(t);
      t.value = 0;
      return;
    }
    const half = motion.fan.duration / 2;
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
  const sway = motion.fan.sway;
  const left = useAnimatedStyle(() => ({ transform: [{ rotate: `${-14 - sway * t.value}deg` }] }));
  const right = useAnimatedStyle(() => ({ transform: [{ rotate: `${12 + sway * t.value}deg` }] }));
  return (
    <View
      style={styles.fan}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Animated.View style={[styles.mini, styles.miniLeft, { backgroundColor: colors.mint }, left]}>
        <CellIcon color={colors.night} size={32} />
      </Animated.View>
      <Animated.View
        style={[styles.mini, styles.miniRight, { backgroundColor: colors.coral }, right]}
      >
        <FlaskIcon color={colors.night} size={30} />
      </Animated.View>
      <View style={[styles.mini, styles.miniFront, { backgroundColor: colors.sunny }]}>
        <Text style={styles.q}>?</Text>
      </View>
    </View>
  );
}

const FAN = 96;

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.card + 4,
    padding: space.s16,
    gap: space.s14,
    boxShadow: `0 18px 40px ${surfaces.cardShadow}`,
  },
  top: { flexDirection: 'row', alignItems: 'center', gap: space.s12 },
  info: { flex: 1, minWidth: 0, gap: space.s8 },
  tag: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.s6,
    height: space.s24,
    paddingHorizontal: space.s10,
    borderRadius: radius.tile,
    backgroundColor: colors.coralTint,
  },
  tagText: { ...textStyle('label'), fontSize: 11, color: colors.coralInk },
  title: { ...textStyle('title'), color: colors.night },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.s6 },
  chip: {
    ...textStyle('chip'),
    overflow: 'hidden',
    borderRadius: radius.chip,
    paddingHorizontal: space.s8,
    paddingVertical: space.s4,
  },
  chipViolet: { backgroundColor: colors.violetTint, color: colors.violetInk },
  chipSunny: { backgroundColor: colors.sunnyTint, color: colors.sunnyInk },
  fan: { width: FAN, height: FAN },
  mini: {
    position: 'absolute',
    width: MINI.w,
    height: MINI.h,
    borderRadius: radius.chip,
    borderWidth: 3,
    borderColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: `0 6px 14px ${surfaces.cardShadow}`,
  },
  miniLeft: { left: 4, top: 18 },
  miniRight: { left: 38, top: 16 },
  miniFront: {
    left: 20,
    top: 6,
    boxShadow: `0 ${elevation.card.offsetY - 6}px 18px ${surfaces.cardShadow}`,
  },
  q: { ...textStyle('display'), fontSize: 30, color: colors.night },
});
