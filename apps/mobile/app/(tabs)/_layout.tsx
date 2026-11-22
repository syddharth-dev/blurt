import { Tabs } from 'expo-router';
import { TabBar } from '@/shared/ui/TabBar';

// Expo Router 58 only shows tabs declared here. Tab names follow SCREENS.md (Play · Topics ·
// League · Me); the design canvas labels the second tab "Decks".
export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }} tabBar={(props) => <TabBar {...props} />}>
      <Tabs.Screen name="index" options={{ title: 'Play' }} />
      <Tabs.Screen name="topics" options={{ title: 'Topics' }} />
      <Tabs.Screen name="league" options={{ title: 'League' }} />
      <Tabs.Screen name="me" options={{ title: 'Me' }} />
    </Tabs>
  );
}
