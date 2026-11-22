import { errorCopy } from '@/shared/speech';
import type { RoundContext } from './machine/roundMachine';
import type { RoundPhase } from './machine/roundView';

/**
 * Pip's speech bubble, derived from the round state (docs/SCREENS.md → Play states).
 * Voice: a smart older classmate. Short, specific, never "Wrong" (BRAND.md).
 */
export type BubbleContent = {
  title: string;
  sub?: string;
  /** The clue, shown after the clue hint (picture terms). */
  clue?: string;
  /**
   * What was heard (or typed): live while listening, then marked by the verdict.
   * BRAND.md: told apart by border style and colour (dashed lilac / coral / sunny).
   */
  heard?: { state: 'live' | 'miss' | 'hit'; label: 'Heard' | 'Typed'; text: string };
  /** Syllables for the pronunciation button, after a close or wrong answer. */
  pronunciation?: string;
};

export function bubbleFor(phase: RoundPhase, c: RoundContext): BubbleContent {
  const term = c.terms[c.index];
  if (!term) return { title: '' };
  const hasPicture = !!term.picture;
  const answer = c.pending?.alternatives[0] ?? '';
  const label = c.pending?.inputMode === 'typed' ? 'Typed' : 'Heard';
  const heard = (state: 'miss' | 'hit') =>
    answer ? { heard: { state, label, text: answer } as const } : {};

  switch (phase) {
    case 'idle':
      return {
        title: hasPicture ? 'Name the glowing part' : 'Name the term',
        sub: c.speechError ? errorCopy(c.speechError.code) : 'Tap the mic and say the term.',
        ...(hasPicture && c.clueShown ? { clue: term.clue } : {}),
      };
    case 'listening':
      return {
        title: 'Listening…',
        sub: 'Say the term. I stop when you pause.',
        heard: { state: 'live', label: 'Heard', text: c.partial || '…' },
      };
    case 'evaluating':
      return {
        title: 'Listening…',
        heard: { state: 'live', label, text: answer },
      };
    case 'typing':
      return { title: 'Type the term', sub: 'Spelling counts.' };
    case 'close':
    case 'wrong':
      return {
        title: c.lastResult?.feedback ?? 'Not quite. Have another go.',
        sub: 'Hear it, then try again.',
        ...heard('miss'),
        pronunciation: term.syllables,
      };
    case 'correct':
      return {
        title: `${term.display}. Nailed it.`,
        sub: `+${c.lastXp}${c.streak >= 2 ? ` · ${c.streak} in a row` : ''}`,
        ...heard('hit'),
      };
    case 'revealed':
      return {
        title: `It's ${term.display}.`,
        sub: "That was your last life. Let's see how you did.",
        ...heard('miss'),
        pronunciation: term.syllables,
      };
    case 'done':
      return { title: 'Round done.' };
  }
}

/** Label under the mic button. */
export function micLabel(phase: RoundPhase): string {
  switch (phase) {
    case 'listening':
      return 'Tap to stop';
    case 'evaluating':
      return 'Checking…';
    case 'close':
    case 'wrong':
      return 'Try again';
    default:
      return 'Tap to speak';
  }
}
