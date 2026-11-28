import { z } from 'zod';

/** Environment variables, validated once at startup. Keep in sync with .env.example. */
export const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().optional(),
  DIRECT_URL: z.string().optional(),
  SUPABASE_URL: z.url().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  /** Where invited teachers land (the teacher dashboard). */
  DASHBOARD_URL: z.url().default('http://localhost:3001'),
  /** Supabase Storage: raw uploads (private) and processed pictures (public). */
  STORAGE_UPLOADS_BUCKET: z.string().default('uploads'),
  STORAGE_PICTURES_BUCKET: z.string().default('pictures'),
  REDIS_URL: z.string().optional(),
  SENTRY_DSN: z.string().optional(),
  CORS_ORIGINS: z
    .string()
    .default('')
    .transform((s) =>
      s
        .split(',')
        .map((o) => o.trim())
        .filter(Boolean),
    ),
});

export type Env = z.infer<typeof EnvSchema>;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  // Treat empty strings (as in a freshly copied .env.example) as unset.
  const cleaned = Object.fromEntries(Object.entries(source).filter(([, v]) => v !== ''));
  const parsed = EnvSchema.safeParse(cleaned);
  if (!parsed.success) {
    throw new Error(`Invalid environment:\n${z.prettifyError(parsed.error)}`);
  }
  const env = parsed.data;
  if (env.NODE_ENV === 'production') {
    const missing = (['DATABASE_URL', 'SUPABASE_URL'] as const).filter((k) => !env[k]);
    if (missing.length)
      throw new Error(`Missing required env in production: ${missing.join(', ')}`);
  }
  return env;
}
