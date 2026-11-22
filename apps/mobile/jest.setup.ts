// Reanimated runs on the UI thread natively; Jest uses a small stand-in (see the file).
jest.mock('react-native-reanimated', () => require('./src/test/reanimatedMock'));

// Native storage and crypto: in-memory stand-ins for tests.
jest.mock('react-native-mmkv', () => ({
  createMMKV: () => {
    const map = new Map<string, string | number | boolean>();
    return {
      set: (k: string, v: string | number | boolean) => void map.set(k, v),
      getString: (k: string) => {
        const v = map.get(k);
        return typeof v === 'string' ? v : undefined;
      },
      remove: (k: string) => map.delete(k),
      contains: (k: string) => map.has(k),
      getAllKeys: () => [...map.keys()],
      clearAll: () => map.clear(),
    };
  },
}));
jest.mock('expo-secure-store', () => {
  const map = new Map<string, string>();
  return {
    getItemAsync: async (k: string) => map.get(k) ?? null,
    setItemAsync: async (k: string, v: string) => void map.set(k, v),
    deleteItemAsync: async (k: string) => void map.delete(k),
  };
});
jest.mock('expo-crypto', () => {
  let n = 0;
  return {
    randomUUID: () => `00000000-0000-4000-8000-${String(++n).padStart(12, '0')}`,
    getRandomBytes: (len: number) => new Uint8Array(len).map((_, i) => (i * 37) % 256),
  };
});
