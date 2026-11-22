import { describe, expect, it } from 'vitest';
import { levelFor, starsFor, XP_PER_LEVEL } from './index.js';

describe('levelFor', () => {
  it('starts at level 1 and goes up every 500 XP', () => {
    expect(levelFor(0)).toEqual({ level: 1, intoLevel: 0, perLevel: XP_PER_LEVEL, fraction: 0 });
    expect(levelFor(499).level).toBe(1);
    expect(levelFor(500)).toMatchObject({ level: 2, intoLevel: 0 });
    expect(levelFor(1250)).toMatchObject({ level: 3, intoLevel: 250, fraction: 0.5 });
  });

  it('never goes below level 1', () => {
    expect(levelFor(-20).level).toBe(1);
  });
});

describe('starsFor', () => {
  it.each([
    [10, 10, 3],
    [9, 10, 3],
    [8, 10, 2],
    [6, 10, 2],
    [5, 10, 1],
    [1, 10, 1],
    [0, 10, 0],
    [0, 0, 0],
  ] as const)('%i of %i → %i stars', (right, total, stars) => {
    expect(starsFor(right, total)).toBe(stars);
  });
});
