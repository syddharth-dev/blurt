import { type INestApplication, RequestMethod } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';

describe('API (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('v1', { exclude: [{ path: 'health', method: RequestMethod.GET }] });
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /health → { ok: true } without auth', () =>
    request(app.getHttpServer()).get('/health').expect(200).expect({ ok: true }));

  it('unknown routes use the shared error shape', async () => {
    const res = await request(app.getHttpServer()).get('/v1/nope').expect(404);
    expect(res.body).toEqual({ error: { code: 'NOT_FOUND', message: expect.any(String) } });
  });
});
