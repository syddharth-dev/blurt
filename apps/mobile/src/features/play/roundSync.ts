import type { AttemptRequest, AttemptResponse, RoundSummaryResponse } from '@blurt/shared/schemas';
import { endpoints, isOffline } from '@/shared/api';
import { enqueue, isLocalRound, syncNow } from '@/shared/sync';

/**
 * Where a round's actions go: a server round id, a temporary "local-…" id for a round started
 * offline (everything queues until it syncs), or null for builds without online settings.
 */
export type RoundRef = string | null;

/** The server's verdict, or null when it couldn't be reached (the answer is queued). */
export async function sendAttempt(
  ref: RoundRef,
  body: AttemptRequest,
  onOffline: () => void,
): Promise<AttemptResponse | null> {
  if (!ref) return null;
  if (isLocalRound(ref)) {
    await enqueue({ kind: 'attempt', round: ref, body });
    return null;
  }
  try {
    return await endpoints.attempt(ref, body);
  } catch (e) {
    if (isOffline(e)) {
      onOffline();
      // Same idempotency key: if the first try did reach the server, it won't count twice.
      await enqueue({ kind: 'attempt', round: ref, body });
    }
    return null;
  }
}

export async function sendSkip(ref: RoundRef, termId: string, key: string, onOffline: () => void) {
  if (!ref) return;
  const body = { termId, idempotencyKey: key };
  if (isLocalRound(ref)) return enqueue({ kind: 'skip', round: ref, body });
  try {
    await endpoints.skip(ref, body);
  } catch (e) {
    if (isOffline(e)) {
      onOffline();
      await enqueue({ kind: 'skip', round: ref, body });
    }
  }
}

/** The server's summary, or null (offline: queued, and the Summary shows the phone's result). */
export async function sendFinish(
  ref: RoundRef,
  localDate: string,
): Promise<RoundSummaryResponse | null> {
  if (!ref) return null;
  if (isLocalRound(ref)) {
    await enqueue({ kind: 'finish', round: ref, localDate });
    void syncNow(); // maybe we're back online already
    return null;
  }
  try {
    return await endpoints.finish(ref, localDate);
  } catch (e) {
    if (isOffline(e)) await enqueue({ kind: 'finish', round: ref, localDate });
    return null;
  }
}
