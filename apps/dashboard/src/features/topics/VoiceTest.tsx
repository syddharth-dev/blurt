'use client';

import { MatchTestResult, type MatchTestRequest } from '@blurt/shared/schemas';
import { useMutation } from '@tanstack/react-query';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { Button, Card, Input, Notice } from '@/components/ui';
import { api } from '@/lib/api';

/** The bits of the Web Speech API used here (Chrome and Edge; Safari as webkit). */
type Alternative = { transcript: string };
type RecognitionResult = { isFinal: boolean; length: number; [i: number]: Alternative };
type RecognitionEvent = {
  resultIndex: number;
  results: { length: number; [i: number]: RecognitionResult };
};
type Recognition = {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  continuous: boolean;
  start(): void;
  abort(): void;
  onresult: ((e: RecognitionEvent) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
};
type RecognitionCtor = new () => Recognition;

const LANG = 'en-US';
const recognitionCtor = (): RecognitionCtor | undefined => {
  const w = window as unknown as {
    SpeechRecognition?: RecognitionCtor;
    webkitSpeechRecognition?: RecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
};
/** Read once on the client; false while rendering on the server. */
const useSupported = (check: () => boolean) =>
  useSyncExternalStore(
    () => () => undefined,
    check,
    () => false,
  );

const ERRORS: Record<string, string> = {
  'not-allowed': 'Allow the microphone for this site in your browser, then try again.',
  'service-not-allowed': 'Allow the microphone for this site in your browser, then try again.',
  'no-speech': "Didn't catch anything. Try again a little closer to the mic.",
  'audio-capture': 'No microphone found.',
  network: 'Speech recognition needs an internet connection in this browser.',
};

const VERDICT = {
  correct: { icon: '✓', label: 'Correct', className: 'bg-sunny-tint text-sunny-ink' },
  close: { icon: '≈', label: 'Close', className: 'bg-coral-tint text-coral-ink' },
  wrong: { icon: '✕', label: 'Not accepted', className: 'bg-violet-tint text-violet-ink' },
} as const;

const HOW = {
  exact: 'matches the answer or an accepted spelling',
  family: 'listed under Close',
  phonetic: 'sounds like the answer',
  near: 'nearly the answer',
  confusable: 'listed under Never accept',
  none: "doesn't match",
} as const;

/**
 * "Test with my voice" (TEACHER_DASHBOARD.md → Term editor): the browser's speech recognition
 * hears the teacher, and the server's matcher (the one students are checked with) gives the
 * verdict on the term as it is in the editor, saved or not. Typing works in every browser.
 */
export function VoiceTest({ term }: { term: MatchTestRequest['term'] }) {
  const voice = useSupported(() => !!recognitionCtor());
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState('');
  const [heard, setHeard] = useState<string[]>([]);
  const [problem, setProblem] = useState<string | null>(null);
  const [typed, setTyped] = useState('');
  const rec = useRef<Recognition | null>(null);
  const check = useMutation({
    mutationFn: (body: MatchTestRequest) =>
      api('/teacher/match-test', { method: 'POST', body, schema: MatchTestResult }),
  });
  const ready = term.canonical.trim().length > 0;

  useEffect(() => () => rec.current?.abort(), []);

  const run = (alternatives: string[], inputMode: 'voice' | 'typed') => {
    setHeard(alternatives);
    check.mutate({ term, alternatives, inputMode });
  };

  const listen = () => {
    const Ctor = recognitionCtor();
    if (!Ctor) return;
    rec.current?.abort();
    const r = new Ctor();
    r.lang = LANG;
    r.interimResults = true;
    r.maxAlternatives = 5;
    r.continuous = false;
    let finished = false;
    r.onresult = (e) => {
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const result = e.results[i]!;
        if (result.isFinal) {
          finished = true;
          const alts = Array.from({ length: result.length }, (_, j) =>
            result[j]!.transcript.trim(),
          );
          run(alts.filter(Boolean).slice(0, 10), 'voice');
        } else setInterim(result[0]?.transcript ?? '');
      }
    };
    r.onerror = (e) => {
      if (e.error !== 'aborted')
        setProblem(ERRORS[e.error] ?? 'Speech recognition stopped. Try again.');
    };
    r.onend = () => {
      setListening(false);
      setInterim('');
      if (!finished) rec.current = null;
    };
    rec.current = r;
    setProblem(null);
    setHeard([]);
    check.reset();
    setListening(true);
    r.start();
  };

  const result = check.data;
  return (
    <Card className="flex flex-col gap-s12">
      <div className="flex flex-wrap items-center justify-between gap-s8">
        <h2 className="font-display text-xl text-night">Test with my voice</h2>
        <PronounceButton text={term.canonical} />
      </div>
      <p className="text-sm text-ink2">
        Say the answer the way a student might. You’ll see what the recognizer heard and what Blurt!
        would decide, using the term as it is now (saved or not).
      </p>

      {voice ? (
        <Button
          onClick={listening ? () => rec.current?.abort() : listen}
          disabled={!ready}
          variant={listening ? 'secondary' : 'primary'}
          className="self-start"
        >
          {listening ? 'Stop' : 'Start listening'}
        </Button>
      ) : (
        <p className="text-sm text-ink2">
          Voice testing works in Chrome and Edge. You can still type what a student might say.
        </p>
      )}
      {listening ? (
        <p role="status" className="text-night">
          Listening… <span className="text-ink2">{interim}</span>
        </p>
      ) : null}

      <form
        className="flex gap-s8"
        onSubmit={(e) => {
          e.preventDefault();
          if (typed.trim()) run([typed.trim()], 'typed');
        }}
      >
        <Input
          aria-label="Type what a student might say"
          placeholder="Or type it: nuclear"
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          className="flex-1"
        />
        <Button
          type="submit"
          variant="secondary"
          disabled={!ready || !typed.trim() || check.isPending}
        >
          Check
        </Button>
      </form>

      {problem ? <Notice tone="error">{problem}</Notice> : null}
      {check.isError ? <Notice tone="error">{check.error.message}</Notice> : null}
      {result ? (
        <div
          role="status"
          className="flex flex-col gap-s8 rounded-chip border-2 border-track p-s12"
        >
          <span className="flex flex-wrap items-center gap-s8">
            <span
              className={`rounded-full px-s10 py-s4 text-sm font-bold ${VERDICT[result.verdict].className}`}
            >
              <span aria-hidden="true">{VERDICT[result.verdict].icon} </span>
              {VERDICT[result.verdict].label}
            </span>
            <span className="text-sm text-ink2">
              “{result.matched ?? heard[0]}” {HOW[result.strategy]}
            </span>
          </span>
          {result.feedback ? <p className="text-night">Pip says: “{result.feedback}”</p> : null}
          {heard.length > 1 ? (
            <p className="text-sm text-ink2">Recognizer’s guesses: {heard.join(' · ')}</p>
          ) : null}
          {result.verdict !== 'correct' ? (
            <p className="text-sm text-ink2">
              If students will say this and it should count, add it under “Also accept”.
            </p>
          ) : null}
        </div>
      ) : null}
    </Card>
  );
}

/**
 * Plays the term with the browser's built-in voice (decision for Phase 4: the device voice,
 * like the app, instead of pre-made audio clips).
 */
function PronounceButton({ text }: { text: string }) {
  const supported = useSupported(() => 'speechSynthesis' in window);
  if (!supported) return null;
  return (
    <Button
      variant="ghost"
      disabled={!text.trim()}
      onClick={() => {
        window.speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(text.trim());
        u.lang = LANG;
        u.rate = 0.85;
        window.speechSynthesis.speak(u);
      }}
    >
      <span aria-hidden="true">🔊</span> Play pronunciation
    </Button>
  );
}
