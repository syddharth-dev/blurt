/**
 * Makes an existing account an admin (the first admin can't be invited by anyone).
 * Run: pnpm --filter api make-admin you@example.com
 * The account must exist: sign in once in the app or dashboard first.
 */
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { createClient } from '@supabase/supabase-js';
import { PrismaClient } from '../src/generated/prisma/client.js';

const arg = process.argv[2]?.trim().toLowerCase();
if (!arg || !arg.includes('@')) {
  console.error('Usage: pnpm --filter api make-admin you@example.com');
  process.exit(1);
}
const email: string = arg;

const db = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? '',
  }),
});

async function findAuthUserId(): Promise<string | null> {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  const admin = createClient(url, key, { auth: { persistSession: false } }).auth.admin;
  for (let page = 1; page <= 50; page++) {
    const { data, error } = await admin.listUsers({ page, perPage: 200 });
    if (error)
      throw new Error(`Supabase: ${error.message} (is SUPABASE_SERVICE_ROLE_KEY the secret key?)`);
    const hit = data.users.find((u) => u.email?.toLowerCase() === email);
    if (hit) return hit.id;
    if (data.users.length < 200) return null;
  }
  return null;
}

async function main() {
  const byEmail = await db.user.findUnique({ where: { email } });
  if (byEmail) {
    await db.user.update({ where: { id: byEmail.id }, data: { role: 'ADMIN' } });
    console.log(`${email} is now an admin.`);
    return;
  }
  const id = await findAuthUserId();
  if (!id) {
    console.error(
      `No account for ${email} yet. Sign in once in the app or dashboard, then run this again.`,
    );
    process.exitCode = 1;
    return;
  }
  await db.user.upsert({
    where: { id },
    update: { role: 'ADMIN', email },
    create: { id, role: 'ADMIN', email, name: email.split('@')[0] ?? 'Admin' },
  });
  console.log(`${email} is now an admin.`);
}

main()
  .catch((e: unknown) => {
    console.error(e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
