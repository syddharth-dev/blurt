import { HttpException } from '@nestjs/common';
import { authUser, FakeTeacherContentRepository, FakeUsersRepository } from '../../test/fakes.js';
import { UsersService } from '../users/users.service.js';
import { TeacherService } from './teacher.service.js';

const ready = {
  canonical: 'proton',
  clue: 'The positive particle in the nucleus.',
  fact: 'It weighs about the same as a neutron.',
  pictureId: 'diagram-atom',
  highlight: { shape: 'ellipse' as const, x: 0.4, y: 0.4, w: 0.2, h: 0.2 },
};

async function setup() {
  const users = new FakeUsersRepository();
  const repo = new FakeTeacherContentRepository();
  const service = new TeacherService(repo, new UsersService(users));
  await users.create({ id: 'tea-1', name: 'T1', email: 't1@s.test', role: 'TEACHER' });
  await users.create({ id: 'tea-2', name: 'T2', email: 't2@s.test', role: 'TEACHER' });
  await users.create({ id: 'adm', name: 'A', email: 'a@s.test', role: 'ADMIN' });
  const t1 = authUser('tea-1', 't1@s.test');
  const t2 = authUser('tea-2', 't2@s.test');
  const admin = authUser('adm', 'a@s.test');
  const topic = await service.createTopic(t1, { title: 'Atoms', subjectId: 'chemistry', grade: 8 });
  return { users, repo, service, t1, t2, admin, topicId: topic.id };
}

const status = (p: Promise<unknown>) =>
  p.then(
    () => 200,
    (e: unknown) => (e instanceof HttpException ? e.getStatus() : 500),
  );
const code = (p: Promise<unknown>) =>
  p.catch((e: HttpException) => (e.getResponse() as { code?: string }).code);

describe('TeacherService', () => {
  it('creates a draft term with display and syllables filled in', async () => {
    const { service, t1, topicId } = await setup();
    const term = await service.createTerm(t1, topicId, { canonical: 'nucleus' });
    expect(term).toMatchObject({
      status: 'DRAFT',
      version: 1,
      display: 'Nucleus',
      syllables: 'nu·cle·us',
    });
    expect(term.problems).toContain('Write a clue.');
  });

  it('another teacher gets 403 on every topic and term route (AGENTS.md rule 9)', async () => {
    const { service, t1, t2, topicId } = await setup();
    const term = await service.createTerm(t1, topicId, { canonical: 'proton' });
    const calls: Array<Promise<unknown>> = [
      service.topic(t2, topicId),
      service.updateTopic(t2, topicId, { title: 'Mine now' }),
      service.archiveTopic(t2, topicId),
      service.duplicateTopic(t2, topicId),
      service.publishTopic(t2, topicId),
      service.reorderTerms(t2, topicId, [term.id]),
      service.createTerm(t2, topicId, { canonical: 'neutron' }),
      service.term(t2, term.id),
      service.updateTerm(t2, term.id, { clue: 'x' }),
      service.deleteTerm(t2, term.id),
      service.confusableSuggestions(t2, { answer: 'proton', topicId }),
    ];
    for (const call of calls) expect(await status(call)).toBe(403);
    expect((await service.listTopics(t2)).topics).toEqual([]);
  });

  it('admins can open any topic', async () => {
    const { service, admin, topicId } = await setup();
    expect((await service.topic(admin, topicId)).title).toBe('Atoms');
  });

  it('a missing topic is 404', async () => {
    const { service, t1 } = await setup();
    expect(await status(service.topic(t1, 'nope'))).toBe(404);
  });

  it('refuses to publish a topic until every term passes the checks', async () => {
    const { service, t1, topicId } = await setup();
    expect(await code(service.publishTopic(t1, topicId))).toBe('NOT_READY'); // no terms
    const term = await service.createTerm(t1, topicId, { canonical: 'proton' });
    expect(await code(service.publishTopic(t1, topicId))).toBe('NOT_READY');
    await service.updateTerm(t1, term.id, ready);
    const published = await service.publishTopic(t1, topicId);
    expect(published.status).toBe('PUBLISHED');
    expect(published.terms[0]?.status).toBe('PUBLISHED');
  });

  it('refuses an answer that is also a confusable', async () => {
    const { service, t1, topicId } = await setup();
    const p = service.createTerm(t1, topicId, {
      ...ready,
      confusables: [{ text: 'Proton', feedback: 'no' }],
      publish: true,
    });
    expect(await code(p)).toBe('NOT_READY');
  });

  it('editing a published term bumps its version; a no-op save does not', async () => {
    const { service, t1, topicId } = await setup();
    const term = await service.createTerm(t1, topicId, { ...ready, publish: true });
    expect(term).toMatchObject({ status: 'PUBLISHED', version: 1 });
    expect((await service.updateTerm(t1, term.id, { clue: ready.clue })).version).toBe(1);
    expect((await service.updateTerm(t1, term.id, { clue: 'A new clue.' })).version).toBe(2);
  });

  it('a published term must stay ready: a save that breaks it is refused', async () => {
    const { service, t1, topicId } = await setup();
    const term = await service.createTerm(t1, topicId, { ...ready, publish: true });
    expect(await code(service.updateTerm(t1, term.id, { clue: '' }))).toBe('NOT_READY');
    expect((await service.term(t1, term.id)).clue).toBe(ready.clue);
  });

  it("can't attach another teacher's picture", async () => {
    const { service, repo, t1, topicId } = await setup();
    repo.pictures.set('pic-2', { ownerId: 'tea-2', diagram: null, state: 'READY' });
    expect(
      await status(service.createTerm(t1, topicId, { canonical: 'x', pictureId: 'pic-2' })),
    ).toBe(403);
  });

  it('deleting a draft removes it; deleting a published term archives it', async () => {
    const { service, repo, t1, topicId } = await setup();
    const draft = await service.createTerm(t1, topicId, { canonical: 'neutron' });
    const live = await service.createTerm(t1, topicId, { ...ready, publish: true });
    await service.deleteTerm(t1, draft.id);
    await service.deleteTerm(t1, live.id);
    expect(repo.terms.has(draft.id)).toBe(false);
    expect(repo.terms.get(live.id)?.status).toBe('ARCHIVED');
    expect((await service.topic(t1, topicId)).terms).toEqual([]);
    expect(await status(service.term(t1, live.id))).toBe(404);
  });

  it('reorders terms, and rejects an order with missing or extra ids', async () => {
    const { service, t1, topicId } = await setup();
    const a = await service.createTerm(t1, topicId, { canonical: 'proton' });
    const b = await service.createTerm(t1, topicId, { canonical: 'neutron' });
    const after = await service.reorderTerms(t1, topicId, [b.id, a.id]);
    expect(after.terms.map((t) => t.canonical)).toEqual(['neutron', 'proton']);
    expect(await status(service.reorderTerms(t1, topicId, [a.id]))).toBe(400);
  });

  it('duplicates a topic as drafts, and any teacher can copy a published library topic', async () => {
    const { service, repo, t1, t2, topicId } = await setup();
    await service.createTerm(t1, topicId, { ...ready, publish: true });
    const copy = await service.duplicateTopic(t1, topicId);
    expect(copy).toMatchObject({ title: 'Atoms (copy)', status: 'DRAFT' });
    expect(copy.terms[0]).toMatchObject({ status: 'DRAFT', version: 1, problems: [] });

    const lib = repo.seedTopic({ ownerId: 'library', visibility: 'LIBRARY', status: 'PUBLISHED' });
    const mine = await service.duplicateTopic(t2, lib);
    expect((await service.listTopics(t2)).topics.map((t) => t.id)).toEqual([mine.id]);
  });

  it('suggests confusables from the topic and the library, not the term itself', async () => {
    const { service, t1, topicId } = await setup();
    const proton = await service.createTerm(t1, topicId, { canonical: 'proton' });
    await service.createTerm(t1, topicId, { canonical: 'neutron', display: 'Neutron' });
    const r = await service.confusableSuggestions(t1, {
      answer: 'proton',
      topicId,
      termId: proton.id,
    });
    expect(r.suggestions.map((s) => s.text)).toEqual(['neutron']);
  });

  it('archived topics leave the list and refuse edits', async () => {
    const { service, t1, topicId } = await setup();
    await service.archiveTopic(t1, topicId);
    expect((await service.listTopics(t1)).topics).toEqual([]);
    expect(await code(service.updateTopic(t1, topicId, { title: 'x' }))).toBe('TOPIC_ARCHIVED');
  });
});
