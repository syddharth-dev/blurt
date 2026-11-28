import { Inject, Injectable } from '@nestjs/common';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { ENV } from '../common/config/config.module.js';
import type { Env } from '../common/config/env.js';

/**
 * Supabase Storage for pictures (DEPLOYMENT.md → Storage). Raw uploads go to a private bucket
 * straight from the browser through a signed URL (the API never receives the file); processed
 * WebP files go to a public bucket. Abstract so tests can use a fake.
 */
export abstract class PictureStorage {
  abstract readonly configured: boolean;
  abstract readonly uploadsBucket: string;
  /** A one-time token the browser uses with uploadToSignedUrl(path, token, file). */
  abstract createSignedUpload(path: string): Promise<{ token: string }>;
  abstract downloadUpload(path: string): Promise<Buffer>;
  abstract removeUpload(path: string): Promise<void>;
  /** Stores a processed file and returns its public URL. */
  abstract putPublic(path: string, data: Buffer, contentType: string): Promise<string>;
}

export class StorageError extends Error {}

@Injectable()
export class SupabasePictureStorage extends PictureStorage {
  private readonly client: SupabaseClient | null;
  readonly uploadsBucket: string;
  private readonly picturesBucket: string;

  constructor(@Inject(ENV) env: Env) {
    super();
    this.uploadsBucket = env.STORAGE_UPLOADS_BUCKET;
    this.picturesBucket = env.STORAGE_PICTURES_BUCKET;
    this.client =
      env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY
        ? createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
            auth: { persistSession: false, autoRefreshToken: false },
          })
        : null;
  }

  get configured() {
    return this.client !== null;
  }

  private get storage() {
    if (!this.client) throw new StorageError('Supabase Storage is not configured.');
    return this.client.storage;
  }

  async createSignedUpload(path: string) {
    const { data, error } = await this.storage.from(this.uploadsBucket).createSignedUploadUrl(path);
    if (error || !data) throw new StorageError(error?.message ?? 'signed upload failed');
    return { token: data.token };
  }

  async downloadUpload(path: string) {
    const { data, error } = await this.storage.from(this.uploadsBucket).download(path);
    if (error || !data) throw new StorageError(error?.message ?? 'download failed');
    return Buffer.from(await data.arrayBuffer());
  }

  async removeUpload(path: string) {
    await this.storage.from(this.uploadsBucket).remove([path]);
  }

  async putPublic(path: string, data: Buffer, contentType: string) {
    const bucket = this.storage.from(this.picturesBucket);
    const { error } = await bucket.upload(path, data, {
      contentType,
      upsert: true,
      cacheControl: '31536000',
    });
    if (error) throw new StorageError(error.message);
    return bucket.getPublicUrl(path).data.publicUrl;
  }
}
