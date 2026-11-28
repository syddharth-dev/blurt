import { GRADE8_TERMS } from '@blurt/shared/content';
import type { RoundStarted } from '@blurt/shared/schemas';
import { ApiRequestError } from '@/shared/api';
import { fromServer, loadRound, toContentTerm } from './roundSource';

const mockStartRound = jest.fn();
jest.mock('@/shared/api/endpoints', () => ({
  endpoints: { startRound: (...a: unknown[]) => mockStartRound(...a) },
}));

const proton = GRADE8_TERMS.find((t) => t.id === 'chem-proton')!;
const serverTerm = {
  id: proton.id,
  version: 2,
  subject: proton.subject,
  topic: proton.topic,
  canonical: proton.canonical,
  display: proton.display,
  syllables: proton.syllables,
  clue: proton.clue,
  fact: proton.fact,
  difficulty: 1,
  audioUrl: null,
  accept: proton.accept,
  close: proton.close,
  confusables: proton.confusables,
  picture: {
    diagram: 'atom',
    url: null,
    width: 200,
    height: 200,
    highlight: proton.picture!.highlight,
    altText: 'An atom',
  },
};
const started: RoundStarted = {
  roundId: 'r-1',
  topic: { id: 'atoms-and-ions', title: 'Atoms and ions', subject: 'Chemistry' },
  terms: [serverTerm],
  lives: 3,
  hints: 3,
  skips: 2,
};

describe('roundSource', () => {
  afterEach(() => mockStartRound.mockReset());

  it('maps server terms: a bundled diagram, or an uploaded picture with its size', () => {
    const t = toContentTerm(serverTerm);
    expect(t).toMatchObject({
      id: 'chem-proton',
      canonical: 'proton',
      picture: { diagram: 'atom' },
    });
    expect(
      toContentTerm({
        ...serverTerm,
        picture: {
          ...serverTerm.picture!,
          diagram: null,
          url: 'https://x/y.webp',
          width: 1600,
          height: 800,
        },
      }).picture,
    ).toEqual({
      url: 'https://x/y.webp',
      width: 1600,
      height: 800,
      highlight: proton.picture!.highlight,
      altText: 'An atom',
    });
    expect(toContentTerm({ ...serverTerm, picture: null }).picture).toBeUndefined();
  });

  it('online: starts the round on the server', async () => {
    mockStartRound.mockResolvedValue(started);
    const load = await loadRound('atoms-and-ions', undefined, true);
    expect(mockStartRound).toHaveBeenCalledWith({ topicId: 'atoms-and-ions' });
    expect(load).toEqual({ status: 'ready', round: fromServer(started, 'atoms-and-ions') });
  });

  it('practice and the daily mix ask the server for specific terms', async () => {
    mockStartRound.mockResolvedValue(started);
    await loadRound('practice', ['bio-gene'], true);
    expect(mockStartRound).toHaveBeenLastCalledWith({ termIds: ['bio-gene'] });
    await loadRound('mix', undefined, true);
    expect(mockStartRound.mock.lastCall?.[0].termIds).toHaveLength(10);
  });

  it('falls back to the bundled set when the server is unreachable', async () => {
    mockStartRound.mockRejectedValue(new ApiRequestError("Can't reach", 0, 'OFFLINE', true));
    const load = await loadRound('atoms-and-ions', undefined, true);
    expect(load).toMatchObject({
      status: 'ready',
      round: { roundId: null, title: 'Atoms and ions' },
    });
  });

  it('explains a locked or missing topic', async () => {
    mockStartRound.mockRejectedValue(
      new ApiRequestError('This topic unlocks at level 3.', 403, 'TOPIC_LOCKED', false),
    );
    expect(await loadRound('ecosystems', undefined, true)).toEqual({
      status: 'error',
      message: 'This topic unlocks at level 3. Keep playing to level up.',
    });
    mockStartRound.mockRejectedValue(new ApiRequestError('Not found', 404, 'NOT_FOUND', false));
    expect((await loadRound('nope', undefined, true)).status).toBe('error');
  });

  it('offline builds never call the server', async () => {
    const load = await loadRound('ecosystems', undefined, false);
    expect(mockStartRound).not.toHaveBeenCalled();
    expect(load).toMatchObject({ status: 'ready', round: { roundId: null } });
  });

  it('offline, a class topic (not bundled) says it needs a connection', async () => {
    mockStartRound.mockRejectedValue(new ApiRequestError('offline', 0, 'OFFLINE', true));
    expect(await loadRound('teacher-topic-123', undefined, true)).toEqual({
      status: 'error',
      message: "You're offline. Topics from your class need a connection.",
    });
  });

  it('a round from the daily card asks the server with the daily flag', async () => {
    mockStartRound.mockResolvedValue(started);
    await loadRound('atoms-and-ions', undefined, true, true);
    expect(mockStartRound).toHaveBeenLastCalledWith({ topicId: 'atoms-and-ions', daily: true });
  });
});
