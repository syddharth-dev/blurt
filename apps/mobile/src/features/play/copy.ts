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
  /** clue: the term's clue · heard: live/final transcript · miss: what was heard on a miss */
  chip?: { kind: 'clue' | 'heard' | 'miss'; text: string };
  /** Syllables for the pronunciation button, after a close or wrong answer. */
  pronunciation?: string;
};

export function bubbleFor(phase: RoundPhase, c: RoundContext): BubbleContent {
  const term = c.terms[c.index];
  if (!term) return { title: '' };
  const hasPicture = !!term.picture;
  const heard = c.pending?.alternatives[0] ?? '';
  const heardLabel = c.pending?.inputMode === 'typed' ? 'Typed' : 'Heard';

  switch (phase) {
    case 'idle': {
      const clueChip =
        hasPicture && c.clueShown ? { kind: 'clue' as const, text: term.clue } : undefined;
      return {
        title: hasPicture ? 'Name the glowing part' : 'Name the term',
        sub: c.speechError ? errorCopy(c.speechError.code) : 'Tap the mic and say the term.',
        chip: clueChip,
      };
    }
    case 'listening':
      return { title: 'Listening…', chip: { kind: 'heard', text: c.partial || '…' } };
    case 'evaluating':
      return { title: 'Listening…', chip: { kind: 'heard', text: heard } };
    case 'typing':
      return { title: 'Type the term', sub: 'Spelling counts.' };
    case 'close':
    case 'wrong':
      return {
        title: c.lastResult?.feedback ?? 'Not quite. Have another go.',
        sub: livesLine(c.lives),
        chip: heard ? { kind: 'miss', text: `${heardLabel}: ${heard}` } : undefined,
        pronunciation: term.syllables,
      };
    case 'correct':
      return {
        title: `${term.display}. Nailed it.`,
        sub: `+${c.lastXp}${c.streak >= 2 ? ` · ${c.streak} in a row` : ''}`,
      };
    case 'revealed':
      return {
        title: `It's ${term.display}.`,
        sub: "That was your last life. Let's see how you did.",
        chip: heard ? { kind: 'miss', text: `${heardLabel}: ${heard}` } : undefined,
        pronunciation: term.syllables,
      };
    case 'done':
      return { title: 'Round done.' };
  }
}

function livesLine(lives: number): string {
  return lives === 1 ? 'One life left.' : `${lives} lives left.`;
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
