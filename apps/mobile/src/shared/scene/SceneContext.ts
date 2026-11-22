import { createContext, useContext, type ComponentRef, type RefObject } from 'react';
import type { View } from 'react-native';

/** The scene behind the screen, which glass panels blur (Android needs a BlurTargetView ref). */
export const SceneContext = createContext<{
  blurTarget: RefObject<ComponentRef<typeof View> | null> | null;
}>({
  blurTarget: null,
});

export const useScene = () => useContext(SceneContext);
