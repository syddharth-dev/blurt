/**
 * Minimal Reanimated stand-in for Jest. Reanimated 4's own mock needs native modules,
 * so tests render final poses with this instead (motion is checked on device).
 * Add functions here as components start using them.
 */
import { View } from 'react-native';

const identity = <T>(x: T) => x;
const easingFn = () => identity;

export const Easing = {
  linear: identity,
  quad: identity,
  sin: identity,
  in: easingFn,
  out: easingFn,
  inOut: easingFn,
};

export const useSharedValue = <T>(value: T) => ({ value });
export const useAnimatedStyle = <T>(fn: () => T) => fn();
export const useAnimatedProps = <T>(fn: () => T) => fn();
export const useReducedMotion = () => false;
export const withTiming = identity;
export const withSpring = identity;
export const withDelay = (_ms: number, value: unknown) => value;
export const withRepeat = identity;
export const withSequence = (...values: unknown[]) => values[values.length - 1];
export const cancelAnimation = () => {};
export const createAnimatedComponent = identity;

const Animated = { View, createAnimatedComponent };
export default Animated;
