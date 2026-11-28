import { localDateOf } from '@blurt/shared/progress';
import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { useClasses } from '@/shared/api';
import { TextButton } from '@/shared/ui/TextButton';
import { asSubject, TopicCard } from '@/shared/ui/TopicCard';
import { colors, radius, space, surfaces, textStyle } from '@/theme';
import { dueLabel } from './due';

/**
 * Topics from the student's classes, first on the Topics tab (SCREENS.md → "assigned topics
 * with due dates first"), plus the way in: "Join a class". Needs a connection; offline it
 * shows nothing and the bundled topics below still work.
 */
export function ClassTopics() {
  const classes = useClasses();
  const list = classes.data?.classes ?? [];
  const today = localDateOf(new Date());

  if (classes.isPending && classes.fetchStatus !== 'idle') return null;
  if (!list.length) {
    return (
      <View style={styles.invite}>
        <Text style={styles.inviteTitle}>Got a class code?</Text>
        <Text style={styles.inviteBody}>
          Join your teacher’s class to see the topics they set for you.
        </Text>
        <TextButton label="Join a class" onPress={() => router.push('/join-class')} />
      </View>
    );
  }

  return (
    <View style={styles.section}>
      {list.map((c) => (
        <View key={c.id} style={styles.section}>
          <Text accessibilityRole="header" style={styles.h2}>
            {c.name}
          </Text>
          <Text style={styles.meta}>with {c.teacherName}</Text>
          {c.topics.length ? (
            <View style={styles.grid}>
              {c.topics.map((t) => (
                <TopicCard
                  key={t.id}
                  title={t.title}
                  subject={asSubject(t.subject)}
                  mastered={t.mastered}
                  total={t.termCount}
                  dueLabel={dueLabel(t.dueOn, today)}
                  onPress={() => router.push(`/play/${t.id}`)}
                />
              ))}
            </View>
          ) : (
            <Text style={styles.meta}>No topics yet. Your teacher will add some.</Text>
          )}
        </View>
      ))}
      <TextButton label="Join another class" onPress={() => router.push('/join-class')} />
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: space.s10 },
  h2: { ...textStyle('title'), color: colors.white },
  meta: { ...textStyle('body'), color: colors.white },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.s12, justifyContent: 'center' },
  invite: {
    backgroundColor: surfaces.scrim,
    borderRadius: radius.card,
    padding: space.s16,
    gap: space.s6,
  },
  inviteTitle: { ...textStyle('title'), color: colors.white },
  inviteBody: { ...textStyle('body'), color: colors.white },
});
