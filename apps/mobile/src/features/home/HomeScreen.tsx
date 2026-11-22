import { router } from 'expo-router';
import { Text } from 'react-native';
import { PrimaryButton } from '@/shared/ui/PrimaryButton';
import { Placeholder } from '@/shared/ui/Placeholder';
import { colors } from '@/theme';

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
      <PrimaryButton
        label="Let's blurt"
        accessibilityHint="Opens a practice round"
        onPress={() => router.push('/play/demo')}
      />
      <PrimaryButton
        label="Speech lab"
        accessibilityHint="Test the mic with Grade 8 terms"
        onPress={() => router.push('/speech-lab')}
      />
    </Placeholder>
  );
}
