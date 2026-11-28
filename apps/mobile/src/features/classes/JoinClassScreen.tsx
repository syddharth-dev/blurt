import { router } from 'expo-router';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { JoinClassResult } from '@blurt/shared/schemas';
import { ApiRequestError, endpoints, queryClient, queryKeys } from '@/shared/api';
import { SceneBackground } from '@/shared/scene';
import { PipGreeting } from '@/shared/ui/PipGreeting';
import { PrimaryButton } from '@/shared/ui/PrimaryButton';
import { TextButton } from '@/shared/ui/TextButton';
import { colors, radius, sizes, space, surfaces, textStyle } from '@/theme';
import { CLASS_CODE_LENGTH, cleanClassCode, joinErrorCopy, looksMistyped } from './joinCopy';

/**
 * Join a class with the code from the teacher (SCREENS.md → Onboarding: enter class code).
 * Reached from the Topics tab. Afterwards the class's topics show at the top of Topics.
 */
export function JoinClassScreen() {
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [joined, setJoined] = useState<JoinClassResult | null>(null);
  const complete = code.length === CLASS_CODE_LENGTH;

  async function join() {
    if (busy) return;
    if (!complete) {
      setError(`Type all ${CLASS_CODE_LENGTH} characters of the code.`);
      return;
    }
    if (looksMistyped(code)) {
      setError('Class codes never use 0, O, 1, I or L. Check the code again.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const result = await endpoints.joinClass(code);
      void queryClient.invalidateQueries({ queryKey: queryKeys.classes });
      void queryClient.invalidateQueries({ queryKey: queryKeys.subjects });
      setJoined(result);
    } catch (e) {
      setError(joinErrorCopy(e instanceof ApiRequestError ? e : null));
    } finally {
      setBusy(false);
    }
  }

  return (
    <SceneBackground variant="day" atoms={1} sparkles={3}>
      <SafeAreaView style={styles.screen}>
        <KeyboardAvoidingView
          style={styles.screen}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            {joined ? (
              <>
                <PipGreeting
                  title={joined.alreadyMember ? "You're already in." : "You're in."}
                  sub={`${joined.class.name} with ${joined.class.teacherName}. ${
                    joined.class.topics.length
                      ? `${joined.class.topics.length} ${joined.class.topics.length === 1 ? 'topic is' : 'topics are'} waiting in Topics.`
                      : 'Topics your teacher assigns will show up in Topics.'
                  }`}
                />
                <PrimaryButton breathe label="Go to Topics" onPress={() => router.back()} />
              </>
            ) : (
              <>
                <PipGreeting
                  title="Join a class"
                  sub="Type the 6-character code your teacher gave you."
                />
                <View style={styles.card}>
                  <Text style={styles.label}>CLASS CODE</Text>
                  <TextInput
                    value={code}
                    onChangeText={(t) => {
                      setCode(cleanClassCode(t));
                      setError('');
                    }}
                    onSubmitEditing={() => void join()}
                    placeholder="K7Q2MX"
                    placeholderTextColor={colors.ink2}
                    autoCapitalize="characters"
                    autoCorrect={false}
                    autoComplete="off"
                    maxLength={CLASS_CODE_LENGTH + 2}
                    autoFocus
                    returnKeyType="go"
                    accessibilityLabel="Class code"
                    style={styles.input}
                  />
                  {error ? (
                    <Text accessibilityLiveRegion="polite" style={styles.error}>
                      {error}
                    </Text>
                  ) : null}
                  <PrimaryButton
                    label={busy ? 'Joining…' : 'Join class'}
                    accessibilityHint={complete ? undefined : 'Type all 6 characters first'}
                    onPress={() => void join()}
                  />
                </View>
                <TextButton label="Not now" onPress={() => router.back()} />
              </>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </SceneBackground>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { flexGrow: 1, justifyContent: 'center', padding: space.screen, gap: space.s20 },
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.card + 4,
    padding: space.s20,
    gap: space.s12,
    boxShadow: `0 18px 40px ${surfaces.cardShadow}`,
  },
  label: { ...textStyle('label'), color: colors.ink2 },
  input: {
    minHeight: sizes.primaryButtonHeight,
    borderRadius: radius.button,
    backgroundColor: colors.lilac,
    paddingHorizontal: space.s16,
    ...textStyle('display'),
    fontSize: 32,
    letterSpacing: 8,
    textAlign: 'center',
    color: colors.night,
  },
  error: {
    ...textStyle('body'),
    color: colors.coralInk,
    backgroundColor: colors.coralTint,
    borderRadius: radius.chip,
    padding: space.s12,
    overflow: 'hidden',
  },
});
