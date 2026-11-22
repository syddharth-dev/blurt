import { GRADE8_TERMS } from '@blurt/shared/content';
import { levelFor } from '@blurt/shared/progress';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { Pip } from '@/shared/mascot';
import { Confetti, SceneBackground, Sunburst } from '@/shared/scene';
import { useRoundResults, type FinishedRound } from '@/shared/session/roundResults';
import { Placeholder } from '@/shared/ui/Placeholder';
import { PrimaryButton } from '@/shared/ui/PrimaryButton';
import { colors, motion, radius, sizes, space, surfaces, textStyle } from '@/theme';
import { noteFor, summaryOf } from './summaryView';

type Outcome = FinishedRound['results'][number]['outcome'];

/** Dot colour per outcome (SCREENS.md): violet first try, sunny with help, coral missed. */
const DOT: Record<Outcome, string> = {
  'first-try': colors.violet,
  assisted: colors.sunny,
  missed: colors.coral,
  skipped: colors.coral,
};

const CLUES = new Map(GRADE8_TERMS.map((t) => [t.id, t.clue]));

/** Round summary (SCREENS.md → 3; design canvas → 6 · Round summary). */
export function SummaryScreen({ roundId }: { roundId: string }) {
  const round = useRoundResults((s) => s.last);
  if (!round || round.roundId !== roundId) {
    return (
      <Placeholder
        scene="day"
        title="No round here"
        body="Play a round and your results show up here."
      >
        <PrimaryButton label="Back home" onPress={() => router.replace('/')} />
      </Placeholder>
    );
  }
  const s = summaryOf(round);
  const before = levelFor(round.xpBefore);
  const after = levelFor(round.xpAfter);
  const playAgain = () =>
    router.replace(
      round.termIds ? `/play/practice?ids=${round.termIds.join(',')}` : `/play/${round.topicId}`,
    );
  const practise = () =>
    router.replace(`/play/practice?ids=${s.tricky.map((t) => t.termId).join(',')}`);

  return (
    <SceneBackground variant="day" atoms={0} sparkles={4}>
      <View style={styles.sunburst}>
        <Sunburst size={SUNBURST} bright />
      </View>
      <SafeAreaView style={styles.screen}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.stars} accessible accessibilityLabel={`${s.stars} of 3 stars`}>
            {[0, 1, 2].map((i) => (
              <Star key={i} index={i} earned={i < s.stars} big={i === 1} />
            ))}
          </View>

          <View style={styles.hero}>
            {/* Summary: Pip celebrates (MASCOT.md mood mapping). */}
            <Pip mood="celebrate" size={sizes.pip.summary} />
            <View>
              <Text accessibilityRole="header" style={styles.headline}>
                {s.headline}
              </Text>
              <Text style={styles.score} accessibilityLabel={`${s.right} out of ${s.total}`}>
                {s.right}/{s.total}
              </Text>
            </View>
          </View>

          <XpBar level={after.level} gained={round.score} from={before} to={after} />

          <View style={styles.stats}>
            <Stat value={s.firstTry} label="First try" color={colors.violet} />
            <Stat value={round.bestStreak} label="Best streak" color={colors.night} />
            <Stat value={s.tricky.length} label="To practise" color={colors.coralShadow} />
          </View>

          <View style={styles.review}>
            {round.results.map((r, i) => (
              <View
                key={`${r.termId}-${i}`}
                style={[styles.row, i === round.results.length - 1 && styles.rowLast]}
                accessible
              >
                <View style={[styles.dot, { backgroundColor: DOT[r.outcome] }]} />
                <View style={styles.rowText}>
                  <Text style={styles.term}>{r.display}</Text>
                  <Text style={styles.meaning} numberOfLines={1}>
                    {CLUES.get(r.termId) ?? ''}
                  </Text>
                </View>
                <Text style={styles.note}>{noteFor(r)}</Text>
              </View>
            ))}
          </View>

          <PrimaryButton breathe label="Play again" onPress={playAgain} />
          {s.tricky.length ? (
            <Pressable accessibilityRole="button" onPress={practise} style={styles.outline}>
              <Text style={styles.outlineText}>
                Practise {s.tricky.length} tricky {s.tricky.length === 1 ? 'term' : 'terms'}
              </Text>
            </Pressable>
          ) : null}
          <Pressable
            accessibilityRole="button"
            onPress={() => router.replace('/')}
            style={styles.home}
          >
            <Text style={styles.homeText}>Home</Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
      <Confetti burst={round.endedBy === 'out-of-lives' ? null : 1} />
    </SceneBackground>
  );
}

const STAR = { small: 48, big: 58 };
const STAR_STAGGER = 300;
const STAR_FIRST = 200;

/** Stars pop in one after another (a fade with Reduce Motion). Missing stars are glass. */
function Star({ index, earned, big }: { index: number; earned: boolean; big: boolean }) {
  const reduced = useReducedMotion();
  const scale = useSharedValue(reduced ? 1 : 0);
  const opacity = useSharedValue(reduced ? 0 : 1);
  useEffect(() => {
    const delay = STAR_FIRST + index * STAR_STAGGER;
    if (reduced) {
      opacity.value = withDelay(delay, withTiming(1, { duration: motion.fade.duration }));
      return;
    }
    const third = motion.pop.duration / 3;
    scale.value = withDelay(
      delay,
      withSequence(withTiming(1.25, { duration: third * 2 }), withTiming(1, { duration: third })),
    );
  }, [index, reduced, scale, opacity]);
  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));
  const size = big ? STAR.big : STAR.small;
  return (
    <Animated.View style={style}>
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Path
          d="M12 2l3 6.6 7 .8-5.2 4.8 1.4 7L12 17.8 5.8 21.2l1.4-7L2 9.4l7-.8z"
          fill={earned ? colors.sunny : surfaces.glassBorder}
          stroke={earned ? colors.sunnyShadow : surfaces.glassBorder}
          strokeWidth={1}
        />
      </Svg>
    </Animated.View>
  );
}

const XP_FILL_DELAY = 600;
const XP_FILL_DURATION = 1400;

/** XP bar animates from the old value to the new one, with the level (SCREENS.md → 3). */
function XpBar(props: {
  level: number;
  gained: number;
  from: ReturnType<typeof levelFor>;
  to: ReturnType<typeof levelFor>;
}) {
  const reduced = useReducedMotion();
  const levelledUp = props.to.level > props.from.level;
  const start = levelledUp ? 0 : props.from.fraction;
  const fill = useSharedValue(reduced ? props.to.fraction : start);
  useEffect(() => {
    if (reduced) return;
    fill.value = withDelay(
      XP_FILL_DELAY,
      withTiming(props.to.fraction, {
        duration: XP_FILL_DURATION,
        easing: Easing.out(Easing.quad),
      }),
    );
  }, [fill, props.to.fraction, reduced]);
  const style = useAnimatedStyle(() => ({ width: `${Math.max(fill.value, 0.02) * 100}%` }));
  return (
    <View
      style={styles.xp}
      accessible
      accessibilityLabel={`Level ${props.level}${levelledUp ? ', level up' : ''}. Plus ${props.gained} XP`}
    >
      <View style={styles.xpRow}>
        <Text style={styles.xpText}>
          Level {props.level}
          {levelledUp ? ' · Level up!' : ''}
        </Text>
        <Text style={styles.xpText}>+{props.gained} XP</Text>
      </View>
      <View style={styles.xpTrack}>
        <Animated.View style={[styles.xpFill, style]} />
      </View>
    </View>
  );
}

function Stat({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <View style={styles.stat} accessible accessibilityLabel={`${label}: ${value}`}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const SUNBURST = 520;
const DOT_SIZE = 12;
const XP_TRACK = 12;
const ROW_MIN = 52;

const styles = StyleSheet.create({
  screen: { flex: 1 },
  sunburst: { position: 'absolute', left: -65, top: -70 },
  content: { padding: space.screen, paddingTop: space.s24, gap: space.s12 },
  stars: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-end',
    gap: space.s10,
    height: STAR.big,
  },
  hero: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.s8 },
  headline: { ...textStyle('display'), fontSize: 40, color: colors.white },
  score: { ...textStyle('display'), color: colors.sunny },
  xp: {
    backgroundColor: surfaces.scrim,
    borderRadius: radius.button - 2,
    paddingHorizontal: space.s14,
    paddingVertical: space.s12,
    gap: space.s8,
  },
  xpRow: { flexDirection: 'row', justifyContent: 'space-between' },
  xpText: { ...textStyle('chip'), color: colors.white },
  xpTrack: {
    height: XP_TRACK,
    borderRadius: radius.full,
    backgroundColor: surfaces.glassBorder,
    overflow: 'hidden',
  },
  xpFill: { height: '100%', borderRadius: radius.full, backgroundColor: colors.sunny },
  stats: { flexDirection: 'row', gap: space.s8 },
  stat: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: radius.chip + 4,
    paddingVertical: space.s10,
    paddingHorizontal: space.s6,
  },
  statValue: { ...textStyle('tile') },
  statLabel: { ...textStyle('chip'), fontFamily: textStyle('body').fontFamily, color: colors.ink2 },
  review: {
    backgroundColor: colors.white,
    borderRadius: radius.bubble,
    paddingHorizontal: space.s14,
    paddingVertical: space.s4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.s10,
    minHeight: ROW_MIN,
    borderBottomWidth: 1,
    borderBottomColor: colors.track,
  },
  rowLast: { borderBottomWidth: 0 },
  dot: { width: DOT_SIZE, height: DOT_SIZE, borderRadius: radius.full },
  rowText: { flex: 1, minWidth: 0 },
  term: {
    ...textStyle('bodyMedium'),
    fontFamily: textStyle('label').fontFamily,
    color: colors.night,
  },
  meaning: { ...textStyle('chip'), fontFamily: textStyle('body').fontFamily, color: colors.ink2 },
  note: { ...textStyle('chip'), color: colors.ink2, maxWidth: '40%', textAlign: 'right' },
  outline: {
    minHeight: sizes.minTouch + 4,
    borderRadius: radius.chip + 4,
    borderWidth: 2,
    borderColor: colors.white,
    backgroundColor: surfaces.scrim,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outlineText: { ...textStyle('button'), fontSize: 17, color: colors.white },
  home: {
    alignSelf: 'center',
    minHeight: sizes.minTouch,
    justifyContent: 'center',
    paddingHorizontal: space.s16,
  },
  homeText: {
    ...textStyle('bodyMedium'),
    fontFamily: textStyle('label').fontFamily,
    color: colors.white,
  },
});
