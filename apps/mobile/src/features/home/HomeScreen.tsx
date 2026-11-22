import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { Pip } from '@/shared/mascot';
import { Placeholder } from '@/shared/ui/Placeholder';
import { PrimaryButton } from '@/shared/ui/PrimaryButton';
import { TextButton } from '@/shared/ui/TextButton';
import { colors, sizes, space, textStyle } from '@/theme';

/** Placeholder. The real Home is specified in docs/SCREENS.md → "1. Home". */
export function HomeScreen() {
  return (
    <Placeholder
      title={
        <>
          blurt<Text style={{ color: colors.sunny }}>!</Text>
        </>
      }
      body="See it. Say it. Know it."
    >
      {/* On Home, Pip waves (MASCOT.md mood mapping). */}
      <View style={styles.pip}>
        <Pip mood="wave" size={sizes.pip.home} />
      </View>
      <PrimaryButton
        label="Let's blurt"
        accessibilityHint="Opens a practice round"
        onPress={() => router.push('/play/demo')}
      />
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
  label: { ...textStyle('label'), color: colors.lilac, marginTop: space.s16 },
  row: { flexDirection: 'row', gap: space.s20 },
});
