import { GRADE8_TERMS } from '@blurt/shared/content';
import { createActor, waitFor } from 'xstate';
import { bubbleFor, micLabel } from './copy';
import { roundMachine } from './machine/roundMachine';
import { phaseOf, type RoundPhase } from './machine/roundView';

const nucleus = GRADE8_TERMS.find((t) => t.canonical === 'nucleus')!;
const withPicture = {
  ...nucleus,
  picture: {
    diagram: 'cell',
    highlight: { shape: 'ellipse' as const, x: 0.4, y: 0.4, w: 0.2, h: 0.2 },
    altText: 'An animal cell',
  },
};

async function actorAfter(alternatives?: string[], term = nucleus) {
  const a = createActor(roundMachine, { input: { terms: [term, term] } }).start();
  if (alternatives) {
    a.send({ type: 'TAP_MIC' });
    a.send({ type: 'FINAL', alternatives });
    await waitFor(a, (s) => !s.matches('evaluating'));
  }
  return a;
}
const bubble = (a: Awaited<ReturnType<typeof actorAfter>>) =>
  bubbleFor(phaseOf(a.getSnapshot()), a.getSnapshot().context);

describe('bubbleFor', () => {
  it('idle: asks for the glowing part when there is a picture, the term otherwise', async () => {
    expect(bubble(await actorAfter(undefined, withPicture))).toEqual({
      title: 'Name the glowing part',
      sub: 'Tap the mic and say the term.',
      chip: undefined,
    });
    const isotope = GRADE8_TERMS.find((t) => t.canonical === 'isotope')!;
    expect(isotope.picture).toBeUndefined();
    expect(bubble(await actorAfter(undefined, isotope)).title).toBe('Name the term');
  });

  it('idle: shows the clue chip once the clue hint is used (picture terms)', async () => {
    const a = await actorAfter(undefined, withPicture);
    a.send({ type: 'HINT' });
    expect(bubble(a).chip).toEqual({ kind: 'clue', text: nucleus.clue });
  });

  it('listening: live transcript in the Heard chip', async () => {
    const a = await actorAfter();
    a.send({ type: 'TAP_MIC' });
    expect(bubble(a)).toEqual({ title: 'Listening…', chip: { kind: 'heard', text: '…' } });
    a.send({ type: 'PARTIAL', text: 'nucle' });
    expect(bubble(a).chip?.text).toBe('nucle');
  });

  it('close: the reason, lives left, what was heard and the pronunciation', async () => {
    expect(bubble(await actorAfter(['nuclear']))).toEqual({
      title: "Close — that's the adjective.",
      sub: '2 lives left.',
      chip: { kind: 'miss', text: 'Heard: nuclear' },
      pronunciation: 'nu·cle·us',
    });
  });

  it('wrong (confusable): the confusable feedback', async () => {
    expect(bubble(await actorAfter(['nucleolus'])).title).toBe(
      "That's the nucleolus. It sits inside this part.",
    );
  });

  it('wrong (unrelated): a gentle retry line, never "wrong"', async () => {
    const b = bubble(await actorAfter(['banana']));
    expect(b.title).toBe('Not quite. Have another go.');
    expect(JSON.stringify(b)).not.toMatch(/wrong|incorrect/i);
  });

  it('correct: "Nucleus. Nailed it." with XP', async () => {
    expect(bubble(await actorAfter(['nucleus']))).toEqual({
      title: 'Nucleus. Nailed it.',
      sub: '+100',
    });
  });

  it('shows "in a row" from a streak of 2', async () => {
    const a = await actorAfter(['nucleus']);
    a.send({ type: 'NEXT' });
    a.send({ type: 'TAP_MIC' });
    a.send({ type: 'FINAL', alternatives: ['nucleus'] });
    await waitFor(a, (s) => s.matches('correct'));
    expect(bubble(a).sub).toBe('+100 · 2 in a row');
  });

  it('shows a friendly speech error in idle', async () => {
    const a = await actorAfter();
    a.send({ type: 'TAP_MIC' });
    a.send({ type: 'SPEECH_ERROR', error: { code: 'no-speech', message: '' } });
    expect(bubble(a).sub).toBe("Didn't catch that. Tap the mic and say it again.");
  });
});

describe('micLabel', () => {
  it.each<[RoundPhase, string]>([
    ['idle', 'Tap to speak'],
    ['listening', 'Tap to stop'],
    ['evaluating', 'Checking…'],
    ['close', 'Try again'],
    ['wrong', 'Try again'],
  ])('%s → %s', (phase, label) => expect(micLabel(phase)).toBe(label));
});
