import { describe, expect, it } from 'vitest';
import { levelFor, localDateOf, nextStreak, starsFor, xpFor, XP_PER_LEVEL } from './index.js';

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

describe('xpFor', () => {
  it('gives 100 for a first try, 25 less per hint or miss, at least 25', () => {
    expect(xpFor(0, 0)).toBe(100);
    expect(xpFor(1, 1)).toBe(50);
    expect(xpFor(5, 5)).toBe(25);
  });
});

describe('nextStreak', () => {
  it('starts at 1, grows on consecutive days, resets after a gap', () => {
    expect(nextStreak(0, null, '2026-11-22')).toBe(1);
    expect(nextStreak(3, '2026-11-21', '2026-11-22')).toBe(4);
    expect(nextStreak(3, '2026-11-22', '2026-11-22')).toBe(3);
    expect(nextStreak(3, '2026-11-19', '2026-11-22')).toBe(1);
  });

  it('crosses month and year ends', () => {
    expect(nextStreak(5, '2026-11-30', '2026-12-01')).toBe(6);
    expect(nextStreak(5, '2026-12-31', '2027-01-01')).toBe(6);
  });

  it('ignores a date earlier than the last one played', () => {
    expect(nextStreak(4, '2026-11-22', '2026-11-20')).toBe(4);
  });

  it('formats the local date', () => {
    expect(localDateOf(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
  });
});
