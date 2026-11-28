import type { SubjectName } from '@blurt/shared/content';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { TopicCard } from '@/shared/ui/TopicCard';
import { colors, sizes, space, textStyle } from '@/theme';

/** A topic on Home: from the server when signed in, or the bundled starter set offline. */
export type HomeTopic = { id: string; title: string; subject: SubjectName; total: number };

type Props = {
  topics: readonly HomeTopic[];
  todayId?: string;
  mastered: (topicId: string) => number;
  lockedAt?: (topicId: string) => number | undefined;
  onOpen: (topicId: string) => void;
  onSeeAll: () => void;
};

/** "Your topics": a snap-scrolling row; the third card peeks in from the edge (SCREENS.md). */
export function TopicsRow({ topics, todayId, mastered, lockedAt, onOpen, onSeeAll }: Props) {
  // Today's topic first, like the canvas.
  const ordered = [...topics].sort((a, b) => Number(b.id === todayId) - Number(a.id === todayId));
  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <Text accessibilityRole="header" style={styles.h2}>
          Your topics
        </Text>
        <Pressable accessibilityRole="button" onPress={onSeeAll} style={styles.seeAll}>
          <Text style={styles.seeAllText}>See all</Text>
        </Pressable>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={sizes.topicCardWidth + space.s12}
        decelerationRate="fast"
        contentContainerStyle={styles.row}
        style={styles.scroller}
      >
        {ordered.map((t) => (
          <TopicCard
            key={t.id}
            title={t.title}
            subject={t.subject}
            mastered={mastered(t.id)}
            total={t.total}
            today={t.id === todayId}
            lockedAtLevel={lockedAt?.(t.id)}
            onPress={() => onOpen(t.id)}
          />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.s10 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  h2: { ...textStyle('title'), fontSize: 20, color: colors.white },
  seeAll: { minHeight: sizes.minTouch, justifyContent: 'center', paddingLeft: space.s12 },
  seeAllText: {
    ...textStyle('bodyMedium'),
    fontFamily: textStyle('label').fontFamily,
    color: colors.white,
  },
  scroller: { marginHorizontal: -space.screen },
  row: {
    gap: space.s12,
    paddingHorizontal: space.screen,
    paddingTop: space.s4,
    paddingBottom: space.s14,
  },
});
