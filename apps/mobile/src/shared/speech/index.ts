import { createMockSpeechAdapter } from './mockSpeechAdapter';
import type { SpeechRecognizer } from './types';

export type * from './types';
export { createMockSpeechAdapter } from './mockSpeechAdapter';
export { errorCopy } from './copy';
export { canPronounce, pronounce, stopPronouncing } from './pronounce';

/**
 * The app's recognizer. Set EXPO_PUBLIC_SPEECH=mock to use scripted speech
 * (simulators, Expo Go, demos). The native module is loaded lazily so the mock
 * path works where the native module isn't installed.
 */
export function createSpeechRecognizer(): SpeechRecognizer {
  if (process.env.EXPO_PUBLIC_SPEECH === 'mock') return createMockSpeechAdapter();
  const { createNativeSpeechAdapter } =
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('./nativeSpeechAdapter') as typeof import('./nativeSpeechAdapter');
  return createNativeSpeechAdapter();
}
