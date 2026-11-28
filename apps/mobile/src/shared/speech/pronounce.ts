/**
 * Pronunciation with the phone's built-in voice (expo-speech). Phase 4 decision: no cloud
 * text-to-speech clips; every term is spoken on the device, so it works offline and costs
 * nothing. Loaded lazily: a development build made before expo-speech was added has no native
 * module, and then the button simply stays disabled.
 */
type SpeechModule = typeof import('expo-speech');

let speech: SpeechModule | null | undefined;

function load(): SpeechModule | null {
  if (speech === undefined) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      speech = require('expo-speech') as SpeechModule;
    } catch {
      speech = null;
    }
  }
  return speech;
}

export const canPronounce = () => load() !== null;

/** Says the term once, a little slower than normal. Stops anything already playing. */
export function pronounce(text: string, language = 'en-US'): boolean {
  const s = load();
  if (!s || !text.trim()) return false;
  void s.stop();
  s.speak(text, { language, rate: 0.85 });
  return true;
}

/** Called before the mic starts, so the recognizer never hears the phone talking. */
export function stopPronouncing() {
  void load()?.stop();
}
