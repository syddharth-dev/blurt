import type { PermissionState, SpeechError, SpeechRecognizer } from './types';

/** One scripted listening session. */
export type MockTurn =
  { partials: string[]; final: string[] } | { partials?: string[]; error: SpeechError };

type Listeners = {
  partial: Set<(t: string) => void>;
  final: Set<(a: string[]) => void>;
  error: Set<(e: SpeechError) => void>;
  end: Set<() => void>;
};

/**
 * Scripted recognizer for development and tests (docs/SPEECH_AND_MATCHING.md → "Testing
 * speech without talking"). Each start() plays the next turn; the script loops.
 * Default script is the prototype flow: "nu", "nucle" → ["nuclear"], then ["nucleus"].
 */
export function createMockSpeechAdapter(
  script: MockTurn[] = [
    { partials: ['nu', 'nucle'], final: ['nuclear'] },
    { partials: ['nu', 'nucle'], final: ['new clears', 'nucleus'] },
  ],
  { stepMs = 300, permission = 'granted' as PermissionState } = {},
): SpeechRecognizer {
  const on: Listeners = { partial: new Set(), final: new Set(), error: new Set(), end: new Set() };
  let turn = 0;
  let timers: ReturnType<typeof setTimeout>[] = [];
  let pending: MockTurn | null = null;

  const clear = () => {
    timers.forEach(clearTimeout);
    timers = [];
  };
  const finish = (t: MockTurn) => {
    clear();
    pending = null;
    if ('error' in t) on.error.forEach((cb) => cb(t.error));
    else on.final.forEach((cb) => cb(t.final));
    on.end.forEach((cb) => cb());
  };
  const subscribe = <K extends keyof Listeners>(key: K, cb: Parameters<Listeners[K]['add']>[0]) => {
    (on[key] as Set<typeof cb>).add(cb);
    return () => void (on[key] as Set<typeof cb>).delete(cb);
  };

  return {
    isAvailable: () => true,
    getPermission: async () => permission,
    requestPermission: async () => permission,
    start() {
      clear();
      const t = script[turn % script.length];
      turn++;
      if (!t) return;
      pending = t;
      (t.partials ?? []).forEach((p, i) =>
        timers.push(setTimeout(() => on.partial.forEach((cb) => cb(p)), stepMs * (i + 1))),
      );
      timers.push(setTimeout(() => finish(t), stepMs * ((t.partials?.length ?? 0) + 1)));
    },
    stop() {
      if (pending) finish(pending);
    },
    abort() {
      clear();
      if (!pending) return;
      pending = null;
      on.error.forEach((cb) => cb({ code: 'aborted', message: 'Aborted' }));
      on.end.forEach((cb) => cb());
    },
    onPartial: (cb) => subscribe('partial', cb),
    onFinal: (cb) => subscribe('final', cb),
    onError: (cb) => subscribe('error', cb),
    onEnd: (cb) => subscribe('end', cb),
  };
}
