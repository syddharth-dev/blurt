import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Pip } from '@/shared/mascot';
import { SceneBackground } from '@/shared/scene';
import { colors, sizes, space, textStyle } from '@/theme';

/** League tab. The weekly leaderboard is still to design (SCREENS.md → 4) and built in Phase 5. */
export function LeagueScreen() {
  return (
    <SceneBackground variant="day" atoms={1} sparkles={4}>
      <SafeAreaView style={styles.screen}>
        <View style={styles.content}>
          {/* Empty state: Pip waves (MASCOT.md mood mapping). */}
          <Pip mood="wave" size={sizes.pip.home} />
          <Text accessibilityRole="header" style={styles.title}>
            Leagues are coming
          </Text>
          <Text style={styles.body}>
            Soon you&apos;ll climb a weekly league with your class. Keep blurting to get a head
            start.
          </Text>
        </View>
      </SafeAreaView>
    </SceneBackground>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: space.screen,
    gap: space.s12,
  },
  title: { ...textStyle('title'), color: colors.white, textAlign: 'center' },
  body: { ...textStyle('body'), color: colors.lilac, textAlign: 'center' },
});
