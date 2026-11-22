import { authUser, FakeContentRepository, FakeUsersRepository } from '../../test/fakes.js';
import { UsersService } from '../users/users.service.js';
import { ContentService } from './content.service.js';

describe('ContentService', () => {
  it('lists subjects with topics, locked by level, with mastered counts', async () => {
    const repo = new FakeContentRepository();
    repo.unlockLevels.set('the-solar-system', 3);
    repo.mastered.set('atoms-and-ions', 2);
    const { subjects } = await new ContentService(
      repo,
      new UsersService(new FakeUsersRepository()),
    ).subjects(authUser());
    const topics = subjects.flatMap((s) => s.topics);
    expect(topics).toHaveLength(7);
    expect(topics.find((t) => t.id === 'the-solar-system')).toMatchObject({
      locked: true,
      unlockLevel: 3,
    });
    expect(topics.find((t) => t.id === 'atoms-and-ions')).toMatchObject({
      locked: false,
      mastered: 2,
      termCount: 7,
    });
  });
});
