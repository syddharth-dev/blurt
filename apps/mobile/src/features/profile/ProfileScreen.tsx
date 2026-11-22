import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Pip } from '@/shared/mascot';
import { SceneBackground } from '@/shared/scene';
import { TextButton } from '@/shared/ui/TextButton';
import { colors, sizes, space, textStyle } from '@/theme';

/**
 * Me tab. Profile and settings (speech language, reduce motion, sound) are still to design
 * (SCREENS.md → 4). Developer tools show only in development builds.
 */
export function ProfileScreen() {
  return (
    <SceneBackground variant="day" atoms={1} sparkles={4}>
      <SafeAreaView style={styles.screen}>
        <View style={styles.content}>
          <Pip mood="wave" size={sizes.pip.home} />
          <Text accessibilityRole="header" style={styles.title}>
            Your profile is on its way
          </Text>
          <Text style={styles.body}>
            Sign-in, your XP and streak, and settings like speech language arrive next.
          </Text>
          {__DEV__ ? (
            <View style={styles.dev}>
              <Text style={styles.label}>DEVELOPER</Text>
              <View style={styles.row}>
                <TextButton label="Speech lab" onPress={() => router.push('/speech-lab')} />
                <TextButton label="Pip preview" onPress={() => router.push('/pip-preview')} />
              </View>
            </View>
          ) : null}
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
  dev: { alignItems: 'center', marginTop: space.s24, gap: space.s4 },
  label: { ...textStyle('label'), color: colors.lilac },
  row: { flexDirection: 'row', gap: space.s20 },
});
