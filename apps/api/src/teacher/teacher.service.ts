import {
  BadRequestException,
  ForbiddenException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  defaultDisplay,
  suggestConfusables,
  suggestSyllables,
  termChecks,
} from '@blurt/shared/authoring';
import {
  ERROR_CODES,
  TermDraft,
  type ConfusableSuggestions,
  type ConfusableSuggestionsRequest,
  type CreateTerm,
  type CreateTopic,
  type SubjectList,
  type TeacherTerm,
  type TeacherTopicDetail,
  type TeacherTopicList,
  type TeacherTopicSummary,
  type UpdateTerm,
  type UpdateTopic,
} from '@blurt/shared/schemas';
import type { AuthUser } from '../auth/supabase-jwt.guard.js';
import { apiError } from '../common/errors.js';
import type { UserRecord } from '../users/users.repository.js';
import { UsersService } from '../users/users.service.js';
import {
  TeacherContentRepository,
  type TermData,
  type TermRecord,
  type TopicRecord,
  type TopicWithTerms,
} from './teacher-content.repository.js';

/**
 * Topics and terms a teacher authors (TEACHER_DASHBOARD.md). Rules:
 * - A teacher reads and changes only topics they own; anyone else's is 403 (AGENTS.md rule 9).
 *   Admins can open every topic. Published library topics can be copied by any teacher.
 * - Only published terms reach students. Publishing runs the shared termChecks.
 * - Editing a published term bumps its version; rounds in progress keep their snapshot.
 * - Deleting a published term archives it (reports still need it); a draft is deleted.
 */
@Injectable()
export class TeacherService {
  constructor(
    private readonly repo: TeacherContentRepository,
    private readonly users: UsersService,
  ) {}

  async subjects(): Promise<SubjectList> {
    return { subjects: await this.repo.subjects() };
  }

  async listTopics(auth: AuthUser): Promise<TeacherTopicList> {
    const topics = await this.repo.topicsOwnedBy(auth.id);
    return { topics: topics.map((t) => this.summary(t)) };
  }

  async library(): Promise<TeacherTopicList> {
    const topics = await this.repo.libraryTopics();
    return { topics: topics.map((t) => this.summary(t)) };
  }

  async topic(auth: AuthUser, id: string): Promise<TeacherTopicDetail> {
    const topic = await this.ownTopic(auth, id);
    return this.detail(topic);
  }

  async createTopic(auth: AuthUser, body: CreateTopic): Promise<TeacherTopicDetail> {
    await this.assertSubject(body.subjectId);
    const id = await this.repo.createTopic({
      ownerId: auth.id,
      title: body.title,
      subjectId: body.subjectId,
      grade: body.grade,
      curriculumCode: body.curriculumCode || null,
    });
    return this.detail(await this.loadTopic(id));
  }

  async updateTopic(auth: AuthUser, id: string, body: UpdateTopic): Promise<TeacherTopicDetail> {
    const topic = await this.ownTopic(auth, id);
    if (topic.status === 'ARCHIVED') throw this.archived();
    if (body.subjectId) await this.assertSubject(body.subjectId);
    // Unlock levels are for the shared library: class topics are never locked.
    if (body.unlockLevel !== undefined && topic.visibility !== 'LIBRARY') {
      throw new BadRequestException('Only starter-library topics have an unlock level.');
    }
    await this.repo.updateTopic(id, {
      ...body,
      ...(body.curriculumCode !== undefined ? { curriculumCode: body.curriculumCode || null } : {}),
    });
    return this.detail(await this.loadTopic(id));
  }

  async archiveTopic(auth: AuthUser, id: string): Promise<TeacherTopicDetail> {
    await this.ownTopic(auth, id);
    await this.repo.updateTopic(id, { status: 'ARCHIVED' });
    return this.detail(await this.loadTopic(id));
  }

  /** A draft copy owned by the caller. Works on their own topics and on the starter library. */
  async duplicateTopic(auth: AuthUser, id: string): Promise<TeacherTopicDetail> {
    const source = await this.repo.topicWithTerms(id);
    if (!source) throw this.topicNotFound();
    const isLibrary = source.visibility === 'LIBRARY' && source.status === 'PUBLISHED';
    if (!isLibrary) await this.assertAccess(auth, source);
    const title = isLibrary ? source.title : `${source.title} (copy)`;
    const copyId = await this.repo.duplicateTopic(id, auth.id, title.slice(0, 80));
    return this.detail(await this.loadTopic(copyId));
  }

  async publishTopic(auth: AuthUser, id: string): Promise<TeacherTopicDetail> {
    const topic = await this.ownTopic(auth, id);
    if (topic.status === 'ARCHIVED') throw this.archived();
    if (!topic.terms.length) throw this.notReady('Add at least one term before publishing.');
    const notReady = topic.terms.filter((t) => this.checks(topic, t).problems.length);
    if (notReady.length) {
      const names = notReady.map((t) => t.display).join(', ');
      throw this.notReady(
        notReady.length === 1
          ? `${names} isn't ready yet. Fix it, then publish.`
          : `${notReady.length} terms aren't ready yet: ${names}.`,
      );
    }
    await this.repo.publishTopic(id);
    return this.detail(await this.loadTopic(id));
  }

  async reorderTerms(auth: AuthUser, id: string, termIds: string[]): Promise<TeacherTopicDetail> {
    const topic = await this.ownTopic(auth, id);
    const current = new Set(topic.terms.map((t) => t.id));
    const sameSet =
      termIds.length === current.size &&
      new Set(termIds).size === termIds.length &&
      termIds.every((t) => current.has(t));
    if (!sameSet) throw new BadRequestException("That order doesn't match this topic's terms.");
    await this.repo.reorderTerms(id, termIds);
    return this.detail(await this.loadTopic(id));
  }

  // ── terms ──────────────────────────────────────────────────────────────────

  async term(auth: AuthUser, id: string): Promise<TeacherTerm> {
    const { topic, term } = await this.ownTerm(auth, id);
    return this.toTeacherTerm(topic, term);
  }

  async createTerm(auth: AuthUser, topicId: string, body: CreateTerm): Promise<TeacherTerm> {
    const topic = await this.ownTopic(auth, topicId);
    if (topic.status === 'ARCHIVED') throw this.archived();
    const { publish, ...draft } = body;
    const data = this.fill(TermDraft.parse(draft));
    await this.assertPicture(auth, data.pictureId);
    if (publish) this.assertReady(topic, data, await this.pictureReady(data.pictureId));
    const id = await this.repo.createTerm(topicId, data, publish ? 'PUBLISHED' : 'DRAFT');
    return this.term(auth, id);
  }

  async updateTerm(auth: AuthUser, id: string, body: UpdateTerm): Promise<TeacherTerm> {
    const { topic, term } = await this.ownTerm(auth, id);
    const { publish, ...patch } = body;
    const before = this.dataOf(term);
    const merged = this.fill(
      TermDraft.parse({
        ...before,
        ...Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined)),
        // An emptied display or syllables field falls back to the suggestion.
        display: patch.display === undefined ? term.display : patch.display || undefined,
        syllables:
          patch.syllables === undefined
            ? patch.canonical && patch.canonical !== term.canonical
              ? undefined
              : term.syllables
            : patch.syllables || undefined,
      }),
    );
    if (merged.pictureId !== before.pictureId) await this.assertPicture(auth, merged.pictureId);

    const wasPublished = term.status === 'PUBLISHED';
    const status = wasPublished || publish ? 'PUBLISHED' : 'DRAFT';
    // Published terms must stay ready: students see every save.
    if (status === 'PUBLISHED') {
      this.assertReady(topic, merged, await this.pictureReady(merged.pictureId));
    }
    const changed = JSON.stringify(merged) !== JSON.stringify(before);
    const version = wasPublished && changed ? term.version + 1 : term.version;
    if (changed || status !== term.status) {
      await this.repo.updateTerm(id, merged, { status, version });
    }
    return this.term(auth, id);
  }

  async deleteTerm(auth: AuthUser, id: string): Promise<void> {
    const { term } = await this.ownTerm(auth, id);
    if (term.status === 'PUBLISHED') await this.repo.setTermStatus(id, 'ARCHIVED');
    else await this.repo.deleteTerm(id);
  }

  async confusableSuggestions(
    auth: AuthUser,
    body: ConfusableSuggestionsRequest,
  ): Promise<ConfusableSuggestions> {
    const topic = await this.ownTopic(auth, body.topicId);
    const nearby = topic.terms
      .filter((t) => t.id !== body.termId)
      .map((t) => ({ ...t, sameTopic: true }));
    const library = (await this.repo.libraryTermsInSubject(topic.subject.id)).filter(
      (t) => t.id !== body.termId,
    );
    const suggestions = suggestConfusables(body.answer, [...nearby, ...library]);
    return { suggestions: suggestions.map(({ score: _score, ...s }) => s) };
  }

  // ── access ─────────────────────────────────────────────────────────────────

  private async ownTopic(auth: AuthUser, id: string): Promise<TopicWithTerms> {
    const topic = await this.repo.topicWithTerms(id);
    if (!topic) throw this.topicNotFound();
    await this.assertAccess(auth, topic);
    return topic;
  }

  private async ownTerm(auth: AuthUser, id: string) {
    const term = await this.repo.findTerm(id);
    if (!term || term.status === 'ARCHIVED') throw new NotFoundException("That term isn't here.");
    const topic = await this.ownTopic(auth, term.topicId);
    return { topic, term };
  }

  /** Owner or admin; anyone else gets 403 (AGENTS.md rule 9). */
  private async assertAccess(auth: AuthUser, topic: TopicRecord) {
    if (topic.ownerId === auth.id) return;
    const user: UserRecord = await this.users.ensure(auth);
    if (user.role === 'ADMIN') return;
    throw new ForbiddenException('That topic belongs to another teacher.');
  }

  /** Your own picture, or a bundled diagram from the starter library. */
  private async assertPicture(auth: AuthUser, pictureId: string | null) {
    if (!pictureId) return;
    const picture = await this.repo.findPicture(pictureId);
    if (!picture) throw new BadRequestException("That picture doesn't exist.");
    if (picture.diagram || picture.ownerId === auth.id) return;
    const user = await this.users.ensure(auth);
    if (user.role !== 'ADMIN')
      throw new ForbiddenException('That picture belongs to another teacher.');
  }

  private async assertSubject(id: string) {
    if (!(await this.repo.subjectExists(id))) throw new BadRequestException('Pick a subject.');
  }

  private async loadTopic(id: string) {
    const topic = await this.repo.topicWithTerms(id);
    if (!topic) throw this.topicNotFound();
    return topic;
  }

  // ── checks and shapes ──────────────────────────────────────────────────────

  /** Fills in the defaults: display from the answer, syllables suggested. */
  private fill(d: ReturnType<typeof TermDraft.parse>): TermData {
    const canonical = d.canonical.trim();
    return {
      canonical,
      display: d.display || defaultDisplay(canonical),
      syllables: d.syllables || suggestSyllables(canonical),
      clue: d.clue,
      fact: d.fact,
      accept: d.accept,
      close: d.close,
      confusables: d.confusables,
      difficulty: d.difficulty,
      pictureId: d.pictureId ?? null,
      highlight: d.highlight ?? null,
    };
  }

  private dataOf(t: TermRecord): TermData {
    return {
      canonical: t.canonical,
      display: t.display,
      syllables: t.syllables,
      clue: t.clue,
      fact: t.fact,
      accept: t.accept,
      close: t.close,
      confusables: t.confusables,
      difficulty: t.difficulty,
      pictureId: t.picture?.id ?? null,
      highlight: t.highlight,
    };
  }

  /** Uploads count once processing has finished (Phase 4 step 3); diagrams are always ready. */
  private async pictureReady(pictureId: string | null) {
    if (!pictureId) return false;
    return (await this.repo.findPicture(pictureId))?.state === 'READY';
  }

  private assertReady(topic: TopicRecord, data: TermData, hasPicture: boolean) {
    const { problems } = termChecks(
      { ...data, hasPicture, hasHighlight: !!data.highlight },
      { requirePicture: topic.visibility !== 'LIBRARY' },
    );
    if (problems.length) throw this.notReady(problems.join(' '));
  }

  private checks(topic: TopicRecord, t: TermRecord) {
    return termChecks(
      {
        ...t,
        hasPicture: t.picture?.state === 'READY',
        hasHighlight: !!t.highlight,
        hasAltText: !!t.picture?.altText,
      },
      { requirePicture: topic.visibility !== 'LIBRARY' },
    );
  }

  private toTeacherTerm(topic: TopicRecord, t: TermRecord): TeacherTerm {
    return { ...t, ...this.checks(topic, t), updatedAt: t.updatedAt.toISOString() };
  }

  private summary(t: TopicWithTerms): TeacherTopicSummary {
    return {
      id: t.id,
      title: t.title,
      subject: t.subject,
      grade: t.grade,
      curriculumCode: t.curriculumCode,
      status: t.status,
      unlockLevel: t.unlockLevel,
      termCount: t.terms.length,
      termsNotReady: t.terms.filter((term) => this.checks(t, term).problems.length).length,
      classes: t.classes,
      updatedAt: t.updatedAt.toISOString(),
    };
  }

  private detail(t: TopicWithTerms): TeacherTopicDetail {
    return {
      ...this.summary(t),
      library: t.visibility === 'LIBRARY',
      terms: t.terms.map((term) => this.toTeacherTerm(t, term)),
    };
  }

  private topicNotFound() {
    return new NotFoundException("That topic isn't here.");
  }

  private archived() {
    return apiError(HttpStatus.CONFLICT, 'TOPIC_ARCHIVED', 'This topic is archived.');
  }

  private notReady(message: string) {
    return apiError(HttpStatus.UNPROCESSABLE_ENTITY, ERROR_CODES.notReady, message);
  }
}
