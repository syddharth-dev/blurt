import { ForbiddenException, HttpStatus, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import {
  ERROR_CODES,
  type PictureUploadRequest,
  type PictureUploadTicket,
  type TeacherPicture,
  type UpdatePicture,
} from '@blurt/shared/schemas';
import type { AuthUser } from '../auth/supabase-jwt.guard.js';
import { apiError } from '../common/errors.js';
import { UsersService } from '../users/users.service.js';
import { PictureJobs } from './picture-jobs.js';
import { PictureStorage } from './picture-storage.js';
import { PicturesRepository, type PictureRecord } from './pictures.repository.js';

/**
 * Teacher pictures (TEACHER_DASHBOARD.md → "What happens when a teacher uploads a picture").
 * 1. upload-url: a picture row (UPLOADING) and a signed URL into the private uploads bucket.
 * 2. The browser uploads the file straight to Storage.
 * 3. complete: PROCESSING, and the background job takes over → READY or FAILED.
 * The storage path is ours (owner/id): the client's file name is never used.
 */
@Injectable()
export class PicturesService {
  constructor(
    private readonly repo: PicturesRepository,
    private readonly storage: PictureStorage,
    private readonly jobs: PictureJobs,
    private readonly users: UsersService,
  ) {}

  async uploadUrl(auth: AuthUser, _body: PictureUploadRequest): Promise<PictureUploadTicket> {
    if (!this.storage.configured) {
      throw apiError(
        HttpStatus.SERVICE_UNAVAILABLE,
        ERROR_CODES.storageNotConfigured,
        "Picture uploads aren't set up on this server yet.",
      );
    }
    await this.users.ensure(auth);
    const id = randomUUID();
    const path = `${auth.id}/${id}`;
    const { token } = await this.storage.createSignedUpload(path);
    await this.repo.create({ id, ownerId: auth.id, storageKey: path });
    return { pictureId: id, bucket: this.storage.uploadsBucket, path, token };
  }

  /** The browser finished uploading. Safe to call twice. */
  async complete(auth: AuthUser, id: string): Promise<TeacherPicture> {
    const picture = await this.own(auth, id);
    if (await this.repo.transition(id, 'UPLOADING', 'PROCESSING')) this.jobs.enqueue(id);
    return this.shape((await this.repo.find(id)) ?? picture);
  }

  async get(auth: AuthUser, id: string): Promise<TeacherPicture> {
    return this.shape(await this.own(auth, id, { allowDiagrams: true }));
  }

  async update(auth: AuthUser, id: string, body: UpdatePicture): Promise<TeacherPicture> {
    await this.own(auth, id);
    return this.shape(await this.repo.update(id, { altText: body.altText || null }));
  }

  /** Your own picture (admins: any). Bundled diagrams can be viewed by every teacher. */
  private async own(
    auth: AuthUser,
    id: string,
    opts: { allowDiagrams?: boolean } = {},
  ): Promise<PictureRecord> {
    const picture = await this.repo.find(id);
    if (!picture) throw new NotFoundException("That picture isn't here.");
    if (picture.ownerId === auth.id) return picture;
    if (opts.allowDiagrams && picture.diagram) return picture;
    const user = await this.users.ensure(auth);
    if (user.role === 'ADMIN') return picture;
    throw new ForbiddenException('That picture belongs to another teacher.');
  }

  private shape({ ownerId: _o, storageKey: _k, ...p }: PictureRecord): TeacherPicture {
    return p;
  }
}
