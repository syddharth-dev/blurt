import { HttpException } from '@nestjs/common';
import sharp from 'sharp';
import {
  authUser,
  FakePicturesRepository,
  FakePictureStorage,
  FakeUsersRepository,
} from '../../test/fakes.js';
import { UsersService } from '../users/users.service.js';
import { PictureJobs } from './picture-jobs.js';
import { PicturesService } from './pictures.service.js';

async function setup() {
  const users = new FakeUsersRepository();
  const repo = new FakePicturesRepository();
  const storage = new FakePictureStorage();
  const jobs = new PictureJobs(repo, storage);
  const service = new PicturesService(repo, storage, jobs, new UsersService(users));
  await users.create({ id: 'tea-1', name: 'T1', email: 't1@s.test', role: 'TEACHER' });
  await users.create({ id: 'tea-2', name: 'T2', email: 't2@s.test', role: 'TEACHER' });
  await users.create({ id: 'adm', name: 'A', email: 'a@s.test', role: 'ADMIN' });
  return {
    repo,
    storage,
    jobs,
    service,
    t1: authUser('tea-1', 't1@s.test'),
    t2: authUser('tea-2', 't2@s.test'),
    admin: authUser('adm', 'a@s.test'),
  };
}

const status = (p: Promise<unknown>) =>
  p.then(
    () => 200,
    (e: unknown) => (e instanceof HttpException ? e.getStatus() : 500),
  );

const jpegWithExif = () =>
  sharp({ create: { width: 2400, height: 1200, channels: 3, background: '#FFC93C' } })
    .jpeg()
    .withExif({ IFD0: { Artist: 'GPS 14.6,121.0' } })
    .toBuffer();

const ticket = { fileName: '../../etc/passwd.png', contentType: 'image/png' as const, size: 1000 };

describe('PicturesService + PictureJobs', () => {
  it('upload → complete → processed WebP in the public bucket, original deleted', async () => {
    const { service, storage, jobs, t1 } = await setup();
    const t = await service.uploadUrl(t1, ticket);
    // The path is ours: owner/id. The client's file name is ignored.
    expect(t.path).toBe(`tea-1/${t.pictureId}`);
    expect(t.bucket).toBe('uploads');

    storage.uploads.set(t.path, await jpegWithExif()); // the browser's upload
    expect((await service.complete(t1, t.pictureId)).state).toBe('PROCESSING');
    await jobs.idle();

    const done = await service.get(t1, t.pictureId);
    expect(done).toMatchObject({
      state: 'READY',
      width: 1600,
      height: 800,
      url: `https://cdn.test/tea-1/${t.pictureId}.webp`,
      thumbUrl: `https://cdn.test/tea-1/${t.pictureId}-thumb.webp`,
    });
    expect(
      (await sharp(storage.public.get(`tea-1/${t.pictureId}.webp`)!).metadata()).exif,
    ).toBeUndefined();
    expect(storage.uploads.has(t.path)).toBe(false);
  });

  it('a file that is not a picture ends FAILED, and the upload is removed', async () => {
    const { service, storage, jobs, t1 } = await setup();
    const t = await service.uploadUrl(t1, ticket);
    storage.uploads.set(t.path, Buffer.from('<html>definitely a png</html>'));
    await service.complete(t1, t.pictureId);
    await jobs.idle();
    expect((await service.get(t1, t.pictureId)).state).toBe('FAILED');
    expect(storage.uploads.size).toBe(0);
  });

  it('complete twice starts the job once', async () => {
    const { service, storage, jobs, t1 } = await setup();
    const t = await service.uploadUrl(t1, ticket);
    storage.uploads.set(t.path, await jpegWithExif());
    const spy = vi.spyOn(jobs, 'enqueue');
    await service.complete(t1, t.pictureId);
    await service.complete(t1, t.pictureId);
    expect(spy).toHaveBeenCalledTimes(1);
    await jobs.idle();
  });

  it("another teacher gets 403 on someone's picture; an admin doesn't (AGENTS.md rule 9)", async () => {
    const { service, t1, t2, admin } = await setup();
    const t = await service.uploadUrl(t1, ticket);
    expect(await status(service.get(t2, t.pictureId))).toBe(403);
    expect(await status(service.complete(t2, t.pictureId))).toBe(403);
    expect(await status(service.update(t2, t.pictureId, { altText: 'x' }))).toBe(403);
    expect(await status(service.get(admin, t.pictureId))).toBe(200);
    expect(await status(service.get(t1, 'nope'))).toBe(404);
  });

  it('any teacher can view a bundled diagram, but not change it', async () => {
    const { service, repo, t2 } = await setup();
    repo.rows.set('diagram-atom', {
      ...(await repo.create({ id: 'diagram-atom', ownerId: 'library', storageKey: '' })),
      diagram: 'atom',
      state: 'READY',
    });
    expect(await status(service.get(t2, 'diagram-atom'))).toBe(200);
    expect(await status(service.update(t2, 'diagram-atom', { altText: 'x' }))).toBe(403);
  });

  it('says so when storage is not set up (503)', async () => {
    const { service, storage, t1 } = await setup();
    storage.configured = false;
    expect(await status(service.uploadUrl(t1, ticket))).toBe(503);
  });

  it('picks up pictures left mid-processing after a restart', async () => {
    const { service, storage, repo, t1 } = await setup();
    const t = await service.uploadUrl(t1, ticket);
    storage.uploads.set(t.path, await jpegWithExif());
    await repo.transition(t.pictureId, 'UPLOADING', 'PROCESSING');
    const fresh = new PictureJobs(repo, storage);
    await fresh.onApplicationBootstrap();
    await fresh.idle();
    expect((await repo.find(t.pictureId))?.state).toBe('READY');
  });
});
