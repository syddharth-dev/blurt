import { Injectable } from '@nestjs/common';
import { levelFor, nextStreak } from '@blurt/shared/progress';
import type { UserRecord } from '../users/users.repository.js';

export type UserProgressPatch = Pick<UserRecord, 'xp' | 'level' | 'streak' | 'lastPlayedOn'>;

/**
 * XP, levels and streaks (rules in @blurt/shared/progress; the server's result is final).
 * Later, AnswerAccepted listeners (leagues, mastery scheduling) hang off here (ARCHITECTURE.md).
 */
@Injectable()
export class ProgressService {
  /** What a finished round does to the student's totals. A round with no answers keeps the streak. */
  afterRound(
    user: UserRecord,
    score: number,
    localDate: string,
    played: boolean,
  ): UserProgressPatch {
    const xp = user.xp + score;
    const later = !user.lastPlayedOn || localDate > user.lastPlayedOn;
    return {
      xp,
      level: levelFor(xp).level,
      streak: played ? nextStreak(user.streak, user.lastPlayedOn, localDate) : user.streak,
      lastPlayedOn: played && later ? localDate : user.lastPlayedOn,
    };
  }
}
