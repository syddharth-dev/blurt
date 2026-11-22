import { recognizerHints } from '@blurt/shared/content';
import { matchAnswer, type MatchResult } from '@blurt/shared/matcher';
import { localDateOf } from '@blurt/shared/progress';
import { useMachine } from '@xstate/react';
import { randomUUID } from 'expo-crypto';
import { router } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { fromPromise } from 'xstate';
import { endpoints, isOffline, refreshProgress } from '@/shared/api';
import {
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { moodFor, Pip } from '@/shared/mascot';
import { Confetti, Float, Rise, SceneBackground, Sunburst } from '@/shared/scene';
import { useRoundResults } from '@/shared/session/roundResults';
import { createSpeechRecognizer, type PermissionState } from '@/shared/speech';
import { Placeholder } from '@/shared/ui/Placeholder';
import { PrimaryButton } from '@/shared/ui/PrimaryButton';
import { TextButton } from '@/shared/ui/TextButton';
import { colors, radius, sizes, space, surfaces, textStyle } from '@/theme';
import { ControlDock } from './components/ControlDock';
import { FactCard } from './components/FactCard';
import { Hud } from './components/Hud';
import { LetterTiles } from './components/LetterTiles';
import { MicPrimer } from './components/MicPrimer';
import { PictureCard } from './components/PictureCard';
import { PipBubble } from './components/PipBubble';
import { TypeAnswer } from './components/TypeAnswer';
import { bubbleFor, micLabel } from './copy';
import { roundMachine, type EvaluateInput } from './machine/roundMachine';
import { nextHint, phaseOf, progressLabel, tilesFor } from './machine/roundView';
import { useRoundLoad, type RoundSetup } from './roundSource';

/** Until the Profile screen adds a speech-language setting (SCREENS.md → still to design). */
const SPEECH_LANG = 'en-US';
export { MIX_TOPIC_ID, PRACTICE_TOPIC_ID } from './roundSource';
const SUNBURST = sizes.pictureCard * 1.52;

export function PlayScreen({ topicId, termIds }: { topicId: string; termIds?: string[] }) {
  const load = useRoundLoad(topicId, termIds);
  if (load.status === 'loading') {
    return (
      <Placeholder title="One sec." body="Getting your round ready…">
        <View style={styles.loadingPip}>
          <Pip mood="idle" size={sizes.pip.play} />
        </View>
      </Placeholder>
    );
  }
  if (load.status === 'error') {
    return (
      <Placeholder title="Hmm." body={load.message}>
        <PrimaryButton label="Back home" onPress={() => router.replace('/')} />
      </Placeholder>
    );
  }
  return <RoundView round={load.round} />;
}

/** The server's verdict when online; the phone's own check when offline (AGENTS.md rule 3). */
async function checkAnswer(
  roundId: string | null,
  input: EvaluateInput,
  onOffline: () => void,
): Promise<MatchResult> {
  const local = matchAnswer(input.term, input.alternatives, { inputMode: input.inputMode });
  if (!roundId) return local;
  try {
    const res = await endpoints.attempt(roundId, {
      termId: input.term.id,
      alternatives: input.alternatives,
      inputMode: input.inputMode,
      hintsUsed: input.hintsUsed,
      ms: Math.round(input.ms),
      idempotencyKey: randomUUID(),
    });
    return {
      verdict: res.verdict,
      matched: res.matched,
      feedback: res.feedback,
      strategy: res.verdict === local.verdict ? local.strategy : 'none',
    };
  } catch (e) {
    if (isOffline(e)) onOffline();
    return local;
  }
}

function RoundView({ round }: { round: RoundSetup }) {
  const [recognizer] = useState(() => createSpeechRecognizer());
  const [offline, setOffline] = useState(round.roundId === null);
  const machine = useMemo(() => {
    const hints = recognizerHints(round.terms);
    const roundId = round.roundId;
    return roundMachine.provide({
      actions: {
        startListening: () => recognizer.start({ lang: SPEECH_LANG, hints }),
        stopListening: () => recognizer.stop(),
        abortListening: () => recognizer.abort(),
        reportSkip: (_, { termId }) => {
          if (!roundId) return;
          endpoints.skip(roundId, { termId, idempotencyKey: randomUUID() }).catch((e: unknown) => {
            if (isOffline(e)) setOffline(true);
          });
        },
      },
      actors: {
        evaluateAnswer: fromPromise<MatchResult, EvaluateInput>(({ input }) =>
          checkAnswer(roundId, input, () => setOffline(true)),
        ),
      },
    });
  }, [recognizer, round.terms, round.roundId]);
  const [snapshot, send] = useMachine(machine, { input: { terms: round.terms } });
  const setLast = useRoundResults((s) => s.setLast);

  const [permission, setPermission] = useState<PermissionState | null>(null);
  const [showPrimer, setShowPrimer] = useState(false);
  const [typedOnly, setTypedOnly] = useState(false);

  const phase = phaseOf(snapshot);
  const c = snapshot.context;
  const term = c.terms[c.index];

  // Recognizer → machine.
  useEffect(() => {
    const subs = [
      recognizer.onPartial((text) => send({ type: 'PARTIAL', text })),
      recognizer.onFinal((alternatives) => send({ type: 'FINAL', alternatives })),
      recognizer.onError((error) => send({ type: 'SPEECH_ERROR', error })),
    ];
    void recognizer.getPermission().then((p) => {
      setPermission(p);
      if (p === 'denied') setTypedOnly(true);
    });
    return () => {
      subs.forEach((off) => off());
      recognizer.abort();
    };
  }, [recognizer, send]);

  // Round over → Summary (or straight back on quit).
  const handedOff = useRef(false);
  useEffect(() => {
    if (snapshot.status !== 'done' || !snapshot.output || handedOff.current) return;
    handedOff.current = true;
    const out = snapshot.output;
    const serverRound = round.roundId;
    const finishOnServer = serverRound
      ? endpoints.finish(serverRound, localDateOf(new Date())).then(
          (s) => {
            refreshProgress();
            return s;
          },
          () => null,
        )
      : Promise.resolve(null);
    if (out.endedBy === 'quit') {
      // Still saved, so answers given before quitting count towards XP and the streak.
      void finishOnServer;
      router.back();
      return;
    }
    void finishOnServer.then((server) => {
      const id = serverRound ?? Date.now().toString(36);
      const base = {
        roundId: id,
        topicId: round.topicId,
        termIds: round.termIds,
        topicTitle: round.title,
        subject: round.subject,
      };
      if (server) {
        setLast(
          {
            ...base,
            score: server.score,
            bestStreak: server.bestStreak,
            livesLeft: server.livesLeft,
            endedBy: server.endedBy,
            results: server.results,
          },
          { before: server.xpBefore, after: server.xpAfter },
        );
      } else {
        setLast({ ...base, ...out });
      }
      router.replace(`/summary/${id}`);
    });
  }, [snapshot.status, snapshot.output, round, setLast]);

  async function onMic() {
    if (phase === 'listening') return send({ type: 'TAP_MIC' });
    if (permission === 'granted') return send({ type: 'TAP_MIC' });
    if (permission === 'denied') return setTypedOnly(true);
    setShowPrimer(true); // explain before the OS prompt
  }

  async function allowMic() {
    const p = await recognizer.requestPermission();
    setPermission(p);
    setShowPrimer(false);
    if (p === 'granted') send({ type: 'TAP_MIC' });
    else {
      setTypedOnly(true);
      send({ type: 'TYPE_INSTEAD' });
    }
  }

  function submitTyped(text: string) {
    if (phase !== 'typing') send({ type: 'TYPE_INSTEAD' });
    send({ type: 'SUBMIT', text });
  }

  if (!term) return null;

  const canAct = phase === 'idle' || phase === 'close' || phase === 'wrong';
  const hint = nextHint(c);
  const isLast = c.index + 1 >= c.terms.length;
  const label = micLabel(phase);

  return (
    <SceneBackground variant="night" atoms={2} sparkles={6}>
      <SafeAreaView style={styles.screen}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <Hud
              topicTitle={round.title}
              progress={progressLabel(c)}
              done={c.results.length}
              total={c.terms.length}
              lives={c.lives}
              onQuit={() => send({ type: 'QUIT' })}
            />
            {offline ? (
              <Text style={styles.offline}>
                Offline: answers are checked on your phone and this round won&apos;t be saved.
              </Text>
            ) : null}

            <View style={styles.stage}>
              <View style={styles.sunburst}>
                <Sunburst size={SUNBURST} bright={phase === 'correct'} />
              </View>
              <Float>
                <PictureCard
                  term={term}
                  solved={phase === 'correct' || phase === 'revealed'}
                  celebrate={phase === 'correct'}
                />
              </Float>
              {phase === 'correct' ? <Rise key={c.index} text={`+${c.lastXp}`} /> : null}
            </View>

            <LetterTiles tiles={tilesFor(c, phase)} missKey={c.missesOnTerm} />

            <PipBubble mood={moodFor(phase)} bubble={bubbleFor(phase, c)} />

            <View style={styles.bottom}>
              {phase === 'correct' ? (
                <>
                  <FactCard fact={term.fact} />
                  <PrimaryButton
                    breathe
                    label={isLast ? 'See results' : 'Next term'}
                    onPress={() => send({ type: 'NEXT' })}
                  />
                </>
              ) : phase === 'revealed' ? (
                <>
                  <FactCard fact={term.fact} />
                  <PrimaryButton
                    breathe
                    label="See results"
                    onPress={() => send({ type: 'NEXT' })}
                  />
                </>
              ) : phase === 'typing' || typedOnly ? (
                <>
                  <TypeAnswer
                    onSubmit={submitTyped}
                    onCancel={typedOnly ? undefined : () => send({ type: 'CANCEL' })}
                  />
                  {typedOnly && permission === 'denied' ? (
                    <TextButton
                      label="Turn on the mic in Settings"
                      onPress={() => void Linking.openSettings()}
                    />
                  ) : null}
                </>
              ) : (
                <>
                  <ControlDock
                    micLook={
                      phase === 'listening'
                        ? 'listening'
                        : phase === 'evaluating'
                          ? 'disabled'
                          : 'idle'
                    }
                    micLabel={label}
                    onMic={() => void onMic()}
                    hint={{
                      label: hint === 'letter' ? 'Letter' : 'Clue',
                      count: c.hintsLeft,
                      enabled: canAct && hint !== null,
                      onPress: () => send({ type: 'HINT' }),
                    }}
                    skip={{
                      count: c.skipsLeft,
                      enabled: canAct && c.skipsLeft > 0,
                      onPress: () => send({ type: 'SKIP' }),
                    }}
                  />
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => send({ type: 'TYPE_INSTEAD' })}
                    style={styles.typeLink}
                  >
                    <Text style={styles.typeLinkText}>Type it instead</Text>
                  </Pressable>
                </>
              )}
            </View>
          </ScrollView>
        </KeyboardAvoidingView>

        {showPrimer ? (
          <MicPrimer
            onAllow={() => void allowMic()}
            onType={() => {
              setShowPrimer(false);
              send({ type: 'TYPE_INSTEAD' });
            }}
          />
        ) : null}
        <Confetti burst={phase === 'correct' ? c.index : null} />
      </SafeAreaView>
    </SceneBackground>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  loadingPip: { alignItems: 'center' },
  offline: {
    ...textStyle('chip'),
    color: colors.white,
    backgroundColor: surfaces.scrim,
    borderRadius: radius.chip,
    paddingHorizontal: space.s12,
    paddingVertical: space.s6,
    textAlign: 'center',
    overflow: 'hidden',
  },
  stage: { alignItems: 'center', justifyContent: 'center' },
  sunburst: { position: 'absolute' },
  flex: { flex: 1 },
  content: { flexGrow: 1, padding: space.screen, gap: space.s16 },
  bottom: { marginTop: 'auto', gap: space.s12 },
  typeLink: {
    flexDirection: 'row',
    alignSelf: 'center',
    alignItems: 'center',
    gap: space.s6,
    minHeight: sizes.minTouch,
    paddingHorizontal: space.s12,
  },
  typeLinkText: {
    ...textStyle('bodyMedium'),
    fontFamily: textStyle('label').fontFamily,
    color: colors.white,
    textDecorationLine: 'underline',
  },
});
