import type { AttemptRequest } from '@blurt/shared/schemas';
import { ApiRequestError, endpoints } from '../api';
import { getStorage } from '../storage/storage';

/**
 * Offline outbox (ARCHITECTURE.md → Offline-first / outbox). Actions that couldn't reach the
 * server are saved on the phone and sent in order when it's reachable again. Rounds started
 * offline get a temporary id ("local-…"); the queued "start" creates the real round first and
 * later actions are sent to it. Attempts keep their idempotency key, so a retry never counts twice.
 */
export type OutboxOp =
  | { kind: 'start'; localId: string; termIds: string[] }
  | { kind: 'attempt'; round: string; body: AttemptRequest }
  | { kind: 'skip'; round: string; body: { termId: string; idempotencyKey: string } }
  | { kind: 'finish'; round: string; localDate: string };

const KEY = 'outbox.v1';
const IDS_KEY = 'outbox.ids.v1';

export const isLocalRound = (id: string) => id.startsWith('local-');

async function read<T>(key: string, fallback: T): Promise<T> {
  const raw = (await getStorage()).getString(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

async function write(key: string, value: unknown) {
  (await getStorage()).set(key, JSON.stringify(value));
}

export async function pendingOps(): Promise<OutboxOp[]> {
  return read<OutboxOp[]>(KEY, []);
}

export async function enqueue(op: OutboxOp): Promise<void> {
  await write(KEY, [...(await pendingOps()), op]);
}

let flushing: Promise<FlushResult> | null = null;

export type FlushResult = { sent: number; dropped: number; remaining: number };

/**
 * Sends queued actions in order. Stops at the first one that can't reach the server (it stays
 * queued). An action the server rejects for good (a 4xx, e.g. the round already finished) is
 * dropped so it can't block the queue forever. Only one flush runs at a time.
 */
export function flushOutbox(): Promise<FlushResult> {
  flushing ??= doFlush().finally(() => {
    flushing = null;
  });
  return flushing;
}

async function doFlush(): Promise<FlushResult> {
  const ops = await pendingOps();
  const ids = await read<Record<string, string>>(IDS_KEY, {});
  let sent = 0;
  let dropped = 0;
  let i = 0;
  for (; i < ops.length; i++) {
    const op = ops[i]!;
    try {
      if (op.kind === 'start') {
        if (!ids[op.localId]) {
          const started = await endpoints.startRound({ termIds: op.termIds });
          ids[op.localId] = started.roundId;
          await write(IDS_KEY, ids);
        }
      } else {
        const round = isLocalRound(op.round) ? ids[op.round] : op.round;
        if (!round) {
          dropped++; // its round never started on the server
          continue;
        }
        if (op.kind === 'attempt') {
          await endpoints.attempt(round, op.body);
        } else if (op.kind === 'skip') {
          await endpoints.skip(round, op.body);
        } else {
          await endpoints.finish(round, op.localDate);
        }
      }
      sent++;
    } catch (e) {
      if (e instanceof ApiRequestError && e.offline) break;
      if (e instanceof ApiRequestError && e.status >= 400 && e.status < 500) {
        dropped++;
        continue;
      }
      break; // server error: try again later
    }
  }
  // Re-read: actions may have been queued during this flush (they're only ever appended).
  const remaining = (await pendingOps()).slice(i);
  await write(KEY, remaining);
  // Forget id mappings no queued action still needs.
  const stillNeeded = new Set(
    remaining.flatMap((o) => (o.kind === 'start' ? [o.localId] : [o.round])),
  );
  await write(IDS_KEY, Object.fromEntries(Object.entries(ids).filter(([k]) => stillNeeded.has(k))));
  return { sent, dropped, remaining: remaining.length };
}

/** Empties the queue (on sign-out, after a last try to send it). */
export async function clearOutbox(): Promise<void> {
  await write(KEY, []);
  await write(IDS_KEY, {});
}
