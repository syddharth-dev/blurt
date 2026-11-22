import { BlurView } from 'expo-blur';
import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { surfaces } from '@/theme';
import { useScene } from './SceneContext';

type Props = { style?: StyleProp<ViewStyle>; children: ReactNode; strong?: boolean };

/**
 * Glass (BRAND.md): rgba(255,255,255,0.12–0.16) + 14–18 px blur, for controls on scenes.
 * On Android below 12 the blur falls back to the translucent fill alone.
 */
export function GlassPanel({ style, children, strong = false }: Props) {
  const { blurTarget } = useScene();
  return (
    <View style={[styles.wrap, style]}>
      <BlurView
        intensity={surfaces.glassBlur * 3}
        tint="dark"
        blurMethod="dimezisBlurViewSdk31Plus"
        blurTarget={blurTarget ?? undefined}
        style={StyleSheet.absoluteFill}
      />
      <View
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: strong ? surfaces.glassStrong : surfaces.glass },
        ]}
      />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { overflow: 'hidden' },
});
