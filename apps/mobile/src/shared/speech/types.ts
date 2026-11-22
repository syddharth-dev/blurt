/**
 * Speech recognizer port (docs/SPEECH_AND_MATCHING.md → "Recognizer setup").
 * The UI and round machine only talk to this interface, so the engine can change
 * (native today, a cloud fallback later, a mock in tests).
 */
export type Unsubscribe = () => void;

export type SpeechErrorCode =
  | 'no-speech'
  | 'network'
  | 'not-allowed'
  | 'audio-capture'
  | 'language-not-supported'
  | 'busy'
  | 'unavailable'
  | 'aborted'
  | 'unknown';

export type SpeechError = { code: SpeechErrorCode; message: string };

export type PermissionState = 'granted' | 'denied' | 'undetermined';

export type StartOptions = {
  /** BCP-47, e.g. "en-US", "en-PH", "en-GB" */
  lang: string;
  /** Words to bias recognition towards (contextualStrings). */
  hints: string[];
  /** Spike tuning: prefer on-device recognition when the phone supports it. */
  onDevice?: boolean;
  /** Spike tuning (Android): "web_search" helps single-word answers. */
  androidModel?: 'free_form' | 'web_search';
};

export interface SpeechRecognizer {
  isAvailable(): boolean;
  getPermission(): Promise<PermissionState>;
  requestPermission(): Promise<PermissionState>;
  start(opts: StartOptions): void;
  /** Stop listening and emit a final result if there is one. */
  stop(): void;
  /** Stop listening and discard the result. */
  abort(): void;
  onPartial(cb: (text: string) => void): Unsubscribe;
  /** All alternatives, best first. Send every one to the matcher. */
  onFinal(cb: (alternatives: string[]) => void): Unsubscribe;
  onError(cb: (e: SpeechError) => void): Unsubscribe;
  /** Always the last event of a session, including after errors. */
  onEnd(cb: () => void): Unsubscribe;
}
