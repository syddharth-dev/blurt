import { Injectable } from '@nestjs/common';
import type { Status } from '@blurt/shared/schemas';
import { PrismaService } from '../common/prisma/prisma.service.js';

export type ClassRecord = { id: string; name: string; code: string; teacherId: string };

export type ClassSummaryRow = ClassRecord & { studentCount: number; topicCount: number };

export type ClassDetailRow = ClassSummaryRow & {
  students: Array<{ id: string; name: string; joinedAt: Date }>;
  topics: Array<{ id: string; title: string; subject: string; status: Status; dueAt: Date | null }>;
};

export type StudentClassRow = {
  id: string;
  name: string;
  teacherName: string;
  topics: Array<{
    id: string;
    title: string;
    subject: string;
    color: string;
    termCount: number;
    dueAt: Date | null;
  }>;
};

export type AssignableTopic = {
  id: string;
  ownerId: string;
  status: Status;
  visibility: 'PRIVATE' | 'CLASS' | 'LIBRARY';
};

/** Thrown when a join code is already taken, so the service can try another. */
export class CodeTaken extends Error {}

export abstract class ClassesRepository {
  /** Throws CodeTaken if the code exists. */
  abstract create(data: { teacherId: string; name: string; code: string }): Promise<string>;
  abstract listForTeacher(teacherId: string): Promise<ClassSummaryRow[]>;
  abstract find(id: string): Promise<ClassRecord | null>;
  abstract detail(id: string): Promise<ClassDetailRow | null>;
  /** Throws CodeTaken if the new code exists. */
  abstract update(id: string, data: { name?: string; code?: string }): Promise<void>;
  abstract topicsByIds(ids: string[]): Promise<AssignableTopic[]>;
  /** Replaces the class's assigned topics. */
  abstract setTopics(
    classId: string,
    topics: Array<{ topicId: string; dueAt: Date | null }>,
  ): Promise<void>;
  abstract removeStudent(classId: string, studentId: string): Promise<void>;
  abstract findByCode(code: string): Promise<ClassRecord | null>;
  /** Returns false if the student was already in the class. */
  abstract enroll(classId: string, studentId: string): Promise<boolean>;
  /** The student's classes with their published assigned topics. */
  abstract classesForStudent(studentId: string, onlyClassId?: string): Promise<StudentClassRow[]>;
}

const isUnique = (e: unknown) => (e as { code?: string } | null)?.code === 'P2002';

@Injectable()
export class PrismaClassesRepository extends ClassesRepository {
  constructor(private readonly db: PrismaService) {
    super();
  }

  async create(data: { teacherId: string; name: string; code: string }) {
    try {
      return (await this.db.class.create({ data })).id;
    } catch (e) {
      if (isUnique(e)) throw new CodeTaken();
      throw e;
    }
  }

  async listForTeacher(teacherId: string) {
    const rows = await this.db.class.findMany({
      where: { teacherId },
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { enrollments: true, topics: true } } },
    });
    return rows.map((c) => ({
      id: c.id,
      name: c.name,
      code: c.code,
      teacherId: c.teacherId,
      studentCount: c._count.enrollments,
      topicCount: c._count.topics,
    }));
  }

  find(id: string) {
    return this.db.class.findUnique({
      where: { id },
      select: { id: true, name: true, code: true, teacherId: true },
    });
  }

  async detail(id: string) {
    const c = await this.db.class.findUnique({
      where: { id },
      include: {
        enrollments: {
          orderBy: { joinedAt: 'asc' },
          include: { student: { select: { id: true, name: true } } },
        },
        topics: { include: { topic: { include: { subject: true } } } },
      },
    });
    if (!c) return null;
    return {
      id: c.id,
      name: c.name,
      code: c.code,
      teacherId: c.teacherId,
      studentCount: c.enrollments.length,
      topicCount: c.topics.length,
      students: c.enrollments.map((e) => ({
        id: e.student.id,
        name: e.student.name,
        joinedAt: e.joinedAt,
      })),
      topics: c.topics.map((ct) => ({
        id: ct.topic.id,
        title: ct.topic.title,
        subject: ct.topic.subject.name,
        status: ct.topic.status,
        dueAt: ct.dueAt,
      })),
    };
  }

  async update(id: string, data: { name?: string; code?: string }) {
    try {
      await this.db.class.update({ where: { id }, data });
    } catch (e) {
      if (isUnique(e)) throw new CodeTaken();
      throw e;
    }
  }

  topicsByIds(ids: string[]) {
    return this.db.topic.findMany({
      where: { id: { in: ids } },
      select: { id: true, ownerId: true, status: true, visibility: true },
    });
  }

  async setTopics(classId: string, topics: Array<{ topicId: string; dueAt: Date | null }>) {
    await this.db.$transaction([
      this.db.classTopic.deleteMany({ where: { classId } }),
      this.db.classTopic.createMany({ data: topics.map((t) => ({ classId, ...t })) }),
    ]);
  }

  async removeStudent(classId: string, studentId: string) {
    await this.db.enrollment.deleteMany({ where: { classId, studentId } });
  }

  findByCode(code: string) {
    return this.db.class.findUnique({
      where: { code },
      select: { id: true, name: true, code: true, teacherId: true },
    });
  }

  async enroll(classId: string, studentId: string) {
    const existing = await this.db.enrollment.findUnique({
      where: { classId_studentId: { classId, studentId } },
    });
    if (existing) return false;
    try {
      await this.db.enrollment.create({ data: { classId, studentId } });
      return true;
    } catch (e) {
      if (isUnique(e)) return false; // joined twice at once
      throw e;
    }
  }

  async classesForStudent(studentId: string, onlyClassId?: string) {
    const rows = await this.db.class.findMany({
      where: { enrollments: { some: { studentId } }, ...(onlyClassId ? { id: onlyClassId } : {}) },
      orderBy: { createdAt: 'asc' },
      include: {
        teacher: { select: { name: true } },
        topics: {
          where: { topic: { status: 'PUBLISHED' } },
          include: {
            topic: {
              include: {
                subject: true,
                _count: { select: { terms: { where: { status: 'PUBLISHED' } } } },
              },
            },
          },
        },
      },
    });
    return rows.map((c) => ({
      id: c.id,
      name: c.name,
      teacherName: c.teacher.name,
      topics: c.topics.map((ct) => ({
        id: ct.topic.id,
        title: ct.topic.title,
        subject: ct.topic.subject.name,
        color: ct.topic.subject.color,
        termCount: ct.topic._count.terms,
        dueAt: ct.dueAt,
      })),
    }));
  }
}
