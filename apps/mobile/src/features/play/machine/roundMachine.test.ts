import { GRADE8_TERMS } from '@blurt/shared/content';
import type { MatchResult } from '@blurt/shared/matcher';
import { createActor, fromPromise, waitFor } from 'xstate';
import { moodFor } from '@/shared/mascot/moodFor';
import {
  letterCount,
  roundMachine,
  xpFor,
  type EvaluateInput,
  type RoundInput,
} from './roundMachine';
import { nextHint, phaseOf, progressLabel, tilesFor } from './roundView';

const byCanonical = (c: string) => GRADE8_TERMS.find((t) => t.canonical === c)!;
const nucleus = byCanonical('nucleus');
const proton = byCanonical('proton');
const kinetic = byCanonical('kinetic energy');
/** Terms with a picture start without the clue, so the first hint shows it. */
const withPicture = <T extends object>(t: T) => ({
  ...t,
  picture: {
    diagram: 'test',
    highlight: { shape: 'ellipse' as const, x: 0.4, y: 0.4, w: 0.2, h: 0.2 },
    altText: 'test',
  },
});

function start(
  input: Partial<RoundInput> = {},
  provide?: Parameters<typeof roundMachine.provide>[0],
) {
  const machine = provide ? roundMachine.provide(provide) : roundMachine;
  const actor = createActor(machine, { input: { terms: [nucleus, proton], ...input } });
  actor.start();
  return actor;
}
type Actor = ReturnType<typeof start>;

const phase = (a: Actor) => phaseOf(a.getSnapshot());
const ctx = (a: Actor) => a.getSnapshot().context;
const settle = (a: Actor) => waitFor(a, (s) => !s.matches('evaluating'));

async function say(a: Actor, ...alternatives: string[]) {
  a.send({ type: 'TAP_MIC' });
  a.send({ type: 'FINAL', alternatives });
  await settle(a);
}
async function type(a: Actor, text: string) {
  a.send({ type: 'TYPE_INSTEAD' });
  a.send({ type: 'SUBMIT', text });
  await settle(a);
}

describe('roundMachine', () => {
  it('a term without a picture starts with its clue shown, so the first hint is a letter', () => {
    const a = start();
    expect(ctx(a).clueShown).toBe(true);
    expect(nextHint(ctx(a))).toBe('letter');
    a.send({ type: 'HINT' });
    expect(ctx(a)).toMatchObject({ revealedLetters: 2, hintsLeft: 2 });
  });

  it('the clue state resets per term, based on whether it has a picture', async () => {
    const a = start({ terms: [nucleus, withPicture(proton)] });
    await say(a, 'nucleus');
    a.send({ type: 'NEXT' });
    expect(ctx(a).clueShown).toBe(false);
  });

  it('starts idle on the first term with 3 lives, hints and 2 skips', () => {
    const a = start();
    expect(phase(a)).toBe('idle');
    expect(ctx(a)).toMatchObject({
      index: 0,
      lives: 3,
      hintsLeft: 3,
      skipsLeft: 2,
      revealedLetters: 1,
    });
  });

  describe('voice', () => {
    it('idle → listening → evaluating → correct, calling the recognizer', async () => {
      const startListening = jest.fn();
      const stopListening = jest.fn();
      const a = start({}, { actions: { startListening, stopListening } });

      a.send({ type: 'TAP_MIC' });
      expect(phase(a)).toBe('listening');
      expect(startListening).toHaveBeenCalledTimes(1);

      a.send({ type: 'PARTIAL', text: 'nucle' });
      expect(ctx(a).partial).toBe('nucle');

      a.send({ type: 'TAP_MIC' }); // tap to stop: still listening until FINAL
      expect(stopListening).toHaveBeenCalledTimes(1);
      expect(phase(a)).toBe('listening');

      a.send({ type: 'FINAL', alternatives: ['new clears', 'nucleus'] });
      await settle(a);
      expect(phase(a)).toBe('correct');
      expect(ctx(a)).toMatchObject({ score: 100, streak: 1, lastXp: 100 });
    });

    it('an empty final or a no-speech error returns to idle with an error to show', () => {
      const a = start();
      a.send({ type: 'TAP_MIC' });
      a.send({ type: 'FINAL', alternatives: ['  '] });
      expect(phase(a)).toBe('idle');
      expect(ctx(a).speechError?.code).toBe('no-speech');

      a.send({ type: 'TAP_MIC' });
      expect(ctx(a).speechError).toBeNull(); // cleared when listening again
      a.send({ type: 'SPEECH_ERROR', error: { code: 'network', message: '' } });
      expect(phase(a)).toBe('idle');
      expect(ctx(a).speechError?.code).toBe('network');
    });

    it('an aborted session returns to idle without an error', () => {
      const a = start();
      a.send({ type: 'TAP_MIC' });
      a.send({ type: 'SPEECH_ERROR', error: { code: 'aborted', message: '' } });
      expect(phase(a)).toBe('idle');
      expect(ctx(a).speechError).toBeNull();
    });

    it('switching to typing while listening aborts the recognizer', () => {
      const abortListening = jest.fn();
      const a = start({}, { actions: { abortListening } });
      a.send({ type: 'TAP_MIC' });
      a.send({ type: 'TYPE_INSTEAD' });
      expect(phase(a)).toBe('typing');
      expect(abortListening).toHaveBeenCalledTimes(1);
    });
  });

  describe('typing', () => {
    it('submits typed text through the same matcher', async () => {
      const a = start();
      await type(a, 'nucleus');
      expect(phase(a)).toBe('correct');
    });

    it('ignores an empty submission and can cancel', () => {
      const a = start();
      a.send({ type: 'TYPE_INSTEAD' });
      a.send({ type: 'SUBMIT', text: '   ' });
      expect(phase(a)).toBe('typing');
      a.send({ type: 'CANCEL' });
      expect(phase(a)).toBe('idle');
    });
  });

  describe('misses and lives (3 per round)', () => {
    it('close costs a life and keeps the reason; retry is allowed', async () => {
      const a = start();
      await say(a, 'nuclear');
      expect(phase(a)).toBe('close');
      expect(ctx(a).lives).toBe(2);
      expect(ctx(a).lastResult?.feedback).toBe("Close — that's the adjective.");

      await say(a, 'nucleus');
      expect(phase(a)).toBe('correct');
      expect(ctx(a)).toMatchObject({ lastXp: 75, streak: 0 }); // one retry
      expect(ctx(a).results[0]).toMatchObject({
        outcome: 'assisted',
        heard: ['nuclear', 'nucleus'],
      });
    });

    it('a confusable is wrong and gives its feedback', async () => {
      const a = start();
      await say(a, 'nucleolus');
      expect(phase(a)).toBe('wrong');
      expect(ctx(a).lastResult?.strategy).toBe('confusable');
    });

    it('lives carry across terms; the round ends when they run out', async () => {
      const a = start();
      await say(a, 'banana'); // nucleus: 2 lives
      await say(a, 'nucleus');
      a.send({ type: 'NEXT' });
      expect(ctx(a).index).toBe(1);
      expect(ctx(a).lives).toBe(2);

      await say(a, 'neutron'); // proton: 1 life
      await say(a, 'banana'); // 0 lives
      expect(phase(a)).toBe('revealed');
      expect(tilesFor(ctx(a), 'revealed').every((t) => t.kind === 'gap' || t.char)).toBe(true);

      a.send({ type: 'NEXT' });
      expect(a.getSnapshot().status).toBe('done');
      expect(a.getSnapshot().output).toMatchObject({
        endedBy: 'out-of-lives',
        livesLeft: 0,
        results: [
          { termId: 'bio-nucleus', outcome: 'assisted' },
          { termId: 'chem-proton', outcome: 'missed', heard: ['neutron', 'banana'] },
        ],
      });
    });
  });

  describe('hints', () => {
    it('first press shows the clue, later presses reveal letters, each costs one', () => {
      const a = start({ terms: [withPicture(nucleus)] });
      expect(nextHint(ctx(a))).toBe('clue');
      a.send({ type: 'HINT' });
      expect(ctx(a)).toMatchObject({ clueShown: true, revealedLetters: 1, hintsLeft: 2 });
      expect(nextHint(ctx(a))).toBe('letter');
      a.send({ type: 'HINT' });
      expect(ctx(a)).toMatchObject({ revealedLetters: 2, hintsLeft: 1, hintsOnTerm: 2 });
    });

    it('runs out after the round budget', () => {
      const a = start({ terms: [kinetic] });
      for (let i = 0; i < 5; i++) a.send({ type: 'HINT' });
      expect(ctx(a).hintsLeft).toBe(0);
      expect(nextHint(ctx(a))).toBeNull();
    });

    it('never reveals the whole word', () => {
      const short = byCanonical('gene'); // 4 letters: at most 3 shown
      const a = start({ terms: [short], config: { hints: 10 } });
      for (let i = 0; i < 10; i++) a.send({ type: 'HINT' });
      expect(ctx(a).revealedLetters).toBe(letterCount(short) - 1);
    });

    it('hints lower the XP for the term', async () => {
      const a = start();
      a.send({ type: 'HINT' });
      a.send({ type: 'HINT' });
      await say(a, 'nucleus');
      expect(ctx(a).lastXp).toBe(xpFor(2, 0));
      expect(ctx(a).results[0]?.outcome).toBe('assisted');
    });
  });

  describe('skips', () => {
    it('skipping records the term and moves on; the budget is 2', () => {
      const a = start({ terms: [nucleus, proton, kinetic, byCanonical('gene')] });
      a.send({ type: 'SKIP' });
      a.send({ type: 'SKIP' });
      a.send({ type: 'SKIP' }); // no skips left: ignored
      expect(ctx(a).index).toBe(2);
      expect(ctx(a).skipsLeft).toBe(0);
      expect(ctx(a).results.map((r) => r.outcome)).toEqual(['skipped', 'skipped']);
    });

    it('can skip after a miss', async () => {
      const a = start();
      await say(a, 'banana');
      a.send({ type: 'SKIP' });
      expect(phase(a)).toBe('idle');
      expect(ctx(a).index).toBe(1);
    });

    it('skipping the last term completes the round', () => {
      const a = start({ terms: [nucleus] });
      a.send({ type: 'SKIP' });
      expect(a.getSnapshot().output?.endedBy).toBe('complete');
    });
  });

  describe('impossible combinations', () => {
    it('ignores answers that arrive when not listening or typing', () => {
      const a = start();
      a.send({ type: 'FINAL', alternatives: ['nucleus'] });
      a.send({ type: 'SUBMIT', text: 'nucleus' });
      a.send({ type: 'NEXT' });
      expect(phase(a)).toBe('idle');
      expect(ctx(a).score).toBe(0);
    });

    it('no hints or skips while listening or after a correct answer', async () => {
      const a = start();
      a.send({ type: 'TAP_MIC' });
      a.send({ type: 'HINT' });
      a.send({ type: 'SKIP' });
      expect(ctx(a)).toMatchObject({ hintsLeft: 3, skipsLeft: 2, index: 0 });
      a.send({ type: 'FINAL', alternatives: ['nucleus'] });
      await settle(a);
      a.send({ type: 'HINT' });
      a.send({ type: 'SKIP' });
      expect(phase(a)).toBe('correct');
      expect(ctx(a)).toMatchObject({ hintsLeft: 3, skipsLeft: 2 });
    });
  });

  it('streak counts first-try answers only and keeps the best', async () => {
    const a = start({ terms: [nucleus, proton, kinetic] });
    await say(a, 'nucleus');
    a.send({ type: 'NEXT' });
    await say(a, 'proton');
    expect(ctx(a).streak).toBe(2);
    a.send({ type: 'NEXT' });
    await say(a, 'banana');
    expect(ctx(a)).toMatchObject({ streak: 0, bestStreak: 2 });
  });

  it('completes the round with a summary', async () => {
    const a = start();
    await say(a, 'nucleus');
    a.send({ type: 'NEXT' });
    expect(progressLabel(ctx(a))).toBe('2 / 2');
    await type(a, 'protons');
    a.send({ type: 'NEXT' });
    expect(a.getSnapshot().output).toEqual({
      score: 200,
      bestStreak: 2,
      livesLeft: 3,
      endedBy: 'complete',
      results: [
        expect.objectContaining({ termId: 'bio-nucleus', outcome: 'first-try', xp: 100 }),
        expect.objectContaining({ termId: 'chem-proton', outcome: 'first-try', xp: 100 }),
      ],
    });
  });

  it('QUIT ends the round from any state and aborts listening', () => {
    const abortListening = jest.fn();
    const a = start({}, { actions: { abortListening } });
    a.send({ type: 'TAP_MIC' });
    a.send({ type: 'QUIT' });
    expect(a.getSnapshot().output?.endedBy).toBe('quit');
    expect(abortListening).toHaveBeenCalled();
  });

  it('a failed evaluation returns to idle with a message', async () => {
    const a = start(
      {},
      {
        actors: {
          evaluateAnswer: fromPromise<MatchResult, EvaluateInput>(async () => {
            throw new Error('offline');
          }),
        },
      },
    );
    await say(a, 'nucleus');
    expect(phase(a)).toBe('idle');
    expect(ctx(a).speechError?.code).toBe('unknown');
  });
});

describe('view helpers', () => {
  it('tiles: first letter shown, gaps for spaces, all yellow when correct', async () => {
    const a = start({ terms: [kinetic] });
    const tiles = tilesFor(ctx(a), 'idle');
    expect(tiles[0]).toEqual({ kind: 'letter', char: 'K', state: 'revealed' });
    expect(tiles[1]).toEqual({ kind: 'letter', char: '', state: 'hidden' }); // no answer leaks
    expect(tiles[7]).toEqual({ kind: 'gap' });
    expect(tiles.filter((t) => t.kind === 'letter')).toHaveLength(letterCount(kinetic));

    await say(a, 'kinetic energy');
    expect(
      tilesFor(ctx(a), 'correct').every((t) => t.kind === 'gap' || t.state === 'correct'),
    ).toBe(true);
  });

  it("Pip's mood follows the round state (MASCOT.md mood mapping)", () => {
    expect(moodFor('idle')).toBe('idle');
    expect(moodFor('typing')).toBe('idle');
    expect(moodFor('listening')).toBe('listening');
    expect(moodFor('evaluating')).toBe('listening');
    expect(moodFor('close')).toBe('oops');
    expect(moodFor('wrong')).toBe('oops');
    expect(moodFor('revealed')).toBe('oops');
    expect(moodFor('correct')).toBe('celebrate');
  });
});
