import { describe, expect, it } from 'vitest';
import {
  levelFor,
  localDateOf,
  nextStreak,
  starsFor,
  xpFor,
  XP_PER_LEVEL,
  nextReview,
  isMastered,
  MAX_BOX,
} from './index.js';

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

describe('nextReview (spaced repetition)', () => {
  const now = new Date('2026-11-28T10:00:00Z');
  const days = (d: Date) => (d.getTime() - now.getTime()) / 86_400_000;

  it('right first time climbs the boxes: 1, 3, 7, 14, then 30 days', () => {
    let box: number | null = null;
    const gaps: number[] = [];
    for (let i = 0; i < 7; i++) {
      const r = nextReview(box, 'first-try', now);
      gaps.push(days(r.dueAt));
      box = r.box;
    }
    expect(gaps).toEqual([1, 3, 7, 14, 30, 30, 30]);
    expect(box).toBe(MAX_BOX);
  });

  it('right with help keeps the box and comes back tomorrow', () => {
    expect(nextReview(3, 'assisted', now)).toEqual({
      box: 3,
      dueAt: new Date('2026-11-29T10:00:00Z'),
    });
    expect(nextReview(null, 'assisted', now).box).toBe(0);
  });

  it('a miss or a skip goes back to box 0, due now', () => {
    expect(nextReview(4, 'missed', now)).toEqual({ box: 0, dueAt: now });
    expect(nextReview(2, 'skipped', now)).toEqual({ box: 0, dueAt: now });
  });

  it('mastered means box 2 or higher', () => {
    expect([0, 1, 2, 5].map(isMastered)).toEqual([false, false, true, true]);
  });
});
