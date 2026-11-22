/**
 * In-memory repositories for tests: the services' rules run without a database.
 * Content is the real Grade 8 starter set from @blurt/shared.
 */
import { GRADE8_TERMS, topicsOf, type ContentTerm } from '@blurt/shared/content';
import type { RoundTerm } from '@blurt/shared/schemas';
import type { AuthUser } from '../src/auth/supabase-jwt.guard.js';
import { ContentRepository, type SubjectRow } from '../src/content/content.repository.js';
import {
  RoundsRepository,
  type AttemptRecord,
  type MasteryDelta,
  type RoundPatch,
  type RoundRecord,
  type TopicTerms,
} from '../src/gameplay/rounds.repository.js';
import type { UserProgressPatch } from '../src/progress/progress.service.js';
import { UsersRepository, type UserRecord } from '../src/users/users.repository.js';

export function authUser(id = 'student-1', email = 'ana.cruz@school.test'): AuthUser {
  return { id, claims: { sub: id, email } };
}

export function asRoundTerm(t: ContentTerm): RoundTerm {
  return {
    id: t.id,
    version: 1,
    subject: t.subject,
    topic: t.topic,
    canonical: t.canonical,
    display: t.display,
    syllables: t.syllables,
    clue: t.clue,
    fact: t.fact,
    difficulty: t.difficulty,
    audioUrl: null,
    accept: t.accept,
    close: t.close,
    confusables: t.confusables,
    picture: t.picture
      ? {
          diagram: t.picture.diagram,
          url: null,
          highlight: t.picture.highlight,
          altText: t.picture.altText,
        }
      : null,
  };
}

export class FakeUsersRepository extends UsersRepository {
  users = new Map<string, UserRecord>();
  async find(id: string) {
    return this.users.get(id) ?? null;
  }
  async create(data: { id: string; name: string }) {
    const u: UserRecord = {
      id: data.id,
      name: data.name,
      role: 'STUDENT',
      grade: null,
      xp: 0,
      level: 1,
      streak: 0,
      lastPlayedOn: null,
    };
    this.users.set(u.id, u);
    return u;
  }
  async update(id: string, data: Partial<UserRecord>) {
    const u = { ...this.users.get(id)!, ...data };
    this.users.set(id, u);
    return u;
  }
}

export class FakeRoundsRepository extends RoundsRepository {
  topics = topicsOf(GRADE8_TERMS);
  unlockLevels = new Map<string, number>();
  rounds = new Map<string, RoundRecord>();
  attempts = new Map<string, AttemptRecord & { roundId: string }>();
  finishes: { userId: string; progress: UserProgressPatch; mastery: MasteryDelta[] }[] = [];
  constructor(private readonly users: FakeUsersRepository) {
    super();
  }
  private nextId = 1;

  async topicTerms(topicId: string): Promise<TopicTerms | null> {
    const t = this.topics.find((x) => x.id === topicId);
    if (!t) return null;
    return {
      topic: {
        id: t.id,
        title: t.title,
        subject: t.subject,
        unlockLevel: this.unlockLevels.get(t.id) ?? 1,
      },
      terms: t.terms.map(asRoundTerm),
    };
  }
  async termsByIds(ids: string[]) {
    return ids
      .map((id) => GRADE8_TERMS.find((t) => t.id === id))
      .filter((t): t is ContentTerm => !!t)
      .map(asRoundTerm);
  }
  async createRound(data: { userId: string; topicId: string | null; termIds: string[] }) {
    const r: RoundRecord = {
      id: `round-${this.nextId++}`,
      ...data,
      status: 'ACTIVE',
      lives: 3,
      hintsUsed: 0,
      skipsUsed: 0,
      streak: 0,
      bestStreak: 0,
      score: 0,
      summary: null,
      attempts: [],
    };
    this.rounds.set(r.id, r);
    return structuredClone(r);
  }
  async findRound(id: string) {
    const r = this.rounds.get(id);
    return r ? structuredClone(r) : null;
  }
  async findAttempt(key: string) {
    return this.attempts.get(key) ?? null;
  }
  async saveAttempt(roundId: string, attempt: AttemptRecord, patch: RoundPatch) {
    if (this.attempts.has(attempt.idempotencyKey)) throw new Error('unique violation');
    const r = this.rounds.get(roundId)!;
    this.attempts.set(attempt.idempotencyKey, { ...attempt, roundId });
    this.rounds.set(roundId, { ...r, ...patch, attempts: [...r.attempts, attempt] });
  }
  async finishRound(input: Parameters<RoundsRepository['finishRound']>[0]) {
    const r = this.rounds.get(input.roundId)!;
    if (r.status !== 'ACTIVE') return false;
    this.rounds.set(r.id, { ...r, status: 'FINISHED', summary: input.summary });
    await this.users.update(input.userId, input.progress);
    this.finishes.push({ userId: input.userId, progress: input.progress, mastery: input.mastery });
    return true;
  }
}

export class FakeContentRepository extends ContentRepository {
  mastered = new Map<string, number>();
  unlockLevels = new Map<string, number>();
  async visibleSubjects(): Promise<SubjectRow[]> {
    const bySubject = new Map<string, SubjectRow>();
    for (const t of topicsOf(GRADE8_TERMS)) {
      const id = t.subject.toLowerCase();
      const s = bySubject.get(id) ?? { id, name: t.subject, color: 'coral', topics: [] };
      s.topics.push({
        id: t.id,
        title: t.title,
        grade: 8,
        unlockLevel: this.unlockLevels.get(t.id) ?? 1,
        termCount: t.terms.length,
      });
      bySubject.set(id, s);
    }
    return [...bySubject.values()];
  }
  async masteredByTopic() {
    return this.mastered;
  }
}
