import { authUser, FakeUsersRepository } from '../../test/fakes.js';
import { UsersService } from './users.service.js';

describe('UsersService', () => {
  it('creates a student on first sign-in, named from the email', async () => {
    const repo = new FakeUsersRepository();
    const me = await new UsersService(repo).me(authUser('u1', 'ana.cruz@school.test'));
    expect(me).toMatchObject({
      id: 'u1',
      name: 'Ana cruz',
      role: 'STUDENT',
      xp: 0,
      level: 1,
      streak: 0,
    });
  });

  it('prefers the profile name, and never creates a second row', async () => {
    const repo = new FakeUsersRepository();
    const service = new UsersService(repo);
    const auth = {
      id: 'u2',
      claims: { sub: 'u2', email: 'x@y.z', user_metadata: { name: 'Bea' } },
    };
    expect((await service.me(auth)).name).toBe('Bea');
    await service.me(auth);
    expect(repo.users.size).toBe(1);
  });

  it('updates name and grade', async () => {
    const service = new UsersService(new FakeUsersRepository());
    expect(await service.update(authUser('u3'), { name: 'Cora', grade: 8 })).toMatchObject({
      name: 'Cora',
      grade: 8,
    });
  });
});
