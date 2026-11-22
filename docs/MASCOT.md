# Pip, the mascot

## How Pip is built
Pip is **vector artwork (SVG)**, not a GIF. In the app he is a React Native component, `<Pip mood="idle" size={104} />`, drawn with **react-native-svg** and animated with **react-native-reanimated**. Both are free and open source.

The files in `assets/pip/*.svg` are the visual reference for each mood: open them in a browser to see the motion. The app does **not** load these files. Their built-in SVG animations don't run in React Native, so the component below redraws the same shapes and animates them with Reanimated instead.

(Rive is a possible upgrade later for smoother blends between moods, but it needs a paid plan to export. Not needed for launch.)

## Anatomy (all coordinates on a 200×200 artboard)

| Part | Shape | Colour | Pivot for rotation |
|---|---|---|---|
| Shadow | ellipse (100,190) 46×6 | `#0B0424` at 22% | — |
| Left ear | ellipse (66,54) 19×42 + inner ellipse (66,58) 9×28 | `#FFC93C` / inner `#FF7A59` | (66, 90) |
| Right ear | ellipse (134,54) 19×42 + inner (134,58) 9×28 | same | (134, 90) |
| Body | ellipse (100,122) 64×58 | `#FFC93C` | — |
| Belly | ellipse (100,142) 36×28 | `#FFE59A` | — |
| Feet | ellipses (78,177) and (122,177) 17×8 | `#F5B21E` | — |
| Arms | ellipses 11×17, positions per mood (see code) | `#F5B21E` | wave arm: (150, 118) |
| Goggles | strap path `M40 92 Q100 62 160 92`, lenses at (82,78) and (118,78) r14 | lenses `#8FD8FF`, outline `#160C3A` 4 px | — |
| Eyes | white ellipses (80,108) and (120,108) 14×16, pupils r8×9 `#160C3A`, shine r3 | — | — |
| Cheeks | ellipses (62,132) and (138,132) 9×6 | `#FF7A59` at 55% | — |
| Mouth | path per mood, stroke `#160C3A` 4.5 px | — | — |

## Moods

| Mood | Body motion | Ears | Arms | Face | Extras |
|---|---|---|---|---|---|
| `idle` | Bob 5 units, 2.4 s loop | Tilted out 14° | Down | Smile | — |
| `wave` | Bob 6 units, 1.8 s | 14° | Right arm waves −10°↔22°, 0.9 s | Open smile | — |
| `listening` | Bob 3 units, 0.8 s | Upright 4°, 8% taller | Hand cupped to ear | Small "o", pupils shifted right 6 | Sound arcs pulse beside the ears |
| `oops` | Side-to-side wobble ±3, 0.6 s | Droop 58° | Down | Wavy mouth | Sweat drop pulses |
| `celebrate` | Jump 16 units, 0.7 s | 20° | Both up | Happy closed eyes (arcs), big open mouth | Sparkles blink |

All moods blink every 4 s (eyes squash to 10% height for 0.1 s), except `celebrate`, whose eyes are already closed arcs.

**Mood changes blend:** ear angles and ear height move with a spring, so switching from `idle` to `listening` makes the ears perk up instead of jumping.

## Mood mapping (derived from game state, never set manually)

| Game state | Pip mood |
|---|---|
| Home, onboarding, empty states | `wave` |
| Round: idle / waiting for an answer | `idle` |
| Round: listening, evaluating | `listening` |
| Round: close or wrong | `oops` |
| Round: correct, level up, summary | `celebrate` |

```ts
// src/shared/mascot/moodFor.ts
import type { PipMood } from './pipMoods';
export function moodFor(roundState: string): PipMood {
  switch (roundState) {
    case 'listening':
    case 'evaluating': return 'listening';
    case 'close':
    case 'wrong':
    case 'revealed':   return 'oops';
    case 'correct':
    case 'done':       return 'celebrate';
    default:           return 'idle';
  }
}
```

## Sizes
Home 120 · Play 104 · Summary 112 · App icon: 124 on a `#160C3A` rounded square.

---

## Implementation with Reanimated

**Built:** `apps/mobile/src/shared/mascot/` (`Pip.tsx`, `pipMoods.ts`, `moodFor.ts`). The code below is the reference it was built from. The built version differs in small ways: colours come from `pipColors`; shared timings (blink, wave, pulse, ear spring) live in `PIP_TIMING` in `pipMoods.ts`; and `Ear`, `Arm` and `Layer` are top-level components, not redefined on each render. To compare moods on a phone, open **Pip preview** from Home → Developer. It has buttons for every mood, Pip's real sizes, a night/light background switch, and a "Switch moods fast" stress test.

### Install
```bash
npx expo install react-native-svg react-native-reanimated
```
Follow the Reanimated install notes for your Expo SDK (current Expo templates already include its Babel setup).

### How it works
- Pip is built from **stacked layers**. Each layer is a full-size `<Svg viewBox="0 0 200 200">` inside an `Animated.View`, so each layer can move on its own: shadow, ears, arms, body+face, extras.
- Whole-body motion (bob, jump, wobble) is a `translateX/translateY` on a wrapper view.
- Ear and arm rotation uses a **pivot transform** (move to pivot → rotate → move back), because views rotate around their centre by default.
- Blinking animates the eye ellipses' `ry` through `useAnimatedProps`.
- Shapes that only change per mood (mouth, arm positions, happy eyes) are plain conditional rendering. Only motion is animated.
- **Reduce Motion:** `useReducedMotion()` turns off all loops. Pip still changes pose per mood, without moving.

### `pipMoods.ts`
```ts
// src/shared/mascot/pipMoods.ts
export type PipMood = 'idle' | 'wave' | 'listening' | 'oops' | 'celebrate';

export type MoodConfig = {
  motion: 'bob' | 'wobble' | 'jump';
  amp: number;              // in artboard units
  period: number;           // ms for one full loop
  ear: number;              // degrees each ear tilts outwards
  earScaleY: number;
  arms: 'down' | 'wave' | 'up' | 'cup';
  eyes: 'open' | 'happy';
  look: number;             // pupil x-offset
  mouth: string;            // SVG path
  mouthFill: string;
  extras: Array<'waves' | 'drop' | 'sparkles'>;
  label: string;            // accessibility
};

import { pipColors } from '@/theme';

const INK = pipColors.ink;

export const PIP_MOODS: Record<PipMood, MoodConfig> = {
  idle:      { motion: 'bob',    amp: 5,  period: 2400, ear: 14, earScaleY: 1,    arms: 'down', eyes: 'open',  look: 0, mouth: 'M88 134 Q100 146 112 134',                    mouthFill: 'none', extras: [],           label: 'Pip smiling' },
  wave:      { motion: 'bob',    amp: 6,  period: 1800, ear: 14, earScaleY: 1,    arms: 'wave', eyes: 'open',  look: 0, mouth: 'M86 132 Q100 150 114 132 Z',                  mouthFill: INK,    extras: [],           label: 'Pip waving hello' },
  listening: { motion: 'bob',    amp: 3,  period: 800,  ear: 4,  earScaleY: 1.08, arms: 'cup',  eyes: 'open',  look: 6, mouth: 'M96 138 a4 4 0 1 0 8 0 a4 4 0 1 0 -8 0 Z', mouthFill: INK,    extras: ['waves'],    label: 'Pip listening closely' },
  oops:      { motion: 'wobble', amp: 3,  period: 600,  ear: 58, earScaleY: 1,    arms: 'down', eyes: 'open',  look: 0, mouth: 'M86 142 Q93 134 100 142 Q107 150 114 142',    mouthFill: 'none', extras: ['drop'],     label: 'Pip looking unsure' },
  celebrate: { motion: 'jump',   amp: 16, period: 700,  ear: 20, earScaleY: 1,    arms: 'up',   eyes: 'happy', look: 0, mouth: 'M84 130 Q100 158 116 130 Z',                  mouthFill: INK,    extras: ['sparkles'], label: 'Pip celebrating' },
};
```

### `Pip.tsx`
```tsx
// src/shared/mascot/Pip.tsx
import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Ellipse, G, Path } from 'react-native-svg';
import Animated, {
  Easing, cancelAnimation, useAnimatedProps, useAnimatedStyle, useReducedMotion,
  useSharedValue, withDelay, withRepeat, withSequence, withSpring, withTiming,
} from 'react-native-reanimated';
import { pipColors as COLOR } from '@/theme';   // values in BRAND.md → "Pip colours"
import { PIP_MOODS, type PipMood } from './pipMoods';

const AnimatedEllipse = Animated.createAnimatedComponent(Ellipse);
const ease = Easing.inOut(Easing.sin);

/** Rotate/scale a full-size layer around an artboard point (px, py). */
function pivot(px: number, py: number, k: number, deg: number, scaleY = 1) {
  'worklet';
  const dx = (px - 100) * k;
  const dy = (py - 100) * k;
  return [
    { translateX: dx }, { translateY: dy },
    { rotate: `${deg}deg` }, { scaleY },
    { translateX: -dx }, { translateY: -dy },
  ];
}

function Layer({ style, children }: { style?: any; children: React.ReactNode }) {
  return (
    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, style]}>
      <Svg width="100%" height="100%" viewBox="0 0 200 200">{children}</Svg>
    </Animated.View>
  );
}

type Props = { mood: PipMood; size?: number };

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

  // Body motion + ears, restarted whenever the mood changes
  useEffect(() => {
    [bodyX, bodyY, armDeg, pulse].forEach(cancelAnimation);
    bodyX.value = 0;
    bodyY.value = withTiming(0, { duration: 120 });
    ear.value = reduced ? m.ear : withSpring(m.ear, { damping: 10, stiffness: 140 });
    earScale.value = reduced ? m.earScaleY : withSpring(m.earScaleY);
    if (reduced) { pulse.value = 1; return; }

    const half = m.period / 2;
    if (m.motion === 'wobble') {
      bodyX.value = withRepeat(withSequence(
        withTiming(-m.amp, { duration: m.period / 4, easing: ease }),
        withTiming(m.amp, { duration: half, easing: ease }),
        withTiming(0, { duration: m.period / 4, easing: ease }),
      ), -1);
    } else {
      bodyY.value = withRepeat(withSequence(
        withTiming(-m.amp, { duration: half, easing: m.motion === 'jump' ? Easing.out(Easing.quad) : ease }),
        withTiming(0, { duration: half, easing: m.motion === 'jump' ? Easing.in(Easing.quad) : ease }),
      ), -1);
    }
    if (m.arms === 'wave') {
      armDeg.value = withRepeat(withSequence(
        withTiming(22, { duration: 450, easing: ease }),
        withTiming(-10, { duration: 450, easing: ease }),
      ), -1);
    }
    pulse.value = withRepeat(withSequence(
      withTiming(0.2, { duration: 500 }), withTiming(1, { duration: 500 }),
    ), -1);
  }, [mood, reduced]);

  // Blink every ~4 s
  useEffect(() => {
    if (reduced) { blink.value = 1; return; }
    blink.value = withRepeat(withSequence(
      withDelay(3600, withTiming(0.1, { duration: 100 })),
      withTiming(1, { duration: 100 }),
    ), -1);
    return () => cancelAnimation(blink);
  }, [reduced]);

  const bodyStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: bodyX.value * k }, { translateY: bodyY.value * k }],
  }));
  const shadowStyle = useAnimatedStyle(() => ({
    transform: [{ scaleX: 1 + bodyY.value / 60 }],   // shadow shrinks as Pip rises
    opacity: 1 + bodyY.value / 40,
  }));
  const earLStyle = useAnimatedStyle(() => ({ transform: pivot(66, 90, k, -ear.value, earScale.value) }));
  const earRStyle = useAnimatedStyle(() => ({ transform: pivot(134, 90, k, ear.value, earScale.value) }));
  const waveArmStyle = useAnimatedStyle(() => ({ transform: pivot(150, 118, k, armDeg.value) }));
  const pulseStyle = useAnimatedStyle(() => ({ opacity: pulse.value }));
  const eyeProps = useAnimatedProps(() => ({ ry: 16 * blink.value }));
  const pupilProps = useAnimatedProps(() => ({ ry: 9 * blink.value }));

  const Ear = ({ cx }: { cx: number }) => (
    <G>
      <Ellipse cx={cx} cy={54} rx={19} ry={42} fill={COLOR.body} />
      <Ellipse cx={cx} cy={58} rx={9} ry={28} fill={COLOR.inner} />
    </G>
  );
  const Arm = ({ cx, cy, rot, ry = 17 }: { cx: number; cy: number; rot: number; ry?: number }) => (
    <Ellipse cx={cx} cy={cy} rx={11} ry={ry} fill={COLOR.limb} transform={`rotate(${rot} ${cx} ${cy})`} />
  );

  return (
    <View
      style={{ width: size, height: size }}
      accessible accessibilityRole="image" accessibilityLabel={m.label}
    >
      <Layer style={shadowStyle}>
        <Ellipse cx={100} cy={190} rx={46} ry={6} fill={COLOR.shadow} opacity={0.22} />
      </Layer>

      <Animated.View style={[StyleSheet.absoluteFill, bodyStyle]}>
        {m.extras.includes('waves') && (
          <Layer style={pulseStyle}>
            <G stroke={COLOR.white} strokeWidth={4} strokeLinecap="round" fill="none">
              <Path d="M22 40 Q12 56 22 72" /><Path d="M10 32 Q-4 56 10 80" />
              <Path d="M178 40 Q188 56 178 72" /><Path d="M190 32 Q204 56 190 80" />
            </G>
          </Layer>
        )}

        <Layer style={earLStyle}><Ear cx={66} /></Layer>
        <Layer style={earRStyle}><Ear cx={134} /></Layer>

        {/* Arms (behind the body) */}
        <Layer>
          {m.arms === 'down' && (<><Arm cx={42} cy={138} rot={20} /><Arm cx={158} cy={138} rot={-20} /></>)}
          {m.arms === 'wave' && <Arm cx={42} cy={138} rot={20} />}
          {m.arms === 'up'   && (<><Arm cx={36} cy={92} rot={-30} ry={18} /><Arm cx={164} cy={92} rot={30} ry={18} /></>)}
          {m.arms === 'cup'  && (<><Arm cx={42} cy={138} rot={20} /><Arm cx={160} cy={92} rot={40} /></>)}
        </Layer>
        {m.arms === 'wave' && (
          <Layer style={waveArmStyle}><Arm cx={166} cy={96} rot={30} ry={18} /></Layer>
        )}

        {/* Body, goggles, face */}
        <Layer>
          <Ellipse cx={100} cy={122} rx={64} ry={58} fill={COLOR.body} />
          <Ellipse cx={100} cy={142} rx={36} ry={28} fill={COLOR.belly} />
          <Ellipse cx={78} cy={177} rx={17} ry={8} fill={COLOR.limb} />
          <Ellipse cx={122} cy={177} rx={17} ry={8} fill={COLOR.limb} />

          <Path d="M40 92 Q100 62 160 92" fill="none" stroke={COLOR.ink} strokeWidth={5} strokeLinecap="round" />
          <Circle cx={82} cy={78} r={14} fill={COLOR.lens} stroke={COLOR.ink} strokeWidth={4} />
          <Circle cx={118} cy={78} r={14} fill={COLOR.lens} stroke={COLOR.ink} strokeWidth={4} />
          <Path d="M96 78 L104 78" stroke={COLOR.ink} strokeWidth={4} strokeLinecap="round" />

          {m.eyes === 'open' ? (
            <G>
              <AnimatedEllipse cx={80} cy={108} rx={14} fill={COLOR.white} animatedProps={eyeProps} />
              <AnimatedEllipse cx={120} cy={108} rx={14} fill={COLOR.white} animatedProps={eyeProps} />
              <AnimatedEllipse cx={80 + m.look} cy={110} rx={8} fill={COLOR.ink} animatedProps={pupilProps} />
              <AnimatedEllipse cx={120 + m.look} cy={110} rx={8} fill={COLOR.ink} animatedProps={pupilProps} />
              <Circle cx={83 + m.look} cy={106} r={3} fill={COLOR.white} />
              <Circle cx={123 + m.look} cy={106} r={3} fill={COLOR.white} />
            </G>
          ) : (
            <G fill="none" stroke={COLOR.ink} strokeWidth={5} strokeLinecap="round">
              <Path d="M68 112 Q80 98 92 112" /><Path d="M108 112 Q120 98 132 112" />
            </G>
          )}

          <Ellipse cx={62} cy={132} rx={9} ry={6} fill={COLOR.inner} opacity={0.55} />
          <Ellipse cx={138} cy={132} rx={9} ry={6} fill={COLOR.inner} opacity={0.55} />
          <Path d={m.mouth} fill={m.mouthFill} stroke={COLOR.ink} strokeWidth={4.5}
                strokeLinecap="round" strokeLinejoin="round" />
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
```

### Using it
```tsx
// Play screen
const state = useSelector(roundActor, (s) => s.value as string);
<Pip mood={moodFor(state)} size={104} />

// Home
<Pip mood="wave" size={120} />
```

### Checklist when building or changing Pip
- [ ] Compare each mood side by side with `assets/pip/pip-<mood>.svg` open in a browser.
- [ ] Test switching moods quickly (idle → listening → oops → listening → celebrate). Nothing should freeze or jump, and ears should spring.
- [ ] Turn on Reduce Motion in the phone settings: Pip should stay still but still change pose.
- [ ] Profile on a low-end Android phone: Pip + background together should stay at 60 fps. If not, lower the number of background atoms first.
- [ ] Pip is decorative next to the speech bubble, so screen readers announce the bubble text. His `accessibilityLabel` describes the mood only.
