import {
  DIAGRAMS,
  type ContentTerm,
  type DiagramId,
  type LocalPicture,
} from '@blurt/shared/content';
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Line, Rect, SvgXml } from 'react-native-svg';
import { colors, elevation, motion, radius, sizes, space, surfaces, textStyle } from '@/theme';

type Props = { term: ContentTerm; solved: boolean };

const CARD = sizes.pictureCard;
const INSET = space.s14;
const AREA = CARD - INSET * 2;
const BADGE = 30;
/** Glow opacity; box highlights cover more of the picture, so they glow more softly. */
const GLOW = { min: 0.22, max: 0.5, boxFactor: 0.55 };
const RING_SCALE = 1.35;

/**
 * Picture card (SCREENS.md → Play): the picture with the target part highlighted. The app
 * draws the highlight from the term's stored box: a pulsing sunny glow, a rotating dashed ring
 * and a leader line to a "?" badge, which becomes the term once it's answered. Terms without a
 * picture show their clue instead.
 */
export function PictureCard({ term, solved }: Props) {
  const tag = (
    <View style={styles.tag}>
      <Text style={styles.tagText}>{`Grade 8 · ${term.subject}`.toUpperCase()}</Text>
    </View>
  );

  if (!term.picture) {
    return (
      <View
        style={[styles.card, styles.clueCard]}
        accessible
        accessibilityLabel={`Clue: ${term.clue}`}
      >
        {tag}
        <Text style={styles.clue}>{term.clue}</Text>
        {solved ? <Text style={styles.answer}>{term.display}</Text> : null}
      </View>
    );
  }

  const diagram = DIAGRAMS[term.picture.diagram as DiagramId];
  return (
    <View
      style={styles.card}
      accessible
      accessibilityRole="image"
      accessibilityLabel={`${term.picture.altText}. The part to name is glowing.${solved ? ` It's ${term.display}.` : ''}`}
    >
      <View style={styles.area}>
        {diagram ? <SvgXml xml={diagram.svg} width={AREA} height={AREA} /> : null}
        <Highlight picture={term.picture} label={solved ? term.display : '?'} />
      </View>
      {tag}
    </View>
  );
}

function Highlight({ picture, label }: { picture: LocalPicture; label: string }) {
  const reduced = useReducedMotion();
  const glow = useSharedValue(GLOW.max);
  const spin = useSharedValue(0);

  useEffect(() => {
    if (reduced) {
      cancelAnimation(glow);
      cancelAnimation(spin);
      glow.value = GLOW.max;
      spin.value = 0;
      return;
    }
    const half = motion.pulse.duration / 2;
    glow.value = withRepeat(
      withSequence(
        withTiming(GLOW.min, { duration: half }),
        withTiming(GLOW.max, { duration: half }),
      ),
      -1,
    );
    spin.value = withRepeat(
      withTiming(360, { duration: motion.spinAtom.duration, easing: Easing.linear }),
      -1,
    );
    return () => {
      cancelAnimation(glow);
      cancelAnimation(spin);
    };
  }, [reduced, glow, spin]);

  const soft = picture.highlight.shape === 'rect' ? GLOW.boxFactor : 1;
  const glowStyle = useAnimatedStyle(() => ({ opacity: glow.value * soft }));
  const spinStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${spin.value}deg` }] }));

  const h = picture.highlight;
  const box = { left: h.x * AREA, top: h.y * AREA, width: h.w * AREA, height: h.h * AREA };
  const cx = box.left + box.width / 2;
  const cy = box.top + box.height / 2;
  const isEllipse = h.shape === 'ellipse';
  const ring = Math.max(box.width, box.height) * RING_SCALE;
  const { badge, lineFrom, anchor } = badgeLayout(box, cx, cy, h.badge);

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {/* glow */}
      <Animated.View
        style={[
          styles.glow,
          box,
          { borderRadius: isEllipse ? Math.max(box.width, box.height) : radius.tile },
          glowStyle,
        ]}
      />
      {/* dashed ring: rotating circle for ellipses, a still dashed frame for boxes */}
      {isEllipse ? (
        <Animated.View
          style={[
            {
              position: 'absolute',
              left: cx - ring / 2,
              top: cy - ring / 2,
              width: ring,
              height: ring,
            },
            spinStyle,
          ]}
        >
          <Svg width={ring} height={ring}>
            <Circle
              cx={ring / 2}
              cy={ring / 2}
              r={ring / 2 - 2}
              fill="none"
              stroke={colors.sunny}
              strokeWidth={2.5}
              strokeDasharray="6 6"
            />
          </Svg>
        </Animated.View>
      ) : null}
      <Svg width={AREA} height={AREA} style={StyleSheet.absoluteFill}>
        {!isEllipse ? (
          <Rect
            x={box.left - 3}
            y={box.top - 3}
            width={box.width + 6}
            height={box.height + 6}
            rx={radius.tile}
            fill="none"
            stroke={colors.sunny}
            strokeWidth={2.5}
            strokeDasharray="6 6"
          />
        ) : null}
        {lineFrom ? (
          <Line
            x1={lineFrom.x}
            y1={lineFrom.y}
            x2={badge.x}
            y2={badge.y}
            stroke={colors.sunny}
            strokeWidth={2.5}
            strokeLinecap="round"
          />
        ) : null}
      </Svg>
      {/* "?" badge, or the term once answered; grows inward from its side */}
      <View
        style={[
          styles.badge,
          { top: badge.y - BADGE / 2 },
          anchor === 'left' ? { left: badge.x - BADGE / 2 } : { right: AREA - badge.x - BADGE / 2 },
        ]}
      >
        <Text style={label === '?' ? styles.badgeQ : styles.badgeTerm} numberOfLines={1}>
          {label}
        </Text>
      </View>
    </View>
  );
}

type Box = { left: number; top: number; width: number; height: number };

/**
 * Puts the badge just outside the box's top corner, inside the picture: on the roomier side,
 * or the side the picture asks for.
 */
export function badgeLayout(box: Box, cx: number, cy: number, side?: 'left' | 'right') {
  const onRight = side ? side === 'right' : cx < AREA / 2;
  const r = BADGE / 2;
  const gap = space.s16;
  const clamp = (v: number) => Math.min(AREA - r, Math.max(r, v));
  const x = clamp(onRight ? box.left + box.width + gap : box.left - gap);
  const y = clamp(box.top - gap);
  const inside =
    x > box.left && x < box.left + box.width && y > box.top && y < box.top + box.height;
  // Line starts on the box edge, at the corner facing the badge (45° on an ellipse).
  const k = Math.SQRT1_2;
  const lineFrom = inside
    ? null
    : {
        x: cx + (onRight ? 1 : -1) * (box.width / 2) * k,
        y: cy - (box.height / 2) * k,
      };
  return { badge: { x, y }, lineFrom, anchor: onRight ? ('left' as const) : ('right' as const) };
}

const styles = StyleSheet.create({
  card: {
    alignSelf: 'center',
    width: CARD,
    height: CARD,
    backgroundColor: colors.lilac,
    borderRadius: radius.pictureCard,
    padding: INSET,
    boxShadow: `0 ${elevation.card.offsetY}px ${elevation.card.blur}px ${surfaces.cardShadow}`,
  },
  clueCard: {
    height: undefined,
    minHeight: CARD * 0.72,
    padding: space.s20,
    paddingTop: space.s24 + space.s20,
    gap: space.s10,
    justifyContent: 'center',
  },
  area: { width: AREA, height: AREA },
  tag: {
    position: 'absolute',
    top: space.s16,
    left: space.s16,
    backgroundColor: colors.coral,
    borderRadius: radius.chip,
    paddingHorizontal: space.s10,
    paddingVertical: space.s4,
  },
  tagText: { ...textStyle('label'), color: colors.night },
  clue: { ...textStyle('title'), color: colors.night, textAlign: 'center' },
  answer: { ...textStyle('bodyMedium'), color: colors.violet, textAlign: 'center' },
  glow: {
    position: 'absolute',
    backgroundColor: colors.sunny,
    boxShadow: `0 0 18px ${colors.sunny}`,
  },
  badge: {
    position: 'absolute',
    minWidth: BADGE,
    height: BADGE,
    borderRadius: radius.full,
    backgroundColor: colors.sunny,
    borderWidth: 2,
    borderColor: colors.night,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space.s8,
    maxWidth: AREA,
  },
  badgeQ: { ...textStyle('button'), color: colors.night },
  badgeTerm: { ...textStyle('chip'), color: colors.night },
});
