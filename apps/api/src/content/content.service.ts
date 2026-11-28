import { Injectable } from '@nestjs/common';
import type { SubjectsResponse } from '@blurt/shared/schemas';
import type { AuthUser } from '../auth/supabase-jwt.guard.js';
import { UsersService } from '../users/users.service.js';
import { ContentRepository } from './content.repository.js';

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
}
