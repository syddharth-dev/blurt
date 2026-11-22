import { levelFor } from '@blurt/shared/progress';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { queryClient } from '@/shared/api';
import { signOut, useAuth } from '@/shared/auth/session';
import { Pip } from '@/shared/mascot';
import { useProgress } from '@/shared/progress/useProgress';
import { SceneBackground } from '@/shared/scene';
import { FlameIcon } from '@/shared/ui/icons';
import { TAB_BAR_SPACE } from '@/shared/ui/TabBar';
import { TextButton } from '@/shared/ui/TextButton';
import { colors, radius, sizes, space, surfaces, textStyle } from '@/theme';

/**
 * Me tab: name, level and XP, streak, sign out. Settings (speech language, reduce motion,
 * sound) are still to design (SCREENS.md → 4). Developer tools show only in development builds.
 */
export function ProfileScreen() {
  const p = useProgress();
  const signedIn = useAuth((s) => s.status === 'signedIn');
  const level = levelFor(p.xp);
  return (
    <SceneBackground variant="day" atoms={1} sparkles={4}>
      <SafeAreaView style={styles.screen} edges={['top']}>
        <ScrollView contentContainerStyle={styles.content}>
          <Pip mood="wave" size={sizes.pip.home} />
          <Text accessibilityRole="header" style={styles.title}>
            {p.name ? `Hi, ${p.name}.` : 'Your profile'}
          </Text>

          <View
            style={styles.card}
            accessible
            accessibilityLabel={`Level ${level.level}, ${p.xp} XP`}
          >
            <View style={styles.row}>
              <Text style={styles.cardTitle}>Level {level.level}</Text>
              <Text style={styles.meta}>{p.xp} XP</Text>
            </View>
            <View style={styles.track}>
              <View style={[styles.fill, { width: `${Math.max(level.fraction, 0.02) * 100}%` }]} />
            </View>
            <Text style={styles.meta}>
              {level.perLevel - level.intoLevel} XP to level {level.level + 1}
            </Text>
          </View>

          <View
            style={[styles.card, styles.row]}
            accessible
            accessibilityLabel={`${p.streak} day streak`}
          >
            <FlameIcon size={sizes.icon} />
            <Text style={styles.cardTitle}>
              {p.streak} {p.streak === 1 ? 'day' : 'days'} in a row
            </Text>
          </View>

          {signedIn ? (
            <Pressable
              accessibilityRole="button"
              style={styles.signOut}
              onPress={() => {
                queryClient.clear();
                void signOut();
              }}
            >
              <Text style={styles.signOutText}>Sign out</Text>
            </Pressable>
          ) : null}

          {__DEV__ ? (
            <View style={styles.dev}>
              <Text style={styles.label}>DEVELOPER</Text>
              <View style={styles.devRow}>
                <TextButton label="Speech lab" onPress={() => router.push('/speech-lab')} />
                <TextButton label="Pip preview" onPress={() => router.push('/pip-preview')} />
              </View>
            </View>
          ) : null}
        </ScrollView>
      </SafeAreaView>
    </SceneBackground>
  );
}

const TRACK = 10;

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: {
    alignItems: 'stretch',
    padding: space.screen,
    paddingBottom: TAB_BAR_SPACE,
    gap: space.s12,
  },
  title: { ...textStyle('title'), color: colors.white, textAlign: 'center' },
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.card,
    padding: space.s16,
    gap: space.s8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.s10,
  },
  cardTitle: { ...textStyle('title'), color: colors.night, flexShrink: 1 },
  meta: { ...textStyle('chip'), color: colors.ink2 },
  track: {
    height: TRACK,
    borderRadius: radius.full,
    backgroundColor: colors.track,
    overflow: 'hidden',
  },
  fill: { height: '100%', borderRadius: radius.full, backgroundColor: colors.violet },
  signOut: {
    minHeight: sizes.minTouch + 4,
    borderRadius: radius.chip + 4,
    borderWidth: 2,
    borderColor: colors.white,
    backgroundColor: surfaces.scrim,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signOutText: { ...textStyle('button'), color: colors.white },
  dev: { alignItems: 'center', marginTop: space.s16, gap: space.s4 },
  label: { ...textStyle('label'), color: colors.lilac },
  devRow: { flexDirection: 'row', gap: space.s20 },
});
