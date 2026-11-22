import { getStorage } from '../storage/storage';
import { queryClient, queryKeys } from './queries';

/** /me and /subjects are kept on the phone, so Home shows last-known progress offline. */
const CACHED = [queryKeys.me, queryKeys.subjects] as const;
const storageKey = (key: readonly string[]) => `cache.${key.join('.')}`;

/** Restores last-known progress (marked stale, so it refreshes when online). */
export async function restoreProgressCache(): Promise<void> {
  const storage = await getStorage();
  for (const key of CACHED) {
    const raw = storage.getString(storageKey(key));
    if (!raw || queryClient.getQueryData(key)) continue;
    try {
      queryClient.setQueryData(key, JSON.parse(raw), { updatedAt: 0 });
    } catch {
      storage.remove(storageKey(key));
    }
  }
}

let unsubscribe: (() => void) | null = null;

/** Saves /me and /subjects whenever they load. Safe to call more than once. */
export function persistProgressCache(): void {
  unsubscribe ??= queryClient.getQueryCache().subscribe((event) => {
    if (event.type !== 'updated' || event.action.type !== 'success') return;
    const key = event.query.queryKey;
    const match = CACHED.find(
      (k) => k.length === key.length && k.every((part, i) => part === key[i]),
    );
    if (!match) return;
    void getStorage().then((s) => s.set(storageKey(match), JSON.stringify(event.query.state.data)));
  });
}

/** On sign-out: nothing from the last student stays on the phone. */
export async function clearProgressCache(): Promise<void> {
  const storage = await getStorage();
  for (const key of CACHED) storage.remove(storageKey(key));
  queryClient.clear();
}
