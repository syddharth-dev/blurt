import { Tabs } from 'expo-router';

// Tab bar (Play · Topics · League · Me) is designed in docs/SCREENS.md; built in Phase 5.
export default function TabsLayout() {
  return <Tabs screenOptions={{ headerShown: false, tabBarStyle: { display: 'none' } }} />;
}
