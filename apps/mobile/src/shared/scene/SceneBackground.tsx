import { BlurTargetView } from 'expo-blur';
import { useRef, type ComponentRef, type ReactNode } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { colors } from '@/theme';
import { Ambient } from './Ambient';
import { SceneContext } from './SceneContext';
import { SCENE_DAY, SCENE_NIGHT } from './scenes.generated';

type Props = {
  /** day: Home and Summary · night: gameplay (BRAND.md → Background scenes) */
  variant: 'day' | 'night';
  atoms?: number;
  sparkles?: number;
  children: ReactNode;
};

/**
 * Full-screen scene with ambient motion behind the screen's content. The scene sits inside a
 * BlurTargetView so glass panels on top can blur it (Android); iOS blurs whatever is behind.
 */
export function SceneBackground({ variant, atoms = 2, sparkles = 5, children }: Props) {
  const { width, height } = useWindowDimensions();
  const target = useRef<ComponentRef<typeof View>>(null);
  return (
    <View
      style={[styles.root, { backgroundColor: variant === 'day' ? colors.violet : colors.night }]}
    >
      <BlurTargetView ref={target} style={StyleSheet.absoluteFill} pointerEvents="none">
        <SvgXml
          xml={variant === 'day' ? SCENE_DAY : SCENE_NIGHT}
          width={width}
          height={height}
          preserveAspectRatio="xMidYMid slice"
        />
        <Ambient atoms={atoms} sparkles={sparkles} />
      </BlurTargetView>
      <SceneContext.Provider value={{ blurTarget: target }}>{children}</SceneContext.Provider>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
