import { HttpException } from '@nestjs/common';
import {
  authUser,
  FakeClassesRepository,
  FakeContentRepository,
  FakeReportsRepository,
  FakeUsersRepository,
} from '../../test/fakes.js';
import { ClassesService } from '../classes/classes.service.js';
import { UsersService } from '../users/users.service.js';
import { ReportsService } from './reports.service.js';

async function setup() {
  const users = new FakeUsersRepository();
  const classesRepo = new FakeClassesRepository(users);
  const usersService = new UsersService(users);
  const classes = new ClassesService(classesRepo, new FakeContentRepository(), usersService);
  const repo = new FakeReportsRepository();
  const service = new ReportsService(repo, classes, classesRepo);
  await users.create({ id: 'tea-1', name: 'Ms Reyes', email: 't1@s.test', role: 'TEACHER' });
  await users.create({ id: 'tea-2', name: 'Mr Cruz', email: 't2@s.test', role: 'TEACHER' });
  await users.create({ id: 'adm', name: 'A', email: 'a@s.test', role: 'ADMIN' });
  const t1 = authUser('tea-1', 't1@s.test');
  const c = await classes.create(t1, 'Rizal');
  repo.studentsByClass.set(c.id, [{ id: 'ana', name: 'Ana' }]);
  repo.termsByClass.set(c.id, [{ termId: 't-proton', display: 'Proton', topic: 'Atoms' }]);
  repo.topicsByClass.set(c.id, ['atoms']);
  const recent = new Date();
  repo.rows = [
    {
      studentId: 'ana',
      roundId: 'r1',
      termId: 't-proton',
      verdict: 'wrong',
      heard: 'neutron',
      createdAt: recent,
    },
    // Another class's term and an outsider: never counted
    {
      studentId: 'ana',
      roundId: 'r1',
      termId: 't-other',
      verdict: 'wrong',
      heard: 'x',
      createdAt: recent,
    },
    {
      studentId: 'zed',
      roundId: 'r9',
      termId: 't-proton',
      verdict: 'correct',
      heard: 'proton',
      createdAt: recent,
    },
    // Too old for 7 days
    {
      studentId: 'ana',
      roundId: 'r0',
      termId: 't-proton',
      verdict: 'correct',
      heard: 'proton',
      createdAt: new Date('2020-01-01'),
    },
  ];
  repo.rounds = [
    {
      studentId: 'ana',
      topicId: 'atoms',
      topic: 'Atoms',
      correct: 7,
      total: 10,
      finishedAt: recent,
    },
  ];
  return {
    service,
    classId: c.id,
    t1,
    t2: authUser('tea-2', 't2@s.test'),
    admin: authUser('adm', 'a@s.test'),
  };
}

const status = (p: Promise<unknown>) =>
  p.then(
    () => 200,
    (e: unknown) => (e instanceof HttpException ? e.getStatus() : 500),
  );

describe('ReportsService', () => {
  it("counts only the class's students and terms, within the range", async () => {
    const { service, classId, t1 } = await setup();
    const week = await service.classReport(t1, classId, '7d');
    expect(week.summary).toMatchObject({ students: 1, answers: 1, accuracy: 0 });
    expect(week.missedTerms[0]).toMatchObject({
      display: 'Proton',
      heard: [{ text: 'neutron', count: 1 }],
    });
    const all = await service.classReport(t1, classId, 'all');
    expect(all.summary).toMatchObject({ answers: 2, accuracy: 0.5, rounds: 2 });
  });

  it('another teacher gets 403 on reports (AGENTS.md rule 9); admins may look', async () => {
    const { service, classId, t2, admin } = await setup();
    expect(await status(service.classReport(t2, classId, '7d'))).toBe(403);
    expect(await status(service.studentReport(t2, classId, 'ana', '7d'))).toBe(403);
    expect(await status(service.classReport(admin, classId, '7d'))).toBe(200);
  });

  it('a student report is only for a student in the class (404 otherwise)', async () => {
    const { service, classId, t1 } = await setup();
    const ana = await service.studentReport(t1, classId, 'ana', 'all');
    expect(ana).toMatchObject({
      student: { name: 'Ana' },
      className: 'Rizal',
      summary: { answers: 2 },
    });
    expect(await status(service.studentReport(t1, classId, 'zed', 'all'))).toBe(404);
  });

  it("the overview covers only the teacher's own classes", async () => {
    const { service, t1, t2 } = await setup();
    const mine = await service.overview(t1);
    expect(mine.classes).toEqual([
      expect.objectContaining({
        name: 'Rizal',
        studentCount: 1,
        activeThisWeek: 1,
        accuracyThisWeek: 0,
      }),
    ]);
    expect(mine.recent).toEqual([
      expect.objectContaining({ studentName: 'Ana', correct: 7, total: 10 }),
    ]);
    expect(mine.missedThisWeek[0]).toMatchObject({ display: 'Proton', className: 'Rizal' });
    expect(await service.overview(t2)).toEqual({ classes: [], recent: [], missedThisWeek: [] });
  });
});
