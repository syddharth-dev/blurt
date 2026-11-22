import { Pressable, StyleSheet, Text, View } from 'react-native';
import { FlameIcon, GemIcon, PersonIcon } from '@/shared/ui/icons';
import { colors, radius, sizes, space, surfaces, textStyle } from '@/theme';

type Props = { initial?: string; streakDays: number; gems: number; onProfile: () => void };

/** Avatar (initial on coral with a sunny ring), streak pill, gems pill (SCREENS.md → Home). */
export function TopBar({ initial, streakDays, gems, onProfile }: Props) {
  return (
    <View style={styles.row}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Your profile"
        onPress={onProfile}
        style={styles.avatar}
      >
        {initial ? (
          <Text style={styles.initial}>{initial}</Text>
        ) : (
          <PersonIcon color={colors.night} size={sizes.iconSmall + 2} />
        )}
      </Pressable>
      <View style={styles.pills}>
        <View style={styles.pill} accessible accessibilityLabel={`${streakDays} day streak`}>
          <FlameIcon />
          <Text style={styles.pillText}>
            {streakDays} {streakDays === 1 ? 'day' : 'days'}
          </Text>
        </View>
        <View style={styles.pill} accessible accessibilityLabel={`${gems} gems`}>
          <GemIcon />
          <Text style={styles.pillText}>{gems}</Text>
        </View>
      </View>
    </View>
  );
}

const PILL = 40;

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  avatar: {
    width: sizes.minTouch,
    height: sizes.minTouch,
    borderRadius: radius.full,
    borderWidth: 3,
    borderColor: colors.sunny,
    backgroundColor: colors.coral,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initial: { ...textStyle('button'), color: colors.night },
  pills: { flexDirection: 'row', gap: space.s8 },
  pill: {
    height: PILL,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.s6,
    paddingHorizontal: space.s12,
    borderRadius: radius.full,
    backgroundColor: surfaces.scrim,
  },
  pillText: {
    ...textStyle('bodyMedium'),
    fontFamily: textStyle('label').fontFamily,
    color: colors.white,
  },
});
