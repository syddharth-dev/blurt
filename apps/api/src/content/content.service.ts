import { Injectable } from '@nestjs/common';
import { DAILY_BONUS_XP } from '@blurt/shared/progress';
import type { DailyResponse, SubjectsResponse } from '@blurt/shared/schemas';
import type { AuthUser } from '../auth/supabase-jwt.guard.js';
import { UsersService } from '../users/users.service.js';
import { ContentRepository } from './content.repository.js';
import { pickDaily } from './daily.js';

@Injectable()
export class ContentService {
  constructor(
    private readonly repo: ContentRepository,
    private readonly users: UsersService,
  ) {}

  async subjects(auth: AuthUser): Promise<SubjectsResponse> {
    const [user, subjects, mastered] = await Promise.all([
      this.users.ensure(auth),
      this.repo.visibleSubjects(auth.id),
      this.repo.masteredByTopic(auth.id),
    ]);
    return {
      subjects: subjects
        .filter((s) => s.topics.length)
        .map((s) => ({
          ...s,
          topics: s.topics.map((t) => ({
            ...t,
            locked: !t.assigned && t.unlockLevel > user.level,
            mastered: mastered.get(t.id) ?? 0,
          })),
        })),
    };
  }

  /** Today's challenge for this student (GET /daily). */
  async daily(auth: AuthUser, localDate: string): Promise<DailyResponse> {
    const [user, subjects, due] = await Promise.all([
      this.users.ensure(auth),
      this.repo.visibleSubjects(auth.id),
      this.repo.assignedDue(auth.id),
    ]);
    const topics = subjects.flatMap((s) =>
      s.topics.map((t) => {
        const dueAt = due.get(t.id);
        return {
          id: t.id,
          title: t.title,
          subject: s.name,
          grade: t.grade,
          termCount: t.termCount,
          locked: !t.assigned && t.unlockLevel > user.level,
          dueOn: dueAt ? dueAt.toISOString().slice(0, 10) : null,
        };
      }),
    );
    const pick = pickDaily(topics, localDate);
    return {
      localDate,
      topic: pick
        ? {
            id: pick.id,
            title: pick.title,
            subject: pick.subject,
            grade: pick.grade,
            termCount: pick.termCount,
            dueOn: pick.dueOn,
          }
        : null,
      bonusXp: DAILY_BONUS_XP,
      done: user.lastDailyOn === localDate,
    };
  }
}
