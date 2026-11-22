import { type ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { authUser, FakeUsersRepository } from '../../test/fakes.js';
import { UsersService } from '../users/users.service.js';
import { RolesGuard } from './roles.guard.js';

function ctx(
  roles: string[] | undefined,
  user = authUser(),
): { context: ExecutionContext; reflector: Reflector } {
  const reflector = { getAllAndOverride: vi.fn().mockReturnValue(roles) } as unknown as Reflector;
  const context = {
    getHandler: () => () => undefined,
    getClass: () => class {},
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  } as unknown as ExecutionContext;
  return { context, reflector };
}

describe('RolesGuard', () => {
  it('lets anyone signed in through routes without @Roles', async () => {
    const { context, reflector } = ctx(undefined);
    await expect(
      new RolesGuard(reflector, new UsersService(new FakeUsersRepository())).canActivate(context),
    ).resolves.toBe(true);
  });

  it('a student gets 403 on a teacher route (AGENTS.md rule 9)', async () => {
    const { context, reflector } = ctx(['TEACHER']);
    const guard = new RolesGuard(reflector, new UsersService(new FakeUsersRepository()));
    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('roles come from our database, and admins pass every role check', async () => {
    const repo = new FakeUsersRepository();
    await repo.create({ id: 'teacher-1', name: 'T' });
    repo.users.set('teacher-1', { ...repo.users.get('teacher-1')!, role: 'TEACHER' });
    await repo.create({ id: 'admin-1', name: 'A' });
    repo.users.set('admin-1', { ...repo.users.get('admin-1')!, role: 'ADMIN' });
    const guard = (u: string) => {
      const { context, reflector } = ctx(['TEACHER'], authUser(u));
      return new RolesGuard(reflector, new UsersService(repo)).canActivate(context);
    };
    await expect(guard('teacher-1')).resolves.toBe(true);
    await expect(guard('admin-1')).resolves.toBe(true);
  });
});
