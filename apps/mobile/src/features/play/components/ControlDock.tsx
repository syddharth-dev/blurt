import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { BulbIcon, SkipIcon } from '@/shared/ui/icons';
import { colors, radius, sizes, space, surfaces, textStyle } from '@/theme';
import { MicButton } from './MicButton';

type Props = {
  micLook: 'idle' | 'listening' | 'disabled';
  micLabel: string;
  onMic: () => void;
  hint: { label: string; count: number; enabled: boolean; onPress: () => void };
  skip: { count: number; enabled: boolean; onPress: () => void };
};

/** Glass dock (BRAND.md): Hint · Mic · Skip, radius 32, side buttons with a sunny count badge. */
export function ControlDock({ micLook, micLabel, onMic, hint, skip }: Props) {
  return (
    <View style={styles.dock}>
      <SideButton
        label={hint.label}
        a11yLabel={`Hint: ${hint.label}. ${hint.count} left`}
        count={hint.count}
        enabled={hint.enabled}
        onPress={hint.onPress}
        icon={<BulbIcon color={colors.white} />}
      />
      <View style={styles.center}>
        <MicButton look={micLook} onPress={onMic} accessibilityLabel={micLabel} />
        <Text style={styles.micLabel}>{micLabel}</Text>
      </View>
      <SideButton
        label="Skip"
        a11yLabel={`Skip this term. ${skip.count} left`}
        count={skip.count}
        enabled={skip.enabled}
        onPress={skip.onPress}
        icon={<SkipIcon color={colors.white} />}
      />
    </View>
  );
}

function SideButton(props: {
  label: string;
  a11yLabel: string;
  count: number;
  enabled: boolean;
  onPress: () => void;
  icon: ReactNode;
}) {
  return (
    <View style={styles.side}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={props.a11yLabel}
        accessibilityState={{ disabled: !props.enabled }}
        disabled={!props.enabled}
        onPress={props.onPress}
        style={({ pressed }) => [
          styles.sideButton,
          !props.enabled && styles.sideDisabled,
          pressed && styles.sidePressed,
        ]}
      >
        {props.icon}
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{props.count}</Text>
        </View>
      </Pressable>
      <Text style={styles.sideLabel}>{props.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  dock: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    backgroundColor: surfaces.glass,
    borderRadius: radius.dock,
    paddingHorizontal: space.s20,
    paddingVertical: space.s14,
  },
  center: { alignItems: 'center', gap: space.s8 },
  micLabel: { ...textStyle('chip'), color: colors.white },
  side: { alignItems: 'center', gap: space.s8, paddingTop: space.s16 },
  sideButton: {
    width: sizes.dockButton,
    height: sizes.dockButton,
    borderRadius: radius.dockButton,
    backgroundColor: surfaces.glassStrong,
    borderWidth: 1,
    borderColor: surfaces.glassBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sideDisabled: { opacity: 0.4 },
  sidePressed: { backgroundColor: surfaces.glassBorder },
  sideLabel: { ...textStyle('chip'), color: colors.lilac },
  badge: {
    position: 'absolute',
    top: -space.s6,
    right: -space.s6,
    minWidth: sizes.badge,
    height: sizes.badge,
    borderRadius: radius.full,
    backgroundColor: colors.sunny,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space.s4,
  },
  badgeText: { ...textStyle('chip'), color: colors.night },
});
