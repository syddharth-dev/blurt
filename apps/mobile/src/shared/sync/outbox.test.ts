import { ApiRequestError } from '../api/client';
import { clearOutbox, enqueue, flushOutbox, pendingOps } from './outbox';

const mockApi = { startRound: jest.fn(), attempt: jest.fn(), skip: jest.fn(), finish: jest.fn() };
jest.mock('../api/endpoints', () => ({
  endpoints: {
    startRound: (...a: unknown[]) => mockApi.startRound(...a),
    attempt: (...a: unknown[]) => mockApi.attempt(...a),
    skip: (...a: unknown[]) => mockApi.skip(...a),
    finish: (...a: unknown[]) => mockApi.finish(...a),
  },
}));

const offline = () => new ApiRequestError("Can't reach", 0, 'OFFLINE', true);
const attempt = (termId: string, key: string) => ({
  termId,
  alternatives: [termId],
  inputMode: 'voice' as const,
  hintsUsed: 0,
  ms: 100,
  idempotencyKey: key,
});

describe('outbox', () => {
  beforeEach(async () => {
    await clearOutbox();
    jest.clearAllMocks();
    mockApi.startRound.mockResolvedValue({ roundId: 'srv-9' });
    mockApi.attempt.mockResolvedValue({});
    mockApi.skip.mockResolvedValue({});
    mockApi.finish.mockResolvedValue({});
  });

  it('creates an offline round on the server first, then sends its actions to it, in order', async () => {
    await enqueue({ kind: 'start', localId: 'local-1', termIds: ['bio-gene', 'chem-isotope'] });
    await enqueue({ kind: 'attempt', round: 'local-1', body: attempt('bio-gene', 'key-aaaa-1') });
    await enqueue({
      kind: 'skip',
      round: 'local-1',
      body: { termId: 'chem-isotope', idempotencyKey: 'key-bbbb-2' },
    });
    await enqueue({ kind: 'finish', round: 'local-1', localDate: '2026-11-22' });

    expect(await flushOutbox()).toEqual({ sent: 4, dropped: 0, remaining: 0 });
    expect(mockApi.startRound).toHaveBeenCalledWith({ termIds: ['bio-gene', 'chem-isotope'] });
    expect(mockApi.attempt).toHaveBeenCalledWith('srv-9', attempt('bio-gene', 'key-aaaa-1'));
    expect(mockApi.skip).toHaveBeenCalledWith('srv-9', {
      termId: 'chem-isotope',
      idempotencyKey: 'key-bbbb-2',
    });
    expect(mockApi.finish).toHaveBeenCalledWith('srv-9', '2026-11-22');
    expect(await pendingOps()).toEqual([]);
  });

  it('stops at the first action that still cannot reach the server, keeping the rest', async () => {
    await enqueue({ kind: 'attempt', round: 'srv-1', body: attempt('bio-gene', 'key-aaaa-1') });
    await enqueue({ kind: 'finish', round: 'srv-1', localDate: '2026-11-22' });
    mockApi.attempt.mockRejectedValueOnce(offline());
    expect(await flushOutbox()).toEqual({ sent: 0, dropped: 0, remaining: 2 });
    expect(mockApi.finish).not.toHaveBeenCalled();
    // Back online: the same idempotency key is sent again.
    expect(await flushOutbox()).toEqual({ sent: 2, dropped: 0, remaining: 0 });
    expect(mockApi.attempt).toHaveBeenLastCalledWith('srv-1', attempt('bio-gene', 'key-aaaa-1'));
  });

  it('a round created before going offline again is not created twice', async () => {
    await enqueue({ kind: 'start', localId: 'local-2', termIds: ['bio-gene'] });
    await enqueue({ kind: 'attempt', round: 'local-2', body: attempt('bio-gene', 'key-cccc-3') });
    mockApi.attempt.mockRejectedValueOnce(offline());
    await flushOutbox();
    await flushOutbox();
    expect(mockApi.startRound).toHaveBeenCalledTimes(1);
    expect(mockApi.attempt).toHaveBeenLastCalledWith('srv-9', attempt('bio-gene', 'key-cccc-3'));
  });

  it('drops an action the server rejects for good, so it cannot block the queue', async () => {
    await enqueue({ kind: 'finish', round: 'srv-1', localDate: '2026-11-22' });
    await enqueue({ kind: 'finish', round: 'srv-2', localDate: '2026-11-22' });
    mockApi.finish.mockRejectedValueOnce(
      new ApiRequestError('This round is over.', 409, 'ROUND_FINISHED', false),
    );
    expect(await flushOutbox()).toEqual({ sent: 1, dropped: 1, remaining: 0 });
  });

  it('keeps a server error queued to retry later', async () => {
    await enqueue({ kind: 'finish', round: 'srv-1', localDate: '2026-11-22' });
    mockApi.finish.mockRejectedValueOnce(
      new ApiRequestError('Oops', 500, 'INTERNAL_SERVER_ERROR', false),
    );
    expect(await flushOutbox()).toEqual({ sent: 0, dropped: 0, remaining: 1 });
  });

  it('keeps actions queued while a flush is running', async () => {
    await enqueue({ kind: 'finish', round: 'srv-1', localDate: '2026-11-22' });
    let release!: () => void;
    mockApi.finish.mockImplementationOnce(() => new Promise<void>((r) => (release = r)));
    const running = flushOutbox();
    await new Promise((r) => setTimeout(r, 0));
    await enqueue({ kind: 'finish', round: 'srv-2', localDate: '2026-11-22' });
    release();
    await running;
    expect(await pendingOps()).toEqual([
      { kind: 'finish', round: 'srv-2', localDate: '2026-11-22' },
    ]);
  });
});
