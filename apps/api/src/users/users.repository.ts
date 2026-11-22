import { Injectable } from '@nestjs/common';
import type { Role } from '@blurt/shared/schemas';
import { PrismaService } from '../common/prisma/prisma.service.js';

export type UserRecord = {
  id: string;
  role: Role;
  name: string;
  grade: number | null;
  xp: number;
  level: number;
  streak: number;
  lastPlayedOn: string | null;
};

export abstract class UsersRepository {
  abstract find(id: string): Promise<UserRecord | null>;
  abstract create(data: { id: string; name: string }): Promise<UserRecord>;
  abstract update(id: string, data: Partial<Omit<UserRecord, 'id' | 'role'>>): Promise<UserRecord>;
}

const select = {
  id: true,
  role: true,
  name: true,
  grade: true,
  xp: true,
  level: true,
  streak: true,
  lastPlayedOn: true,
} as const;

@Injectable()
export class PrismaUsersRepository extends UsersRepository {
  constructor(private readonly db: PrismaService) {
    super();
  }
  find(id: string) {
    return this.db.user.findUnique({ where: { id }, select });
  }
  create(data: { id: string; name: string }) {
    // upsert: two first requests at once must not both fail on the unique id
    return this.db.user.upsert({ where: { id: data.id }, update: {}, create: data, select });
  }
  update(id: string, data: Partial<Omit<UserRecord, 'id' | 'role'>>) {
    return this.db.user.update({ where: { id }, data, select });
  }
}
