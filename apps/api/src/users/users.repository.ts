import { Injectable } from '@nestjs/common';
import type { Role } from '@blurt/shared/schemas';
import { PrismaService } from '../common/prisma/prisma.service.js';

export type UserRecord = {
  id: string;
  role: Role;
  name: string;
  email: string | null;
  grade: number | null;
  xp: number;
  level: number;
  streak: number;
  lastPlayedOn: string | null;
  /** Local date the daily bonus was last earned */
  lastDailyOn: string | null;
};

export type NewUser = { id: string; name: string; email?: string | null; role?: Role };

export abstract class UsersRepository {
  abstract find(id: string): Promise<UserRecord | null>;
  abstract findByEmail(email: string): Promise<UserRecord | null>;
  abstract create(data: NewUser): Promise<UserRecord>;
  abstract update(id: string, data: Partial<Omit<UserRecord, 'id' | 'role'>>): Promise<UserRecord>;
  /** Only admin flows change roles (never the user themselves). */
  abstract setRole(id: string, role: Role): Promise<UserRecord>;
  abstract listByRole(roles: Role[]): Promise<UserRecord[]>;
}

const select = {
  id: true,
  role: true,
  name: true,
  email: true,
  grade: true,
  xp: true,
  level: true,
  streak: true,
  lastPlayedOn: true,
  lastDailyOn: true,
} as const;

@Injectable()
export class PrismaUsersRepository extends UsersRepository {
  constructor(private readonly db: PrismaService) {
    super();
  }
  find(id: string) {
    return this.db.user.findUnique({ where: { id }, select });
  }
  findByEmail(email: string) {
    return this.db.user.findUnique({ where: { email: email.toLowerCase() }, select });
  }
  create(data: NewUser) {
    // upsert: two first requests at once must not both fail on the unique id
    const row = { ...data, email: data.email?.toLowerCase() ?? null };
    return this.db.user.upsert({ where: { id: data.id }, update: {}, create: row, select });
  }
  setRole(id: string, role: Role) {
    return this.db.user.update({ where: { id }, data: { role }, select });
  }
  listByRole(roles: Role[]) {
    return this.db.user.findMany({
      where: { role: { in: roles } },
      orderBy: { name: 'asc' },
      select,
    });
  }
  update(id: string, data: Partial<Omit<UserRecord, 'id' | 'role'>>) {
    return this.db.user.update({ where: { id }, data, select });
  }
}
