import { describe, expect, it } from 'vitest';
import { matchAnswer, matchKey, NEAR_FEEDBACK, type MatchableTerm } from './index.js';

const voice = { inputMode: 'voice' } as const;
const typed = { inputMode: 'typed' } as const;

function term(canonical: string, extra: Partial<MatchableTerm> = {}): MatchableTerm {
  return { canonical, accept: [], close: [], confusables: [], ...extra };
}

const nucleus = term('nucleus', {
  accept: ['nuclei'],
  close: [{ text: 'nuclear', reason: "that's the adjective" }],
  confusables: [
    { text: 'nucleolus', feedback: "That's the nucleolus. This one holds the whole cell's DNA." },
  ],
});
const proton = term('proton', {
  confusables: [
    { text: 'neutron', feedback: "That's the neutron. This one has a positive charge." },
    { text: 'electron', feedback: "That's the electron. This one sits in the nucleus." },
  ],
});
const neutron = term('neutron', {
  confusables: [{ text: 'proton', feedback: "That's the proton. This one has no charge." }],
});
const mitosis = term('mitosis', {
  confusables: [
    { text: 'meiosis', feedback: "That's meiosis. This one makes two identical cells." },
  ],
});
const meiosis = term('meiosis', {
  confusables: [{ text: 'mitosis', feedback: "That's mitosis. This one makes sex cells." }],
});
const anion = term('anion', {
  confusables: [{ text: 'cation', feedback: "That's a cation. This ion has a negative charge." }],
});
const cation = term('cation', {
  confusables: [{ text: 'anion', feedback: "That's an anion. This ion has a positive charge." }],
});

// Required tests: docs/SPEECH_AND_MATCHING.md → "Unit tests you must have".
describe('required cases', () => {
  describe('confusable guard (AGENTS.md rule 4)', () => {
    it.each([
      ['proton', proton, 'neutron'],
      ['neutron', neutron, 'proton'],
      ['mitosis', mitosis, 'meiosis'],
      ['meiosis', meiosis, 'mitosis'],
      ['anion', anion, 'cation'],
      ['cation', cation, 'anion'],
      ['nucleus', nucleus, 'nucleolus'],
    ] as const)('%s ✗ %s', (_name, t, said) => {
      const r = matchAnswer(t, [said], voice);
      expect(r.verdict).toBe('wrong');
      expect(r.strategy).toBe('confusable');
      expect(r.feedback).toBeTruthy();
    });
  });

  it('nuclear → CLOSE for nucleus, with the reason', () => {
    expect(matchAnswer(nucleus, ['nuclear'], voice)).toEqual({
      verdict: 'close',
      matched: 'nuclear',
      strategy: 'family',
      feedback: "Close — that's the adjective.",
    });
  });

  it('nuclei → CORRECT for nucleus', () => {
    expect(matchAnswer(nucleus, ['nuclei'], voice).verdict).toBe('correct');
  });

  it('"um the nucleus" → CORRECT', () => {
    const r = matchAnswer(nucleus, ['um the nucleus'], voice);
    expect(r.verdict).toBe('correct');
    expect(r.matched).toBe('nucleus');
  });

  it('alternatives ["new clears", "nucleus"] → CORRECT (second alternative wins)', () => {
    const r = matchAnswer(nucleus, ['new clears', 'nucleus'], voice);
    expect(r.verdict).toBe('correct');
    expect(r.matched).toBe('nucleus');
  });
});

describe('fuzzy matching never rewards a confusable (AGENTS.md rule 4)', () => {
  // Slightly garbled versions of the confusable: nearer the confusable than the term.
  it.each([
    [mitosis, 'meiosys'],
    [mitosis, 'my osis'],
    [meiosis, 'mitosys'],
    [proton, 'nutron'],
    [proton, 'neutrons'],
    [neutron, 'protons'],
    [anion, 'cations'],
    [cation, 'anions'],
    [nucleus, 'nucleolous'],
  ] as const)('%#: "%s" is not correct', (t, said) => {
    expect(matchAnswer(t, [said], voice).verdict).not.toBe('correct');
    expect(matchAnswer(t, [said], typed).verdict).not.toBe('correct');
  });

  it('ties between the term and a confusable are never accepted', () => {
    // "abcf" is one edit from both the term and its confusable.
    const t = term('abcd', { confusables: [{ text: 'abce', feedback: 'x' }] });
    expect(matchAnswer(t, ['abcf'], voice).verdict).toBe('wrong');
  });

  it('every confusable in a symmetric pair is rejected both ways, with any fillers', () => {
    for (const [t, said] of [
      [proton, 'um the neutron'],
      [neutron, "it's a proton"],
      [mitosis, 'is it meiosis'],
    ] as const) {
      expect(matchAnswer(t, [said], voice).strategy).toBe('confusable');
    }
  });
});

describe('strategies', () => {
  it('accepts an accent or spelling slip that sounds the same (phonetic)', () => {
    const r = matchAnswer(term('photosynthesis'), ['fotosynthesis'], voice);
    expect(r).toMatchObject({ verdict: 'correct', strategy: 'phonetic' });
  });

  it('marks a near miss as CLOSE with "check the ending"', () => {
    const r = matchAnswer(term('chloroplast'), ['chloroplasm'], voice);
    expect(r).toMatchObject({ verdict: 'close', strategy: 'near', feedback: NEAR_FEEDBACK });
  });

  it('a garbled word-family form is CLOSE with that form’s reason', () => {
    const r = matchAnswer(nucleus, ['nucleer'], voice);
    expect(r).toMatchObject({ verdict: 'close', feedback: "Close — that's the adjective." });
  });

  it('typed answers use a stricter NEAR threshold', () => {
    // similarity 0.625: close by voice, wrong when typed
    const t = term('meniscus');
    expect(matchAnswer(t, ['menisxyz'], voice).verdict).toBe('close');
    expect(matchAnswer(t, ['menisxyz'], typed).verdict).toBe('wrong');
  });

  it('unrelated words are wrong with no feedback', () => {
    expect(matchAnswer(nucleus, ['banana'], voice)).toEqual({
      verdict: 'wrong',
      matched: 'banana',
      strategy: 'none',
      feedback: null,
    });
  });

  it('an empty or filler-only answer is wrong with nothing matched', () => {
    expect(matchAnswer(nucleus, ['', 'um', 'uh the'], voice)).toMatchObject({
      verdict: 'wrong',
      matched: null,
    });
  });

  it('prefers the best verdict across alternatives (correct > close > wrong)', () => {
    expect(matchAnswer(nucleus, ['banana', 'nuclear'], voice).verdict).toBe('close');
    expect(matchAnswer(nucleus, ['nuclear', 'nuclei'], voice).verdict).toBe('correct');
  });

  it('keeps confusable feedback when no alternative is better', () => {
    const r = matchAnswer(proton, ['banana', 'neutron'], voice);
    expect(r.strategy).toBe('confusable');
  });
});

describe('multi-word terms', () => {
  const membrane = term('cell membrane');
  const newton = term("Newton's first law");

  it('matches the whole phrase after normalizing', () => {
    expect(matchAnswer(membrane, ['Cell membrane.'], voice).verdict).toBe('correct');
    expect(matchAnswer(membrane, ['cellmembrane'], voice).verdict).toBe('correct');
    expect(matchAnswer(newton, ['newtons first law'], voice).verdict).toBe('correct');
    expect(matchAnswer(newton, ['um newtons first law'], voice).verdict).toBe('correct');
  });

  it('a partial phrase is not correct', () => {
    expect(matchAnswer(membrane, ['membrane'], voice).verdict).not.toBe('correct');
  });
});

describe('matchKey', () => {
  it('normalizes case, punctuation, accents and fillers', () => {
    expect(matchKey("  Um, it's the NUCLEUS!  ")).toBe('nucleus');
    expect(matchKey('Café')).toBe('cafe');
    expect(matchKey('is it the cell membrane?')).toBe('cellmembrane');
  });
});
