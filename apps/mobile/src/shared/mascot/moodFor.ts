import type { PipMood } from './pipMoods';

/**
 * Pip's mood is derived from the round state, never set by hand
 * (AGENTS.md rule 2, docs/MASCOT.md → "Mood mapping").
 */
export function moodFor(roundState: string): PipMood {
  switch (roundState) {
    case 'listening':
    case 'evaluating':
      return 'listening';
    case 'close':
    case 'wrong':
    case 'revealed':
      return 'oops';
    case 'correct':
    case 'done':
      return 'celebrate';
    default:
      return 'idle';
  }
}
