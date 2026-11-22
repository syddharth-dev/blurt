import { getRandomBytes } from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import { createMMKV, type MMKV } from 'react-native-mmkv';

const KEY_NAME = 'blurt.storage-key';
const KEY_BYTES = 16; // 32 hex characters for AES-256

let ready: Promise<MMKV> | null = null;

/**
 * The app's encrypted key-value store (MMKV). Its key is generated once and kept in the
 * OS keystore (SecureStore). Holds the sign-in session and, from step 4, the offline queue.
 */
export function getStorage(): Promise<MMKV> {
  ready ??= (async () => {
    let key = await SecureStore.getItemAsync(KEY_NAME);
    if (!key) {
      key = [...getRandomBytes(KEY_BYTES)].map((b) => b.toString(16).padStart(2, '0')).join('');
      await SecureStore.setItemAsync(KEY_NAME, key);
    }
    return createMMKV({ id: 'blurt', encryptionKey: key, encryptionType: 'AES-256' });
  })();
  return ready;
}

/** Async storage adapter in the shape Supabase Auth expects. */
export const authStorage = {
  getItem: async (key: string) => (await getStorage()).getString(key) ?? null,
  setItem: async (key: string, value: string) => {
    (await getStorage()).set(key, value);
  },
  removeItem: async (key: string) => {
    (await getStorage()).remove(key);
  },
};
