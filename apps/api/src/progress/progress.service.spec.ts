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
});
