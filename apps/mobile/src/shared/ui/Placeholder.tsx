import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, space, textStyle } from '@/theme';

type Props = { title: ReactNode; body: string; children?: ReactNode };

/** Temporary screen shell used until each screen is built from docs/SCREENS.md. */
export function Placeholder({ title, body, children }: Props) {
  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.content}>
        <Text accessibilityRole="header" style={styles.title}>
          {title}
        </Text>
        <Text style={styles.body}>{body}</Text>
        {children}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.night },
  content: { flex: 1, justifyContent: 'center', padding: space.screen, gap: space.s16 },
  title: { ...textStyle('wordmark'), color: colors.white },
  body: { ...textStyle('body'), color: colors.lilac },
});
