import { GRADE8_TERMS, recognizerHints } from '@blurt/shared/content';
import type { MatchResult } from '@blurt/shared/matcher';
import { router } from 'expo-router';
import { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import {
  Linking,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Chip } from '@/shared/ui/Chip';
import { MicIcon } from '@/shared/ui/icons';
import { PrimaryButton } from '@/shared/ui/PrimaryButton';
import { TextButton } from '@/shared/ui/TextButton';
import { colors, radius, sizes, space, surfaces, textStyle } from '@/theme';
import { createSpeechRecognizer, type PermissionState } from '@/shared/speech';
import {
  errorCopy,
  initialLabState,
  labReducer,
  logAsText,
  verdictCopy,
  type LabSettings,
} from './labReducer';

const TERMS = GRADE8_TERMS;
const HINTS = recognizerHints(TERMS);
const LANGS = ['en-US', 'en-PH', 'en-GB'] as const;

/**
 * Speech lab: the Phase 1 spike (docs/ROADMAP.md). Tap the mic, see partial and final
 * alternatives, and how the shared matcher judges each one. Used to tune hints,
 * variants and confusables with real students before building the game.
 */
export function SpeechLabScreen() {
  const recognizer = useMemo(() => createSpeechRecognizer(), []);
  const reducer = useMemo(() => labReducer(TERMS), []);
  const [state, dispatch] = useReducer(reducer, undefined, () => initialLabState());
  const [permission, setPermission] = useState<PermissionState | null>(null);
  const [typed, setTyped] = useState('');
  const listening = state.status === 'listening';
  const term = TERMS[state.index];

  useEffect(() => {
    const subs = [
      recognizer.onPartial((text) => dispatch({ type: 'PARTIAL', text })),
      recognizer.onFinal((alternatives) =>
        dispatch({ type: 'ANSWER', alternatives, inputMode: 'voice', at: Date.now() }),
      ),
      recognizer.onError((error) => dispatch({ type: 'ERROR', error })),
      recognizer.onEnd(() => dispatch({ type: 'END' })),
    ];
    void recognizer.getPermission().then(setPermission);
    return () => {
      subs.forEach((off) => off());
      recognizer.abort();
    };
  }, [recognizer]);

  // Stop listening when the term changes mid-session.
  const lastIndex = useRef(state.index);
  useEffect(() => {
    if (lastIndex.current !== state.index) recognizer.abort();
    lastIndex.current = state.index;
  }, [state.index, recognizer]);

  async function onMic() {
    if (listening) return recognizer.stop();
    let p = permission ?? (await recognizer.getPermission());
    if (p !== 'granted') p = await recognizer.requestPermission();
    setPermission(p);
    if (p !== 'granted') {
      dispatch({ type: 'ERROR', error: { code: 'not-allowed', message: 'Permission denied' } });
      return;
    }
    if (!recognizer.isAvailable()) {
      dispatch({ type: 'ERROR', error: { code: 'unavailable', message: 'Not available' } });
      return;
    }
    dispatch({ type: 'START', at: Date.now() });
    recognizer.start({ ...state.settings, hints: HINTS });
  }

  function onTypedSubmit() {
    if (!typed.trim()) return;
    dispatch({ type: 'ANSWER', alternatives: [typed], inputMode: 'typed', at: Date.now() });
    setTyped('');
  }

  const setSettings = (patch: Partial<LabSettings>) => dispatch({ type: 'SETTINGS', patch });
  const correctCount = state.log.filter((a) => a.verdict === 'correct').length;

  if (!term) return null;

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.row}>
          <Text accessibilityRole="header" style={styles.h1}>
            Speech lab
          </Text>
          <TextButton label="Done" onPress={() => router.back()} />
        </View>

        {/* Tuning */}
        <View style={styles.rowWrap}>
          {LANGS.map((lang) => (
            <Chip
              key={lang}
              label={lang}
              selected={state.settings.lang === lang}
              onPress={() => setSettings({ lang })}
            />
          ))}
        </View>
        <View style={styles.rowWrap}>
          <Chip
            label={`On-device: ${state.settings.onDevice ? 'on' : 'off'}`}
            selected={state.settings.onDevice}
            onPress={() => setSettings({ onDevice: !state.settings.onDevice })}
          />
          {Platform.OS === 'android' && (
            <Chip
              label={`Model: ${state.settings.androidModel === 'web_search' ? 'short words' : 'free form'}`}
              selected={state.settings.androidModel === 'web_search'}
              onPress={() =>
                setSettings({
                  androidModel:
                    state.settings.androidModel === 'web_search' ? 'free_form' : 'web_search',
                })
              }
            />
          )}
        </View>

        {/* Term */}
        <View style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.tag}>{`Grade 8 · ${term.subject}`.toUpperCase()}</Text>
            <Text style={styles.counter}>
              {state.index + 1} / {TERMS.length}
            </Text>
          </View>
          <Text style={styles.cardTitle}>{term.clue}</Text>
          {state.showAnswer ? (
            <Text style={styles.answer}>
              {term.display} · {term.syllables}
            </Text>
          ) : null}
          <View style={styles.row}>
            <TextButton
              tone="onLight"
              label="Previous"
              onPress={() => dispatch({ type: 'GO', delta: -1 })}
            />
            <TextButton
              tone="onLight"
              label={state.showAnswer ? 'Hide answer' : 'Show answer'}
              onPress={() => dispatch({ type: 'TOGGLE_ANSWER' })}
            />
            <TextButton
              tone="onLight"
              label="Next"
              onPress={() => dispatch({ type: 'GO', delta: 1 })}
            />
          </View>
        </View>

        {/* Mic */}
        <View style={styles.micArea}>
          {permission === 'undetermined' && !listening ? (
            <Text style={styles.body}>
              Blurt! listens only while the mic is on, so you can say the term out loud.
            </Text>
          ) : null}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={listening ? 'Stop listening' : 'Start listening'}
            accessibilityState={{ busy: listening }}
            onPress={onMic}
            style={[styles.mic, listening && styles.micLive]}
          >
            <MicIcon color={listening ? colors.white : colors.night} />
          </Pressable>
          <Text style={styles.micLabel}>{listening ? 'Tap to stop' : 'Tap to speak'}</Text>
          {listening || state.partial ? (
            <View style={styles.heardChip}>
              <Text style={styles.heardText}>Heard: {state.partial || '…'}</Text>
            </View>
          ) : null}
        </View>

        {/* Result */}
        {state.error ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{errorCopy(state.error.code)}</Text>
            {state.error.code === 'not-allowed' ? (
              <TextButton
                tone="onLight"
                label="Open Settings"
                onPress={() => void Linking.openSettings()}
              />
            ) : null}
            <Text style={styles.small}>Code: {state.error.code}</Text>
          </View>
        ) : null}

        {state.result ? (
          <View style={styles.card}>
            <VerdictBadge verdict={state.result.verdict} />
            <Text style={styles.cardTitle}>{verdictCopy(term, state.result)}</Text>
            <Text style={styles.small}>
              {state.inputMode === 'typed' ? 'Typed' : 'Alternatives, best first'}
            </Text>
            {state.heard.map((h, i) => (
              <View key={`${h.text}-${i}`} style={styles.altRow}>
                <Text style={styles.altText}>“{h.text}”</Text>
                <Text style={styles.small}>
                  {h.result.verdict} · {h.result.strategy}
                </Text>
              </View>
            ))}
          </View>
        ) : null}

        {/* Type it instead: always available */}
        <View style={styles.card}>
          <Text style={styles.label}>TYPE IT INSTEAD</Text>
          <View style={styles.row}>
            <TextInput
              value={typed}
              onChangeText={setTyped}
              onSubmitEditing={onTypedSubmit}
              placeholder="Type the term"
              placeholderTextColor={colors.ink2}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="done"
              accessibilityLabel="Type the term"
              style={styles.input}
            />
            <TextButton tone="onLight" label="Check" onPress={onTypedSubmit} />
          </View>
        </View>

        {/* Session log */}
        <View style={styles.row}>
          <Text style={styles.body}>
            {state.log.length} tries · {correctCount} correct
          </Text>
          {state.log.length ? (
            <TextButton
              label="Share log"
              onPress={() => void Share.share({ message: logAsText(state.log, state.settings) })}
            />
          ) : null}
        </View>

        <PrimaryButton label="Next term" onPress={() => dispatch({ type: 'GO', delta: 1 })} />
      </ScrollView>
    </SafeAreaView>
  );
}

function VerdictBadge({ verdict }: { verdict: MatchResult['verdict'] }) {
  // Told apart by icon and text as well as colour (BRAND.md).
  const look = {
    correct: { icon: '✓', text: 'Correct', bg: colors.sunny, fg: colors.night },
    close: { icon: '≈', text: 'Close', bg: colors.lilac, fg: colors.violet },
    wrong: { icon: '✕', text: 'Not it', bg: colors.coral, fg: colors.night },
  }[verdict];
  return (
    <View style={[styles.badge, { backgroundColor: look.bg }]}>
      <Text style={[styles.label, { color: look.fg }]}>
        {look.icon} {look.text.toUpperCase()}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.night },
  content: { padding: space.screen, gap: space.s16 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.s8,
  },
  rowWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: space.s8 },
  h1: { ...textStyle('title'), color: colors.white },
  body: { ...textStyle('body'), color: colors.lilac, flexShrink: 1 },
  small: { ...textStyle('chip'), color: colors.ink2 },
  label: { ...textStyle('label'), color: colors.ink2 },
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.card,
    padding: space.s20,
    gap: space.s10,
  },
  cardTitle: { ...textStyle('title'), color: colors.night },
  tag: { ...textStyle('label'), color: colors.coralShadow },
  counter: { ...textStyle('chip'), color: colors.ink2 },
  answer: { ...textStyle('bodyMedium'), color: colors.violet },
  micArea: { alignItems: 'center', gap: space.s10 },
  mic: {
    width: sizes.mic,
    height: sizes.mic,
    borderRadius: radius.full,
    backgroundColor: colors.sunny,
    alignItems: 'center',
    justifyContent: 'center',
  },
  micLive: { backgroundColor: colors.coral },
  micLabel: { ...textStyle('button'), color: colors.white },
  heardChip: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: surfaces.glassBorder,
    backgroundColor: surfaces.scrim,
    borderRadius: radius.chip,
    paddingHorizontal: space.s14,
    paddingVertical: space.s8,
  },
  heardText: { ...textStyle('bodyMedium'), color: colors.white },
  badge: {
    alignSelf: 'flex-start',
    borderRadius: radius.chip,
    paddingHorizontal: space.s12,
    paddingVertical: space.s6,
  },
  altRow: { flexDirection: 'row', justifyContent: 'space-between', gap: space.s8 },
  altText: { ...textStyle('bodyMedium'), color: colors.night, flexShrink: 1 },
  input: {
    flex: 1,
    minHeight: sizes.minTouch,
    borderRadius: radius.tile,
    backgroundColor: colors.lilac,
    paddingHorizontal: space.s12,
    ...textStyle('body'),
    color: colors.night,
  },
});
