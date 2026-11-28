import { GRADE8_TERMS, topicsOf } from '@blurt/shared/content';
import { DAILY_BONUS_XP, localDateOf } from '@blurt/shared/progress';
import { router } from 'expo-router';
import { useMemo } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDaily, usePractice, useSubjects } from '@/shared/api';
import { useAuth } from '@/shared/auth/session';
import { useProgress } from '@/shared/progress/useProgress';
import { SceneBackground } from '@/shared/scene';
import { TAB_BAR_SPACE } from '@/shared/ui/TabBar';
import { space } from '@/theme';
import { DailyCard } from './components/DailyCard';
import { PracticeCard } from './components/PracticeCard';
import { PipGreeting } from '@/shared/ui/PipGreeting';
import { TopBar } from './components/TopBar';
import { TopicsRow, type HomeTopic } from './components/TopicsRow';
import { Wordmark } from '@/shared/ui/Wordmark';
import { asSubject } from '@/shared/ui/TopicCard';
import { dailyTopic, timeLeftLabel } from './daily';

const TOPICS = topicsOf(GRADE8_TERMS);
const BUNDLED: HomeTopic[] = TOPICS.map((t) => ({
  id: t.id,
  title: t.title,
  subject: t.subject,
  total: t.terms.length,
}));

/**
 * Home (SCREENS.md → 1. Home; design canvas → 1 · Home). Streak and topic progress come from
 * the API once signed in; gems have no data model yet, so they show 0.
 */
export function HomeScreen() {
  const now = useMemo(() => new Date(), []);
  const progress = useProgress();
  // Signed in implies online settings (there's no sign-in without them).
  const online = useAuth((s) => s.status === 'signedIn');
  const practice = usePractice().data;
  const daily = useDaily(localDateOf(now)).data;
  const subjects = useSubjects().data;

  // Signed in: the server's topics (class topics first). Offline: the bundled starter set.
  const topics: HomeTopic[] = subjects
    ? subjects.subjects
        .flatMap((s) =>
          s.topics.map((t) => ({
            id: t.id,
            title: t.title,
            subject: asSubject(s.name),
            total: t.termCount,
            assigned: t.assigned,
          })),
        )
        .sort((a, b) => Number(b.assigned) - Number(a.assigned))
    : BUNDLED;
  // Today's challenge: picked by the server when signed in, else on the phone.
  const local = dailyTopic(TOPICS, now);
  const today =
    online && daily
      ? daily.topic
        ? { id: daily.topic.id, title: daily.topic.title, terms: daily.topic.termCount }
        : null
      : local
        ? { id: local.id, title: local.title, terms: local.terms.length }
        : null;

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
              terms={today.terms}
              timeLeft={timeLeftLabel(now)}
              bonusXp={daily?.bonusXp ?? DAILY_BONUS_XP}
              done={daily?.done}
              onPlay={() => router.push(`/play/${today.id}?daily=1`)}
            />
          ) : null}
          {online && practice && practice.dueCount > 0 ? (
            <PracticeCard
              dueCount={practice.dueCount}
              onPractise={() => router.push(`/play/practice?ids=${practice.termIds.join(',')}`)}
            />
          ) : null}
          <TopicsRow
            topics={topics}
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
