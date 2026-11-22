import type { SpeechError } from './types';

/** Pip-voice copy for recognizer errors (docs/BRAND.md voice). */
export function errorCopy(code: SpeechError['code']): string {
  switch (code) {
    case 'no-speech':
      return "Didn't catch that. Tap the mic and say it again.";
    case 'network':
      return 'Speech needs a connection right now. Try on-device, or type it instead.';
    case 'not-allowed':
      return 'The mic is off for Blurt!. Turn it on in Settings, or type it instead.';
    case 'audio-capture':
      return 'The mic got interrupted. Tap to try again.';
    case 'language-not-supported':
      return "This phone can't do that language on-device yet. Try turning on-device off.";
    case 'busy':
      return 'The recognizer is busy. Give it a second and try again.';
    case 'unavailable':
      return "Speech recognition isn't available on this phone. Type it instead.";
    case 'aborted':
    case 'unknown':
      return 'The mic hiccuped. Try again, or type it instead.';
  }
}
