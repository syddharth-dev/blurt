import { useEffect, type ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedProps,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
  type AnimatedStyle,
} from 'react-native-reanimated';
import Svg, { Circle, Ellipse, G, Path } from 'react-native-svg';
import { pipColors as COLOR } from '@/theme';
import { PIP_MOODS, PIP_TIMING as T, type PipMood } from './pipMoods';

/**
 * Pip, the mascot (docs/MASCOT.md). Stacked full-size SVG layers inside Animated.Views,
 * so each part can move on its own. Mood is a prop derived from game state (moodFor),
 * never stored here. With Reduce Motion on, every loop stops but the pose still changes.
 */
type Props = { mood: PipMood; size?: number };

const AnimatedEllipse = Animated.createAnimatedComponent(Ellipse);
const ease = Easing.inOut(Easing.sin);

/** Rotate / scale a full-size layer around an artboard point (px, py). */
function pivot(px: number, py: number, k: number, deg: number, scaleY = 1) {
  'worklet';
  const dx = (px - 100) * k;
  const dy = (py - 100) * k;
  return [
    { translateX: dx },
    { translateY: dy },
    { rotate: `${deg}deg` },
    { scaleY },
    { translateX: -dx },
    { translateY: -dy },
  ];
}

function Layer({
  style,
  children,
}: {
  style?: StyleProp<AnimatedStyle<ViewStyle>>;
  children: ReactNode;
}) {
  return (
    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, style]}>
      <Svg width="100%" height="100%" viewBox="0 0 200 200">
        {children}
      </Svg>
    </Animated.View>
  );
}

function Ear({ cx }: { cx: number }) {
  return (
    <G>
      <Ellipse cx={cx} cy={54} rx={19} ry={42} fill={COLOR.body} />
      <Ellipse cx={cx} cy={58} rx={9} ry={28} fill={COLOR.inner} />
    </G>
  );
}

function Arm({ cx, cy, rot, ry = 17 }: { cx: number; cy: number; rot: number; ry?: number }) {
  return (
    <Ellipse
      cx={cx}
      cy={cy}
      rx={11}
      ry={ry}
      fill={COLOR.limb}
      transform={`rotate(${rot} ${cx} ${cy})`}
    />
  );
}

export function Pip({ mood, size = 120 }: Props) {
  const m = PIP_MOODS[mood];
  const k = size / 200;
  const reduced = useReducedMotion();

  const bodyX = useSharedValue(0);
  const bodyY = useSharedValue(0);
  const ear = useSharedValue(m.ear);
  const earScale = useSharedValue(m.earScaleY);
  const blink = useSharedValue(1);
  const armDeg = useSharedValue(0);
  const pulse = useSharedValue(1);

  // Body motion, ears and extras restart whenever the mood changes.
  useEffect(() => {
    [bodyX, bodyY, armDeg, pulse].forEach(cancelAnimation);
    bodyX.value = 0;
    armDeg.value = 0;
    ear.value = reduced ? m.ear : withSpring(m.ear, T.earSpring);
    earScale.value = reduced ? m.earScaleY : withSpring(m.earScaleY);
    if (reduced) {
      bodyY.value = 0;
      pulse.value = 1;
      return;
    }
    bodyY.value = withTiming(0, { duration: T.settle });

    const half = m.period / 2;
    if (m.motion === 'wobble') {
      bodyX.value = withRepeat(
        withSequence(
          withTiming(-m.amp, { duration: m.period / 4, easing: ease }),
          withTiming(m.amp, { duration: half, easing: ease }),
          withTiming(0, { duration: m.period / 4, easing: ease }),
        ),
        -1,
      );
    } else {
      const jump = m.motion === 'jump';
      bodyY.value = withRepeat(
        withSequence(
          withTiming(-m.amp, { duration: half, easing: jump ? Easing.out(Easing.quad) : ease }),
          withTiming(0, { duration: half, easing: jump ? Easing.in(Easing.quad) : ease }),
        ),
        -1,
      );
    }
    if (m.arms === 'wave') {
      armDeg.value = withRepeat(
        withSequence(
          withTiming(T.waveTo, { duration: T.waveHalf, easing: ease }),
          withTiming(T.waveFrom, { duration: T.waveHalf, easing: ease }),
        ),
        -1,
      );
    }
    pulse.value = withRepeat(
      withSequence(
        withTiming(T.pulseMin, { duration: T.pulseHalf }),
        withTiming(1, { duration: T.pulseHalf }),
      ),
      -1,
    );
  }, [m, reduced, bodyX, bodyY, armDeg, pulse, ear, earScale]);

  // Blink every ~4 s (celebrate's eyes are closed arcs, so blinking doesn't show there).
  useEffect(() => {
    if (reduced) {
      cancelAnimation(blink);
      blink.value = 1;
      return;
    }
    blink.value = withRepeat(
      withSequence(
        withDelay(T.blinkWait, withTiming(T.blinkScale, { duration: T.blinkClose })),
        withTiming(1, { duration: T.blinkClose }),
      ),
      -1,
    );
    return () => cancelAnimation(blink);
  }, [reduced, blink]);

  const bodyStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: bodyX.value * k }, { translateY: bodyY.value * k }],
  }));
  const shadowStyle = useAnimatedStyle(() => ({
    // The shadow shrinks and fades as Pip rises.
    transform: [{ scaleX: 1 + bodyY.value / 60 }],
    opacity: 1 + bodyY.value / 40,
  }));
  const earLStyle = useAnimatedStyle(() => ({
    transform: pivot(66, 90, k, -ear.value, earScale.value),
  }));
  const earRStyle = useAnimatedStyle(() => ({
    transform: pivot(134, 90, k, ear.value, earScale.value),
  }));
  const waveArmStyle = useAnimatedStyle(() => ({ transform: pivot(150, 118, k, armDeg.value) }));
  const pulseStyle = useAnimatedStyle(() => ({ opacity: pulse.value }));
  const eyeProps = useAnimatedProps(() => ({ ry: 16 * blink.value }));
  const pupilProps = useAnimatedProps(() => ({ ry: 9 * blink.value }));

  return (
    <View
      style={{ width: size, height: size }}
      accessible
      accessibilityRole="image"
      accessibilityLabel={m.label}
    >
      <Layer style={shadowStyle}>
        <Ellipse cx={100} cy={190} rx={46} ry={6} fill={COLOR.shadow} opacity={0.22} />
      </Layer>

      <Animated.View style={[StyleSheet.absoluteFill, bodyStyle]}>
        {m.extras.includes('waves') && (
          <Layer style={pulseStyle}>
            <G stroke={COLOR.white} strokeWidth={4} strokeLinecap="round" fill="none">
              <Path d="M22 40 Q12 56 22 72" />
              <Path d="M10 32 Q-4 56 10 80" />
              <Path d="M178 40 Q188 56 178 72" />
              <Path d="M190 32 Q204 56 190 80" />
            </G>
          </Layer>
        )}

        <Layer style={earLStyle}>
          <Ear cx={66} />
        </Layer>
        <Layer style={earRStyle}>
          <Ear cx={134} />
        </Layer>

        {/* Arms (behind the body) */}
        <Layer>
          {m.arms === 'down' && (
            <>
              <Arm cx={42} cy={138} rot={20} />
              <Arm cx={158} cy={138} rot={-20} />
            </>
          )}
          {m.arms === 'wave' && <Arm cx={42} cy={138} rot={20} />}
          {m.arms === 'up' && (
            <>
              <Arm cx={36} cy={92} rot={-30} ry={18} />
              <Arm cx={164} cy={92} rot={30} ry={18} />
            </>
          )}
          {m.arms === 'cup' && (
            <>
              <Arm cx={42} cy={138} rot={20} />
              <Arm cx={160} cy={92} rot={40} />
            </>
          )}
        </Layer>
        {m.arms === 'wave' && (
          <Layer style={waveArmStyle}>
            <Arm cx={166} cy={96} rot={30} ry={18} />
          </Layer>
        )}

        {/* Body, goggles, face */}
        <Layer>
          <Ellipse cx={100} cy={122} rx={64} ry={58} fill={COLOR.body} />
          <Ellipse cx={100} cy={142} rx={36} ry={28} fill={COLOR.belly} />
          <Ellipse cx={78} cy={177} rx={17} ry={8} fill={COLOR.limb} />
          <Ellipse cx={122} cy={177} rx={17} ry={8} fill={COLOR.limb} />

          <Path
            d="M40 92 Q100 62 160 92"
            fill="none"
            stroke={COLOR.ink}
            strokeWidth={5}
            strokeLinecap="round"
          />
          <Circle cx={82} cy={78} r={14} fill={COLOR.lens} stroke={COLOR.ink} strokeWidth={4} />
          <Circle cx={118} cy={78} r={14} fill={COLOR.lens} stroke={COLOR.ink} strokeWidth={4} />
          <Path d="M96 78 L104 78" stroke={COLOR.ink} strokeWidth={4} strokeLinecap="round" />

          {m.eyes === 'open' ? (
            <G>
              <AnimatedEllipse
                cx={80}
                cy={108}
                rx={14}
                fill={COLOR.white}
                animatedProps={eyeProps}
              />
              <AnimatedEllipse
                cx={120}
                cy={108}
                rx={14}
                fill={COLOR.white}
                animatedProps={eyeProps}
              />
              <AnimatedEllipse
                cx={80 + m.look}
                cy={110}
                rx={8}
                fill={COLOR.ink}
                animatedProps={pupilProps}
              />
              <AnimatedEllipse
                cx={120 + m.look}
                cy={110}
                rx={8}
                fill={COLOR.ink}
                animatedProps={pupilProps}
              />
              <Circle cx={83 + m.look} cy={106} r={3} fill={COLOR.white} />
              <Circle cx={123 + m.look} cy={106} r={3} fill={COLOR.white} />
            </G>
          ) : (
            <G fill="none" stroke={COLOR.ink} strokeWidth={5} strokeLinecap="round">
              <Path d="M68 112 Q80 98 92 112" />
              <Path d="M108 112 Q120 98 132 112" />
            </G>
          )}

          <Ellipse cx={62} cy={132} rx={9} ry={6} fill={COLOR.inner} opacity={0.55} />
          <Ellipse cx={138} cy={132} rx={9} ry={6} fill={COLOR.inner} opacity={0.55} />
          <Path
            d={m.mouth}
            fill={m.mouthFill}
            stroke={COLOR.ink}
            strokeWidth={4.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Layer>

        {m.extras.includes('drop') && (
          <Layer style={pulseStyle}>
            <Path d="M160 70 Q168 84 160 90 Q152 84 160 70 Z" fill={COLOR.lens} />
          </Layer>
        )}
      </Animated.View>

      {m.extras.includes('sparkles') && (
        <Layer style={pulseStyle}>
          <Path d="M24 30 l4 10 l10 4 l-10 4 l-4 10 l-4 -10 l-10 -4 l10 -4 z" fill={COLOR.white} />
          <Path d="M176 22 l3 8 l8 3 l-8 3 l-3 8 l-3 -8 l-8 -3 l8 -3 z" fill={COLOR.body} />
          <Path d="M186 140 l3 7 l7 3 l-7 3 l-3 7 l-3 -7 l-7 -3 l7 -3 z" fill={COLOR.white} />
        </Layer>
      )}
    </View>
  );
}
