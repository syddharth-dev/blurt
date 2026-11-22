import { router } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Pip } from '@/shared/mascot';
import { useRoundResults, type FinishedRound } from '@/shared/session/roundResults';
import { Placeholder } from '@/shared/ui/Placeholder';
import { PrimaryButton } from '@/shared/ui/PrimaryButton';
import { TextButton } from '@/shared/ui/TextButton';
import { colors, radius, sizes, space, textStyle } from '@/theme';

type Outcome = FinishedRound['results'][number]['outcome'];

/** Dot colour + word, so outcomes never rely on colour alone (SCREENS.md → term review list). */
const OUTCOME: Record<Outcome, { color: string; text: string }> = {
  'first-try': { color: colors.violet, text: 'First try' },
  assisted: { color: colors.sunny, text: 'With help' },
  missed: { color: colors.coral, text: 'Missed' },
  skipped: { color: colors.coral, text: 'Skipped' },
};

/**
 * Simple round summary. The full design (stars, XP bar, stats) is in docs/SCREENS.md → 3,
 * scheduled for Phase 5.
 */
export function SummaryScreen({ roundId }: { roundId: string }) {
  const round = useRoundResults((s) => s.last);
  if (!round || round.roundId !== roundId) {
    return (
      <Placeholder title="No round here" body="Play a round and your results show up here.">
        <PrimaryButton label="Back home" onPress={() => router.replace('/')} />
      </Placeholder>
    );
  }
  const right = round.results.filter((r) => r.outcome === 'first-try' || r.outcome === 'assisted');
  const firstTry = round.results.filter((r) => r.outcome === 'first-try').length;
  const outOfLives = round.endedBy === 'out-of-lives';

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <Pip mood={outOfLives ? 'oops' : 'celebrate'} size={sizes.pip.summary} />
          <Text accessibilityRole="header" style={styles.title}>
            {outOfLives ? 'Out of lives. Good effort.' : 'Round done. Nice work.'}
          </Text>
          <Text style={styles.score}>
            {right.length}/{round.results.length}
          </Text>
          <Text style={styles.body}>
            {round.topicTitle} · +{round.score} XP · First try {firstTry} · Best streak{' '}
            {round.bestStreak}
          </Text>
        </View>

        <View style={styles.card}>
          {round.results.map((r) => {
            const o = OUTCOME[r.outcome];
            const lastHeard = r.heard.filter(Boolean).at(-1);
            return (
              <View key={r.termId} style={styles.row} accessible>
                <View style={[styles.dot, { backgroundColor: o.color }]} />
                <View style={styles.rowText}>
                  <Text style={styles.term}>{r.display}</Text>
                  <Text style={styles.note}>
                    {o.text}
                    {r.outcome !== 'first-try' && lastHeard ? ` · Heard "${lastHeard}"` : ''}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>

        <PrimaryButton
          breathe
          label="Play again"
          onPress={() => router.replace(`/play/${round.topicId}`)}
        />
        <TextButton label="Home" onPress={() => router.replace('/')} />
      </ScrollView>
    </SafeAreaView>
  );
}

const DOT = space.s12;

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.night },
  content: { padding: space.screen, gap: space.s16 },
  hero: { alignItems: 'center', gap: space.s8 },
  title: { ...textStyle('title'), color: colors.white, textAlign: 'center' },
  score: { ...textStyle('display'), color: colors.sunny },
  body: { ...textStyle('body'), color: colors.lilac, textAlign: 'center' },
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.card,
    padding: space.s16,
    gap: space.s12,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.s12 },
  dot: { width: DOT, height: DOT, borderRadius: radius.full },
  rowText: { flex: 1 },
  term: { ...textStyle('bodyMedium'), color: colors.night },
  note: { ...textStyle('chip'), color: colors.ink2 },
});
