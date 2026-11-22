import type { BottomTabBarProps } from 'expo-router/tabs';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, space, surfaces, textStyle } from '@/theme';
import { DecksIcon, PersonIcon, PlayIcon, TrophyIcon } from './icons';

const ICONS: Record<string, (color: string) => ReactNode> = {
  index: (c) => <PlayIcon color={c} />,
  topics: (c) => <DecksIcon color={c} />,
  league: (c) => <TrophyIcon color={c} />,
  me: (c) => <PersonIcon color={c} />,
};

const BAR_HEIGHT = 68;

/** Floating white tab bar (SCREENS.md → Home): Play · Topics · League · Me. */
export function TabBar({ state, descriptors, navigateToTab, insets }: BottomTabBarProps) {
  return (
    <View
      style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, space.s16) }]}
      pointerEvents="box-none"
    >
      <View style={styles.bar} accessibilityRole="tablist">
        {state.routes.map((route, i) => {
          const focused = state.index === i;
          const label = descriptors[route.key]?.options.title ?? route.name;
          const color = focused ? colors.violet : colors.ink2;
          return (
            <Pressable
              key={route.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={label}
              onPress={() => {
                if (!focused) navigateToTab(route.key);
              }}
              style={styles.tab}
            >
              {ICONS[route.name]?.(color)}
              <Text style={[styles.label, { color }, focused && styles.labelFocused]}>{label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

/** Space screens leave at the bottom so content clears the floating bar. */
export const TAB_BAR_SPACE = BAR_HEIGHT + space.s24 * 2;

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: space.screen, right: space.screen, bottom: 0 },
  bar: {
    height: BAR_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.card + 2,
    backgroundColor: colors.white,
    boxShadow: `0 12px 30px ${surfaces.cardShadow}`,
  },
  tab: { flex: 1, height: '100%', alignItems: 'center', justifyContent: 'center', gap: 2 },
  label: { ...textStyle('chip'), fontFamily: textStyle('bodyMedium').fontFamily },
  labelFocused: { fontFamily: textStyle('label').fontFamily },
});
