import { GRADE8_TERMS } from '@blurt/shared/content';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import { useAuth } from '@/shared/auth/session';
import { useRoundResults } from '@/shared/session/roundResults';
import { PlayScreen } from './PlayScreen';

jest.mock('expo-router', () => ({
  router: { back: jest.fn(), replace: jest.fn(), push: jest.fn() },
}));
jest.mock('@/shared/config', () => ({
  config: { apiUrl: 'http://api.test', supabaseUrl: 'x', supabaseAnonKey: 'y' },
  isOnlineConfigured: () => true,
}));
jest.mock('@/shared/auth/supabase', () => ({ supabase: null }));
jest.mock('@/shared/speech', () => {
  const actual = jest.requireActual('@/shared/speech');
  return { ...actual, createSpeechRecognizer: () => actual.createMockSpeechAdapter() };
});

const mockApi = { startRound: jest.fn(), attempt: jest.fn(), skip: jest.fn(), finish: jest.fn() };
jest.mock('@/shared/api/endpoints', () => ({
  endpoints: {
    startRound: (...a: unknown[]) => mockApi.startRound(...a),
    attempt: (...a: unknown[]) => mockApi.attempt(...a),
    skip: (...a: unknown[]) => mockApi.skip(...a),
    finish: (...a: unknown[]) => mockApi.finish(...a),
  },
}));

const term = (id: string) => {
  const t = GRADE8_TERMS.find((x) => x.id === id)!;
  return {
    ...t,
    version: 1,
    difficulty: t.difficulty,
    audioUrl: null,
    picture: t.picture ? { ...t.picture, url: null } : null,
  };
};

describe('PlayScreen (online)', () => {
  beforeEach(() => {
    useAuth.setState({ status: 'signedIn' });
    mockApi.startRound.mockResolvedValue({
      roundId: 'srv-round',
      topic: { id: 'ecosystems', title: 'Ecosystems', subject: 'Biology' },
      terms: [term('bio-producer'), term('bio-consumer')],
      lives: 3,
      hints: 3,
      skips: 2,
    });
    mockApi.skip.mockResolvedValue({ skipsLeft: 1 });
  });
  afterEach(async () => {
    await cleanup();
    jest.clearAllMocks();
    useAuth.setState({ status: 'signedOut' });
  });

  async function typeAnswer(text: string) {
    await fireEvent.press(screen.getByText('Type it instead'));
    await fireEvent.changeText(screen.getByLabelText('Type the term'), text);
    await fireEvent.press(screen.getByText('Check'));
  }

  it("uses the server's verdict, sends hints and an idempotency key", async () => {
    // The phone would call "producer" correct; the server has the final say.
    mockApi.attempt.mockResolvedValue({
      verdict: 'close',
      matched: 'producer',
      feedback: 'Close — check the ending.',
      pronunciation: { syllables: 'pro·du·cer', audioUrl: null },
      livesLeft: 2,
      xpGained: 0,
    });
    await render(<PlayScreen topicId="ecosystems" />);
    await screen.findByText('1 / 2');
    await typeAnswer('producer');
    expect(await screen.findByText('Close — check the ending.')).toBeOnTheScreen();
    expect(mockApi.attempt).toHaveBeenCalledWith(
      'srv-round',
      expect.objectContaining({
        termId: 'bio-producer',
        alternatives: ['producer'],
        inputMode: 'typed',
        hintsUsed: 0,
        idempotencyKey: expect.any(String),
      }),
    );
  });

  it('falls back to the phone when the server is unreachable mid-round', async () => {
    const { ApiRequestError } = jest.requireActual('@/shared/api/client');
    mockApi.attempt.mockRejectedValue(new ApiRequestError("Can't reach", 0, 'OFFLINE', true));
    await render(<PlayScreen topicId="ecosystems" />);
    await screen.findByText('1 / 2');
    await typeAnswer('producer');
    expect(await screen.findByText('Producer. Nailed it.')).toBeOnTheScreen();
    expect(screen.getByText(/Offline: answers are checked on your phone/)).toBeOnTheScreen();
  });

  it('reports skips, finishes on the server and shows its XP in the summary', async () => {
    mockApi.attempt.mockResolvedValue({
      verdict: 'correct',
      matched: 'consumer',
      feedback: null,
      pronunciation: { syllables: 'con·su·mer', audioUrl: null },
      livesLeft: 3,
      xpGained: 100,
    });
    mockApi.finish.mockResolvedValue({
      roundId: 'srv-round',
      score: 100,
      xpBefore: 450,
      xpAfter: 550,
      level: 2,
      levelledUp: true,
      streak: 4,
      bestStreak: 1,
      livesLeft: 3,
      endedBy: 'complete',
      results: [
        {
          termId: 'bio-producer',
          display: 'Producer',
          outcome: 'skipped',
          xp: 0,
          hintsUsed: 0,
          heard: [],
        },
        {
          termId: 'bio-consumer',
          display: 'Consumer',
          outcome: 'first-try',
          xp: 100,
          hintsUsed: 0,
          heard: ['consumer'],
        },
      ],
    });
    await render(<PlayScreen topicId="ecosystems" />);
    await screen.findByText('1 / 2');
    await fireEvent.press(screen.getByLabelText(/Skip this term/));
    expect(mockApi.skip).toHaveBeenCalledWith(
      'srv-round',
      expect.objectContaining({ termId: 'bio-producer' }),
    );
    await typeAnswer('consumer');
    await fireEvent.press(await screen.findByText('See results'));
    await act(async () => {});
    expect(mockApi.finish).toHaveBeenCalledWith(
      'srv-round',
      expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
    );
    expect(router.replace).toHaveBeenCalledWith('/summary/srv-round');
    expect(useRoundResults.getState().last).toMatchObject({
      roundId: 'srv-round',
      score: 100,
      xpBefore: 450,
      xpAfter: 550,
    });
  });
});
