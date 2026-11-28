import { Injectable } from '@nestjs/common';
import { nextReview, type ReviewOutcome } from '@blurt/shared/progress';
import type { Highlight, RoundSummaryResponse, RoundTerm } from '@blurt/shared/schemas';
import { PrismaService } from '../common/prisma/prisma.service.js';
import type { Prisma } from '../generated/prisma/client.js';
import { visibleTopic } from '../common/visibility.js';
import type { UserProgressPatch } from '../progress/progress.service.js';

export type TopicTerms = {
  topic: {
    id: string;
    title: string;
    subject: string;
    unlockLevel: number;
    /** Assigned to one of this student's classes: never locked by level. */
    assigned: boolean;
  };
  terms: RoundTerm[];
};

export type AttemptRecord = {
  termId: string;
  termVersion: number;
  input: string[];
  inputMode: string;
  /** correct | close | wrong | skipped */
  verdict: string;
  hintsUsed: number;
  ms: number;
  xp: number;
  response: unknown;
  idempotencyKey: string;
};

export type RoundRecord = {
  id: string;
  userId: string;
  topicId: string | null;
  termIds: string[];
  /** The terms as served (null for rounds started before snapshots existed). */
  terms: RoundTerm[] | null;
  status: 'ACTIVE' | 'FINISHED';
  lives: number;
  hintsUsed: number;
  skipsUsed: number;
  streak: number;
  bestStreak: number;
  score: number;
  summary: RoundSummaryResponse | null;
  attempts: AttemptRecord[];
};

export type RoundPatch = Partial<
  Pick<RoundRecord, 'lives' | 'hintsUsed' | 'skipsUsed' | 'streak' | 'bestStreak' | 'score'>
>;

/** How a term went in a round: moves its review box (spaced repetition) and its totals. */
export type MasteryDelta = {
  termId: string;
  outcome: ReviewOutcome;
  correct: number;
  missed: number;
};

export type DueTerms = { dueCount: number; termIds: string[]; nextDueAt: Date | null };

export abstract class RoundsRepository {
  /**
   * Published terms of a published topic this student can see (the shared library, or assigned
   * to one of their classes), in order. Null if not visible.
   */
  abstract topicTerms(topicId: string, userId: string): Promise<TopicTerms | null>;
  /** Published terms this student can see, by id (practice). Unknown ids are left out. */
  abstract termsByIds(ids: string[], userId: string): Promise<RoundTerm[]>;
  abstract createRound(data: {
    userId: string;
    topicId: string | null;
    terms: RoundTerm[];
  }): Promise<RoundRecord>;
  abstract findRound(id: string): Promise<RoundRecord | null>;
  abstract findAttempt(
    idempotencyKey: string,
  ): Promise<(AttemptRecord & { roundId: string }) | null>;
  /** Stores an attempt and the round changes it causes, atomically. */
  abstract saveAttempt(roundId: string, attempt: AttemptRecord, patch: RoundPatch): Promise<void>;
  /**
   * Marks the round finished and updates the student's totals and mastery, atomically.
   * Only one caller wins: returns false if the round was already finished (no double XP).
   */
  abstract finishRound(input: {
    roundId: string;
    userId: string;
    summary: RoundSummaryResponse;
    progress: UserProgressPatch;
    mastery: MasteryDelta[];
  }): Promise<boolean>;
  /** Terms due for review that this student can still see, most overdue first. */
  abstract dueTerms(userId: string, now: Date, limit: number): Promise<DueTerms>;
}

const termInclude = {
  variants: true,
  confusables: true,
  picture: true,
  topic: { include: { subject: true } },
} satisfies Prisma.TermInclude;

type TermRow = Prisma.TermGetPayload<{ include: typeof termInclude }>;

export function toRoundTerm(t: TermRow): RoundTerm {
  const highlight = t.highlight as Highlight | null;
  return {
    id: t.id,
    version: t.version,
    subject: t.topic.subject.name,
    topic: t.topic.title,
    canonical: t.canonical,
    display: t.display,
    syllables: t.syllables,
    clue: t.clue,
    fact: t.fact,
    difficulty: t.difficulty,
    audioUrl: t.audioUrl,
    accept: t.variants.filter((v) => v.kind === 'ACCEPT').map((v) => v.text),
    close: t.variants
      .filter((v) => v.kind === 'CLOSE')
      .map((v) => ({ text: v.text, reason: v.reason ?? '' })),
    confusables: t.confusables.map((c) => ({ text: c.otherText, feedback: c.feedback })),
    picture:
      t.picture && highlight && 'shape' in highlight
        ? {
            diagram: t.picture.diagram,
            url: t.picture.state === 'READY' ? t.picture.url : null,
            width: t.picture.width,
            height: t.picture.height,
            highlight,
            altText: t.picture.altText ?? '',
          }
        : null,
  };
}

const roundInclude = { attempts: { orderBy: { createdAt: 'asc' } } } satisfies Prisma.RoundInclude;

function toRound(r: Prisma.RoundGetPayload<{ include: typeof roundInclude }>): RoundRecord {
  return {
    id: r.id,
    userId: r.userId,
    topicId: r.topicId,
    termIds: r.termIds,
    terms: (r.terms as RoundTerm[] | null) ?? null,
    status: r.status,
    lives: r.lives,
    hintsUsed: r.hintsUsed,
    skipsUsed: r.skipsUsed,
    streak: r.streak,
    bestStreak: r.bestStreak,
    score: r.score,
    summary: (r.summary as RoundSummaryResponse | null) ?? null,
    attempts: r.attempts.map(toAttempt),
  };
}

function toAttempt(a: Prisma.AttemptGetPayload<object>): AttemptRecord {
  return {
    termId: a.termId,
    termVersion: a.termVersion,
    input: a.input,
    inputMode: a.inputMode,
    verdict: a.verdict,
    hintsUsed: a.hintsUsed,
    ms: a.ms,
    xp: a.xp,
    response: a.response,
    idempotencyKey: a.idempotencyKey,
  };
}

@Injectable()
export class PrismaRoundsRepository extends RoundsRepository {
  constructor(private readonly db: PrismaService) {
    super();
  }

  async topicTerms(topicId: string, userId: string): Promise<TopicTerms | null> {
    const topic = await this.db.topic.findFirst({
      where: { id: topicId, ...visibleTopic(userId) },
      include: {
        subject: true,
        classes: { where: { class: { enrollments: { some: { studentId: userId } } } }, take: 1 },
        terms: {
          where: { status: 'PUBLISHED' },
          orderBy: { position: 'asc' },
          include: termInclude,
        },
      },
    });
    if (!topic) return null;
    return {
      topic: {
        id: topic.id,
        title: topic.title,
        subject: topic.subject.name,
        unlockLevel: topic.unlockLevel,
        assigned: topic.classes.length > 0,
      },
      terms: topic.terms.map(toRoundTerm),
    };
  }

  async termsByIds(ids: string[], userId: string): Promise<RoundTerm[]> {
    const rows = await this.db.term.findMany({
      where: { id: { in: ids }, status: 'PUBLISHED', topic: visibleTopic(userId) },
      include: termInclude,
    });
    const byId = new Map(rows.map((t) => [t.id, toRoundTerm(t)]));
    return ids.map((id) => byId.get(id)).filter((t): t is RoundTerm => !!t);
  }

  async createRound({
    terms,
    ...data
  }: {
    userId: string;
    topicId: string | null;
    terms: RoundTerm[];
  }) {
    return toRound(
      await this.db.round.create({
        data: {
          ...data,
          termIds: terms.map((t) => t.id),
          terms: terms as unknown as Prisma.InputJsonValue,
        },
        include: roundInclude,
      }),
    );
  }

  async findRound(id: string) {
    const r = await this.db.round.findUnique({ where: { id }, include: roundInclude });
    return r ? toRound(r) : null;
  }

  async findAttempt(idempotencyKey: string) {
    const a = await this.db.attempt.findUnique({ where: { idempotencyKey } });
    return a ? { ...toAttempt(a), roundId: a.roundId } : null;
  }

  async saveAttempt(roundId: string, attempt: AttemptRecord, patch: RoundPatch) {
    await this.db.$transaction([
      this.db.attempt.create({
        data: {
          roundId,
          ...attempt,
          response: attempt.response as Prisma.InputJsonValue,
        },
      }),
      this.db.round.update({ where: { id: roundId }, data: patch }),
    ]);
  }

  async finishRound(input: {
    roundId: string;
    userId: string;
    summary: RoundSummaryResponse;
    progress: UserProgressPatch;
    mastery: MasteryDelta[];
  }) {
    const now = new Date();
    return this.db.$transaction(async (tx) => {
      const claimed = await tx.round.updateMany({
        where: { id: input.roundId, status: 'ACTIVE' },
        data: {
          status: 'FINISHED',
          endedAt: now,
          summary: input.summary as unknown as Prisma.InputJsonValue,
        },
      });
      if (claimed.count === 0) return false;
      await tx.user.update({ where: { id: input.userId }, data: input.progress });
      const existing = new Map(
        (
          await tx.termMastery.findMany({
            where: { userId: input.userId, termId: { in: input.mastery.map((m) => m.termId) } },
            select: { termId: true, box: true },
          })
        ).map((m) => [m.termId, m.box]),
      );
      for (const m of input.mastery) {
        const review = nextReview(existing.get(m.termId) ?? null, m.outcome, now);
        await tx.termMastery.upsert({
          where: { userId_termId: { userId: input.userId, termId: m.termId } },
          update: {
            correct: { increment: m.correct },
            missed: { increment: m.missed },
            box: review.box,
            dueAt: review.dueAt,
            lastSeenAt: now,
          },
          create: {
            userId: input.userId,
            termId: m.termId,
            correct: m.correct,
            missed: m.missed,
            box: review.box,
            dueAt: review.dueAt,
            lastSeenAt: now,
          },
        });
      }
      return true;
    });
  }

  async dueTerms(userId: string, now: Date, limit: number): Promise<DueTerms> {
    const rows = await this.db.termMastery.findMany({
      where: { userId },
      select: { termId: true, dueAt: true },
      orderBy: { dueAt: 'asc' },
    });
    if (!rows.length) return { dueCount: 0, termIds: [], nextDueAt: null };
    // Only terms still published and visible to this student (a class they left, an archived term).
    const visible = new Set(
      (
        await this.db.term.findMany({
          where: {
            id: { in: rows.map((r) => r.termId) },
            status: 'PUBLISHED',
            topic: visibleTopic(userId),
          },
          select: { id: true },
        })
      ).map((t) => t.id),
    );
    const live = rows.filter((r) => visible.has(r.termId));
    const due = live.filter((r) => r.dueAt <= now);
    return {
      dueCount: due.length,
      termIds: due.slice(0, limit).map((r) => r.termId),
      nextDueAt: due.length ? null : (live.find((r) => r.dueAt > now)?.dueAt ?? null),
    };
  }
}
