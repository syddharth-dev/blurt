import { Injectable, NotFoundException } from '@nestjs/common';
import type {
  ClassReport,
  ReportRange,
  StudentReport,
  TeacherOverview,
} from '@blurt/shared/schemas';
import type { AuthUser } from '../auth/supabase-jwt.guard.js';
import { ClassesService } from '../classes/classes.service.js';
import { ClassesRepository } from '../classes/classes.repository.js';
import {
  buildClassReport,
  byMostMissed,
  sinceFor,
  summarize,
  termStats,
  type TermMeta,
} from './build-report.js';
import { ReportsRepository } from './reports.repository.js';

/**
 * Teacher reports (TEACHER_DASHBOARD.md → Reports). Only the class's teacher, or an admin, can
 * see a class's report (ClassesService.access: 403 otherwise). A report covers students
 * enrolled in the class, on terms from topics assigned to it: practice and daily rounds count
 * too, since they're the same terms.
 */
@Injectable()
export class ReportsService {
  constructor(
    private readonly repo: ReportsRepository,
    private readonly classes: ClassesService,
    private readonly classesRepo: ClassesRepository,
  ) {}

  async classReport(auth: AuthUser, classId: string, range: ReportRange): Promise<ClassReport> {
    await this.classes.access(auth, classId);
    const since = sinceFor(range);
    const { students, terms, rows } = await this.load(classId, since);
    return buildClassReport({ range, since, students, terms, rows });
  }

  async studentReport(
    auth: AuthUser,
    classId: string,
    studentId: string,
    range: ReportRange,
  ): Promise<StudentReport> {
    const c = await this.classes.access(auth, classId);
    const since = sinceFor(range);
    const students = await this.repo.students(classId);
    const student = students.find((s) => s.id === studentId);
    if (!student) throw new NotFoundException("That student isn't in this class.");
    const terms = await this.termMap(classId);
    const rows = await this.repo.attempts({
      studentIds: [studentId],
      termIds: [...terms.keys()],
      since,
    });
    const { rounds, answers, accuracy, lastPlayedAt } = summarize(rows);
    return {
      range,
      since: since ? since.toISOString() : null,
      student,
      className: c.name,
      summary: { rounds, answers, accuracy, lastPlayedAt },
      terms: termStats(rows, terms).sort(
        (a, b) => (a.accuracy ?? 1) - (b.accuracy ?? 1) || b.misses - a.misses,
      ),
    };
  }

  async overview(auth: AuthUser): Promise<TeacherOverview> {
    const classes = await this.classesRepo.listForTeacher(auth.id);
    const since = sinceFor('7d');
    const out: TeacherOverview = { classes: [], recent: [], missedThisWeek: [] };
    for (const c of classes) {
      const { students, terms, rows } = await this.load(c.id, since);
      const week = summarize(rows);
      out.classes.push({
        id: c.id,
        name: c.name,
        studentCount: students.length,
        activeThisWeek: new Set(rows.map((r) => r.studentId)).size,
        roundsThisWeek: week.rounds,
        accuracyThisWeek: week.accuracy,
      });
      out.missedThisWeek.push(
        ...termStats(rows, terms)
          .filter((t) => t.misses > 0)
          .map((t) => ({ ...t, className: c.name })),
      );
      const names = new Map(students.map((s) => [s.id, s.name]));
      const finished = await this.repo.finishedRounds({
        studentIds: students.map((s) => s.id),
        topicIds: await this.repo.topicIds(c.id),
        limit: 10,
      });
      out.recent.push(
        ...finished.map((r) => ({
          studentName: names.get(r.studentId) ?? 'A student',
          className: c.name,
          topic: r.topic,
          correct: r.correct,
          total: r.total,
          finishedAt: r.finishedAt.toISOString(),
        })),
      );
    }
    out.missedThisWeek = out.missedThisWeek.sort(byMostMissed).slice(0, 5);
    out.recent = out.recent.sort((a, b) => b.finishedAt.localeCompare(a.finishedAt)).slice(0, 10);
    return out;
  }

  private async termMap(classId: string): Promise<Map<string, TermMeta>> {
    return new Map((await this.repo.terms(classId)).map((t) => [t.termId, t]));
  }

  private async load(classId: string, since: Date | null) {
    const [students, terms] = await Promise.all([
      this.repo.students(classId),
      this.termMap(classId),
    ]);
    const rows = await this.repo.attempts({
      studentIds: students.map((s) => s.id),
      termIds: [...terms.keys()],
      since,
    });
    return { students, terms, rows };
  }
}
