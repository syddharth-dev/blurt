import { ApiRequestError } from '@/shared/api/client';
import { clearOutbox, enqueue, flushOutbox, pendingOps } from '@/shared/sync';
import { sendAttempt, sendFinish, sendSkip } from './roundSync';

const mockApi = { attempt: jest.fn(), skip: jest.fn(), finish: jest.fn(), startRound: jest.fn() };
jest.mock('@/shared/api/endpoints', () => ({
  endpoints: {
    attempt: (...a: unknown[]) => mockApi.attempt(...a),
    skip: (...a: unknown[]) => mockApi.skip(...a),
    finish: (...a: unknown[]) => mockApi.finish(...a),
    startRound: (...a: unknown[]) => mockApi.startRound(...a),
  },
}));

const body = {
  termId: 'bio-gene',
  alternatives: ['gene'],
  inputMode: 'voice' as const,
  hintsUsed: 0,
  ms: 1,
  idempotencyKey: 'key-1234-5678',
};
const offline = () => new ApiRequestError("Can't reach", 0, 'OFFLINE', true);

describe('roundSync', () => {
  beforeEach(async () => {
    await clearOutbox();
    jest.clearAllMocks();
  });

  it('server rounds: returns the verdict', async () => {
    mockApi.attempt.mockResolvedValue({ verdict: 'correct' });
    expect(await sendAttempt('srv-1', body, jest.fn())).toEqual({ verdict: 'correct' });
    expect(await pendingOps()).toEqual([]);
  });

  it('server rounds that lose the connection: queue with the same key and flag offline', async () => {
    mockApi.attempt.mockRejectedValue(offline());
    const onOffline = jest.fn();
    expect(await sendAttempt('srv-1', body, onOffline)).toBeNull();
    expect(onOffline).toHaveBeenCalled();
    expect(await pendingOps()).toEqual([{ kind: 'attempt', round: 'srv-1', body }]);
  });

  it('rounds started offline queue everything without calling the server', async () => {
    mockApi.startRound.mockRejectedValue(offline()); // still offline when the finish tries to sync
    await enqueue({ kind: 'start', localId: 'local-7', termIds: ['bio-gene', 'chem-isotope'] }); // as PlayScreen does
    await sendAttempt('local-7', body, jest.fn());
    await sendSkip('local-7', 'chem-isotope', 'key-skip-0001', jest.fn());
    await sendFinish('local-7', '2026-11-22');
    await flushOutbox(); // waits for the background sync try to finish
    expect(mockApi.attempt).not.toHaveBeenCalled();
    expect((await pendingOps()).map((o) => o.kind)).toEqual(['start', 'attempt', 'skip', 'finish']);
  });

  it('builds without online settings send nothing', async () => {
    expect(await sendAttempt(null, body, jest.fn())).toBeNull();
    await sendSkip(null, 'x', 'key-skip-0002', jest.fn());
    expect(await sendFinish(null, '2026-11-22')).toBeNull();
    expect(await pendingOps()).toEqual([]);
  });
});
