import { clearProgressCache } from '../api/progressCache';
import { supabase } from '../auth/supabase';
import { clearOutbox, flushOutbox } from './outbox';

/**
 * Signs out. Tries once more to send any offline queue, then clears it and the cached progress,
 * so nothing from this student is sent or shown under the next student's account.
 */
export async function signOut(): Promise<void> {
  await flushOutbox().catch(() => undefined);
  await clearOutbox();
  await clearProgressCache();
  await supabase?.auth.signOut();
}
