import { Injectable } from '@nestjs/common';
import type { Highlight, Status, SubjectOption, TeacherPicture } from '@blurt/shared/schemas';
import { PrismaService } from '../common/prisma/prisma.service.js';
import type { Prisma } from '../generated/prisma/client.js';

export type Visibility = 'PRIVATE' | 'CLASS' | 'LIBRARY';

export type TopicRecord = {
  id: string;
  ownerId: string;
  title: string;
  subject: SubjectOption;
  grade: number;
  curriculumCode: string | null;
  status: Status;
  visibility: Visibility;
  classes: string[];
  updatedAt: Date;
};

/** What a teacher can set on a term (after defaults are filled in). */
export type TermData = {
  canonical: string;
  display: string;
  syllables: string;
  clue: string;
  fact: string;
  accept: string[];
  close: Array<{ text: string; reason: string }>;
  confusables: Array<{ text: string; feedback: string }>;
  difficulty: number;
  pictureId: string | null;
  highlight: Highlight | null;
};

export type TermRecord = Omit<TermData, 'pictureId'> & {
  id: string;
  topicId: string;
  position: number;
  status: Status;
  version: number;
  picture: TeacherPicture | null;
  updatedAt: Date;
};

export type TopicWithTerms = TopicRecord & { terms: TermRecord[] };

export type CandidateTerm = {
  id: string;
  canonical: string;
  display: string;
  confusables: Array<{ text: string }>;
};

/** Content a teacher authors (TEACHER_DASHBOARD.md). Ownership is checked in TeacherService. */
export abstract class TeacherContentRepository {
  abstract subjects(): Promise<SubjectOption[]>;
  abstract subjectExists(id: string): Promise<boolean>;
  /** Topics this user owns, not archived, with their live (not archived) terms. */
  abstract topicsOwnedBy(ownerId: string): Promise<TopicWithTerms[]>;
  /** Published starter-library topics, to copy from. */
  abstract libraryTopics(): Promise<TopicWithTerms[]>;
  abstract topicWithTerms(id: string): Promise<TopicWithTerms | null>;
  abstract createTopic(data: {
    ownerId: string;
    title: string;
    subjectId: string;
    grade: number;
    curriculumCode: string | null;
  }): Promise<string>;
  abstract updateTopic(
    id: string,
    patch: Partial<{
      title: string;
      subjectId: string;
      grade: number;
      curriculumCode: string | null;
      status: Status;
    }>,
  ): Promise<void>;
  /** Copies the topic and its live terms as drafts (version 1) for a new owner. */
  abstract duplicateTopic(id: string, ownerId: string, title: string): Promise<string>;
  /** Publishes the topic and every live term in it. */
  abstract publishTopic(id: string): Promise<void>;
  /** Sets positions to the order given (ids are the topic's live terms). */
  abstract reorderTerms(topicId: string, termIds: string[]): Promise<void>;
  abstract findTerm(id: string): Promise<TermRecord | null>;
  abstract createTerm(topicId: string, data: TermData, status: Status): Promise<string>;
  abstract updateTerm(
    id: string,
    data: TermData,
    meta: { status: Status; version: number },
  ): Promise<void>;
  abstract setTermStatus(id: string, status: Status): Promise<void>;
  abstract deleteTerm(id: string): Promise<void>;
  abstract findPicture(
    id: string,
  ): Promise<{ ownerId: string; diagram: string | null; state: TeacherPicture['state'] } | null>;
  /** Published library terms in a subject (for confusable suggestions). */
  abstract libraryTermsInSubject(subjectId: string): Promise<CandidateTerm[]>;
}

// ── Prisma ───────────────────────────────────────────────────────────────────

const termInclude = {
  variants: true,
  confusables: true,
  picture: true,
} satisfies Prisma.TermInclude;

const liveTerms = { status: { not: 'ARCHIVED' } } satisfies Prisma.TermWhereInput;

const topicInclude = {
  subject: true,
  classes: { include: { class: { select: { name: true } } } },
  terms: { where: liveTerms, orderBy: { position: 'asc' }, include: termInclude },
} satisfies Prisma.TopicInclude;

type TermRow = Prisma.TermGetPayload<{ include: typeof termInclude }>;
type TopicRow = Prisma.TopicGetPayload<{ include: typeof topicInclude }>;

function toTerm(t: TermRow): TermRecord {
  const highlight = t.highlight as Highlight | null;
  return {
    id: t.id,
    topicId: t.topicId,
    position: t.position,
    status: t.status,
    version: t.version,
    canonical: t.canonical,
    display: t.display,
    syllables: t.syllables,
    clue: t.clue,
    fact: t.fact,
    accept: t.variants.filter((v) => v.kind === 'ACCEPT').map((v) => v.text),
    close: t.variants
      .filter((v) => v.kind === 'CLOSE')
      .map((v) => ({ text: v.text, reason: v.reason ?? '' })),
    confusables: t.confusables.map((c) => ({ text: c.otherText, feedback: c.feedback })),
    difficulty: t.difficulty,
    highlight: highlight && 'shape' in highlight ? highlight : null,
    picture: t.picture
      ? {
          id: t.picture.id,
          diagram: t.picture.diagram,
          url: t.picture.url,
          thumbUrl: t.picture.thumbUrl,
          state: t.picture.state,
          altText: t.picture.altText,
        }
      : null,
    updatedAt: t.updatedAt,
  };
}

function toTopic(t: TopicRow): TopicWithTerms {
  return {
    id: t.id,
    ownerId: t.ownerId,
    title: t.title,
    subject: { id: t.subject.id, name: t.subject.name, color: t.subject.color },
    grade: t.grade,
    curriculumCode: t.curriculumCode,
    status: t.status,
    visibility: t.visibility,
    classes: t.classes.map((c) => c.class.name),
    updatedAt: t.updatedAt,
    terms: t.terms.map(toTerm),
  };
}

/** Variant and confusable rows for a term (they're replaced wholesale on save). */
function children(data: TermData) {
  return {
    variants: {
      create: [
        ...data.accept.map((text) => ({ text, kind: 'ACCEPT' as const })),
        ...data.close.map((c) => ({ text: c.text, kind: 'CLOSE' as const, reason: c.reason })),
      ],
    },
    confusables: {
      create: data.confusables.map((c) => ({ otherText: c.text, feedback: c.feedback })),
    },
  };
}

function scalars(data: TermData) {
  return {
    canonical: data.canonical,
    display: data.display,
    syllables: data.syllables,
    clue: data.clue,
    fact: data.fact,
    difficulty: data.difficulty,
    pictureId: data.pictureId,
    highlight: (data.highlight ?? null) as Prisma.InputJsonValue,
  };
}

@Injectable()
export class PrismaTeacherContentRepository extends TeacherContentRepository {
  constructor(private readonly db: PrismaService) {
    super();
  }

  async subjects() {
    const rows = await this.db.subject.findMany({ orderBy: { name: 'asc' } });
    return rows.map((s) => ({ id: s.id, name: s.name, color: s.color }));
  }

  async subjectExists(id: string) {
    return (await this.db.subject.count({ where: { id } })) > 0;
  }

  async topicsOwnedBy(ownerId: string) {
    const rows = await this.db.topic.findMany({
      where: { ownerId, status: { not: 'ARCHIVED' } },
      orderBy: { updatedAt: 'desc' },
      include: topicInclude,
    });
    return rows.map(toTopic);
  }

  async libraryTopics() {
    const rows = await this.db.topic.findMany({
      where: { visibility: 'LIBRARY', status: 'PUBLISHED' },
      orderBy: [{ subject: { name: 'asc' } }, { title: 'asc' }],
      include: topicInclude,
    });
    return rows.map(toTopic);
  }

  async topicWithTerms(id: string) {
    const row = await this.db.topic.findUnique({ where: { id }, include: topicInclude });
    return row ? toTopic(row) : null;
  }

  async createTopic(data: {
    ownerId: string;
    title: string;
    subjectId: string;
    grade: number;
    curriculumCode: string | null;
  }) {
    const t = await this.db.topic.create({
      data: { ...data, status: 'DRAFT', visibility: 'CLASS' },
    });
    return t.id;
  }

  async updateTopic(id: string, patch: Parameters<TeacherContentRepository['updateTopic']>[1]) {
    await this.db.topic.update({ where: { id }, data: patch });
  }

  async duplicateTopic(id: string, ownerId: string, title: string) {
    const source = await this.topicWithTerms(id);
    if (!source) throw new Error(`topic ${id} not found`);
    return this.db.$transaction(async (tx) => {
      const copy = await tx.topic.create({
        data: {
          ownerId,
          title,
          subjectId: source.subject.id,
          grade: source.grade,
          curriculumCode: source.curriculumCode,
          status: 'DRAFT',
          visibility: 'CLASS',
        },
      });
      for (const [position, t] of source.terms.entries()) {
        const data: TermData = { ...t, pictureId: t.picture?.id ?? null };
        await tx.term.create({
          data: {
            topicId: copy.id,
            position,
            status: 'DRAFT',
            ...scalars(data),
            ...children(data),
          },
        });
      }
      return copy.id;
    });
  }

  async publishTopic(id: string) {
    await this.db.$transaction([
      this.db.term.updateMany({
        where: { topicId: id, status: 'DRAFT' },
        data: { status: 'PUBLISHED' },
      }),
      this.db.topic.update({ where: { id }, data: { status: 'PUBLISHED' } }),
    ]);
  }

  async reorderTerms(topicId: string, termIds: string[]) {
    await this.db.$transaction([
      ...termIds.map((id, position) =>
        this.db.term.update({ where: { id, topicId }, data: { position } }),
      ),
      // Touch the topic so lists sort by last edit.
      this.db.topic.update({ where: { id: topicId }, data: {} }),
    ]);
  }

  async findTerm(id: string) {
    const t = await this.db.term.findUnique({ where: { id }, include: termInclude });
    return t ? toTerm(t) : null;
  }

  async createTerm(topicId: string, data: TermData, status: Status) {
    return this.db.$transaction(async (tx) => {
      const last = await tx.term.aggregate({ where: { topicId }, _max: { position: true } });
      const t = await tx.term.create({
        data: {
          topicId,
          position: (last._max.position ?? -1) + 1,
          status,
          ...scalars(data),
          ...children(data),
        },
      });
      await tx.topic.update({ where: { id: topicId }, data: {} });
      return t.id;
    });
  }

  async updateTerm(id: string, data: TermData, meta: { status: Status; version: number }) {
    await this.db.$transaction(async (tx) => {
      await tx.termVariant.deleteMany({ where: { termId: id } });
      await tx.confusable.deleteMany({ where: { termId: id } });
      const t = await tx.term.update({
        where: { id },
        data: { ...meta, ...scalars(data), ...children(data) },
      });
      await tx.topic.update({ where: { id: t.topicId }, data: {} });
    });
  }

  async setTermStatus(id: string, status: Status) {
    await this.db.term.update({ where: { id }, data: { status } });
  }

  async deleteTerm(id: string) {
    await this.db.$transaction([
      this.db.termVariant.deleteMany({ where: { termId: id } }),
      this.db.confusable.deleteMany({ where: { termId: id } }),
      this.db.term.delete({ where: { id } }),
    ]);
  }

  async findPicture(id: string) {
    return this.db.picture.findUnique({
      where: { id },
      select: { ownerId: true, diagram: true, state: true },
    });
  }

  async libraryTermsInSubject(subjectId: string) {
    const rows = await this.db.term.findMany({
      where: {
        status: 'PUBLISHED',
        topic: { subjectId, visibility: 'LIBRARY', status: 'PUBLISHED' },
      },
      select: { id: true, canonical: true, display: true, confusables: true },
    });
    return rows.map((r) => ({
      id: r.id,
      canonical: r.canonical,
      display: r.display,
      confusables: r.confusables.map((c) => ({ text: c.otherText })),
    }));
  }
}
