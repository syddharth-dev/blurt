import { QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { queryClient } from '@/shared/api';
import { useAuth } from '@/shared/auth/session';
import { isOnlineConfigured } from '@/shared/config';
import { useSync } from '@/shared/sync';
import { colors, fontAssets } from '@/theme';

export { ErrorBoundary } from '@/shared/ui/ErrorBoundary';

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts(fontAssets);
  const status = useAuth((s) => s.status);
  const init = useAuth((s) => s.init);
  const ready = (fontsLoaded || !!fontError) && status !== 'loading';
  useSync();

  useEffect(() => {
    void init();
  }, [init]);

  useEffect(() => {
    if (fontError) console.warn('Fonts failed to load; using system fonts.', fontError);
    if (ready) void SplashScreen.hideAsync();
  }, [ready, fontError]);

  if (!ready) return <View style={{ flex: 1, backgroundColor: colors.night }} />;

  // Builds without Supabase settings play offline with local content, no sign-in needed.
  const canPlay = status === 'signedIn' || !isOnlineConfigured();

  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <StatusBar style="light" />
        <Stack
          screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.night } }}
        >
          <Stack.Protected guard={canPlay}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="play/[topicId]" />
            <Stack.Screen name="summary/[roundId]" />
            <Stack.Screen name="join-class" />
            <Stack.Screen name="speech-lab" />
            <Stack.Screen name="pip-preview" />
          </Stack.Protected>
          <Stack.Protected guard={!canPlay}>
            <Stack.Screen name="sign-in" />
          </Stack.Protected>
        </Stack>
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}
