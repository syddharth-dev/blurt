import { type INestApplication, RequestMethod } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';
import { AuthAdmin } from '../src/auth/auth-admin.js';
import { ClassesRepository } from '../src/classes/classes.repository.js';
import { JwtVerifier } from '../src/auth/jwt-verifier.js';
import { ContentRepository } from '../src/content/content.repository.js';
import { RoundsRepository } from '../src/gameplay/rounds.repository.js';
import { PictureStorage } from '../src/media/picture-storage.js';
import { PicturesRepository } from '../src/media/pictures.repository.js';
import { TeacherContentRepository } from '../src/teacher/teacher-content.repository.js';
import { UsersRepository } from '../src/users/users.repository.js';
import {
  FakeClassesRepository,
  FakeContentRepository,
  FakePictureStorage,
  FakePicturesRepository,
  FakeRoundsRepository,
  FakeTeacherContentRepository,
  FakeUsersRepository,
} from './fakes.js';

/** Tokens in these tests are just user ids; the real verifier checks Supabase JWKS. */
const fakeVerifier = {
  configured: true,
  verify: async (token: string) => {
    if (token === 'expired') throw new Error('expired');
    return { sub: token, email: `${token}@school.test` };
  },
};

describe('API (e2e, in-memory data)', () => {
  let app: INestApplication<App>;
  const users = new FakeUsersRepository();
  const rounds = new FakeRoundsRepository(users);
  const classes = new FakeClassesRepository(users);

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(JwtVerifier)
      .useValue(fakeVerifier)
      .overrideProvider(UsersRepository)
      .useValue(users)
      .overrideProvider(RoundsRepository)
      .useValue(rounds)
      .overrideProvider(ContentRepository)
      .useValue(new FakeContentRepository())
      .overrideProvider(TeacherContentRepository)
      .useValue(new FakeTeacherContentRepository())
      .overrideProvider(PicturesRepository)
      .useValue(new FakePicturesRepository())
      .overrideProvider(PictureStorage)
      .useValue(new FakePictureStorage())
      .overrideProvider(ClassesRepository)
      .useValue(classes)
      .overrideProvider(AuthAdmin)
      .useValue({ invite: async () => ({ id: 'invited-1' }), findIdByEmail: async () => null })
      .compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('v1', { exclude: [{ path: 'health', method: RequestMethod.GET }] });
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  const as = (user: string) => ({ Authorization: `Bearer ${user}` });

  it('GET /health → { ok: true } without auth', () =>
    request(app.getHttpServer()).get('/health').expect(200).expect({ ok: true }));

  it.each([
    ['GET', '/v1/me'],
    ['GET', '/v1/subjects'],
    ['POST', '/v1/rounds'],
  ])('%s %s needs a signed-in user (401, shared error shape)', async (method, path) => {
    const res = await request(app.getHttpServer())
      [method === 'GET' ? 'get' : 'post'](path)
      .expect(401);
    expect(res.body).toEqual({ error: { code: 'UNAUTHORIZED', message: 'Sign in to continue.' } });
  });

  it('an expired token is 401', () =>
    request(app.getHttpServer()).get('/v1/me').set(as('expired')).expect(401));

  it('unknown routes use the shared error shape', async () => {
    const res = await request(app.getHttpServer()).get('/v1/nope').set(as('ana')).expect(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('GET /me creates the student; PATCH /me validates its body', async () => {
    const me = await request(app.getHttpServer()).get('/v1/me').set(as('ana')).expect(200);
    expect(me.body).toMatchObject({ id: 'ana', role: 'STUDENT', level: 1 });
    await request(app.getHttpServer())
      .patch('/v1/me')
      .set(as('ana'))
      .send({ grade: 99 })
      .expect(400);
    await request(app.getHttpServer())
      .patch('/v1/me')
      .set(as('ana'))
      .send({ role: 'ADMIN' })
      .expect(400);
    const ok = await request(app.getHttpServer())
      .patch('/v1/me')
      .set(as('ana'))
      .send({ grade: 8 })
      .expect(200);
    expect(ok.body.grade).toBe(8);
  });

  it('GET /subjects lists the starter topics', async () => {
    const res = await request(app.getHttpServer()).get('/v1/subjects').set(as('ana')).expect(200);
    expect(res.body.subjects.flatMap((s: { topics: unknown[] }) => s.topics)).toHaveLength(7);
  });

  it('plays a whole round over HTTP: start → attempts → skip → finish', async () => {
    const http = request(app.getHttpServer());
    const start = await http
      .post('/v1/rounds')
      .set(as('ana'))
      .send({ topicId: 'ecosystems' })
      .expect(201);
    const id = start.body.roundId as string;
    expect(start.body.terms).toHaveLength(3);

    const attempt = (termId: string, text: string, key: string) =>
      http
        .post(`/v1/rounds/${id}/attempts`)
        .set(as('ana'))
        .send({
          termId,
          alternatives: [text],
          inputMode: 'voice',
          hintsUsed: 0,
          ms: 800,
          idempotencyKey: key,
        });

    expect(
      (await attempt('bio-producer', 'producer', 'k-producer-1').expect(200)).body,
    ).toMatchObject({
      verdict: 'correct',
      xpGained: 100,
    });
    expect(
      (await attempt('bio-consumer', 'consumers', 'k-consumer-1').expect(200)).body.verdict,
    ).toBe('correct');
    await http
      .post(`/v1/rounds/${id}/skip`)
      .set(as('ana'))
      .send({ termId: 'bio-decomposer', idempotencyKey: 'k-skip-0001' })
      .expect(200);

    const done = await http
      .post(`/v1/rounds/${id}/finish`)
      .set(as('ana'))
      .send({ localDate: '2026-11-22' })
      .expect(200);
    expect(done.body).toMatchObject({ score: 200, endedBy: 'complete', streak: 1 });
    const me = await http.get('/v1/me').set(as('ana')).expect(200);
    expect(me.body).toMatchObject({ xp: 200, streak: 1, lastPlayedOn: '2026-11-22' });
  });

  it("another student can't touch someone's round (404)", async () => {
    const http = request(app.getHttpServer());
    const start = await http
      .post('/v1/rounds')
      .set(as('ana'))
      .send({ topicId: 'ecosystems' })
      .expect(201);
    await http
      .post(`/v1/rounds/${start.body.roundId}/finish`)
      .set(as('ben'))
      .send({ localDate: '2026-11-22' })
      .expect(404);
  });

  it('rejects malformed bodies with 400', async () => {
    const http = request(app.getHttpServer());
    await http.post('/v1/rounds').set(as('ana')).send({ topicId: '' }).expect(400);
    await http
      .post('/v1/rounds/x/finish')
      .set(as('ana'))
      .send({ localDate: 'yesterday' })
      .expect(400);
    await http
      .post('/v1/rounds/x/attempts')
      .set(as('ana'))
      .send({
        termId: 't',
        alternatives: [],
        inputMode: 'voice',
        hintsUsed: 0,
        ms: 1,
        idempotencyKey: 'short',
      })
      .expect(400);
  });

  describe('admin routes (AGENTS.md rule 9)', () => {
    const invite = (who: string) =>
      request(app.getHttpServer())
        .post('/v1/admin/teachers/invite')
        .set(as(who))
        .send({ email: 'new.teacher@school.edu' });

    it('a student gets 403', async () => {
      const res = await invite('stu-1').expect(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
      await request(app.getHttpServer()).get('/v1/admin/teachers').set(as('stu-1')).expect(403);
    });

    it('a teacher gets 403 too: only admins invite', async () => {
      await users.create({ id: 'tea-1', name: 'T', email: 'tea-1@school.test', role: 'TEACHER' });
      await invite('tea-1').expect(403);
    });

    it('an admin invites a teacher and sees them in the staff list', async () => {
      await users.create({ id: 'adm-1', name: 'A', email: 'adm-1@school.test', role: 'ADMIN' });
      const res = await invite('adm-1').expect(201);
      expect(res.body).toMatchObject({
        status: 'invited',
        teacher: { email: 'new.teacher@school.edu', role: 'TEACHER' },
      });
      const list = await request(app.getHttpServer())
        .get('/v1/admin/teachers')
        .set(as('adm-1'))
        .expect(200);
      expect(list.body.staff.map((s: { email: string }) => s.email)).toContain(
        'new.teacher@school.edu',
      );
    });

    it('rejects a bad email with 400', () =>
      request(app.getHttpServer())
        .post('/v1/admin/teachers/invite')
        .set(as('adm-1'))
        .send({ email: 'not-an-email' })
        .expect(400));
  });

  describe('teacher routes (AGENTS.md rule 9)', () => {
    const http = () => request(app.getHttpServer());
    let topicId = '';
    let termId = '';

    beforeAll(async () => {
      await users.create({ id: 'tea-a', name: 'A', email: 'tea-a@school.test', role: 'TEACHER' });
      await users.create({ id: 'tea-b', name: 'B', email: 'tea-b@school.test', role: 'TEACHER' });
    });

    it('a student gets 403', () => http().get('/v1/teacher/topics').set(as('stu-2')).expect(403));

    it('a teacher creates a topic and a draft term', async () => {
      const topic = await http()
        .post('/v1/teacher/topics')
        .set(as('tea-a'))
        .send({ title: 'Atoms', subjectId: 'chemistry', grade: 8 })
        .expect(201);
      topicId = topic.body.id;
      const term = await http()
        .post(`/v1/teacher/topics/${topicId}/terms`)
        .set(as('tea-a'))
        .send({ canonical: 'proton' })
        .expect(201);
      termId = term.body.id;
      expect(term.body).toMatchObject({ status: 'DRAFT', display: 'Proton' });
    });

    // Paths and bodies are functions: the ids exist only after the test above runs.
    type Route = [
      'get' | 'post' | 'patch' | 'put' | 'delete',
      () => string,
      () => object | undefined,
    ];
    it.each<Route>([
      ['get', () => `/v1/teacher/topics/${topicId}`, () => undefined],
      ['patch', () => `/v1/teacher/topics/${topicId}`, () => ({ title: 'Mine' })],
      ['delete', () => `/v1/teacher/topics/${topicId}`, () => undefined],
      ['post', () => `/v1/teacher/topics/${topicId}/duplicate`, () => undefined],
      ['post', () => `/v1/teacher/topics/${topicId}/publish`, () => undefined],
      ['put', () => `/v1/teacher/topics/${topicId}/terms/order`, () => ({ termIds: [termId] })],
      ['post', () => `/v1/teacher/topics/${topicId}/terms`, () => ({ canonical: 'neutron' })],
      ['get', () => `/v1/teacher/terms/${termId}`, () => undefined],
      ['patch', () => `/v1/teacher/terms/${termId}`, () => ({ clue: 'Mine' })],
      ['delete', () => `/v1/teacher/terms/${termId}`, () => undefined],
      [
        'post',
        () => '/v1/teacher/terms/confusable-suggestions',
        () => ({ answer: 'proton', topicId }),
      ],
    ])('another teacher gets 403: %s', async (method, path, body) => {
      const req = http()[method](path()).set(as('tea-b'));
      const payload = body();
      const res = await (payload ? req.send(payload) : req).expect(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('match-test runs the shared matcher on a draft (confusables never match)', async () => {
      const term = {
        canonical: 'proton',
        accept: ['protons'],
        close: [{ text: 'protonic', reason: "that's the adjective" }],
        confusables: [{ text: 'neutron', feedback: "That's the neutron." }],
      };
      const check = async (heard: string[]) =>
        (
          await http()
            .post('/v1/teacher/match-test')
            .set(as('tea-b'))
            .send({ term, alternatives: heard, inputMode: 'voice' })
            .expect(200)
        ).body;
      expect(await check(['um the protons'])).toMatchObject({
        verdict: 'correct',
        strategy: 'exact',
      });
      expect(await check(['neutron'])).toMatchObject({
        verdict: 'wrong',
        strategy: 'confusable',
        feedback: "That's the neutron.",
      });
      expect(await check(['protonic'])).toMatchObject({ verdict: 'close', strategy: 'family' });
    });

    it('match-test is for teachers only (403 for a student)', () =>
      http()
        .post('/v1/teacher/match-test')
        .set(as('stu-2'))
        .send({ term: { canonical: 'x' }, alternatives: ['x'], inputMode: 'voice' })
        .expect(403));

    it('publishing an unfinished topic is 422 NOT_READY', async () => {
      const res = await http()
        .post(`/v1/teacher/topics/${topicId}/publish`)
        .set(as('tea-a'))
        .expect(422);
      expect(res.body.error.code).toBe('NOT_READY');
    });

    it('rejects a bad term body with 400', () =>
      http()
        .post(`/v1/teacher/topics/${topicId}/terms`)
        .set(as('tea-a'))
        .send({ canonical: '', difficulty: 9 })
        .expect(400));
  });

  describe('picture routes (AGENTS.md rules 9 and 10)', () => {
    const http = () => request(app.getHttpServer());
    const body = { fileName: 'cell.png', contentType: 'image/png', size: 2048 };

    beforeAll(async () => {
      await users.create({ id: 'tea-p1', name: 'P1', email: 'p1@school.test', role: 'TEACHER' });
      await users.create({ id: 'tea-p2', name: 'P2', email: 'p2@school.test', role: 'TEACHER' });
    });

    it('a student gets 403', () =>
      http().post('/v1/teacher/pictures/upload-url').set(as('stu-3')).send(body).expect(403));

    it('rejects files over 5 MB and types we do not accept (400)', async () => {
      await http()
        .post('/v1/teacher/pictures/upload-url')
        .set(as('tea-p1'))
        .send({ ...body, size: 6 * 1024 * 1024 })
        .expect(400);
      await http()
        .post('/v1/teacher/pictures/upload-url')
        .set(as('tea-p1'))
        .send({ ...body, contentType: 'image/gif' })
        .expect(400);
    });

    it("another teacher gets 403 on someone's picture", async () => {
      const t = await http()
        .post('/v1/teacher/pictures/upload-url')
        .set(as('tea-p1'))
        .send(body)
        .expect(201);
      const id = t.body.pictureId as string;
      await http().get(`/v1/teacher/pictures/${id}`).set(as('tea-p2')).expect(403);
      await http().post(`/v1/teacher/pictures/${id}/complete`).set(as('tea-p2')).expect(403);
      await http()
        .patch(`/v1/teacher/pictures/${id}`)
        .set(as('tea-p2'))
        .send({ altText: 'mine' })
        .expect(403);
      const own = await http().get(`/v1/teacher/pictures/${id}`).set(as('tea-p1')).expect(200);
      expect(own.body.state).toBe('UPLOADING');
    });
  });

  describe('class routes (AGENTS.md rule 9)', () => {
    const http = () => request(app.getHttpServer());
    let classId = '';
    let code = '';

    beforeAll(async () => {
      await users.create({
        id: 'tea-c1',
        name: 'Ms Reyes',
        email: 'c1@school.test',
        role: 'TEACHER',
      });
      await users.create({
        id: 'tea-c2',
        name: 'Mr Cruz',
        email: 'c2@school.test',
        role: 'TEACHER',
      });
      classes.topics.set('own-topic', {
        id: 'own-topic',
        ownerId: 'tea-c1',
        status: 'PUBLISHED',
        visibility: 'CLASS',
        title: 'Cells',
        subject: 'Biology',
        color: 'coral',
        termCount: 4,
      });
    });

    it('a teacher creates a class and assigns a topic', async () => {
      const c = await http()
        .post('/v1/teacher/classes')
        .set(as('tea-c1'))
        .send({ name: 'Rizal' })
        .expect(201);
      classId = c.body.id;
      code = c.body.code;
      expect(code).toMatch(/^[A-Z2-9]{6}$/);
      await http()
        .put(`/v1/teacher/classes/${classId}/topics`)
        .set(as('tea-c1'))
        .send({ topics: [{ topicId: 'own-topic', dueOn: '2026-12-04' }] })
        .expect(200);
    });

    it('a student gets 403 on teacher class routes', () =>
      http().get('/v1/teacher/classes').set(as('stu-c')).expect(403));

    type Route = ['get' | 'patch' | 'put' | 'delete', () => string, () => object | undefined];
    it.each<Route>([
      ['get', () => `/v1/teacher/classes/${classId}`, () => undefined],
      ['patch', () => `/v1/teacher/classes/${classId}`, () => ({ name: 'Mine' })],
      ['put', () => `/v1/teacher/classes/${classId}/topics`, () => ({ topics: [] })],
      ['delete', () => `/v1/teacher/classes/${classId}/students/stu-c`, () => undefined],
    ])('another teacher gets 403: %s', async (method, path, body) => {
      const req = http()[method](path()).set(as('tea-c2'));
      const payload = body();
      await (payload ? req.send(payload) : req).expect(403);
    });

    it('a student joins with the code in lower case and sees the assigned topic', async () => {
      const joined = await http()
        .post('/v1/classes/join')
        .set(as('stu-c'))
        .send({ code: code.toLowerCase() })
        .expect(200);
      expect(joined.body).toMatchObject({
        alreadyMember: false,
        class: {
          name: 'Rizal',
          teacherName: 'Ms Reyes',
          topics: [{ id: 'own-topic', dueOn: '2026-12-04' }],
        },
      });
      const mine = await http().get('/v1/classes').set(as('stu-c')).expect(200);
      expect(mine.body.classes).toHaveLength(1);
    });

    it('a bad code is 400 (shape) or 404 (no such class)', async () => {
      await http().post('/v1/classes/join').set(as('stu-c')).send({ code: '12' }).expect(400);
      const res = await http()
        .post('/v1/classes/join')
        .set(as('stu-c'))
        .send({ code: 'ZZZZZZ' })
        .expect(404);
      expect(res.body.error.code).toBe('CLASS_NOT_FOUND');
    });
  });
});
