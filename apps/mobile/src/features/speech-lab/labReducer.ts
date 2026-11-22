import { matchAnswer, type MatchResult } from '@blurt/shared/matcher';
import type { ContentTerm } from '@blurt/shared/content';
import type { InputMode } from '@blurt/shared/schemas';
import type { SpeechError, StartOptions } from '@/shared/speech';

export { errorCopy } from '@/shared/speech';

/**
 * State for the Speech lab (ROADMAP Phase 1 spike). Matching here is a local preview;
 * from Phase 3 the server's verdict is authoritative (AGENTS.md rule 3).
 * The real round state machine (XState) replaces this in Phase 2.
 */
export type LabSettings = Required<Pick<StartOptions, 'lang' | 'onDevice' | 'androidModel'>>;

export type LabAttempt = {
  termId: string;
  display: string;
  inputMode: InputMode;
  heard: string[];
  verdict: MatchResult['verdict'];
  strategy: MatchResult['strategy'];
  ms: number;
};

export type LabState = {
  index: number;
  showAnswer: boolean;
  status: 'idle' | 'listening';
  startedAt: number | null;
  partial: string;
  /** Last answer: what was heard and how each alternative matched. */
  heard: { text: string; result: MatchResult }[];
  result: MatchResult | null;
  inputMode: InputMode;
  error: SpeechError | null;
  settings: LabSettings;
  log: LabAttempt[];
};

export type LabAction =
  | { type: 'START'; at: number }
  | { type: 'PARTIAL'; text: string }
  | { type: 'ANSWER'; alternatives: string[]; inputMode: InputMode; at: number }
  | { type: 'ERROR'; error: SpeechError }
  | { type: 'END' }
  | { type: 'GO'; delta: number }
  | { type: 'TOGGLE_ANSWER' }
  | { type: 'SETTINGS'; patch: Partial<LabSettings> };

export function initialLabState(settings?: Partial<LabSettings>): LabState {
  return {
    index: 0,
    showAnswer: false,
    status: 'idle',
    startedAt: null,
    partial: '',
    heard: [],
    result: null,
    inputMode: 'voice',
    error: null,
    settings: { lang: 'en-US', onDevice: true, androidModel: 'web_search', ...settings },
    log: [],
  };
}

const clearAnswer = {
  partial: '',
  heard: [],
  result: null,
  error: null,
} satisfies Partial<LabState>;

export function labReducer(
  terms: readonly ContentTerm[],
): (state: LabState, action: LabAction) => LabState {
  return (state, action) => {
    switch (action.type) {
      case 'START':
        return { ...state, ...clearAnswer, status: 'listening', startedAt: action.at };

      case 'PARTIAL':
        return state.status === 'listening' ? { ...state, partial: action.text } : state;

      case 'ANSWER': {
        const term = terms[state.index];
        if (!term) return state;
        const opts = { inputMode: action.inputMode };
        const result = matchAnswer(term, action.alternatives, opts);
        const attempt: LabAttempt = {
          termId: term.id,
          display: term.display,
          inputMode: action.inputMode,
          heard: action.alternatives,
          verdict: result.verdict,
          strategy: result.strategy,
          ms: state.startedAt === null ? 0 : action.at - state.startedAt,
        };
        return {
          ...state,
          status: 'idle',
          startedAt: null,
          partial: '',
          error: null,
          inputMode: action.inputMode,
          heard: action.alternatives.map((text) => ({
            text,
            result: matchAnswer(term, [text], opts),
          })),
          result,
          log: [...state.log, attempt],
        };
      }

      case 'ERROR':
        // Aborts are our own doing (leaving the screen, switching terms): not an error to show.
        if (action.error.code === 'aborted') return { ...state, status: 'idle', partial: '' };
        return { ...state, status: 'idle', partial: '', error: action.error };

      case 'END':
        // Session closed without a final result or error: treat as "didn't catch that".
        if (state.status !== 'listening') return state;
        return {
          ...state,
          status: 'idle',
          partial: '',
          error: { code: 'no-speech', message: 'Ended without a result' },
        };

      case 'GO': {
        const n = terms.length;
        if (!n) return state;
        const index = (((state.index + action.delta) % n) + n) % n;
        return { ...state, ...clearAnswer, index, showAnswer: false, status: 'idle' };
      }

      case 'TOGGLE_ANSWER':
        return { ...state, showAnswer: !state.showAnswer };

      case 'SETTINGS':
        return { ...state, settings: { ...state.settings, ...action.patch } };
    }
  };
}

/** Headline for a verdict, in Pip's voice. Never "Wrong". */
export function verdictCopy(term: ContentTerm, result: MatchResult): string {
  if (result.verdict === 'correct') return `${term.display}. Nailed it.`;
  return result.feedback ?? 'Not quite. Have another go.';
}

/** Plain-text session log, for sharing results after testing with students. */
export function logAsText(log: readonly LabAttempt[], settings: LabSettings): string {
  const correct = log.filter((a) => a.verdict === 'correct').length;
  const lines = log.map(
    (a, i) =>
      `${i + 1}. ${a.display} [${a.inputMode}] → ${a.verdict} (${a.strategy}, ${a.ms} ms) heard: ${a.heard
        .map((h) => `"${h}"`)
        .join(', ')}`,
  );
  return [
    `Blurt! speech lab · ${settings.lang} · on-device ${settings.onDevice ? 'on' : 'off'} · model ${settings.androidModel}`,
    `${correct}/${log.length} correct`,
    '',
    ...lines,
  ].join('\n');
}
