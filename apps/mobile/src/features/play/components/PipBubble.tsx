import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Pip, type PipMood } from '@/shared/mascot';
import { SpeakerIcon } from '@/shared/ui/icons';
import { colors, elevation, radius, sizes, space, surfaces, textStyle } from '@/theme';
import type { BubbleContent } from '../copy';

type Props = {
  mood: PipMood;
  bubble: BubbleContent;
  /** Pronunciation audio arrives with Phase 4 (TTS clips); until then the button shows syllables. */
  onPronounce?: () => void;
};

const TAIL = 18;

/**
 * Pip + speech bubble (BRAND.md → Pip speech bubble): white, radius 22, tail pointing at Pip.
 * Holds a title, then sub-text or the clue, then a "Heard" chip. The bubble is a live region
 * so screen readers announce feedback; Pip is decorative next to it.
 */
export function PipBubble({ mood, bubble, onPronounce }: Props) {
  const heard = bubble.heard;
  return (
    <View style={styles.row}>
      <Pip mood={mood} size={sizes.pip.play} />
      <View style={styles.bubble} accessibilityLiveRegion="polite" accessible>
        <View style={styles.tail} />
        <Text style={styles.title}>{bubble.title}</Text>
        {bubble.clue ? (
          <View style={styles.clueRow}>
            <Text style={styles.clueTag}>CLUE</Text>
            <Text style={styles.clueText}>{bubble.clue}</Text>
          </View>
        ) : bubble.sub ? (
          <Text style={styles.sub}>{bubble.sub}</Text>
        ) : null}
        {heard || bubble.pronunciation ? (
          <View style={styles.heardRow}>
            {heard ? (
              <View
                style={[
                  styles.heard,
                  heard.state === 'live' && styles.heardLive,
                  heard.state === 'miss' && styles.heardMiss,
                  heard.state === 'hit' && styles.heardHit,
                ]}
              >
                <Text style={styles.heardLabel}>{heard.label.toUpperCase()}</Text>
                <Text style={styles.heardText}>{heard.text}</Text>
              </View>
            ) : null}
            {bubble.pronunciation ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Hear it pronounced: ${bubble.pronunciation}`}
                accessibilityState={{ disabled: !onPronounce }}
                disabled={!onPronounce}
                onPress={onPronounce}
                style={styles.pronounce}
              >
                <SpeakerIcon color={colors.white} />
                <Text style={styles.pronounceText}>{bubble.pronunciation}</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: space.s6 },
  bubble: {
    flex: 1,
    minWidth: 0,
    marginBottom: space.s14,
    backgroundColor: colors.white,
    borderRadius: radius.bubble,
    paddingHorizontal: space.s14,
    paddingVertical: space.s12,
    gap: space.s6,
    boxShadow: `0 ${elevation.card.offsetY - 2}px ${elevation.card.blur - 4}px ${surfaces.cardShadow}`,
  },
  // A rotated square at the bubble's bottom-left, pointing at Pip.
  tail: {
    position: 'absolute',
    left: -TAIL / 2 + 1,
    bottom: space.s20,
    width: TAIL,
    height: TAIL,
    borderRadius: 3,
    backgroundColor: colors.white,
    transform: [{ rotate: '45deg' }],
  },
  title: { ...textStyle('title'), color: colors.night },
  sub: { ...textStyle('body'), color: colors.ink2 },
  clueRow: { flexDirection: 'row', alignItems: 'flex-start', gap: space.s6 },
  clueTag: {
    ...textStyle('label'),
    color: colors.sunnyInk,
    backgroundColor: colors.sunnyTint,
    borderRadius: radius.tile - 4,
    paddingHorizontal: space.s6,
    overflow: 'hidden',
  },
  clueText: { ...textStyle('body'), color: colors.night, flex: 1 },
  heardRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: space.s6 },
  heard: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: space.s8,
    backgroundColor: colors.violetTint,
    borderRadius: radius.tile,
    borderWidth: 2,
    borderColor: 'transparent',
    paddingHorizontal: space.s10,
    paddingVertical: space.s6,
    maxWidth: '100%',
  },
  heardLive: { borderStyle: 'dashed', borderColor: colors.lilacLine },
  heardMiss: { borderColor: colors.coral },
  heardHit: { borderColor: colors.sunny },
  heardLabel: { ...textStyle('label'), color: colors.ink2 },
  heardText: { ...textStyle('bodyMedium'), color: colors.night, flexShrink: 1 },
  pronounce: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.s6,
    minHeight: sizes.minTouch,
    paddingHorizontal: space.s10,
    borderRadius: radius.tile,
    backgroundColor: colors.violet,
  },
  pronounceText: { ...textStyle('chip'), color: colors.white },
});
