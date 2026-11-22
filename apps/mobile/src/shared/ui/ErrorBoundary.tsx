import type { ErrorBoundaryProps } from 'expo-router';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, space, textStyle } from '@/theme';
import { PrimaryButton } from './PrimaryButton';

/** Shown by Expo Router when a screen throws, instead of a blank screen. */
export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text accessibilityRole="header" style={styles.title}>
          That didn&apos;t load.
        </Text>
        <Text style={styles.body}>Try again. If it keeps happening, share this message:</Text>
        <Text selectable style={styles.code}>
          {error.message}
        </Text>
        <PrimaryButton label="Try again" onPress={() => void retry()} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.night },
  content: { padding: space.screen, gap: space.s16 },
  title: { ...textStyle('title'), color: colors.white },
  body: { ...textStyle('body'), color: colors.lilac },
  code: { ...textStyle('body'), color: colors.sunny },
});
