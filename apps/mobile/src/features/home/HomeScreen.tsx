import { GRADE8_TERMS, topicsOf } from '@blurt/shared/content';
import { router } from 'expo-router';
import { useMemo } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { usePractice } from '@/shared/api';
import { useAuth } from '@/shared/auth/session';
import { useProgress } from '@/shared/progress/useProgress';
import { SceneBackground } from '@/shared/scene';
import { TAB_BAR_SPACE } from '@/shared/ui/TabBar';
import { space } from '@/theme';
import { DailyCard } from './components/DailyCard';
import { PracticeCard } from './components/PracticeCard';
import { PipGreeting } from '@/shared/ui/PipGreeting';
import { TopBar } from './components/TopBar';
import { TopicsRow } from './components/TopicsRow';
import { Wordmark } from '@/shared/ui/Wordmark';
import { DAILY_BONUS_XP, dailyTopic, timeLeftLabel } from './daily';

const TOPICS = topicsOf(GRADE8_TERMS);

/**
 * Home (SCREENS.md → 1. Home; design canvas → 1 · Home). Streak and topic progress come from
 * the API once signed in; gems have no data model yet, so they show 0.
 */
export function HomeScreen() {
  const now = useMemo(() => new Date(), []);
  const today = dailyTopic(TOPICS, now);
  const progress = useProgress();
  // Signed in implies online settings (there's no sign-in without them).
  const online = useAuth((s) => s.status === 'signedIn');
  const practice = usePractice().data;

  return (
    <SceneBackground variant="day" atoms={2} sparkles={5}>
      <SafeAreaView style={styles.screen} edges={['top']}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <TopBar
            initial={progress.initial}
            streakDays={progress.streak}
            gems={0}
            onProfile={() => router.push('/me')}
          />
          <Wordmark />
          <PipGreeting title="Hey, I'm Pip." sub="Ready to name some science?" />
          {today ? (
            <DailyCard
              title={today.title}
              terms={today.terms.length}
              timeLeft={timeLeftLabel(now)}
              bonusXp={DAILY_BONUS_XP}
              onPlay={() => router.push(`/play/${today.id}`)}
            />
          ) : null}
          {online && practice && practice.dueCount > 0 ? (
            <PracticeCard
              dueCount={practice.dueCount}
              onPractise={() => router.push(`/play/practice?ids=${practice.termIds.join(',')}`)}
            />
          ) : null}
          <TopicsRow
            topics={TOPICS}
            todayId={today?.id}
            mastered={progress.mastered}
            lockedAt={progress.lockedAt}
            onOpen={(id) => router.push(`/play/${id}`)}
            onSeeAll={() => router.push('/topics')}
          />
        </ScrollView>
      </SafeAreaView>
    </SceneBackground>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: {
    paddingHorizontal: space.screen,
    paddingTop: space.s8,
    paddingBottom: TAB_BAR_SPACE,
    gap: space.s12,
  },
});
