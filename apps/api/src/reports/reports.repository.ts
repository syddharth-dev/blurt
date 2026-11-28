import { Injectable } from '@nestjs/common';
import type { RoundSummaryResponse } from '@blurt/shared/schemas';
import { PrismaService } from '../common/prisma/prisma.service.js';
import type { AttemptRow, StudentMeta, TermMeta } from './build-report.js';

export type FinishedRound = {
  studentId: string;
  topicId: string;
  topic: string;
  correct: number;
  total: number;
  finishedAt: Date;
};

/** Read-only queries for teacher reports. */
export abstract class ReportsRepository {
  /** Students enrolled in the class. */
  abstract students(classId: string): Promise<StudentMeta[]>;
  /** Every term (any status) in the topics assigned to the class. */
  abstract terms(classId: string): Promise<TermMeta[]>;
  /** Attempts by these students on these terms, since a date (null: all time). */
  abstract attempts(q: {
    studentIds: string[];
    termIds: string[];
    since: Date | null;
  }): Promise<AttemptRow[]>;
  /** Latest finished rounds by these students on these topics. */
  abstract finishedRounds(q: {
    studentIds: string[];
    topicIds: string[];
    limit: number;
  }): Promise<FinishedRound[]>;
  /** Topic ids assigned to the class. */
  abstract topicIds(classId: string): Promise<string[]>;
}

@Injectable()
export class PrismaReportsRepository extends ReportsRepository {
  constructor(private readonly db: PrismaService) {
    super();
  }

  async students(classId: string) {
    const rows = await this.db.enrollment.findMany({
      where: { classId },
      include: { student: { select: { id: true, name: true } } },
    });
    return rows.map((r) => r.student);
  }

  async terms(classId: string) {
    const rows = await this.db.term.findMany({
      where: { topic: { classes: { some: { classId } } } },
      select: { id: true, display: true, topic: { select: { title: true } } },
    });
    return rows.map((t) => ({ termId: t.id, display: t.display, topic: t.topic.title }));
  }

  async attempts(q: { studentIds: string[]; termIds: string[]; since: Date | null }) {
    if (!q.studentIds.length || !q.termIds.length) return [];
    const rows = await this.db.attempt.findMany({
      where: {
        termId: { in: q.termIds },
        round: { userId: { in: q.studentIds } },
        ...(q.since ? { createdAt: { gte: q.since } } : {}),
      },
      select: {
        roundId: true,
        termId: true,
        verdict: true,
        input: true,
        createdAt: true,
        round: { select: { userId: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
    return rows.map((a) => ({
      studentId: a.round.userId,
      roundId: a.roundId,
      termId: a.termId,
      verdict: a.verdict,
      heard: a.input[0] ?? null,
      createdAt: a.createdAt,
    }));
  }

  async finishedRounds(q: { studentIds: string[]; topicIds: string[]; limit: number }) {
    if (!q.studentIds.length || !q.topicIds.length) return [];
    const rows = await this.db.round.findMany({
      where: { status: 'FINISHED', userId: { in: q.studentIds }, topicId: { in: q.topicIds } },
      orderBy: { endedAt: 'desc' },
      take: q.limit,
      select: {
        userId: true,
        topicId: true,
        termIds: true,
        summary: true,
        endedAt: true,
        startedAt: true,
      },
    });
    const titles = new Map(
      (
        await this.db.topic.findMany({
          where: { id: { in: [...new Set(rows.map((r) => r.topicId!))] } },
          select: { id: true, title: true },
        })
      ).map((t) => [t.id, t.title]),
    );
    return rows.map((r) => {
      const results = (r.summary as RoundSummaryResponse | null)?.results ?? [];
      return {
        studentId: r.userId,
        topicId: r.topicId!,
        topic: titles.get(r.topicId!) ?? '',
        correct: results.filter((x) => x.outcome === 'first-try' || x.outcome === 'assisted')
          .length,
        total: r.termIds.length,
        finishedAt: r.endedAt ?? r.startedAt,
      };
    });
  }

  async topicIds(classId: string) {
    const rows = await this.db.classTopic.findMany({
      where: { classId },
      select: { topicId: true },
    });
    return rows.map((r) => r.topicId);
  }
}
