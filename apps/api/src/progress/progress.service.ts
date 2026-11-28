import { Injectable } from '@nestjs/common';
import { DAILY_BONUS_XP, levelFor, nextStreak } from '@blurt/shared/progress';
import type { UserRecord } from '../users/users.repository.js';

export type UserProgressPatch = Pick<UserRecord, 'xp' | 'level' | 'streak' | 'lastPlayedOn'> &
  Partial<Pick<UserRecord, 'lastDailyOn'>>;

/**
 * XP, levels and streaks (rules in @blurt/shared/progress; the server's result is final).
 * Later, AnswerAccepted listeners (leagues, mastery scheduling) hang off here (ARCHITECTURE.md).
 */
@Injectable()
export class ProgressService {
  /**
   * What a finished round does to the student's totals. A round with no answers keeps the streak.
   * `dailyBonus` (already decided by the caller) is added to the XP and marks today as done.
   */
  afterRound(
    user: UserRecord,
    score: number,
    localDate: string,
    played: boolean,
    dailyBonus = 0,
  ): UserProgressPatch {
    const xp = user.xp + score + dailyBonus;
    const later = !user.lastPlayedOn || localDate > user.lastPlayedOn;
    return {
      xp,
      level: levelFor(xp).level,
      streak: played ? nextStreak(user.streak, user.lastPlayedOn, localDate) : user.streak,
      lastPlayedOn: played && later ? localDate : user.lastPlayedOn,
      ...(dailyBonus > 0 ? { lastDailyOn: localDate } : {}),
    };
  }

  /** The daily bonus: a daily round with at least one right answer, once per local day. */
  dailyBonus(user: UserRecord, daily: boolean, anyRight: boolean, localDate: string): number {
    return daily && anyRight && user.lastDailyOn !== localDate ? DAILY_BONUS_XP : 0;
  }
}
