import { Injectable } from '@nestjs/common';
import type { PictureState, TeacherPicture } from '@blurt/shared/schemas';
import { PrismaService } from '../common/prisma/prisma.service.js';

export type PictureRecord = TeacherPicture & { ownerId: string; storageKey: string | null };

export abstract class PicturesRepository {
  abstract create(data: {
    id: string;
    ownerId: string;
    storageKey: string;
  }): Promise<PictureRecord>;
  abstract find(id: string): Promise<PictureRecord | null>;
  /** Moves the state only if it is still `from` (so two requests can't both start the job). */
  abstract transition(id: string, from: PictureState, to: PictureState): Promise<boolean>;
  abstract markReady(
    id: string,
    data: { url: string; thumbUrl: string; width: number; height: number },
  ): Promise<void>;
  abstract markFailed(id: string): Promise<void>;
  abstract update(id: string, data: { altText: string | null }): Promise<PictureRecord>;
  /** Pictures left mid-processing (e.g. the API restarted). */
  abstract processingIds(): Promise<string[]>;
}

const select = {
  id: true,
  ownerId: true,
  storageKey: true,
  diagram: true,
  url: true,
  thumbUrl: true,
  width: true,
  height: true,
  state: true,
  altText: true,
} as const;

@Injectable()
export class PrismaPicturesRepository extends PicturesRepository {
  constructor(private readonly db: PrismaService) {
    super();
  }

  create(data: { id: string; ownerId: string; storageKey: string }) {
    return this.db.picture.create({ data: { ...data, state: 'UPLOADING' }, select });
  }

  find(id: string) {
    return this.db.picture.findUnique({ where: { id }, select });
  }

  async transition(id: string, from: PictureState, to: PictureState) {
    const r = await this.db.picture.updateMany({ where: { id, state: from }, data: { state: to } });
    return r.count === 1;
  }

  async markReady(
    id: string,
    data: { url: string; thumbUrl: string; width: number; height: number },
  ) {
    await this.db.picture.update({ where: { id }, data: { ...data, state: 'READY' } });
  }

  async markFailed(id: string) {
    await this.db.picture.update({ where: { id }, data: { state: 'FAILED' } });
  }

  update(id: string, data: { altText: string | null }) {
    return this.db.picture.update({ where: { id }, data, select });
  }

  async processingIds() {
    const rows = await this.db.picture.findMany({
      where: { state: 'PROCESSING' },
      select: { id: true },
    });
    return rows.map((r) => r.id);
  }
}
