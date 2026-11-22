import type { ContentTerm } from '@blurt/shared/content';
import { matchAnswer, type MatchResult } from '@blurt/shared/matcher';
import { ROUND_RULES, xpFor } from '@blurt/shared/progress';
import type { InputMode } from '@blurt/shared/schemas';
import { assign, fromPromise, setup } from 'xstate';
import type { SpeechError } from '@/shared/speech';

/**
 * The round state machine (docs/ARCHITECTURE.md → "Round state machine").
 * Everything on the Play screen (Pip's mood, mic look, bubble copy, tiles) is derived
 * from this machine's state; no component keeps its own copy.
 *
 * Side effects are injectable with `roundMachine.provide(...)`:
 * - actions `startListening` / `stopListening` / `abortListening` drive the recognizer;
 * - actor `evaluateAnswer` judges an answer. Phase 2 uses the shared matcher locally;
 *   Phase 3 swaps in the API call, where the server's verdict is authoritative (AGENTS.md rule 3).
 */

/** Lives, hints, skips and round length: shared with the server (@blurt/shared/progress). */
export const ROUND_CONFIG = ROUND_RULES;

export { xpFor };

export type RoundConfig = { lives: number; hints: number; skips: number };

export type TermOutcome = 'first-try' | 'assisted' | 'missed' | 'skipped';

export type TermResult = {
  termId: string;
  display: string;
  outcome: TermOutcome;
  xp: number;
  hintsUsed: number;
  /** Every answer given for this term, as heard (first alternative) or typed. */
  heard: string[];
};

export type RoundSummary = {
  score: number;
  bestStreak: number;
  livesLeft: number;
  endedBy: 'complete' | 'out-of-lives' | 'quit';
  results: TermResult[];
};

export type RoundContext = {
  terms: readonly ContentTerm[];
  index: number;
  lives: number;
  hintsLeft: number;
  skipsLeft: number;
  score: number;
  streak: number;
  bestStreak: number;
  results: TermResult[];
  // Current term
  clueShown: boolean;
  /** Letters shown on the tiles. The first letter is revealed by default. */
  revealedLetters: number;
  hintsOnTerm: number;
  missesOnTerm: number;
  heardOnTerm: string[];
  // Current answer
  partial: string;
  pending: { alternatives: string[]; inputMode: InputMode } | null;
  lastResult: MatchResult | null;
  lastXp: number;
  speechError: SpeechError | null;
  endedBy: RoundSummary['endedBy'] | null;
};

export type RoundEvent =
  | { type: 'TAP_MIC' }
  | { type: 'PARTIAL'; text: string }
  | { type: 'FINAL'; alternatives: string[] }
  | { type: 'SPEECH_ERROR'; error: SpeechError }
  | { type: 'TYPE_INSTEAD' }
  | { type: 'SUBMIT'; text: string }
  | { type: 'CANCEL' }
  | { type: 'HINT' }
  | { type: 'SKIP' }
  | { type: 'NEXT' }
  | { type: 'QUIT' };

export type RoundInput = { terms: readonly ContentTerm[]; config?: Partial<RoundConfig> };

export type EvaluateInput = {
  term: ContentTerm;
  alternatives: string[];
  inputMode: InputMode;
};

/** Number of letters on the tiles (spaces and punctuation aren't tiles). */
export function letterCount(term: ContentTerm): number {
  return term.display.replace(/[^\p{L}\p{N}]/gu, '').length;
}

/** Terms without a picture show their clue on the card from the start. */
export function startsWithClue(term: ContentTerm | undefined): boolean {
  return !term?.picture;
}

function freshTerm(term: ContentTerm | undefined) {
  return {
    clueShown: startsWithClue(term),
    revealedLetters: 1,
    hintsOnTerm: 0,
    missesOnTerm: 0,
    heardOnTerm: [] as string[],
    partial: '',
    pending: null,
    lastResult: null,
    lastXp: 0,
    speechError: null,
  } satisfies Partial<RoundContext>;
}

const current = (c: RoundContext) => c.terms[c.index];

export const roundMachine = setup({
  types: {
    context: {} as RoundContext,
    events: {} as RoundEvent,
    input: {} as RoundInput,
    output: {} as RoundSummary,
  },
  actors: {
    evaluateAnswer: fromPromise<MatchResult, EvaluateInput>(async ({ input }) =>
      matchAnswer(input.term, input.alternatives, { inputMode: input.inputMode }),
    ),
  },
  actions: {
    // Provided by the Play screen; no-ops here so the machine runs in tests.
    startListening: () => {},
    stopListening: () => {},
    abortListening: () => {},

    useHint: assign(({ context: c }) =>
      c.clueShown
        ? {
            revealedLetters: c.revealedLetters + 1,
            hintsLeft: c.hintsLeft - 1,
            hintsOnTerm: c.hintsOnTerm + 1,
          }
        : { clueShown: true, hintsLeft: c.hintsLeft - 1, hintsOnTerm: c.hintsOnTerm + 1 },
    ),
    recordTerm: assign(
      ({ context: c }, params: { outcome: Exclude<TermOutcome, 'first-try' | 'assisted'> }) => {
        const term = current(c);
        if (!term) return {};
        return {
          streak: 0,
          results: [
            ...c.results,
            {
              termId: term.id,
              display: term.display,
              outcome: params.outcome,
              xp: 0,
              hintsUsed: c.hintsOnTerm,
              heard: c.heardOnTerm,
            },
          ],
        };
      },
    ),
    nextTerm: assign(({ context: c }) => ({
      ...freshTerm(c.terms[c.index + 1]),
      index: c.index + 1,
    })),
    spendSkip: assign(({ context: c }) => ({ skipsLeft: c.skipsLeft - 1 })),
  },
  guards: {
    canHint: ({ context: c }) => {
      const term = current(c);
      if (!term || c.hintsLeft <= 0) return false;
      // Never reveal the whole word: keep at least one letter hidden.
      return !c.clueShown || c.revealedLetters < letterCount(term) - 1;
    },
    canSkip: ({ context: c }) => c.skipsLeft > 0,
    hasText: (_, params: { text: string }) => params.text.trim().length > 0,
    hasAlternatives: (_, params: { alternatives: string[] }) =>
      params.alternatives.some((a) => a.trim()),
    noLivesLeft: ({ context: c }) => c.lives <= 0,
    roundComplete: ({ context: c }) => c.index + 1 >= c.terms.length,
  },
}).createMachine({
  id: 'round',
  context: ({ input }) => {
    const config = { ...ROUND_CONFIG, ...input.config };
    return {
      terms: input.terms,
      index: 0,
      lives: config.lives,
      hintsLeft: config.hints,
      skipsLeft: config.skips,
      score: 0,
      streak: 0,
      bestStreak: 0,
      results: [],
      endedBy: null,
      ...freshTerm(input.terms[0]),
    };
  },
  initial: 'idle',
  on: {
    QUIT: {
      target: '.done',
      actions: ['abortListening', assign({ endedBy: 'quit' })],
    },
  },
  states: {
    idle: {
      on: {
        TAP_MIC: 'listening',
        TYPE_INSTEAD: 'typing',
        HINT: { guard: 'canHint', actions: 'useHint' },
        SKIP: {
          guard: 'canSkip',
          target: 'advancing',
          actions: [{ type: 'recordTerm', params: { outcome: 'skipped' } }, 'spendSkip'],
        },
      },
    },

    listening: {
      entry: [assign({ partial: '', speechError: null, lastResult: null }), 'startListening'],
      on: {
        PARTIAL: { actions: assign({ partial: ({ event }) => event.text }) },
        // Ask the recognizer to stop; its FINAL (or an error) moves us on.
        TAP_MIC: { actions: 'stopListening' },
        FINAL: [
          {
            guard: { type: 'hasAlternatives', params: ({ event }) => event },
            target: 'evaluating',
            actions: assign({
              pending: ({ event }) => ({ alternatives: event.alternatives, inputMode: 'voice' }),
            }),
          },
          {
            target: 'idle',
            actions: assign({ speechError: { code: 'no-speech', message: 'Empty result' } }),
          },
        ],
        SPEECH_ERROR: [
          // Our own abort (e.g. switching to typing) is not something to show.
          { guard: ({ event }) => event.error.code === 'aborted', target: 'idle' },
          { target: 'idle', actions: assign({ speechError: ({ event }) => event.error }) },
        ],
        TYPE_INSTEAD: { target: 'typing', actions: 'abortListening' },
      },
    },

    typing: {
      entry: assign({ speechError: null }),
      on: {
        SUBMIT: {
          guard: { type: 'hasText', params: ({ event }) => event },
          target: 'evaluating',
          actions: assign({
            pending: ({ event }) => ({ alternatives: [event.text], inputMode: 'typed' }),
          }),
        },
        CANCEL: 'idle',
      },
    },

    evaluating: {
      invoke: {
        src: 'evaluateAnswer',
        input: ({ context: c }) => ({
          term: current(c)!,
          alternatives: c.pending?.alternatives ?? [],
          inputMode: c.pending?.inputMode ?? 'voice',
        }),
        onDone: [
          {
            guard: ({ event }) => event.output.verdict === 'correct',
            target: 'correct',
            actions: assign(({ context: c, event }) => {
              const term = current(c)!;
              const firstTry = c.hintsOnTerm === 0 && c.missesOnTerm === 0;
              const xp = xpFor(c.hintsOnTerm, c.missesOnTerm);
              const streak = firstTry ? c.streak + 1 : 0;
              const heard = [...c.heardOnTerm, c.pending?.alternatives[0] ?? ''];
              return {
                lastResult: event.output,
                lastXp: xp,
                score: c.score + xp,
                streak,
                bestStreak: Math.max(c.bestStreak, streak),
                revealedLetters: letterCount(term),
                heardOnTerm: heard,
                results: [
                  ...c.results,
                  {
                    termId: term.id,
                    display: term.display,
                    outcome: firstTry ? ('first-try' as const) : ('assisted' as const),
                    xp,
                    hintsUsed: c.hintsOnTerm,
                    heard,
                  },
                ],
              };
            }),
          },
          {
            target: 'missed',
            actions: assign(({ context: c, event }) => ({
              lastResult: event.output,
              lives: c.lives - 1,
              missesOnTerm: c.missesOnTerm + 1,
              streak: 0,
              heardOnTerm: [...c.heardOnTerm, c.pending?.alternatives[0] ?? ''],
            })),
          },
        ],
        onError: {
          target: 'idle',
          actions: assign({
            speechError: { code: 'unknown', message: "Couldn't check that answer" },
          }),
        },
      },
    },

    /** Routes a miss: out of lives → revealed, otherwise close or wrong. */
    missed: {
      always: [
        { guard: 'noLivesLeft', target: 'revealed' },
        { guard: ({ context }) => context.lastResult?.verdict === 'close', target: 'close' },
        { target: 'wrong' },
      ],
    },

    correct: {
      on: { NEXT: 'advancing' },
    },

    close: {
      // After a close or wrong answer: retry, type, take a hint or skip.
      on: {
        TAP_MIC: 'listening',
        TYPE_INSTEAD: 'typing',
        HINT: { guard: 'canHint', actions: 'useHint' },
        SKIP: {
          guard: 'canSkip',
          target: 'advancing',
          actions: [{ type: 'recordTerm', params: { outcome: 'skipped' } }, 'spendSkip'],
        },
      },
    },
    wrong: {
      on: {
        TAP_MIC: 'listening',
        TYPE_INSTEAD: 'typing',
        HINT: { guard: 'canHint', actions: 'useHint' },
        SKIP: {
          guard: 'canSkip',
          target: 'advancing',
          actions: [{ type: 'recordTerm', params: { outcome: 'skipped' } }, 'spendSkip'],
        },
      },
    },

    /** Out of lives: show the answer, then the round ends. */
    revealed: {
      entry: [
        { type: 'recordTerm', params: { outcome: 'missed' } },
        assign(({ context: c }) => ({ revealedLetters: letterCount(current(c)!) })),
      ],
      on: { NEXT: { target: 'done', actions: assign({ endedBy: 'out-of-lives' }) } },
    },

    advancing: {
      always: [
        { guard: 'roundComplete', target: 'done', actions: assign({ endedBy: 'complete' }) },
        { target: 'idle', actions: 'nextTerm' },
      ],
    },

    done: { type: 'final' },
  },
  output: ({ context: c }) => ({
    score: c.score,
    bestStreak: c.bestStreak,
    livesLeft: c.lives,
    endedBy: c.endedBy ?? 'complete',
    results: c.results,
  }),
});
