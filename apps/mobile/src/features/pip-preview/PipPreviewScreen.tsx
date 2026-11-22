import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Pip, PIP_MOOD_LIST, PIP_MOODS, type PipMood } from '@/shared/mascot';
import { Chip } from '@/shared/ui/Chip';
import { TextButton } from '@/shared/ui/TextButton';
import { colors, radius, sizes, space, textStyle } from '@/theme';

/** The moods in the order MASCOT.md's checklist asks to switch quickly between. */
const STRESS: readonly PipMood[] = ['idle', 'listening', 'oops', 'listening', 'celebrate'];
const STRESS_STEP_MS = 400;

const SIZES = [
  { label: 'Play 104', value: sizes.pip.play },
  { label: 'Summary 112', value: sizes.pip.summary },
  { label: 'Home 120', value: sizes.pip.home },
  { label: 'Large 220', value: 220 },
] as const;

/**
 * Developer screen for checking Pip against assets/pip/*.svg (docs/MASCOT.md → checklist).
 * Here the mood is picked by hand on purpose; in the game it always comes from moodFor().
 */
export function PipPreviewScreen() {
  const [mood, setMood] = useState<PipMood>('idle');
  const [size, setSize] = useState<number>(SIZES[3].value);
  const [dark, setDark] = useState(true);
  const [stress, setStress] = useState(false);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (!stress) return;
    let i = 0;
    const id = setInterval(() => {
      setMood(STRESS[i % STRESS.length]!);
      i++;
    }, STRESS_STEP_MS);
    return () => clearInterval(id);
  }, [stress]);

  return (
    <SafeAreaView style={[styles.screen, !dark && styles.screenLight]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.row}>
          <Text accessibilityRole="header" style={[styles.h1, !dark && styles.onLight]}>
            Pip preview
          </Text>
          <TextButton
            label="Done"
            tone={dark ? 'onDark' : 'onLight'}
            onPress={() => router.back()}
          />
        </View>

        <View style={styles.stage}>
          <Pip mood={mood} size={size} />
        </View>
        <Text style={[styles.caption, !dark && styles.onLight]}>
          {mood} · {PIP_MOODS[mood].label}
          {reduced ? ' · Reduce Motion is on' : ''}
        </Text>

        <Text style={[styles.label, !dark && styles.onLight]}>MOOD</Text>
        <View style={styles.wrap}>
          {PIP_MOOD_LIST.map((m) => (
            <Chip
              key={m}
              label={m}
              selected={!stress && mood === m}
              onPress={() => {
                setStress(false);
                setMood(m);
              }}
            />
          ))}
        </View>

        <Text style={[styles.label, !dark && styles.onLight]}>SIZE</Text>
        <View style={styles.wrap}>
          {SIZES.map((s) => (
            <Chip
              key={s.label}
              label={s.label}
              selected={size === s.value}
              onPress={() => setSize(s.value)}
            />
          ))}
        </View>

        <Text style={[styles.label, !dark && styles.onLight]}>CHECKS</Text>
        <View style={styles.wrap}>
          <Chip
            label={stress ? 'Stop switching' : 'Switch moods fast'}
            selected={stress}
            onPress={() => setStress((v) => !v)}
          />
          <Chip
            label={dark ? 'Background: night' : 'Background: light'}
            selected={!dark}
            onPress={() => setDark((v) => !v)}
          />
        </View>
        <Text style={[styles.body, !dark && styles.onLight]}>
          Compare each mood with assets/pip/pip-&lt;mood&gt;.svg open in a browser. Ears should
          spring between moods, nothing should freeze or jump, and with Reduce Motion on Pip should
          stay still but still change pose.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.night },
  screenLight: { backgroundColor: colors.lilac },
  content: { padding: space.screen, gap: space.s12 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: space.s8 },
  stage: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 240,
    borderRadius: radius.card,
  },
  h1: { ...textStyle('title'), color: colors.white },
  caption: { ...textStyle('bodyMedium'), color: colors.white, textAlign: 'center' },
  label: { ...textStyle('label'), color: colors.lilac, marginTop: space.s8 },
  body: { ...textStyle('body'), color: colors.lilac },
  onLight: { color: colors.night },
});
