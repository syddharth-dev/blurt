import { GRADE8_TERMS, topicsOf } from '@blurt/shared/content';
import { router } from 'expo-router';
import { useMemo } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SceneBackground } from '@/shared/scene';
import { TAB_BAR_SPACE } from '@/shared/ui/TabBar';
import { space } from '@/theme';
import { DailyCard } from './components/DailyCard';
import { PipGreeting } from './components/PipGreeting';
import { TopBar } from './components/TopBar';
import { TopicsRow } from './components/TopicsRow';
import { Wordmark } from './components/Wordmark';
import { DAILY_BONUS_XP, dailyTopic, timeLeftLabel } from './daily';

const TOPICS = topicsOf(GRADE8_TERMS);

/**
 * Home (SCREENS.md → 1. Home; design canvas → 1 · Home). Streak, gems and topic progress are
 * zero until progress is saved on the server (ROADMAP Phase 3).
 */
export function HomeScreen() {
  const now = useMemo(() => new Date(), []);
  const today = dailyTopic(TOPICS, now);

  return (
    <SceneBackground variant="day" atoms={2} sparkles={5}>
      <SafeAreaView style={styles.screen} edges={['top']}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <TopBar streakDays={0} gems={0} onProfile={() => router.push('/me')} />
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
          <TopicsRow
            topics={TOPICS}
            todayId={today?.id}
            mastered={() => 0}
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
