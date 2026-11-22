import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Pip, type PipMood } from '@/shared/mascot';
import { SpeakerIcon } from '@/shared/ui/icons';
import { colors, radius, sizes, space, textStyle } from '@/theme';
import type { BubbleContent } from '../copy';

type Props = {
  mood: PipMood;
  bubble: BubbleContent;
  /** Pronunciation audio arrives with Phase 4 (TTS clips); until then the chip is display-only. */
  onPronounce?: () => void;
};

/**
 * Pip + speech bubble (BRAND.md → Pip speech bubble): white, radius 22, tail pointing at Pip.
 * Holds a title, then sub-text or the clue chip, then a "Heard" chip. The bubble is a live
 * region so screen readers announce feedback; Pip is decorative next to it.
 */
export function PipBubble({ mood, bubble, onPronounce }: Props) {
  return (
    <View style={styles.row}>
      <Pip mood={mood} size={sizes.pip.play} />
      <View style={styles.bubbleWrap}>
        <View style={styles.tail} />
        <View style={styles.bubble} accessibilityLiveRegion="polite" accessible>
          <Text style={styles.title}>{bubble.title}</Text>
          {bubble.sub ? <Text style={styles.sub}>{bubble.sub}</Text> : null}
          {bubble.chip ? (
            <View
              style={[
                styles.chip,
                bubble.chip.kind === 'heard' && styles.chipHeard,
                bubble.chip.kind === 'miss' && styles.chipMiss,
                bubble.chip.kind === 'clue' && styles.chipClue,
              ]}
            >
              <Text style={styles.chipText}>
                {bubble.chip.kind === 'heard' ? `Heard: ${bubble.chip.text}` : bubble.chip.text}
              </Text>
            </View>
          ) : null}
          {bubble.pronunciation ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Pronunciation: ${bubble.pronunciation}`}
              accessibilityState={{ disabled: !onPronounce }}
              disabled={!onPronounce}
              onPress={onPronounce}
              style={styles.pronounce}
            >
              <SpeakerIcon color={colors.violet} />
              <Text style={styles.pronounceText}>{bubble.pronunciation}</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const TAIL = space.s12;

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.s4 },
  bubbleWrap: { flex: 1, justifyContent: 'center' },
  // A rotated square peeking out of the bubble's left edge, pointing at Pip.
  tail: {
    position: 'absolute',
    left: -TAIL / 2 + 1,
    top: '50%',
    marginTop: -TAIL / 2,
    width: TAIL,
    height: TAIL,
    backgroundColor: colors.white,
    transform: [{ rotate: '45deg' }],
  },
  bubble: {
    backgroundColor: colors.white,
    borderRadius: radius.bubble,
    padding: space.s14,
    gap: space.s6,
  },
  title: { ...textStyle('title'), color: colors.night },
  sub: { ...textStyle('body'), color: colors.ink2 },
  chip: {
    alignSelf: 'flex-start',
    borderRadius: radius.chip,
    paddingHorizontal: space.s10,
    paddingVertical: space.s6,
  },
  chipHeard: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.lilacLine,
    backgroundColor: colors.lilac,
  },
  chipMiss: { backgroundColor: colors.coral },
  chipClue: { backgroundColor: colors.lilac },
  chipText: { ...textStyle('chip'), color: colors.night },
  pronounce: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.s6,
    minHeight: sizes.minTouch,
    paddingHorizontal: space.s12,
    borderRadius: radius.chip,
    backgroundColor: colors.lilac,
  },
  pronounceText: { ...textStyle('bodyMedium'), color: colors.violet },
});
