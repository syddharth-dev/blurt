import { Tabs } from 'expo-router';

// Expo Router 58 only shows tabs declared here; add Topics, League and Me as they're built.
// The tab bar (Play · Topics · League · Me, docs/SCREENS.md) is designed for Phase 5.
export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false, tabBarStyle: { display: 'none' } }}>
      <Tabs.Screen name="index" options={{ title: 'Play' }} />
    </Tabs>
  );
}
