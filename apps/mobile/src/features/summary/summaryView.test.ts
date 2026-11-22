import type { FinishedRound } from '@/shared/session/roundResults';
import { headlineFor, noteFor, summaryOf } from './summaryView';

const r = (
  outcome: FinishedRound['results'][number]['outcome'],
  heard: string[] = [],
  hintsUsed = 0,
) => ({
  termId: `t-${Math.random()}`,
  display: 'Term',
  outcome,
  xp: 0,
  hintsUsed,
  heard,
});

describe('summary view', () => {
  it('headlines by stars, gently when out of lives', () => {
    expect(headlineFor(3, 'complete')).toBe('Amazing!');
    expect(headlineFor(2, 'complete')).toBe('Nice work!');
    expect(headlineFor(0, 'complete')).toBe('Keep going!');
    expect(headlineFor(1, 'out-of-lives')).toBe('Good effort!');
  });

  it('writes a note for each outcome', () => {
    expect(noteFor(r('first-try', ['nucleus']))).toBe('First try');
    expect(noteFor(r('assisted', ['nuclear', 'nucleus']))).toBe('2nd try');
    expect(noteFor(r('assisted', ['nucleus'], 1))).toBe('With a hint');
    expect(noteFor(r('missed', ['ice a tope']))).toBe('Heard “ice a tope”');
    expect(noteFor(r('skipped'))).toBe('Skipped');
  });

  it('counts right answers, first tries and tricky terms', () => {
    const s = summaryOf({
      roundId: 'x',
      topicId: 'atoms',
      topicTitle: 'Atoms',
      subject: 'Chemistry',
      score: 300,
      bestStreak: 2,
      livesLeft: 2,
      endedBy: 'complete',
      results: [r('first-try'), r('first-try'), r('assisted', ['a', 'b']), r('missed', ['x'])],
    });
    expect(s).toMatchObject({ right: 3, total: 4, firstTry: 2, stars: 2, headline: 'Nice work!' });
    expect(s.tricky).toHaveLength(2);
  });
});
