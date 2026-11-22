import { GRADE8_TERMS, topicsOf } from '@blurt/shared/content';
import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { Pip } from '@/shared/mascot';
import { Chip } from '@/shared/ui/Chip';
import { Placeholder } from '@/shared/ui/Placeholder';
import { PrimaryButton } from '@/shared/ui/PrimaryButton';
import { TextButton } from '@/shared/ui/TextButton';
import { colors, sizes, space, textStyle } from '@/theme';

const TOPICS = topicsOf(GRADE8_TERMS);

/** Placeholder. The real Home is specified in docs/SCREENS.md → "1. Home" (Phase 5). */
export function HomeScreen() {
  return (
    <Placeholder
      title={
        <>
          blurt<Text style={{ color: colors.sunny }}>!</Text>
        </>
      }
      body="See it. Say it. Know it."
      scene="day"
    >
      {/* On Home, Pip waves (MASCOT.md mood mapping). */}
      <View style={styles.pip}>
        <Pip mood="wave" size={sizes.pip.home} />
      </View>
      <PrimaryButton
        breathe
        label="Let's blurt"
        accessibilityHint="Starts a mixed round of 10 terms"
        onPress={() => router.push('/play/mix')}
      />
      <Text style={styles.label}>TOPICS</Text>
      <View style={styles.wrap}>
        {TOPICS.map((t) => (
          <Chip
            key={t.id}
            label={`${t.title} · ${t.terms.length}`}
            selected={false}
            onPress={() => router.push(`/play/${t.id}`)}
          />
        ))}
      </View>
      <Text style={styles.label}>DEVELOPER</Text>
      <View style={styles.row}>
        <TextButton label="Speech lab" onPress={() => router.push('/speech-lab')} />
        <TextButton label="Pip preview" onPress={() => router.push('/pip-preview')} />
      </View>
    </Placeholder>
  );
}

const styles = StyleSheet.create({
  pip: { alignItems: 'center' },
  label: { ...textStyle('label'), color: colors.lilac, marginTop: space.s8 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: space.s8 },
  row: { flexDirection: 'row', gap: space.s20 },
});
