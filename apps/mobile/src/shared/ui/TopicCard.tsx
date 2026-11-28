import type { SubjectName } from '@blurt/shared/content';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  colors,
  elevation,
  radius,
  sizes,
  space,
  subjectColors,
  surfaces,
  textStyle,
} from '@/theme';
import { CellIcon, FlaskIcon, ForcesIcon, LockIcon, PlanetIcon } from './icons';

type Props = {
  title: string;
  subject: SubjectName;
  mastered: number;
  total: number;
  /** Today's topic: 3 px sunny ring and a "Today" tag. */
  today?: boolean;
  /** Locked until this level: lilac panel with a lock and "Unlocks at level N". */
  lockedAtLevel?: number;
  /** A class assignment's due date, e.g. "Due Fri", shown as a coral tag on the panel. */
  dueLabel?: string;
  onPress: () => void;
};

const PANEL_ICON = 46;

const SUBJECT_ICON: Record<SubjectName, (p: { color: string; size: number }) => ReactNode> = {
  Chemistry: (p) => <FlaskIcon {...p} />,
  Biology: (p) => <CellIcon {...p} />,
  Physics: (p) => <ForcesIcon {...p} />,
  'Earth & Space': (p) => <PlanetIcon {...p} />,
};

/**
 * Topic card (BRAND.md → Topic card): 136 wide, white, a coloured 76 px illustration panel,
 * then name, subject and progress.
 */
export function TopicCard({
  title,
  subject,
  mastered,
  total,
  today,
  lockedAtLevel,
  dueLabel,
  onPress,
}: Props) {
  const locked = lockedAtLevel !== undefined;
  const look = subjectColors[subject];
  const a11y = locked
    ? `${title}, unlocks at level ${lockedAtLevel}`
    : `${title}, ${subject}, ${mastered} of ${total} mastered${today ? ", today's topic" : ''}${
        dueLabel ? `, ${dueLabel}` : ''
      }`;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={a11y}
      accessibilityState={{ disabled: locked }}
      disabled={locked}
      onPress={onPress}
      style={[styles.card, today && styles.today]}
    >
      <View
        style={[
          styles.panel,
          { backgroundColor: locked ? colors.lockedPanel : colors[look.panel] },
        ]}
      >
        {locked ? null : <View style={styles.shine} />}
        {locked ? (
          <LockIcon color={colors.lockedInk} size={PANEL_ICON - 6} />
        ) : (
          SUBJECT_ICON[subject]({ color: colors[look.ink], size: PANEL_ICON })
        )}
        {today ? (
          <View style={styles.todayTag}>
            <Text style={styles.todayText}>Today</Text>
          </View>
        ) : dueLabel ? (
          <View style={[styles.todayTag, styles.dueTag]}>
            <Text style={[styles.todayText, styles.dueText]}>{dueLabel}</Text>
          </View>
        ) : null}
      </View>
      <View style={styles.body}>
        <Text style={styles.name} numberOfLines={2}>
          {title}
        </Text>
        {locked ? (
          <Text style={styles.meta}>Unlocks at level {lockedAtLevel}</Text>
        ) : (
          <>
            <View style={styles.metaRow}>
              <Text style={styles.meta}>{subject}</Text>
              <Text style={styles.meta}>
                {mastered}/{total}
              </Text>
            </View>
            <View style={styles.track}>
              <View style={[styles.fill, { width: `${total ? (mastered / total) * 100 : 0}%` }]} />
            </View>
          </>
        )}
      </View>
    </Pressable>
  );
}

const SHINE = 64;

const styles = StyleSheet.create({
  card: {
    width: sizes.topicCardWidth,
    borderRadius: radius.card,
    backgroundColor: colors.white,
    padding: space.s8,
    gap: space.s8,
    boxShadow: `0 ${elevation.card.offsetY - 4}px ${elevation.card.blur - 8}px ${surfaces.cardShadow}`,
  },
  today: {
    boxShadow: `0 0 0 3px ${colors.sunny}, 0 ${elevation.card.offsetY - 4}px ${elevation.card.blur - 8}px ${surfaces.cardShadow}`,
  },
  panel: {
    height: sizes.topicCardPanel,
    borderRadius: radius.chip + 4,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shine: {
    position: 'absolute',
    right: -SHINE / 4,
    top: -SHINE / 4,
    width: SHINE,
    height: SHINE,
    borderRadius: radius.full,
    backgroundColor: surfaces.glassBorder,
  },
  todayTag: {
    position: 'absolute',
    left: space.s8,
    top: space.s8,
    backgroundColor: colors.night,
    borderRadius: radius.full,
    paddingHorizontal: space.s8,
    paddingVertical: 2,
  },
  todayText: { ...textStyle('chip'), color: colors.white },
  dueTag: { backgroundColor: colors.coralTint },
  dueText: { color: colors.coralInk },
  body: { paddingHorizontal: space.s4, paddingBottom: space.s4, gap: space.s6 },
  name: {
    ...textStyle('bodyMedium'),
    fontFamily: textStyle('label').fontFamily,
    color: colors.night,
  },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', gap: space.s4 },
  meta: { ...textStyle('chip'), fontFamily: textStyle('body').fontFamily, color: colors.ink2 },
  track: {
    height: sizes.progressHeight - 2,
    borderRadius: radius.full,
    backgroundColor: colors.track,
    overflow: 'hidden',
  },
  fill: { height: '100%', borderRadius: radius.full, backgroundColor: colors.violet },
});
