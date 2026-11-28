import { ProgressService } from './progress.service.js';

const user = {
  id: 'u',
  role: 'STUDENT' as const,
  name: 'A',
  email: null,
  grade: null,
  xp: 480,
  level: 1,
  streak: 2,
  lastPlayedOn: '2026-11-21',
  lastDailyOn: null as string | null,
};

describe('ProgressService', () => {
  it('adds XP, recomputes the level and grows the streak on the next day', () => {
    expect(new ProgressService().afterRound(user, 100, '2026-11-22', true)).toEqual({
      xp: 580,
      level: 2,
      streak: 3,
      lastPlayedOn: '2026-11-22',
    });
  });

  it('a round without answers keeps the streak and the last played date', () => {
    expect(new ProgressService().afterRound(user, 0, '2026-11-25', false)).toMatchObject({
      streak: 2,
      lastPlayedOn: '2026-11-21',
    });
  });

  it('a game logged with an earlier date never moves the last played date back', () => {
    expect(new ProgressService().afterRound(user, 50, '2026-11-20', true).lastPlayedOn).toBe(
      '2026-11-21',
    );
  });

  it('the daily bonus: a daily round with a right answer, once per local day', () => {
    const p = new ProgressService();
    expect(p.dailyBonus(user, true, true, '2026-11-22')).toBe(150);
    expect(p.dailyBonus(user, false, true, '2026-11-22')).toBe(0); // not the daily round
    expect(p.dailyBonus(user, true, false, '2026-11-22')).toBe(0); // nothing right
    expect(p.dailyBonus({ ...user, lastDailyOn: '2026-11-22' }, true, true, '2026-11-22')).toBe(0);
    const patch = p.afterRound(user, 100, '2026-11-22', true, 150);
    expect(patch).toMatchObject({ xp: 730, lastDailyOn: '2026-11-22' });
    expect(p.afterRound(user, 100, '2026-11-22', true)).not.toHaveProperty('lastDailyOn');
  });
});
