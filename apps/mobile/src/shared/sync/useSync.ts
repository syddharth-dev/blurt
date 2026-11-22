import { useEffect } from 'react';
import { AppState } from 'react-native';
import { persistProgressCache, refreshProgress, restoreProgressCache } from '../api';
import { useAuth } from '../auth/session';
import { flushOutbox } from './outbox';

/** Sends queued actions now; refreshes progress if anything was saved. */
export async function syncNow(): Promise<void> {
  const r = await flushOutbox();
  if (r.sent > 0) refreshProgress();
}

/**
 * While signed in: restore last-known progress, keep it saved, and send the offline queue at
 * sign-in and whenever the app comes back to the foreground.
 */
export function useSync(): void {
  const signedIn = useAuth((s) => s.status === 'signedIn');
  useEffect(() => {
    if (!signedIn) return;
    persistProgressCache();
    void restoreProgressCache().then(syncNow);
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void syncNow();
    });
    return () => sub.remove();
  }, [signedIn]);
}
