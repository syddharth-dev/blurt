import { HttpException } from '@nestjs/common';
import { FakeUsersRepository } from '../../test/fakes.js';
import { AuthAdminError, type AuthAdmin } from '../auth/auth-admin.js';
import { AdminService } from './admin.service.js';

function setup(
  overrides: Partial<Record<'invite' | 'findIdByEmail', ReturnType<typeof vi.fn>>> = {},
) {
  const users = new FakeUsersRepository();
  const invite = overrides.invite ?? vi.fn(async () => ({ id: 'new-teacher' }));
  const findIdByEmail = overrides.findIdByEmail ?? vi.fn(async () => null);
  const fakeAuth = { invite, findIdByEmail } as unknown as AuthAdmin;
  return { users, invite, service: new AdminService(users, fakeAuth) };
}

describe('AdminService', () => {
  it('invites a new email: Supabase invite + a TEACHER profile', async () => {
    const { service, invite, users } = setup();
    const r = await service.inviteTeacher({ email: 'Ms.Reyes@School.edu', name: 'Ms Reyes' });
    expect(invite).toHaveBeenCalledWith('ms.reyes@school.edu');
    expect(r).toEqual({
      status: 'invited',
      teacher: {
        id: 'new-teacher',
        name: 'Ms Reyes',
        email: 'ms.reyes@school.edu',
        role: 'TEACHER',
      },
    });
    expect(users.users.get('new-teacher')?.role).toBe('TEACHER');
  });

  it('promotes an existing student account instead of inviting it', async () => {
    const { service, invite, users } = setup();
    await users.create({ id: 's1', name: 'Ana', email: 'ana@school.edu' });
    const r = await service.inviteTeacher({ email: 'ana@school.edu' });
    expect(r.status).toBe('promoted');
    expect(invite).not.toHaveBeenCalled();
    expect(users.users.get('s1')?.role).toBe('TEACHER');
  });

  it('never demotes an admin', async () => {
    const { service, users } = setup();
    await users.create({ id: 'a1', name: 'Admin', email: 'boss@school.edu', role: 'ADMIN' });
    expect((await service.inviteTeacher({ email: 'boss@school.edu' })).status).toBe(
      'already-staff',
    );
    expect(users.users.get('a1')?.role).toBe('ADMIN');
  });

  it('a Supabase account without a profile yet becomes a teacher', async () => {
    const { service, users } = setup({
      invite: vi.fn(async () => {
        throw new AuthAdminError('email_exists', 'exists');
      }),
      findIdByEmail: vi.fn(async () => 'auth-only'),
    });
    expect((await service.inviteTeacher({ email: 'new@school.edu' })).status).toBe('promoted');
    expect(users.users.get('auth-only')?.role).toBe('TEACHER');
  });

  it('a failed invite is a clear 502, with nothing half-created', async () => {
    const { service, users } = setup({
      invite: vi.fn(async () => {
        throw new AuthAdminError('smtp', 'Error sending invite email');
      }),
    });
    const err = await service.inviteTeacher({ email: 'x@school.edu' }).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(HttpException);
    expect((err as HttpException).getStatus()).toBe(502);
    expect(users.users.size).toBe(0);
  });

  it('lists teachers and admins, not students', async () => {
    const { service, users } = setup();
    await users.create({ id: 's', name: 'S', email: 's@x.y' });
    await users.create({ id: 't', name: 'T', email: 't@x.y', role: 'TEACHER' });
    await users.create({ id: 'a', name: 'A', email: 'a@x.y', role: 'ADMIN' });
    expect((await service.staff()).staff.map((m) => m.id).sort()).toEqual(['a', 't']);
  });
});
