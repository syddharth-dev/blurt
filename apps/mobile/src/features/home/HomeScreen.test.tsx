import { GRADE8_TERMS, topicsOf } from '@blurt/shared/content';
import { fireEvent, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import { useAuth } from '@/shared/auth/session';
import { renderWithProviders as render } from '@/test/render';
import { HomeScreen } from './HomeScreen';

import { dailyTopic } from './daily';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() },
}));

jest.mock('@/shared/api/endpoints', () => ({
  endpoints: {
    daily: jest.fn(async (localDate: string) => ({
      localDate,
      topic: {
        id: 'atoms-and-ions',
        title: 'Atoms and ions',
        subject: 'Chemistry',
        grade: 8,
        termCount: 7,
        dueOn: null,
      },
      bonusXp: 150,
      done: true,
    })),
    practice: jest.fn(async () => ({
      dueCount: 3,
      termIds: ['chem-proton', 'bio-gene', 'phys-inertia'],
      nextDueAt: null,
    })),
    me: jest.fn(async () => ({
      id: 'u1',
      name: 'Ana',
      role: 'STUDENT',
      grade: 8,
      xp: 640,
      level: 2,
      streak: 5,
      lastPlayedOn: '2026-11-22',
    })),
    subjects: jest.fn(async () => ({
      subjects: [
        {
          id: 'chemistry',
          name: 'Chemistry',
          color: 'sunny',
          topics: [
            {
              id: 'atoms-and-ions',
              title: 'Atoms and ions',
              grade: 8,
              termCount: 7,
              unlockLevel: 1,
              locked: false,
              mastered: 3,
            },
          ],
        },
        {
          id: 'earth-space',
          name: 'Earth & Space',
          color: 'violet',
          topics: [
            {
              id: 'the-solar-system',
              title: 'The solar system',
              grade: 8,
              termCount: 2,
              unlockLevel: 4,
              locked: true,
              mastered: 0,
            },
          ],
        },
      ],
    })),
  },
}));

const topics = topicsOf(GRADE8_TERMS);

describe('HomeScreen', () => {
  afterEach(() => {
    jest.clearAllMocks();
    useAuth.setState({ status: 'signedOut', session: null });
  });

  it("shows Pip's greeting, today's challenge and every topic", async () => {
    await render(<HomeScreen />);
    expect(screen.getByText("Hey, I'm Pip.")).toBeOnTheScreen();
    const today = dailyTopic(topics, new Date())!;
    expect(screen.getAllByText(today.title).length).toBeGreaterThan(0);
    expect(screen.getByText('+150 XP')).toBeOnTheScreen();
    for (const t of topics) {
      expect(screen.getByLabelText(new RegExp(`^${t.title}, ${t.subject}`))).toBeOnTheScreen();
    }
    expect(screen.getByLabelText(/today's topic/)).toBeOnTheScreen();
  });

  it('shows honest zeros until progress is saved', async () => {
    await render(<HomeScreen />);
    expect(screen.getByLabelText('0 day streak')).toBeOnTheScreen();
    expect(screen.getByLabelText('0 gems')).toBeOnTheScreen();
  });

  it("Let's blurt starts today's topic; See all opens Topics", async () => {
    await render(<HomeScreen />);
    const today = dailyTopic(topics, new Date())!;
    await fireEvent.press(screen.getByText("Let's blurt"));
    expect(router.push).toHaveBeenCalledWith(`/play/${today.id}?daily=1`);
    await fireEvent.press(screen.getByText('See all'));
    expect(router.push).toHaveBeenCalledWith('/topics');
  });

  it('shows saved progress once signed in: initial, streak, mastery and locks', async () => {
    useAuth.setState({ status: 'signedIn' });
    await render(<HomeScreen />);
    expect(await screen.findByLabelText('5 day streak')).toBeOnTheScreen();
    expect(screen.getByText('A')).toBeOnTheScreen();
    expect(screen.getByLabelText(/^Atoms and ions, Chemistry, 3 of 7 mastered/)).toBeOnTheScreen();
    expect(screen.getByLabelText('The solar system, unlocks at level 4')).toBeOnTheScreen();
  });

  it('offers practice when terms are due, starting exactly those terms', async () => {
    useAuth.setState({ status: 'signedIn' });
    await render(<HomeScreen />);
    const card = await screen.findByLabelText('Practice. 3 terms are back for review.');
    await fireEvent.press(card);
    expect(router.push).toHaveBeenCalledWith(
      '/play/practice?ids=chem-proton,bio-gene,phys-inertia',
    );
  });

  it('no practice card when signed out', async () => {
    await render(<HomeScreen />);
    expect(screen.queryByText(/back for review/)).toBeNull();
  });

  it("signed in: the server picks today's challenge; once the bonus is earned it says so", async () => {
    useAuth.setState({ status: 'signedIn' });
    await render(<HomeScreen />);
    expect(await screen.findByText('Bonus earned')).toBeOnTheScreen();
    await fireEvent.press(screen.getByText('Play again'));
    expect(router.push).toHaveBeenCalledWith('/play/atoms-and-ions?daily=1');
  });
});
