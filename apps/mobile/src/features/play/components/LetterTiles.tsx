import { useEffect, useState } from 'react';
import { StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { colors, elevation, motion, radius, sizes, space, surfaces, textStyle } from '@/theme';
import type { Tile } from '../machine/roundView';

type Props = {
  tiles: Tile[];
  /** Changes on every miss: triggers the shake. */
  missKey: number;
};

type LetterTile = Extract<Tile, { kind: 'letter' }>;

/**
 * Letter tiles (BRAND.md → Letter tiles): hidden = glass, revealed = white,
 * correct = sunny popping in one by one. Shake on a miss. Words wrap as units;
 * tiles shrink so the longest word fits the width.
 */
export function LetterTiles({ tiles, missKey }: Props) {
  const reduced = useReducedMotion();
  const [width, setWidth] = useState(0);
  const words = splitWords(tiles);
  const longest = Math.max(1, ...words.map((w) => w.length));
  const fit = width ? (width - sizes.tileGap * (longest - 1)) / longest : sizes.tileWidth;
  const tileW = Math.min(sizes.tileWidth, fit);
  const tileH = tileW * (sizes.tileHeight / sizes.tileWidth);

  // Shake on a miss (a fade with Reduce Motion).
  const shakeX = useSharedValue(0);
  const dim = useSharedValue(1);
  useEffect(() => {
    if (missKey === 0) return;
    if (reduced) {
      dim.value = withSequence(
        withTiming(0.5, { duration: motion.fade.duration }),
        withTiming(1, { duration: motion.fade.duration }),
      );
      return;
    }
    const step = motion.shake.duration / 4;
    const d = motion.shake.distance;
    shakeX.value = withRepeat(
      withSequence(
        withTiming(-d, { duration: step }),
        withTiming(d, { duration: step * 2 }),
        withTiming(0, { duration: step }),
      ),
      motion.shake.repeat,
    );
  }, [missKey, reduced, shakeX, dim]);
  const rowStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shakeX.value }],
    opacity: dim.value,
  }));

  let letterIndex = 0;
  return (
    <Animated.View
      onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}
      style={[styles.wrap, rowStyle]}
      accessible
      accessibilityLabel={describe(tiles)}
    >
      {words.map((word, w) => (
        <View key={w} style={styles.word}>
          {word.map((tile) => {
            const i = letterIndex++;
            return <TileView key={i} tile={tile} index={i} w={tileW} h={tileH} />;
          })}
        </View>
      ))}
    </Animated.View>
  );
}

function TileView({
  tile,
  index,
  w,
  h,
}: {
  tile: LetterTile;
  index: number;
  w: number;
  h: number;
}) {
  const reduced = useReducedMotion();
  const scale = useSharedValue(1);
  const rotate = useSharedValue(0);
  const opacity = useSharedValue(1);

  // Pop in one by one when solved (a fade with Reduce Motion).
  useEffect(() => {
    if (tile.state !== 'correct') return;
    const delay = index * motion.pop.stagger;
    if (reduced) {
      opacity.value = 0;
      opacity.value = withDelay(delay, withTiming(1, { duration: motion.fade.duration }));
      return;
    }
    const third = motion.pop.duration / 3;
    scale.value = motion.pop.scaleFrom;
    scale.value = withDelay(
      delay,
      withSequence(
        withTiming(motion.pop.overshoot, { duration: third * 2 }),
        withTiming(1, { duration: third }),
      ),
    );
    rotate.value = withDelay(
      delay,
      withSequence(
        withTiming(motion.pop.rotate, { duration: third }),
        withTiming(0, { duration: third * 2 }),
      ),
    );
  }, [tile.state, index, reduced, scale, rotate, opacity]);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }, { rotate: `${rotate.value}deg` }],
  }));

  return (
    <Animated.View
      style={[
        styles.tile,
        { width: w, height: h },
        tile.state === 'hidden' && styles.hidden,
        tile.state === 'revealed' && styles.revealed,
        tile.state === 'correct' && styles.correct,
        style,
      ]}
    >
      <Text
        style={[styles.letter, { fontSize: textStyle('tile').fontSize! * (w / sizes.tileWidth) }]}
      >
        {tile.char}
      </Text>
    </Animated.View>
  );
}

function splitWords(tiles: Tile[]): LetterTile[][] {
  const words: LetterTile[][] = [[]];
  for (const t of tiles) {
    if (t.kind === 'gap') words.push([]);
    else words[words.length - 1]!.push(t);
  }
  return words.filter((w) => w.length);
}

/** Screen reader text, e.g. "Answer: N, then 6 hidden letters". */
function describe(tiles: Tile[]): string {
  const letters = tiles.filter((t): t is LetterTile => t.kind === 'letter');
  const shown = letters.filter((t) => t.state !== 'hidden').map((t) => t.char);
  const hidden = letters.length - shown.length;
  if (!hidden) return `Answer: ${shown.join('')}`;
  return `Answer: ${shown.join(', ') || 'no letters yet'}, then ${hidden} hidden ${hidden === 1 ? 'letter' : 'letters'}`;
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    rowGap: space.s8,
    columnGap: space.s16,
  },
  word: { flexDirection: 'row', gap: sizes.tileGap },
  tile: { borderRadius: radius.tile, alignItems: 'center', justifyContent: 'center' },
  hidden: { backgroundColor: surfaces.glass, borderWidth: 2, borderColor: surfaces.glassBorder },
  revealed: {
    backgroundColor: colors.white,
    boxShadow: `0 ${elevation.tile.offsetY}px 0 ${colors.lilacLine}`,
  },
  correct: {
    backgroundColor: colors.sunny,
    boxShadow: `0 ${elevation.tile.offsetY}px 0 ${colors.sunnyShadow}`,
  },
  letter: { ...textStyle('tile'), color: colors.night },
});
