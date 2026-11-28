import { Injectable } from '@nestjs/common';
import type { Me, UpdateMe } from '@blurt/shared/schemas';
import type { AuthUser } from '../auth/supabase-jwt.guard.js';
import { UsersRepository, type UserRecord } from './users.repository.js';

@Injectable()
export class UsersService {
  constructor(private readonly repo: UsersRepository) {}

  /** The user's row, created on first sign-in. New accounts are always students. */
  async ensure(auth: AuthUser): Promise<UserRecord> {
    const email = emailOf(auth);
    const found = await this.repo.find(auth.id);
    if (!found) return this.repo.create({ id: auth.id, name: nameFrom(auth), email });
    // Rows made before emails were stored get theirs on the next request.
    if (!found.email && email) return this.repo.update(auth.id, { email });
    return found;
  }

  async me(auth: AuthUser): Promise<Me> {
    return toMe(await this.ensure(auth));
  }

  async update(auth: AuthUser, patch: UpdateMe): Promise<Me> {
    await this.ensure(auth);
    return toMe(await this.repo.update(auth.id, patch));
  }
}

export function toMe(u: UserRecord): Me {
  return {
    id: u.id,
    name: u.name,
    role: u.role,
    grade: u.grade,
    xp: u.xp,
    level: u.level,
    streak: u.streak,
    lastPlayedOn: u.lastPlayedOn,
  };
}

function emailOf(auth: AuthUser): string | null {
  return typeof auth.claims.email === 'string' ? auth.claims.email.toLowerCase() : null;
}

/** A first name to greet with: the profile name, else the email's local part, else "Student". */
function nameFrom(auth: AuthUser): string {
  const meta = auth.claims.user_metadata as { name?: unknown; full_name?: unknown } | undefined;
  const fromMeta = [meta?.name, meta?.full_name].find((v): v is string => typeof v === 'string');
  if (fromMeta?.trim()) return fromMeta.trim().slice(0, 40);
  const email = typeof auth.claims.email === 'string' ? auth.claims.email : '';
  const local = email
    .split('@')[0]
    ?.replace(/[._-]+/g, ' ')
    .trim();
  if (local) return local.charAt(0).toUpperCase() + local.slice(1, 40);
  return 'Student';
}
