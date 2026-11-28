import { STARTER_UNLOCK_LEVELS } from './topics.js';
import { describe, expect, it } from 'vitest';
import { GRADE8_TERMS, mixedRound, topicSlug, topicsOf } from './index.js';

describe('topics', () => {
  it('groups the Grade 8 terms into 7 topics covering every term', () => {
    const topics = topicsOf(GRADE8_TERMS);
    expect(topics.map((t) => t.id)).toEqual([
      'atoms-and-ions',
      'cells-and-heredity',
      'ecosystems',
      'forces-and-motion',
      'energy-light-and-sound',
      'earthquakes-and-weather',
      'the-solar-system',
    ]);
    expect(topics.flatMap((t) => t.terms)).toHaveLength(GRADE8_TERMS.length);
    expect(topics.every((t) => t.terms.length <= 10)).toBe(true);
  });

  it('makes URL-safe slugs', () => {
    expect(topicSlug('Energy, light and sound')).toBe('energy-light-and-sound');
  });

  it('picks a mixed round without repeats', () => {
    const round = mixedRound(GRADE8_TERMS, 10, () => 0.5);
    expect(round).toHaveLength(10);
    expect(new Set(round.map((t) => t.id)).size).toBe(10);
  });
});

describe('STARTER_UNLOCK_LEVELS', () => {
  it('gives every starter topic a level, two open from the start', () => {
    const ids = topicsOf(GRADE8_TERMS).map((t) => t.id);
    expect(Object.keys(STARTER_UNLOCK_LEVELS).sort()).toEqual([...ids].sort());
    expect(Object.values(STARTER_UNLOCK_LEVELS).filter((l) => l === 1)).toHaveLength(2);
  });
});
