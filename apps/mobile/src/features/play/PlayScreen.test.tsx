import { act, cleanup, fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import { useRoundResults } from '@/shared/session/roundResults';
import { PlayScreen } from './PlayScreen';

jest.mock('expo-router', () => ({
  router: { back: jest.fn(), replace: jest.fn(), push: jest.fn() },
}));

// Scripted speech: the prototype flow from SPEECH_AND_MATCHING.md → "Testing speech without talking".
jest.mock('@/shared/speech', () => {
  const actual = jest.requireActual('@/shared/speech');
  return {
    ...actual,
    createSpeechRecognizer: () =>
      actual.createMockSpeechAdapter(
        [
          { partials: ['nu', 'nucle'], final: ['nuclear'] },
          { partials: ['nu'], final: ['new clears', 'nucleus'] },
        ],
        { stepMs: 10 },
      ),
  };
});

// "Cells and heredity" starts with Nucleus, then Mitosis.
const TOPIC = 'cells-and-heredity';

async function tapMicAndWait() {
  await fireEvent.press(screen.getByLabelText(/Tap to speak|Try again/));
  await act(async () => {
    jest.advanceTimersByTime(100);
  });
}

describe('PlayScreen', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(async () => {
    await cleanup(); // unmount while fake timers are still installed
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it('plays a term by voice: close, then correct, then the next term', async () => {
    await render(<PlayScreen topicId={TOPIC} />);
    await act(async () => {}); // permission check resolves
    expect(screen.getByText('Name the glowing part')).toBeOnTheScreen();
    expect(screen.getByLabelText(/An animal cell.*The part to name is glowing/)).toBeOnTheScreen();
    expect(screen.getByLabelText('3 lives left')).toBeOnTheScreen();

    await tapMicAndWait();
    expect(await screen.findByText("Close — that's the adjective.")).toBeOnTheScreen();
    expect(screen.getByText('Heard: nuclear')).toBeOnTheScreen();
    expect(screen.getByLabelText('2 lives left')).toBeOnTheScreen();

    await tapMicAndWait();
    expect(await screen.findByText('Nucleus. Nailed it.')).toBeOnTheScreen();
    expect(screen.getByText('QUICK FACT')).toBeOnTheScreen();
    expect(screen.getByLabelText(/It's Nucleus\./)).toBeOnTheScreen(); // "?" became the term

    await fireEvent.press(screen.getByText('Next term'));
    expect(screen.getByText('2 / 6')).toBeOnTheScreen();
  });

  it('accepts a typed answer through "Type it instead"', async () => {
    await render(<PlayScreen topicId={TOPIC} />);
    await act(async () => {});
    await fireEvent.press(screen.getByText('Type it instead'));
    await fireEvent.changeText(screen.getByLabelText('Type the term'), 'nucleus');
    await fireEvent.press(screen.getByText('Check'));
    expect(await screen.findByText('Nucleus. Nailed it.')).toBeOnTheScreen();
  });

  it('with a picture, the first hint shows the clue and the next reveals a letter', async () => {
    await render(<PlayScreen topicId={TOPIC} />);
    await act(async () => {});
    expect(screen.getByLabelText('Answer: N, then 6 hidden letters')).toBeOnTheScreen();
    await fireEvent.press(screen.getByLabelText('Hint: Clue. 3 left'));
    expect(screen.getByText('The control center of the cell.')).toBeOnTheScreen();
    await fireEvent.press(screen.getByLabelText('Hint: Letter. 2 left'));
    expect(screen.getByLabelText('Answer: N, U, then 5 hidden letters')).toBeOnTheScreen();
  });

  it('skipping every term ends the round and hands results to Summary', async () => {
    await render(<PlayScreen topicId="ecosystems" />); // 3 terms, 2 skips
    await act(async () => {});
    for (let i = 0; i < 2; i++) {
      await fireEvent.press(screen.getByLabelText(/Skip this term/));
    }
    await fireEvent.press(screen.getByText('Type it instead'));
    await fireEvent.changeText(screen.getByLabelText('Type the term'), 'decomposer');
    await fireEvent.press(screen.getByText('Check'));
    await fireEvent.press(await screen.findByText('See results'));
    expect(router.replace).toHaveBeenCalledWith(expect.stringMatching(/^\/summary\//));
    expect(useRoundResults.getState().last).toMatchObject({
      topicId: 'ecosystems',
      endedBy: 'complete',
      results: [{ outcome: 'skipped' }, { outcome: 'skipped' }, { outcome: 'first-try' }],
    });
  });

  it('quitting goes back without a summary', async () => {
    await render(<PlayScreen topicId={TOPIC} />);
    await fireEvent.press(screen.getByLabelText('Quit round'));
    expect(router.back).toHaveBeenCalled();
    expect(router.replace).not.toHaveBeenCalled();
  });

  it('shows a friendly message for an unknown topic', async () => {
    await render(<PlayScreen topicId="nope" />);
    expect(
      screen.getByText("That topic isn't here. Pick another one from Home."),
    ).toBeOnTheScreen();
  });
});
