/**
 * Creates (or updates) the Supabase Storage buckets for pictures. Safe to run again.
 *   uploads  — private. Teachers' raw files land here through signed URLs; the API deletes each
 *              one after processing. Storage itself refuses files over 5 MB or of other types.
 *   pictures — public. Processed WebP pictures and thumbnails that the app and dashboard show.
 * Run: pnpm --filter api storage:setup   (needs SUPABASE_URL and the secret key in .env)
 */
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { PICTURE_RULES } from '@blurt/shared/schemas';

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (the secret key) in apps/api/.env');
  process.exit(1);
}
const storage = createClient(url, key, { auth: { persistSession: false } }).storage;

const buckets = [
  {
    id: process.env.STORAGE_UPLOADS_BUCKET || 'uploads',
    options: {
      public: false,
      fileSizeLimit: PICTURE_RULES.maxBytes,
      allowedMimeTypes: [...PICTURE_RULES.contentTypes],
    },
  },
  {
    id: process.env.STORAGE_PICTURES_BUCKET || 'pictures',
    options: {
      public: true,
      fileSizeLimit: PICTURE_RULES.maxBytes,
      allowedMimeTypes: ['image/webp'],
    },
  },
];

for (const { id, options } of buckets) {
  const existing = await storage.getBucket(id);
  const { error } = existing.data
    ? await storage.updateBucket(id, options)
    : await storage.createBucket(id, options);
  if (error) {
    console.error(`Bucket "${id}": ${error.message}`);
    process.exit(1);
  }
  console.log(
    `Bucket "${id}" ${existing.data ? 'updated' : 'created'} (${options.public ? 'public' : 'private'})`,
  );
}
