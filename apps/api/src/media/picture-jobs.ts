import { Injectable, Logger, type OnApplicationBootstrap } from '@nestjs/common';
import { PictureRejected, processPicture } from './image-processing.js';
import { PictureStorage } from './picture-storage.js';
import { PicturesRepository } from './pictures.repository.js';

/**
 * Background processing for uploaded pictures (AGENTS.md rule 10). An in-process queue for now
 * (decision for Phase 4: no Redis yet); it moves to BullMQ when Redis arrives in Phase 5.
 * Pictures left mid-processing by a restart are picked up again at startup.
 */
@Injectable()
export class PictureJobs implements OnApplicationBootstrap {
  private readonly logger = new Logger(PictureJobs.name);
  private readonly queue: string[] = [];
  private running = 0;
  private readonly concurrency = 2;
  private waiters: Array<() => void> = [];

  constructor(
    private readonly repo: PicturesRepository,
    private readonly storage: PictureStorage,
  ) {}

  async onApplicationBootstrap() {
    if (!this.storage.configured) return;
    try {
      for (const id of await this.repo.processingIds()) this.enqueue(id);
    } catch (err) {
      this.logger.warn(`Couldn't resume picture jobs: ${(err as Error).message}`);
    }
  }

  enqueue(pictureId: string) {
    if (!this.queue.includes(pictureId)) this.queue.push(pictureId);
    this.pump();
  }

  /** Resolves once the queue is empty (tests). */
  idle(): Promise<void> {
    if (!this.running && !this.queue.length) return Promise.resolve();
    return new Promise((resolve) => this.waiters.push(resolve));
  }

  private pump() {
    while (this.running < this.concurrency && this.queue.length) {
      const id = this.queue.shift()!;
      this.running++;
      void this.run(id).finally(() => {
        this.running--;
        this.pump();
        if (!this.running && !this.queue.length) {
          this.waiters.forEach((w) => w());
          this.waiters = [];
        }
      });
    }
  }

  /** Download → check and convert → store WebP + thumbnail → READY. Any problem → FAILED. */
  async run(pictureId: string): Promise<void> {
    const picture = await this.repo.find(pictureId);
    if (!picture || picture.state !== 'PROCESSING' || !picture.storageKey) return;
    const key = picture.storageKey;
    try {
      const out = await processPicture(await this.storage.downloadUpload(key));
      const base = `${picture.ownerId}/${picture.id}`;
      const url = await this.storage.putPublic(`${base}.webp`, out.webp, 'image/webp');
      const thumbUrl = await this.storage.putPublic(`${base}-thumb.webp`, out.thumb, 'image/webp');
      await this.repo.markReady(picture.id, {
        url,
        thumbUrl,
        width: out.width,
        height: out.height,
      });
    } catch (err) {
      const why = err instanceof PictureRejected ? 'rejected' : 'failed';
      this.logger.warn(`Picture ${picture.id} ${why}: ${(err as Error).message}`);
      await this.repo.markFailed(picture.id).catch(() => undefined);
    } finally {
      // The original may carry location data: never keep it once processed or refused.
      await this.storage.removeUpload(key).catch(() => undefined);
    }
  }
}
