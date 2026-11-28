import { HttpException } from '@nestjs/common';
import {
  authUser,
  FakeClassesRepository,
  FakeContentRepository,
  FakeUsersRepository,
} from '../../test/fakes.js';
import { UsersService } from '../users/users.service.js';
import { newClassCode } from './class-code.js';
import { ClassesService } from './classes.service.js';

async function setup(codes?: string[]) {
  const users = new FakeUsersRepository();
  const repo = new FakeClassesRepository(users);
  const content = new FakeContentRepository();
  const makeCode = codes ? () => codes.shift() ?? newClassCode() : newClassCode;
  const service = new ClassesService(repo, content, new UsersService(users), makeCode);
  await users.create({ id: 'tea-1', name: 'Ms Reyes', email: 't1@s.test', role: 'TEACHER' });
  await users.create({ id: 'tea-2', name: 'Mr Cruz', email: 't2@s.test', role: 'TEACHER' });
  await users.create({ id: 'adm', name: 'A', email: 'a@s.test', role: 'ADMIN' });
  await users.create({ id: 'stu-1', name: 'Ana', email: 's1@s.test' });
  const topic = (id: string, ownerId: string, extra: object = {}) =>
    repo.topics.set(id, {
      id,
      ownerId,
      status: 'PUBLISHED',
      visibility: 'CLASS',
      title: id,
      subject: 'Biology',
      color: 'coral',
      termCount: 5,
      ...extra,
    });
  topic('mine', 'tea-1');
  topic('mine-2', 'tea-1');
  topic('theirs', 'tea-2');
  topic('library', 'library', { visibility: 'LIBRARY' });
  topic('draft', 'tea-1', { status: 'DRAFT' });
  return {
    repo,
    content,
    service,
    t1: authUser('tea-1', 't1@s.test'),
    t2: authUser('tea-2', 't2@s.test'),
    admin: authUser('adm', 'a@s.test'),
    student: authUser('stu-1', 's1@s.test'),
  };
}

const status = (p: Promise<unknown>) =>
  p.then(
    () => 200,
    (e: unknown) => (e instanceof HttpException ? e.getStatus() : 500),
  );

describe('class codes', () => {
  it('are 6 characters with no look-alikes', () => {
    for (let i = 0; i < 200; i++) expect(newClassCode()).toMatch(/^[A-HJKMNP-Z2-9]{6}$/);
  });
});

describe('ClassesService', () => {
  it('creates a class with a join code, retrying if the code is taken', async () => {
    const { service, t1 } = await setup(['AAAAAA', 'AAAAAA', 'BBBBBB']);
    const a = await service.create(t1, 'Grade 8 – Rizal');
    const b = await service.create(t1, 'Grade 8 – Mabini');
    expect(a).toMatchObject({ name: 'Grade 8 – Rizal', code: 'AAAAAA', studentCount: 0 });
    expect(b.code).toBe('BBBBBB');
    expect((await service.list(t1)).classes).toHaveLength(2);
  });

  it('another teacher gets 403 on every class route (AGENTS.md rule 9); admins may', async () => {
    const { service, t1, t2, admin } = await setup();
    const c = await service.create(t1, 'Rizal');
    for (const call of [
      service.detail(t2, c.id),
      service.update(t2, c.id, { name: 'Mine' }),
      service.update(t2, c.id, { newCode: true }),
      service.assign(t2, c.id, { topics: [] }),
      service.removeStudent(t2, c.id, 'stu-1'),
    ])
      expect(await status(call)).toBe(403);
    expect((await service.list(t2)).classes).toEqual([]);
    expect(await status(service.detail(admin, c.id))).toBe(200);
    expect(await status(service.detail(t1, 'nope'))).toBe(404);
  });

  it('a new code replaces the old one', async () => {
    const { service, t1, student } = await setup(['OLDOLD', 'NEWNEW']);
    const c = await service.create(t1, 'Rizal');
    await service.update(t1, c.id, { newCode: true });
    expect(await status(service.join(student, 'OLDOLD'))).toBe(404);
    expect((await service.join(student, 'NEWNEW')).class.name).toBe('Rizal');
  });

  it('assigns own and library topics with due dates, never another teacher’s', async () => {
    const { service, t1 } = await setup();
    const c = await service.create(t1, 'Rizal');
    const after = await service.assign(t1, c.id, {
      topics: [
        { topicId: 'mine', dueOn: '2026-12-04' },
        { topicId: 'library', dueOn: null },
      ],
    });
    expect(after.topics).toEqual([
      expect.objectContaining({ id: 'mine', dueOn: '2026-12-04' }),
      expect.objectContaining({ id: 'library', dueOn: null }),
    ]);
    expect(
      await status(service.assign(t1, c.id, { topics: [{ topicId: 'theirs', dueOn: null }] })),
    ).toBe(403);
    expect(
      await status(service.assign(t1, c.id, { topics: [{ topicId: 'gone', dueOn: null }] })),
    ).toBe(400);
  });

  it('a student joins with the code (any case), sees published topics due soonest first', async () => {
    const { service, repo, content, t1, student } = await setup(['K7Q2MX']);
    const c = await service.create(t1, 'Rizal');
    await service.assign(t1, c.id, {
      topics: [
        { topicId: 'mine', dueOn: null },
        { topicId: 'mine-2', dueOn: '2026-12-10' },
        { topicId: 'draft', dueOn: '2026-12-01' },
      ],
    });
    content.mastered.set('mine-2', 3);
    const joined = await service.join(student, 'K7Q2MX');
    expect(joined).toMatchObject({
      alreadyMember: false,
      class: { name: 'Rizal', teacherName: 'Ms Reyes' },
    });
    expect(joined.class.topics.map((t) => [t.id, t.dueOn, t.mastered])).toEqual([
      ['mine-2', '2026-12-10', 3],
      ['mine', null, 0],
    ]);
    expect((await service.join(student, 'K7Q2MX')).alreadyMember).toBe(true);
    expect(repo.enrollments).toHaveLength(1);
    expect((await service.mine(student)).classes).toHaveLength(1);
    expect((await service.detail(t1, c.id)).students).toEqual([
      expect.objectContaining({ id: 'stu-1', name: 'Ana' }),
    ]);
  });

  it('a wrong code is 404 CLASS_NOT_FOUND', async () => {
    const { service, student } = await setup();
    const err = await service.join(student, 'ZZZZZZ').catch((e: HttpException) => e);
    expect((err as HttpException).getStatus()).toBe(404);
    expect(((err as HttpException).getResponse() as { code: string }).code).toBe('CLASS_NOT_FOUND');
  });

  it('a teacher can remove a student', async () => {
    const { service, t1, student } = await setup(['K7Q2MX']);
    const c = await service.create(t1, 'Rizal');
    await service.join(student, 'K7Q2MX');
    expect((await service.removeStudent(t1, c.id, 'stu-1')).students).toEqual([]);
    expect((await service.mine(student)).classes).toEqual([]);
  });
});
