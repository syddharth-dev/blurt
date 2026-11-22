import 'dotenv/config';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations', seed: 'tsx prisma/seed.ts' },
  datasource: {
    // Migrations use the direct (non-pooled) connection; the app uses DATABASE_URL.
    // Plain process.env so `prisma generate` and `prisma validate` work without a database.
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? '',
  },
});
