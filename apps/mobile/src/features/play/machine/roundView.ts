import type { SnapshotFrom } from 'xstate';
import { letterCount, type RoundContext, type roundMachine } from './roundMachine';

/** Pure view helpers: everything the Play screen shows is derived from the machine. */

export type RoundPhase =
  | 'idle'
  | 'listening'
  | 'typing'
  | 'evaluating'
  | 'correct'
  | 'close'
  | 'wrong'
  | 'revealed'
  | 'done';

export function phaseOf(snapshot: SnapshotFrom<typeof roundMachine>): RoundPhase {
  return snapshot.value as RoundPhase;
}

export type Tile =
  { kind: 'letter'; char: string; state: 'hidden' | 'revealed' | 'correct' } | { kind: 'gap' };

/** One tile per letter; spaces become gaps. Hidden tiles carry no character. */
export function tilesFor(context: RoundContext, phase: RoundPhase): Tile[] {
  const term = context.terms[context.index];
  if (!term) return [];
  const solved = phase === 'correct';
  let letterIndex = 0;
  return [...term.display].map((ch): Tile => {
    if (!/[\p{L}\p{N}]/u.test(ch)) return { kind: 'gap' };
    const shown = letterIndex < context.revealedLetters;
    letterIndex++;
    if (solved) return { kind: 'letter', char: ch.toUpperCase(), state: 'correct' };
    return shown
      ? { kind: 'letter', char: ch.toUpperCase(), state: 'revealed' }
      : { kind: 'letter', char: '', state: 'hidden' };
  });
}

/** What the next Hint press gives ("Clue" → "Letter"), or null when none is left. */
export function nextHint(context: RoundContext): 'clue' | 'letter' | null {
  const term = context.terms[context.index];
  if (!term || context.hintsLeft <= 0) return null;
  if (!context.clueShown) return 'clue';
  return context.revealedLetters < letterCount(term) - 1 ? 'letter' : null;
}

/** "3 / 10" in the HUD (1-based). */
export function progressLabel(context: RoundContext): string {
  return `${Math.min(context.index + 1, context.terms.length)} / ${context.terms.length}`;
}
