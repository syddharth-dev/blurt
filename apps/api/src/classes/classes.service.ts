import {
  BadRequestException,
  ForbiddenException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ERROR_CODES,
  type AssignTopics,
  type JoinClassResult,
  type StudentClass,
  type StudentClasses,
  type TeacherClassDetail,
  type TeacherClassList,
  type UpdateClass,
} from '@blurt/shared/schemas';
import type { AuthUser } from '../auth/supabase-jwt.guard.js';
import { apiError } from '../common/errors.js';
import { ContentRepository } from '../content/content.repository.js';
import { UsersService } from '../users/users.service.js';
import { newClassCode } from './class-code.js';
import {
  ClassesRepository,
  CodeTaken,
  type ClassDetailRow,
  type StudentClassRow,
} from './classes.repository.js';

/** Due dates are days ("YYYY-MM-DD"), stored at noon UTC so no time zone moves them. */
const toDueAt = (day: string | null) => (day ? new Date(`${day}T12:00:00.000Z`) : null);
const toDueOn = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : null);

/**
 * Classes (TEACHER_DASHBOARD.md → Classes). A teacher manages only the classes they teach
 * (403 otherwise, AGENTS.md rule 9; admins can manage any). Students join with the class code
 * and then see the published topics assigned to the class, never locked by level.
 */
@Injectable()
export class ClassesService {
  constructor(
    private readonly repo: ClassesRepository,
    private readonly content: ContentRepository,
    private readonly users: UsersService,
    private readonly makeCode: () => string = newClassCode,
  ) {}

  // ── teacher ────────────────────────────────────────────────────────────────

  async list(auth: AuthUser): Promise<TeacherClassList> {
    const rows = await this.repo.listForTeacher(auth.id);
    return { classes: rows.map(({ teacherId: _t, ...c }) => c) };
  }

  async create(auth: AuthUser, name: string): Promise<TeacherClassDetail> {
    await this.users.ensure(auth);
    const id = await this.withFreshCode((code) =>
      this.repo.create({ teacherId: auth.id, name, code }),
    );
    return this.detail(auth, id);
  }

  async detail(auth: AuthUser, id: string): Promise<TeacherClassDetail> {
    await this.ownClass(auth, id);
    const row = await this.repo.detail(id);
    if (!row) throw this.notFound();
    return this.shape(row);
  }

  async update(auth: AuthUser, id: string, body: UpdateClass): Promise<TeacherClassDetail> {
    await this.ownClass(auth, id);
    if (body.name) await this.repo.update(id, { name: body.name });
    if (body.newCode) await this.withFreshCode((code) => this.repo.update(id, { code }));
    return this.detail(auth, id);
  }

  /** Your own topics or published library topics. Students only ever see the published ones. */
  async assign(auth: AuthUser, id: string, body: AssignTopics): Promise<TeacherClassDetail> {
    await this.ownClass(auth, id);
    const ids = [...new Set(body.topics.map((t) => t.topicId))];
    if (ids.length !== body.topics.length)
      throw new BadRequestException('A topic is listed twice.');
    const topics = new Map((await this.repo.topicsByIds(ids)).map((t) => [t.id, t]));
    const admin = (await this.users.ensure(auth)).role === 'ADMIN';
    for (const topicId of ids) {
      const t = topics.get(topicId);
      if (!t || t.status === 'ARCHIVED')
        throw new BadRequestException("One of those topics isn't available.");
      const library = t.visibility === 'LIBRARY' && t.status === 'PUBLISHED';
      if (!library && t.ownerId !== auth.id && !admin)
        throw new ForbiddenException('That topic belongs to another teacher.');
    }
    await this.repo.setTopics(
      id,
      body.topics.map((t) => ({ topicId: t.topicId, dueAt: toDueAt(t.dueOn) })),
    );
    return this.detail(auth, id);
  }

  async removeStudent(auth: AuthUser, id: string, studentId: string): Promise<TeacherClassDetail> {
    await this.ownClass(auth, id);
    await this.repo.removeStudent(id, studentId);
    return this.detail(auth, id);
  }

  // ── student ────────────────────────────────────────────────────────────────

  async join(auth: AuthUser, code: string): Promise<JoinClassResult> {
    await this.users.ensure(auth);
    const found = await this.repo.findByCode(code);
    if (!found) {
      throw apiError(
        HttpStatus.NOT_FOUND,
        ERROR_CODES.classNotFound,
        'No class has that code. Check it with your teacher.',
      );
    }
    const joined = await this.repo.enroll(found.id, auth.id);
    const [row] = await this.repo.classesForStudent(auth.id, found.id);
    if (!row) throw this.notFound();
    return { class: await this.studentShape(auth.id, row), alreadyMember: !joined };
  }

  async mine(auth: AuthUser): Promise<StudentClasses> {
    await this.users.ensure(auth);
    const rows = await this.repo.classesForStudent(auth.id);
    const mastered = await this.content.masteredByTopic(auth.id);
    return { classes: rows.map((r) => this.toStudentClass(r, mastered)) };
  }

  // ── helpers ────────────────────────────────────────────────────────────────

  /** The class, if this user teaches it (or is an admin). 404 if missing, 403 otherwise. */
  access(auth: AuthUser, id: string) {
    return this.ownClass(auth, id);
  }

  private async ownClass(auth: AuthUser, id: string) {
    const c = await this.repo.find(id);
    if (!c) throw this.notFound();
    if (c.teacherId === auth.id) return c;
    if ((await this.users.ensure(auth)).role === 'ADMIN') return c;
    throw new ForbiddenException('That class belongs to another teacher.');
  }

  /** Codes are random; on the rare clash, try another. */
  private async withFreshCode<T>(fn: (code: string) => Promise<T>): Promise<T> {
    for (let i = 0; i < 5; i++) {
      try {
        return await fn(this.makeCode());
      } catch (e) {
        if (!(e instanceof CodeTaken)) throw e;
      }
    }
    throw new Error('Could not find a free class code');
  }

  private async studentShape(userId: string, row: StudentClassRow): Promise<StudentClass> {
    return this.toStudentClass(row, await this.content.masteredByTopic(userId));
  }

  private toStudentClass(r: StudentClassRow, mastered: Map<string, number>): StudentClass {
    const topics = r.topics
      .map((t) => ({
        id: t.id,
        title: t.title,
        subject: t.subject,
        color: t.color,
        termCount: t.termCount,
        mastered: mastered.get(t.id) ?? 0,
        dueOn: toDueOn(t.dueAt),
      }))
      // Due soonest first, then undated, then by title.
      .sort((a, b) =>
        a.dueOn && b.dueOn
          ? a.dueOn.localeCompare(b.dueOn)
          : a.dueOn
            ? -1
            : b.dueOn
              ? 1
              : a.title.localeCompare(b.title),
      );
    return { id: r.id, name: r.name, teacherName: r.teacherName, topics };
  }

  private shape(row: ClassDetailRow): TeacherClassDetail {
    return {
      id: row.id,
      name: row.name,
      code: row.code,
      studentCount: row.studentCount,
      topicCount: row.topicCount,
      students: row.students.map((s) => ({ ...s, joinedAt: s.joinedAt.toISOString() })),
      topics: row.topics.map(({ dueAt, ...t }) => ({ ...t, dueOn: toDueOn(dueAt) })),
    };
  }

  private notFound() {
    return new NotFoundException("That class isn't here.");
  }
}
