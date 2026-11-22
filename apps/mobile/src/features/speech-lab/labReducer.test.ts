import { GRADE8_TERMS } from '@blurt/shared/content';
import { errorCopy, initialLabState, labReducer, logAsText } from './labReducer';

const reduce = labReducer(GRADE8_TERMS);
const nucleusIndex = GRADE8_TERMS.findIndex((t) => t.canonical === 'nucleus');
const atNucleus = () => ({ ...initialLabState(), index: nucleusIndex });

describe('labReducer', () => {
  it('runs a voice attempt: start → partial → answer', () => {
    let s = reduce(atNucleus(), { type: 'START', at: 1000 });
    expect(s.status).toBe('listening');
    s = reduce(s, { type: 'PARTIAL', text: 'nucle' });
    expect(s.partial).toBe('nucle');
    s = reduce(s, {
      type: 'ANSWER',
      alternatives: ['new clears', 'nucleus'],
      inputMode: 'voice',
      at: 1800,
    });
    expect(s.status).toBe('idle');
    expect(s.result?.verdict).toBe('correct');
    // "new clears" alone is only an "almost"; the second alternative wins.
    expect(s.heard.map((h) => h.result.verdict)).toEqual(['close', 'correct']);
    expect(s.log).toEqual([
      expect.objectContaining({ termId: 'bio-nucleus', verdict: 'correct', ms: 800 }),
    ]);
  });

  it('gives the word-family reason for a close answer', () => {
    const s = reduce(atNucleus(), {
      type: 'ANSWER',
      alternatives: ['nuclear'],
      inputMode: 'voice',
      at: 0,
    });
    expect(s.result?.feedback).toBe("Close — that's the adjective.");
  });

  it('treats a session that ends with no result as no-speech', () => {
    let s = reduce(atNucleus(), { type: 'START', at: 0 });
    s = reduce(s, { type: 'END' });
    expect(s.status).toBe('idle');
    expect(s.error?.code).toBe('no-speech');
  });

  it('END after an answer changes nothing', () => {
    let s = reduce(atNucleus(), { type: 'START', at: 0 });
    s = reduce(s, { type: 'ANSWER', alternatives: ['nucleus'], inputMode: 'voice', at: 1 });
    expect(reduce(s, { type: 'END' })).toBe(s);
  });

  it('ignores aborts but shows other errors', () => {
    const listening = reduce(atNucleus(), { type: 'START', at: 0 });
    expect(
      reduce(listening, { type: 'ERROR', error: { code: 'aborted', message: '' } }).error,
    ).toBeNull();
    expect(
      reduce(listening, { type: 'ERROR', error: { code: 'network', message: '' } }).error?.code,
    ).toBe('network');
  });

  it('wraps around the term list and clears the last answer', () => {
    let s = reduce(initialLabState(), {
      type: 'ANSWER',
      alternatives: ['x'],
      inputMode: 'typed',
      at: 0,
    });
    s = reduce(s, { type: 'GO', delta: -1 });
    expect(s.index).toBe(GRADE8_TERMS.length - 1);
    expect(s.result).toBeNull();
    expect(s.log).toHaveLength(1); // the log survives
  });

  it('has Pip-voice copy for every error and never says "wrong"', () => {
    for (const code of [
      'no-speech',
      'network',
      'not-allowed',
      'audio-capture',
      'language-not-supported',
      'busy',
      'unavailable',
      'aborted',
      'unknown',
    ] as const) {
      expect(errorCopy(code)).not.toMatch(/wrong|error/i);
    }
  });

  it('formats a shareable log', () => {
    const s = reduce(atNucleus(), {
      type: 'ANSWER',
      alternatives: ['nuclear'],
      inputMode: 'voice',
      at: 0,
    });
    const text = logAsText(s.log, s.settings);
    expect(text).toContain('0/1 correct');
    expect(text).toContain('Nucleus [voice] → close (family');
  });
});
