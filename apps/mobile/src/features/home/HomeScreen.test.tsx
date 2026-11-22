import { GRADE8_TERMS, topicsOf } from '@blurt/shared/content';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import { HomeScreen } from './HomeScreen';
import { dailyTopic } from './daily';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() },
}));

const topics = topicsOf(GRADE8_TERMS);

describe('HomeScreen', () => {
  afterEach(() => jest.clearAllMocks());

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
    expect(router.push).toHaveBeenCalledWith(`/play/${today.id}`);
    await fireEvent.press(screen.getByText('See all'));
    expect(router.push).toHaveBeenCalledWith('/topics');
  });
});
