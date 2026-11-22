import {
  ExpoSpeechRecognitionModule,
  type ExpoSpeechRecognitionErrorCode,
} from 'expo-speech-recognition';
import type { PermissionState, SpeechErrorCode, SpeechRecognizer } from './types';

/** Phone's built-in recognizer via expo-speech-recognition. Voice audio stays on the phone. */
export function createNativeSpeechAdapter(): SpeechRecognizer {
  const M = ExpoSpeechRecognitionModule;

  return {
    isAvailable: () => M.isRecognitionAvailable(),
    getPermission: async () => toPermission(await M.getPermissionsAsync()),
    requestPermission: async () => toPermission(await M.requestPermissionsAsync()),

    start({ lang, hints, onDevice = true, androidModel = 'web_search' }) {
      M.start({
        lang,
        interimResults: true,
        maxAlternatives: 5,
        continuous: false, // auto-stop on silence; students tap once
        contextualStrings: hints,
        requiresOnDeviceRecognition: onDevice && M.supportsOnDeviceRecognition(),
        addsPunctuation: false,
        iosTaskHint: 'confirmation', // better for single-word answers
        androidIntentOptions: { EXTRA_LANGUAGE_MODEL: androidModel },
      });
    },
    stop: () => M.stop(),
    abort: () => M.abort(),

    onPartial(cb) {
      const sub = M.addListener('result', (e) => {
        const text = e.results[0]?.transcript;
        if (!e.isFinal && text) cb(text);
      });
      return () => sub.remove();
    },
    onFinal(cb) {
      const sub = M.addListener('result', (e) => {
        if (!e.isFinal) return;
        const alternatives = e.results.map((r) => r.transcript.trim()).filter(Boolean);
        if (alternatives.length) cb(alternatives);
      });
      return () => sub.remove();
    },
    onError(cb) {
      const sub = M.addListener('error', (e) =>
        cb({ code: mapError(e.error), message: e.message }),
      );
      // "nomatch" = finished without recognizable speech: same as no-speech for the student.
      const noMatch = M.addListener('nomatch', () =>
        cb({ code: 'no-speech', message: 'No speech recognized' }),
      );
      return () => {
        sub.remove();
        noMatch.remove();
      };
    },
    onEnd(cb) {
      const sub = M.addListener('end', () => cb());
      return () => sub.remove();
    },
  };
}

type PermissionResponse = Awaited<
  ReturnType<typeof ExpoSpeechRecognitionModule.getPermissionsAsync>
>;

function toPermission(p: PermissionResponse): PermissionState {
  if (p.granted) return 'granted';
  return p.canAskAgain ? 'undetermined' : 'denied';
}

export function mapError(code: ExpoSpeechRecognitionErrorCode): SpeechErrorCode {
  switch (code) {
    case 'no-speech':
    case 'speech-timeout':
      return 'no-speech';
    case 'network':
      return 'network';
    case 'not-allowed':
      return 'not-allowed';
    case 'audio-capture':
    case 'interrupted':
      return 'audio-capture';
    case 'language-not-supported':
      return 'language-not-supported';
    case 'busy':
    case 'too-many-requests':
      return 'busy';
    case 'service-not-allowed':
      return 'unavailable';
    case 'aborted':
      return 'aborted';
    default:
      return 'unknown';
  }
}
