import { fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import { useRoundResults } from '@/shared/session/roundResults';
import { SummaryScreen } from './SummaryScreen';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() },
}));

const result = (
  termId: string,
  display: string,
  outcome: 'first-try' | 'assisted' | 'missed',
  heard: string[],
) => ({
  termId,
  display,
  outcome,
  xp: outcome === 'first-try' ? 100 : outcome === 'assisted' ? 75 : 0,
  hintsUsed: 0,
  heard,
});

// Set before rendering, so no act() is needed.
function finishRound() {
  {
    useRoundResults.setState({ last: null, totalXp: 400 });
    useRoundResults.getState().setLast({
      roundId: 'r1',
      topicId: 'atoms-and-ions',
      topicTitle: 'Atoms and ions',
      subject: 'Chemistry',
      score: 175,
      bestStreak: 1,
      livesLeft: 1,
      endedBy: 'complete',
      results: [
        result('chem-proton', 'Proton', 'first-try', ['proton']),
        result('bio-nucleus', 'Nucleus', 'assisted', ['nuclear', 'nucleus']),
        result('chem-isotope', 'Isotope', 'missed', ['ice a tope']),
      ],
    });
  }
}

describe('SummaryScreen', () => {
  afterEach(() => jest.clearAllMocks());

  it('shows stars, the headline, score, XP with level up, stats and the review list', async () => {
    finishRound();
    await render(<SummaryScreen roundId="r1" />);
    expect(screen.getByLabelText('2 of 3 stars')).toBeOnTheScreen();
    expect(screen.getByText('Nice work!')).toBeOnTheScreen();
    expect(screen.getByLabelText('2 out of 3')).toBeOnTheScreen();
    // 400 → 575 XP crosses 500: level 2
    expect(screen.getByLabelText('Level 2, level up. Plus 175 XP')).toBeOnTheScreen();
    expect(screen.getByLabelText('To practise: 2')).toBeOnTheScreen();
    expect(screen.getByText('2nd try')).toBeOnTheScreen();
    expect(screen.getByText('Heard “ice a tope”')).toBeOnTheScreen();
  });

  it('practises the tricky terms and plays the topic again', async () => {
    finishRound();
    await render(<SummaryScreen roundId="r1" />);
    await fireEvent.press(screen.getByText('Practise 2 tricky terms'));
    expect(router.replace).toHaveBeenCalledWith('/play/practice?ids=bio-nucleus,chem-isotope');
    await fireEvent.press(screen.getByText('Play again'));
    expect(router.replace).toHaveBeenCalledWith('/play/atoms-and-ions');
  });

  it('explains when there is no round to show', async () => {
    await render(<SummaryScreen roundId="other" />);
    expect(screen.getByText('No round here')).toBeOnTheScreen();
  });
});
