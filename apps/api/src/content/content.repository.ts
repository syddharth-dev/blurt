import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service.js';
import { assignedTo, visibleTopic } from '../common/visibility.js';

export type TopicRow = {
  id: string;
  title: string;
  grade: number;
  unlockLevel: number;
  termCount: number;
  assigned: boolean;
};
export type SubjectRow = { id: string; name: string; color: string; topics: TopicRow[] };

export abstract class ContentRepository {
  /** Published topics a student may see: the shared library and topics assigned to their classes. */
  abstract visibleSubjects(userId: string): Promise<SubjectRow[]>;
  /** Terms mastered per topic for this user. */
  abstract masteredByTopic(userId: string): Promise<Map<string, number>>;
}

@Injectable()
export class PrismaContentRepository extends ContentRepository {
  constructor(private readonly db: PrismaService) {
    super();
  }

  async visibleSubjects(userId: string): Promise<SubjectRow[]> {
    const subjects = await this.db.subject.findMany({
      orderBy: { name: 'asc' },
      include: {
        topics: {
          where: visibleTopic(userId),
          orderBy: { title: 'asc' },
          include: {
            _count: { select: { terms: { where: { status: 'PUBLISHED' } } } },
            classes: { where: assignedTo(userId).classes.some, take: 1, select: { classId: true } },
          },
        },
      },
    });
    return subjects.map((s) => ({
      id: s.id,
      name: s.name,
      color: s.color,
      topics: s.topics.map((t) => ({
        id: t.id,
        title: t.title,
        grade: t.grade,
        unlockLevel: t.unlockLevel,
        termCount: t._count.terms,
        assigned: t.classes.length > 0,
      })),
    }));
  }

  async masteredByTopic(userId: string): Promise<Map<string, number>> {
    const rows = await this.db.termMastery.findMany({
      where: { userId, correct: { gte: 1 } },
      select: { termId: true },
    });
    if (!rows.length) return new Map();
    const terms = await this.db.term.findMany({
      where: { id: { in: rows.map((r) => r.termId) } },
      select: { topicId: true },
    });
    const counts = new Map<string, number>();
    for (const t of terms) counts.set(t.topicId, (counts.get(t.topicId) ?? 0) + 1);
    return counts;
  }
}
