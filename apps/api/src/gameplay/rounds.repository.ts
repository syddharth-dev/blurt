import { Injectable } from '@nestjs/common';
import type { Highlight, RoundSummaryResponse, RoundTerm } from '@blurt/shared/schemas';
import { PrismaService } from '../common/prisma/prisma.service.js';
import type { Prisma } from '../generated/prisma/client.js';
import type { UserProgressPatch } from '../progress/progress.service.js';

export type TopicTerms = {
  topic: { id: string; title: string; subject: string; unlockLevel: number };
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

export type MasteryDelta = { termId: string; correct: number; missed: number };

export abstract class RoundsRepository {
  /** Published terms of a published, visible topic, in order. Null if not visible. */
  abstract topicTerms(topicId: string): Promise<TopicTerms | null>;
  /** Published, visible terms by id (practice). Unknown ids are left out. */
  abstract termsByIds(ids: string[]): Promise<RoundTerm[]>;
  abstract createRound(data: {
    userId: string;
    topicId: string | null;
    termIds: string[];
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
}

const termInclude = {
  variants: true,
  confusables: true,
  picture: true,
  topic: { include: { subject: true } },
} satisfies Prisma.TermInclude;

type TermRow = Prisma.TermGetPayload<{ include: typeof termInclude }>;

/** Terms students may play: published, in a published library topic (class topics: Phase 4). */
const visibleTerm = {
  status: 'PUBLISHED',
  topic: { status: 'PUBLISHED', visibility: 'LIBRARY' },
} satisfies Prisma.TermWhereInput;

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
            url: t.picture.url,
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

  async topicTerms(topicId: string): Promise<TopicTerms | null> {
    const topic = await this.db.topic.findFirst({
      where: { id: topicId, status: 'PUBLISHED', visibility: 'LIBRARY' },
      include: {
        subject: true,
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
      },
      terms: topic.terms.map(toRoundTerm),
    };
  }

  async termsByIds(ids: string[]): Promise<RoundTerm[]> {
    const rows = await this.db.term.findMany({
      where: { id: { in: ids }, ...visibleTerm },
      include: termInclude,
    });
    const byId = new Map(rows.map((t) => [t.id, toRoundTerm(t)]));
    return ids.map((id) => byId.get(id)).filter((t): t is RoundTerm => !!t);
  }

  async createRound(data: { userId: string; topicId: string | null; termIds: string[] }) {
    return toRound(await this.db.round.create({ data, include: roundInclude }));
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
      for (const m of input.mastery) {
        await tx.termMastery.upsert({
          where: { userId_termId: { userId: input.userId, termId: m.termId } },
          update: { correct: { increment: m.correct }, missed: { increment: m.missed } },
          create: {
            userId: input.userId,
            termId: m.termId,
            correct: m.correct,
            missed: m.missed,
            dueAt: now,
          },
        });
      }
      return true;
    });
  }
}
