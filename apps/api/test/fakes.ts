/**
 * In-memory repositories for tests: the services' rules run without a database.
 * Content is the real Grade 8 starter set from @blurt/shared.
 */
import { GRADE8_TERMS, topicsOf, type ContentTerm } from '@blurt/shared/content';
import type { PictureState, RoundTerm, TeacherPicture } from '@blurt/shared/schemas';
import type { AuthUser } from '../src/auth/supabase-jwt.guard.js';
import {
  ClassesRepository,
  CodeTaken,
  type AssignableTopic,
  type ClassRecord,
} from '../src/classes/classes.repository.js';
import { ContentRepository, type SubjectRow } from '../src/content/content.repository.js';
import {
  RoundsRepository,
  type AttemptRecord,
  type MasteryDelta,
  type RoundPatch,
  type RoundRecord,
  type TopicTerms,
} from '../src/gameplay/rounds.repository.js';
import { PictureStorage } from '../src/media/picture-storage.js';
import { PicturesRepository, type PictureRecord } from '../src/media/pictures.repository.js';
import type { UserProgressPatch } from '../src/progress/progress.service.js';
import type { AttemptRow, StudentMeta, TermMeta } from '../src/reports/build-report.js';
import { ReportsRepository, type FinishedRound } from '../src/reports/reports.repository.js';
import {
  TeacherContentRepository,
  type TermData,
  type TermRecord,
  type TopicRecord,
  type TopicWithTerms,
} from '../src/teacher/teacher-content.repository.js';
import { UsersRepository, type NewUser, type UserRecord } from '../src/users/users.repository.js';

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
          diagram: 'diagram' in t.picture ? t.picture.diagram : null,
          url: 'url' in t.picture ? t.picture.url : null,
          width: null,
          height: null,
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
  async findByEmail(email: string) {
    return [...this.users.values()].find((u) => u.email === email.toLowerCase()) ?? null;
  }
  async create(data: NewUser) {
    const u: UserRecord = {
      id: data.id,
      name: data.name,
      email: data.email?.toLowerCase() ?? null,
      role: data.role ?? 'STUDENT',
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
  async setRole(id: string, role: UserRecord['role']) {
    return this.update(id, { role });
  }
  async listByRole(roles: UserRecord['role'][]) {
    return [...this.users.values()].filter((u) => roles.includes(u.role));
  }
}

export class FakeRoundsRepository extends RoundsRepository {
  topics = topicsOf(GRADE8_TERMS);
  unlockLevels = new Map<string, number>();
  /** topicId → student ids it's assigned to (through a class) */
  assigned = new Map<string, Set<string>>();
  rounds = new Map<string, RoundRecord>();
  attempts = new Map<string, AttemptRecord & { roundId: string }>();
  finishes: { userId: string; progress: UserProgressPatch; mastery: MasteryDelta[] }[] = [];
  constructor(private readonly users: FakeUsersRepository) {
    super();
  }
  private nextId = 1;

  async topicTerms(topicId: string, userId: string): Promise<TopicTerms | null> {
    const t = this.topics.find((x) => x.id === topicId);
    if (!t) return null;
    return {
      topic: {
        id: t.id,
        title: t.title,
        subject: t.subject,
        unlockLevel: this.unlockLevels.get(t.id) ?? 1,
        assigned: this.assigned.get(t.id)?.has(userId) ?? false,
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
  async createRound({
    terms,
    ...data
  }: {
    userId: string;
    topicId: string | null;
    terms: RoundTerm[];
  }) {
    const r: RoundRecord = {
      id: `round-${this.nextId++}`,
      ...data,
      termIds: terms.map((t) => t.id),
      terms,
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
        assigned: false,
      });
      bySubject.set(id, s);
    }
    return [...bySubject.values()];
  }
  async masteredByTopic() {
    return this.mastered;
  }
}

// ── Teacher content ─────────────────────────────────────────────────────────

type FakeTopic = Omit<TopicRecord, 'classes'> & { classes: string[] };
type FakeTerm = TermRecord & { pictureId: string | null };

export class FakeTeacherContentRepository extends TeacherContentRepository {
  subjectRows = [
    { id: 'chemistry', name: 'Chemistry', color: 'sunny' },
    { id: 'biology', name: 'Biology', color: 'coral' },
  ];
  topics = new Map<string, FakeTopic>();
  terms = new Map<string, FakeTerm>();
  pictures = new Map<
    string,
    { ownerId: string; diagram: string | null; state: TeacherPicture['state'] }
  >([['diagram-atom', { ownerId: 'library', diagram: 'atom', state: 'READY' }]]);
  private nextId = 1;
  private id(prefix: string) {
    return `${prefix}-${this.nextId++}`;
  }
  private touch(topicId: string) {
    const t = this.topics.get(topicId);
    if (t) t.updatedAt = new Date();
  }
  private picture(id: string | null): TeacherPicture | null {
    const p = id ? this.pictures.get(id) : undefined;
    return p && id
      ? {
          id,
          diagram: p.diagram,
          url: null,
          thumbUrl: null,
          width: 200,
          height: 200,
          state: p.state,
          altText: null,
        }
      : null;
  }
  private withTerms(t: FakeTopic): TopicWithTerms {
    return {
      ...structuredClone(t),
      terms: [...this.terms.values()]
        .filter((x) => x.topicId === t.id && x.status !== 'ARCHIVED')
        .sort((a, b) => a.position - b.position)
        .map(({ pictureId, ...x }) => ({
          ...structuredClone(x),
          picture: this.picture(pictureId),
        })),
    };
  }

  /** Test helper: a topic straight into the store. */
  seedTopic(data: Partial<FakeTopic> & { ownerId: string }): string {
    const id = data.id ?? this.id('topic');
    this.topics.set(id, {
      title: 'Atoms',
      subject: this.subjectRows[0]!,
      grade: 8,
      curriculumCode: null,
      status: 'DRAFT',
      visibility: 'CLASS',
      classes: [],
      updatedAt: new Date(),
      ...data,
      id,
    });
    return id;
  }

  async subjects() {
    return this.subjectRows;
  }
  async subjectExists(id: string) {
    return this.subjectRows.some((s) => s.id === id);
  }
  async topicsOwnedBy(ownerId: string) {
    return [...this.topics.values()]
      .filter((t) => t.ownerId === ownerId && t.status !== 'ARCHIVED')
      .map((t) => this.withTerms(t));
  }
  async libraryTopics() {
    return [...this.topics.values()]
      .filter((t) => t.visibility === 'LIBRARY' && t.status === 'PUBLISHED')
      .map((t) => this.withTerms(t));
  }
  async topicWithTerms(id: string) {
    const t = this.topics.get(id);
    return t ? this.withTerms(t) : null;
  }
  async createTopic(data: {
    ownerId: string;
    title: string;
    subjectId: string;
    grade: number;
    curriculumCode: string | null;
  }) {
    const { subjectId, ...rest } = data;
    return this.seedTopic({ ...rest, subject: this.subjectRows.find((s) => s.id === subjectId)! });
  }
  async updateTopic(id: string, patch: Parameters<TeacherContentRepository['updateTopic']>[1]) {
    const t = this.topics.get(id)!;
    const { subjectId, ...rest } = patch;
    Object.assign(t, rest, { updatedAt: new Date() });
    if (subjectId) t.subject = this.subjectRows.find((s) => s.id === subjectId)!;
  }
  async duplicateTopic(id: string, ownerId: string, title: string) {
    const source = this.withTerms(this.topics.get(id)!);
    const copy = this.seedTopic({
      ownerId,
      title,
      subject: source.subject,
      grade: source.grade,
      curriculumCode: source.curriculumCode,
    });
    source.terms.forEach((t, position) => {
      const termId = this.id('term');
      this.terms.set(termId, {
        ...structuredClone(t),
        id: termId,
        topicId: copy,
        position,
        status: 'DRAFT',
        version: 1,
        pictureId: t.picture?.id ?? null,
      });
    });
    return copy;
  }
  async publishTopic(id: string) {
    for (const t of this.terms.values())
      if (t.topicId === id && t.status === 'DRAFT') t.status = 'PUBLISHED';
    this.topics.get(id)!.status = 'PUBLISHED';
  }
  async reorderTerms(topicId: string, termIds: string[]) {
    termIds.forEach((id, position) => {
      this.terms.get(id)!.position = position;
    });
    this.touch(topicId);
  }
  async findTerm(id: string) {
    const t = this.terms.get(id);
    if (!t) return null;
    const { pictureId, ...rest } = structuredClone(t);
    return { ...rest, picture: this.picture(pictureId) };
  }
  async createTerm(topicId: string, data: TermData, status: TermRecord['status']) {
    const id = this.id('term');
    const positions = [...this.terms.values()]
      .filter((t) => t.topicId === topicId)
      .map((t) => t.position);
    const { pictureId, ...rest } = structuredClone(data);
    this.terms.set(id, {
      ...rest,
      pictureId,
      picture: null,
      id,
      topicId,
      position: Math.max(-1, ...positions) + 1,
      status,
      version: 1,
      updatedAt: new Date(),
    });
    this.touch(topicId);
    return id;
  }
  async updateTerm(
    id: string,
    data: TermData,
    meta: { status: TermRecord['status']; version: number },
  ) {
    const t = this.terms.get(id)!;
    Object.assign(t, structuredClone(data), meta, { updatedAt: new Date() });
    this.touch(t.topicId);
  }
  async setTermStatus(id: string, status: TermRecord['status']) {
    this.terms.get(id)!.status = status;
  }
  async deleteTerm(id: string) {
    this.terms.delete(id);
  }
  async findPicture(id: string) {
    return this.pictures.get(id) ?? null;
  }
  async libraryTermsInSubject(subjectId: string) {
    const library = new Set(
      [...this.topics.values()]
        .filter(
          (t) =>
            t.visibility === 'LIBRARY' && t.status === 'PUBLISHED' && t.subject.id === subjectId,
        )
        .map((t) => t.id),
    );
    return [...this.terms.values()]
      .filter((t) => library.has(t.topicId) && t.status === 'PUBLISHED')
      .map((t) => ({
        id: t.id,
        canonical: t.canonical,
        display: t.display,
        confusables: t.confusables,
      }));
  }
}

// ── Pictures ────────────────────────────────────────────────────────────────

export class FakePicturesRepository extends PicturesRepository {
  rows = new Map<string, PictureRecord>();
  async create(data: { id: string; ownerId: string; storageKey: string }) {
    const p: PictureRecord = {
      ...data,
      diagram: null,
      url: null,
      thumbUrl: null,
      width: null,
      height: null,
      state: 'UPLOADING',
      altText: null,
    };
    this.rows.set(p.id, p);
    return { ...p };
  }
  async find(id: string) {
    const p = this.rows.get(id);
    return p ? { ...p } : null;
  }
  async transition(id: string, from: PictureState, to: PictureState) {
    const p = this.rows.get(id);
    if (!p || p.state !== from) return false;
    p.state = to;
    return true;
  }
  async markReady(
    id: string,
    data: { url: string; thumbUrl: string; width: number; height: number },
  ) {
    Object.assign(this.rows.get(id)!, data, { state: 'READY' });
  }
  async markFailed(id: string) {
    this.rows.get(id)!.state = 'FAILED';
  }
  async update(id: string, data: { altText: string | null }) {
    Object.assign(this.rows.get(id)!, data);
    return { ...this.rows.get(id)! };
  }
  async processingIds() {
    return [...this.rows.values()].filter((p) => p.state === 'PROCESSING').map((p) => p.id);
  }
}

export class FakePictureStorage extends PictureStorage {
  configured = true;
  uploadsBucket = 'uploads';
  uploads = new Map<string, Buffer>();
  public = new Map<string, Buffer>();
  async createSignedUpload(path: string) {
    return { token: `token-for-${path}` };
  }
  async downloadUpload(path: string) {
    const b = this.uploads.get(path);
    if (!b) throw new Error('not found');
    return b;
  }
  async removeUpload(path: string) {
    this.uploads.delete(path);
  }
  async putPublic(path: string, data: Buffer) {
    this.public.set(path, data);
    return `https://cdn.test/${path}`;
  }
}

// ── Classes ─────────────────────────────────────────────────────────────────

export class FakeClassesRepository extends ClassesRepository {
  classes = new Map<string, ClassRecord & { createdAt: number }>();
  enrollments: Array<{ classId: string; studentId: string; joinedAt: Date }> = [];
  assignments: Array<{ classId: string; topicId: string; dueAt: Date | null }> = [];
  /** Topics that can be assigned, with what the student list shows */
  topics = new Map<
    string,
    AssignableTopic & { title: string; subject: string; color: string; termCount: number }
  >();
  constructor(private readonly users: FakeUsersRepository) {
    super();
  }
  private nextId = 1;

  async create(data: { teacherId: string; name: string; code: string }) {
    if ([...this.classes.values()].some((c) => c.code === data.code)) throw new CodeTaken();
    const id = `class-${this.nextId++}`;
    this.classes.set(id, { id, ...data, createdAt: this.nextId });
    return id;
  }
  async listForTeacher(teacherId: string) {
    return [...this.classes.values()]
      .filter((c) => c.teacherId === teacherId)
      .map(({ createdAt: _c, ...c }) => ({
        ...c,
        studentCount: this.enrollments.filter((e) => e.classId === c.id).length,
        topicCount: this.assignments.filter((a) => a.classId === c.id).length,
      }));
  }
  async find(id: string) {
    const c = this.classes.get(id);
    if (!c) return null;
    const { createdAt: _c, ...rest } = c;
    return rest;
  }
  async detail(id: string) {
    const c = await this.find(id);
    if (!c) return null;
    const students = await Promise.all(
      this.enrollments
        .filter((e) => e.classId === id)
        .map(async (e) => ({
          id: e.studentId,
          name: (await this.users.find(e.studentId))?.name ?? '?',
          joinedAt: e.joinedAt,
        })),
    );
    const topics = this.assignments
      .filter((a) => a.classId === id)
      .map((a) => {
        const t = this.topics.get(a.topicId)!;
        return { id: t.id, title: t.title, subject: t.subject, status: t.status, dueAt: a.dueAt };
      });
    return { ...c, studentCount: students.length, topicCount: topics.length, students, topics };
  }
  async update(id: string, data: { name?: string; code?: string }) {
    if (data.code && [...this.classes.values()].some((c) => c.code === data.code))
      throw new CodeTaken();
    Object.assign(this.classes.get(id)!, data);
  }
  async topicsByIds(ids: string[]) {
    return ids.flatMap((id) => {
      const t = this.topics.get(id);
      return t
        ? [{ id: t.id, ownerId: t.ownerId, status: t.status, visibility: t.visibility }]
        : [];
    });
  }
  async setTopics(classId: string, topics: Array<{ topicId: string; dueAt: Date | null }>) {
    this.assignments = [
      ...this.assignments.filter((a) => a.classId !== classId),
      ...topics.map((t) => ({ classId, ...t })),
    ];
  }
  async removeStudent(classId: string, studentId: string) {
    this.enrollments = this.enrollments.filter(
      (e) => !(e.classId === classId && e.studentId === studentId),
    );
  }
  async findByCode(code: string) {
    return (
      (await Promise.all([...this.classes.keys()].map((id) => this.find(id)))).find(
        (c) => c?.code === code,
      ) ?? null
    );
  }
  async enroll(classId: string, studentId: string) {
    if (this.enrollments.some((e) => e.classId === classId && e.studentId === studentId))
      return false;
    this.enrollments.push({ classId, studentId, joinedAt: new Date() });
    return true;
  }
  async classesForStudent(studentId: string, onlyClassId?: string) {
    const mine = this.enrollments
      .filter((e) => e.studentId === studentId && (!onlyClassId || e.classId === onlyClassId))
      .map((e) => this.classes.get(e.classId)!);
    return Promise.all(
      mine.map(async (c) => ({
        id: c.id,
        name: c.name,
        teacherName: (await this.users.find(c.teacherId))?.name ?? '?',
        topics: this.assignments
          .filter((a) => a.classId === c.id && this.topics.get(a.topicId)?.status === 'PUBLISHED')
          .map((a) => {
            const t = this.topics.get(a.topicId)!;
            return {
              id: t.id,
              title: t.title,
              subject: t.subject,
              color: t.color,
              termCount: t.termCount,
              dueAt: a.dueAt,
            };
          }),
      })),
    );
  }
}

// ── Reports ─────────────────────────────────────────────────────────────────

export class FakeReportsRepository extends ReportsRepository {
  studentsByClass = new Map<string, StudentMeta[]>();
  termsByClass = new Map<string, TermMeta[]>();
  topicsByClass = new Map<string, string[]>();
  rows: AttemptRow[] = [];
  rounds: FinishedRound[] = [];
  async students(classId: string) {
    return this.studentsByClass.get(classId) ?? [];
  }
  async terms(classId: string) {
    return this.termsByClass.get(classId) ?? [];
  }
  async attempts(q: { studentIds: string[]; termIds: string[]; since: Date | null }) {
    return this.rows.filter(
      (r) =>
        q.studentIds.includes(r.studentId) &&
        q.termIds.includes(r.termId) &&
        (!q.since || r.createdAt >= q.since),
    );
  }
  async finishedRounds(q: { studentIds: string[]; topicIds: string[]; limit: number }) {
    return this.rounds
      .filter((r) => q.studentIds.includes(r.studentId) && q.topicIds.includes(r.topicId))
      .slice(0, q.limit);
  }
  async topicIds(classId: string) {
    return this.topicsByClass.get(classId) ?? [];
  }
}
