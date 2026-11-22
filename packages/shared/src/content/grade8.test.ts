import { describe, expect, it } from 'vitest';
import { matchAnswer, matchKey } from '../matcher/index.js';
import { GRADE8_TERMS, recognizerHints } from './index.js';

const voice = { inputMode: 'voice' } as const;
const typed = { inputMode: 'typed' } as const;

describe('Grade 8 starter terms', () => {
  it('has 30 terms with unique ids and answers', () => {
    expect(GRADE8_TERMS).toHaveLength(30);
    expect(new Set(GRADE8_TERMS.map((t) => t.id)).size).toBe(30);
    expect(new Set(GRADE8_TERMS.map((t) => matchKey(t.canonical))).size).toBe(30);
  });

  it.each(GRADE8_TERMS.map((t) => [t.id, t] as const))('%s is well formed', (_id, t) => {
    // Every own form matches as intended.
    expect(matchAnswer(t, [t.canonical], voice).verdict).toBe('correct');
    for (const a of t.accept) expect(matchAnswer(t, [a], voice).verdict).toBe('correct');
    for (const c of t.close) expect(matchAnswer(t, [c.text], voice).verdict).toBe('close');
    for (const c of t.confusables) {
      expect(matchAnswer(t, [c.text], voice).strategy).toBe('confusable');
      // Publishing rule (TEACHER_DASHBOARD.md): the answer isn't also a confusable.
      expect(matchKey(c.text)).not.toBe(matchKey(t.canonical));
    }
    // Clues never give the answer away.
    expect(t.clue.toLowerCase()).not.toContain(t.canonical.toLowerCase());
  });

  // AGENTS.md rule 4, across the whole set: no term's answer is accepted for another term.
  it('no term is ever accepted as the answer to a different term', () => {
    const leaks: string[] = [];
    for (const target of GRADE8_TERMS) {
      for (const other of GRADE8_TERMS) {
        if (other === target) continue;
        for (const said of [other.canonical, ...other.accept]) {
          for (const opts of [voice, typed]) {
            if (matchAnswer(target, [said], opts).verdict === 'correct') {
              leaks.push(`${target.canonical} ← "${said}" (${opts.inputMode})`);
            }
          }
        }
      }
    }
    expect(leaks).toEqual([]);
  });

  it('builds recognizer hints that include confusables, without duplicates', () => {
    const hints = recognizerHints(GRADE8_TERMS);
    expect(hints).toContain('mitosis');
    expect(hints).toContain('nucleolus');
    expect(new Set(hints).size).toBe(hints.length);
  });
});
