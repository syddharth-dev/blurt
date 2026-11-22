import { GRADE8_TERMS, mixedRound, recognizerHints, topicsOf } from '@blurt/shared/content';
import { useMachine } from '@xstate/react';
import { router } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
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
import { moodFor } from '@/shared/mascot';
import { Confetti, Float, Rise, SceneBackground, Sunburst } from '@/shared/scene';
import { useRoundResults } from '@/shared/session/roundResults';
import { createSpeechRecognizer, type PermissionState } from '@/shared/speech';
import { KeyboardIcon } from '@/shared/ui/icons';
import { Placeholder } from '@/shared/ui/Placeholder';
import { PrimaryButton } from '@/shared/ui/PrimaryButton';
import { TextButton } from '@/shared/ui/TextButton';
import { colors, sizes, space, textStyle } from '@/theme';
import { ControlDock } from './components/ControlDock';
import { FactCard } from './components/FactCard';
import { Hud } from './components/Hud';
import { LetterTiles } from './components/LetterTiles';
import { MicPrimer } from './components/MicPrimer';
import { PictureCard } from './components/PictureCard';
import { PipBubble } from './components/PipBubble';
import { TypeAnswer } from './components/TypeAnswer';
import { bubbleFor, micLabel } from './copy';
import { ROUND_CONFIG, roundMachine } from './machine/roundMachine';
import { nextHint, phaseOf, progressLabel, tilesFor } from './machine/roundView';

/** Until the Profile screen adds a speech-language setting (SCREENS.md → still to design). */
const SPEECH_LANG = 'en-US';
export const MIX_TOPIC_ID = 'mix';
const SUNBURST = sizes.pictureCard * 1.5;

type RoundSetup = { topicId: string; title: string; subject: string; terms: typeof GRADE8_TERMS };

function loadRound(topicId: string): RoundSetup | null {
  if (topicId === MIX_TOPIC_ID) {
    return {
      topicId,
      title: 'Daily mix',
      subject: 'Mixed',
      terms: mixedRound(GRADE8_TERMS, ROUND_CONFIG.termsPerRound),
    };
  }
  const topic = topicsOf(GRADE8_TERMS).find((t) => t.id === topicId);
  if (!topic) return null;
  return {
    topicId,
    title: topic.title,
    subject: topic.subject,
    terms: topic.terms.slice(0, ROUND_CONFIG.termsPerRound),
  };
}

export function PlayScreen({ topicId }: { topicId: string }) {
  const [round] = useState(() => loadRound(topicId));
  if (!round) {
    return (
      <Placeholder title="Hmm." body="That topic isn't here. Pick another one from Home.">
        <PrimaryButton label="Back home" onPress={() => router.replace('/')} />
      </Placeholder>
    );
  }
  return <RoundView round={round} />;
}

function RoundView({ round }: { round: RoundSetup }) {
  const [recognizer] = useState(() => createSpeechRecognizer());
  const machine = useMemo(() => {
    const hints = recognizerHints(round.terms);
    return roundMachine.provide({
      actions: {
        startListening: () => recognizer.start({ lang: SPEECH_LANG, hints }),
        stopListening: () => recognizer.stop(),
        abortListening: () => recognizer.abort(),
      },
    });
  }, [recognizer, round.terms]);
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
    if (out.endedBy === 'quit') {
      router.back();
      return;
    }
    const roundId = Date.now().toString(36);
    setLast({
      roundId,
      topicId: round.topicId,
      topicTitle: round.title,
      subject: round.subject,
      ...out,
    });
    router.replace(`/summary/${roundId}`);
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

            <View style={styles.stage}>
              <View style={styles.sunburst}>
                <Sunburst size={SUNBURST} />
              </View>
              <Float>
                <PictureCard term={term} solved={phase === 'correct' || phase === 'revealed'} />
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
                    <KeyboardIcon color={colors.lilac} />
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
  typeLinkText: { ...textStyle('chip'), color: colors.lilac },
});
