import { GRADE8_TERMS, topicsOf } from '@blurt/shared/content';
import { router } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/shared/auth/session';
import { isOnlineConfigured } from '@/shared/config';
import { useProgress } from '@/shared/progress/useProgress';
import { PrimaryButton } from '@/shared/ui/PrimaryButton';
import { SceneBackground } from '@/shared/scene';
import { TAB_BAR_SPACE } from '@/shared/ui/TabBar';
import { TopicCard } from '@/shared/ui/TopicCard';
import { colors, space, textStyle } from '@/theme';
import { ClassTopics } from './ClassTopics';

const TOPICS = topicsOf(GRADE8_TERMS);

/**
 * Topics tab. Placeholder layout: the topic list and topic detail are still to design
 * (SCREENS.md → 4). Topics from the student's classes come first, then the starter set.
 */
export function TopicsScreen() {
  const progress = useProgress();
  const signedIn = useAuth((s) => s.status === 'signedIn');
  return (
    <SceneBackground variant="day" atoms={0} sparkles={3}>
      <SafeAreaView style={styles.screen} edges={['top']}>
        <ScrollView contentContainerStyle={styles.content}>
          <Text accessibilityRole="header" style={styles.h1}>
            Topics
          </Text>
          {signedIn && isOnlineConfigured() ? <ClassTopics /> : null}
          <Text accessibilityRole="header" style={styles.h2}>
            Starter topics
          </Text>
          <PrimaryButton label="Mixed round · 10 terms" onPress={() => router.push('/play/mix')} />
          <View style={styles.grid}>
            {TOPICS.map((t) => (
              <TopicCard
                key={t.id}
                title={t.title}
                subject={t.subject}
                mastered={progress.mastered(t.id)}
                lockedAtLevel={progress.lockedAt(t.id)}
                total={t.terms.length}
                onPress={() => router.push(`/play/${t.id}`)}
              />
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    </SceneBackground>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: space.screen, paddingBottom: TAB_BAR_SPACE, gap: space.s16 },
  h1: { ...textStyle('title'), color: colors.white },
  h2: { ...textStyle('title'), color: colors.white },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.s12, justifyContent: 'center' },
});
