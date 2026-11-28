import { describe, expect, it } from 'vitest';
import { GRADE8_TERMS } from '../content/index.js';
import { defaultDisplay, suggestConfusables, suggestSyllables, termChecks } from './index.js';

describe('suggestSyllables', () => {
  it.each([
    ['proton', 'pro·ton'],
    ['neutron', 'neu·tron'],
    ['electron', 'e·lec·tron'],
    ['nucleus', 'nu·cle·us'],
    ['mitosis', 'mi·to·sis'],
    ['radius', 'ra·di·us'],
    ['isotope', 'i·so·tope'],
    ['chloroplast', 'chlo·ro·plast'],
    ['gene', 'gene'],
    ['fault', 'fault'],
    ['Kinetic friction', 'Ki·ne·tic fric·tion'],
  ])('%s → %s', (word, expected) => {
    expect(suggestSyllables(word)).toBe(expected);
  });

  it('gets most of the starter set exactly right (it is only a suggestion)', () => {
    const exact = GRADE8_TERMS.filter((t) => suggestSyllables(t.canonical) === t.syllables);
    expect(exact.length / GRADE8_TERMS.length).toBeGreaterThanOrEqual(0.5);
  });
});

describe('suggestConfusables', () => {
  const atoms = GRADE8_TERMS.filter((t) => t.topic === GRADE8_TERMS[0]!.topic);

  it('suggests neutron and electron for proton', () => {
    const texts = suggestConfusables('proton', atoms).map((s) => s.text);
    expect(texts).toEqual(expect.arrayContaining(['neutron', 'electron']));
    expect(texts).not.toContain('proton');
  });

  it('a shared "-on" counts in the same topic, but not from the library', () => {
    const neutron = { canonical: 'neutron', display: 'Neutron' };
    expect(suggestConfusables('proton', [{ ...neutron, sameTopic: true }])).toHaveLength(1);
    expect(suggestConfusables('proton', [neutron])).toEqual([]);
  });

  it('suggests from the starter set by name alone', () => {
    const bare = atoms.map((t) => ({
      canonical: t.canonical,
      display: t.display,
      sameTopic: true,
    }));
    const texts = suggestConfusables('proton', bare).map((s) => s.text);
    expect(texts).toEqual(expect.arrayContaining(['neutron', 'electron']));
    expect(texts).not.toContain('proton');
  });

  it('suggests meiosis for mitosis (AGENTS.md rule 4 pairs)', () => {
    const texts = suggestConfusables('mitosis', GRADE8_TERMS).map((s) => s.text);
    expect(texts).toContain('meiosis');
  });

  it('suggests a term that already lists this answer as a confusable', () => {
    const s = suggestConfusables('zorp', [
      { canonical: 'quux', display: 'Quux', confusables: [{ text: 'zorp' }] },
    ]);
    expect(s).toMatchObject([{ text: 'quux', why: 'listed' }]);
  });

  it('gives editable feedback in Pip’s voice, never "Wrong"', () => {
    const [first] = suggestConfusables('mitosis', GRADE8_TERMS);
    expect(first?.feedback).toMatch(/^That's /);
    expect(first?.feedback).not.toMatch(/wrong|incorrect/i);
  });

  it('ignores unrelated words and very short answers', () => {
    expect(
      suggestConfusables('typhoon', [{ canonical: 'chloroplast', display: 'Chloroplast' }]),
    ).toEqual([]);
    expect(suggestConfusables('ab', GRADE8_TERMS)).toEqual([]);
  });
});

describe('termChecks', () => {
  const ok = {
    canonical: 'nucleus',
    clue: 'The control centre of the cell.',
    fact: 'Most cells have one.',
    accept: ['nuclei'],
    confusables: [{ text: 'nucleolus' }],
    hasPicture: true,
    hasHighlight: true,
  };

  it('passes a complete term', () => {
    expect(termChecks(ok, { requirePicture: true })).toEqual({ problems: [], warnings: [] });
  });

  it('lists every missing field', () => {
    const { problems } = termChecks(
      { ...ok, canonical: ' ', clue: '', fact: '', hasPicture: false, hasHighlight: false },
      { requirePicture: true },
    );
    expect(problems).toEqual([
      'Add a picture.',
      'Type the answer.',
      'Write a clue.',
      'Write a quick fact.',
    ]);
  });

  it('needs a highlight once a picture is there', () => {
    expect(termChecks({ ...ok, hasHighlight: false }, { requirePicture: true }).problems).toEqual([
      'Mark the part to name on the picture.',
    ]);
  });

  it('refuses an answer that is also a confusable', () => {
    const { problems } = termChecks(
      { ...ok, confusables: [{ text: 'The Nucleus' }, { text: 'nuclei' }] },
      { requirePicture: true },
    );
    expect(problems).toHaveLength(2);
  });

  it('library terms may skip the picture', () => {
    expect(termChecks({ ...ok, hasPicture: false }, { requirePicture: false }).problems).toEqual(
      [],
    );
  });

  it('warns when the clue gives the answer away', () => {
    expect(
      termChecks({ ...ok, clue: 'The nucleus controls the cell.' }, { requirePicture: true })
        .warnings,
    ).toEqual(['The clue contains the answer.']);
  });

  it('capitalises the default display name', () => {
    expect(defaultDisplay(' kinetic energy')).toBe('Kinetic energy');
  });
});
