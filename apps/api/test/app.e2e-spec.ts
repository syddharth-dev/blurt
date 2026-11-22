import { type INestApplication, RequestMethod } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';
import { JwtVerifier } from '../src/auth/jwt-verifier.js';
import { ContentRepository } from '../src/content/content.repository.js';
import { RoundsRepository } from '../src/gameplay/rounds.repository.js';
import { UsersRepository } from '../src/users/users.repository.js';
import { FakeContentRepository, FakeRoundsRepository, FakeUsersRepository } from './fakes.js';

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
});
