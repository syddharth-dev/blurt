import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { colors, fontAssets } from '@/theme';

export { ErrorBoundary } from '@/shared/ui/ErrorBoundary';

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts(fontAssets);
  const ready = loaded || !!error;

  useEffect(() => {
    if (error) console.warn('Fonts failed to load; using system fonts.', error);
    if (ready) void SplashScreen.hideAsync();
  }, [ready, error]);

  // Night background, not a blank white view, while fonts load.
  if (!ready) return <View style={{ flex: 1, backgroundColor: colors.night }} />;

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <Stack
        screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.night } }}
      />
    </SafeAreaProvider>
  );
}
