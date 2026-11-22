import { useEffect, useState } from 'react';
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
import { supabase } from '@/shared/auth/supabase';
import { SceneBackground } from '@/shared/scene';
import { PipGreeting } from '@/shared/ui/PipGreeting';
import { PrimaryButton } from '@/shared/ui/PrimaryButton';
import { TextButton } from '@/shared/ui/TextButton';
import { Wordmark } from '@/shared/ui/Wordmark';
import { colors, radius, sizes, space, surfaces, textStyle } from '@/theme';
import { authErrorCopy, cleanCode, looksLikeEmail } from './authCopy';

const RESEND_SECONDS = 60;

/**
 * Sign in with email + a 6-digit code (Supabase email OTP). New emails get an account;
 * the API creates the student profile on first use. Onboarding (grade, class code) comes later.
 */
export function SignInScreen() {
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [wait, setWait] = useState(0);

  useEffect(() => {
    if (wait <= 0) return;
    const t = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  async function sendCode() {
    if (!looksLikeEmail(email)) {
      setError("That email doesn't look right. Check it and try again.");
      return;
    }
    if (!supabase) {
      setError("Sign-in isn't set up in this build yet.");
      return;
    }
    setBusy(true);
    setError('');
    const { error: e } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: { shouldCreateUser: true },
    });
    setBusy(false);
    if (e) return setError(authErrorCopy(e));
    setStep('code');
    setCode('');
    setWait(RESEND_SECONDS);
  }

  async function verify() {
    if (code.length !== 6 || !supabase) return;
    setBusy(true);
    setError('');
    const { error: e } = await supabase.auth.verifyOtp({
      email: email.trim().toLowerCase(),
      token: code,
      type: 'email',
    });
    setBusy(false);
    // On success the session store flips to signed in and the router shows Home.
    if (e) setError(authErrorCopy(e));
  }

  const onEmail = step === 'email';
  return (
    <SceneBackground variant="day" atoms={2} sparkles={5}>
      <SafeAreaView style={styles.screen}>
        <KeyboardAvoidingView
          style={styles.screen}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <Wordmark />
            <PipGreeting
              title={onEmail ? "Hey, I'm Pip." : 'Check your email.'}
              sub={
                onEmail
                  ? "What's your email? I'll send you a code."
                  : `I sent a 6-digit code to ${email.trim()}.`
              }
            />
            <View style={styles.card}>
              <Text style={styles.label}>{onEmail ? 'YOUR EMAIL' : '6-DIGIT CODE'}</Text>
              {onEmail ? (
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  onSubmitEditing={() => void sendCode()}
                  placeholder="you@school.edu"
                  placeholderTextColor={colors.ink2}
                  keyboardType="email-address"
                  autoComplete="email"
                  textContentType="emailAddress"
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="send"
                  accessibilityLabel="Your email"
                  style={styles.input}
                />
              ) : (
                <TextInput
                  value={code}
                  onChangeText={(t) => setCode(cleanCode(t))}
                  onSubmitEditing={() => void verify()}
                  placeholder="000000"
                  placeholderTextColor={colors.ink2}
                  keyboardType="number-pad"
                  autoComplete="one-time-code"
                  textContentType="oneTimeCode"
                  maxLength={6}
                  autoFocus
                  accessibilityLabel="6-digit code"
                  style={[styles.input, styles.code]}
                />
              )}
              {error ? (
                <Text
                  style={styles.error}
                  accessibilityLiveRegion="polite"
                  accessibilityRole="alert"
                >
                  {error}
                </Text>
              ) : null}
              <PrimaryButton
                label={busy ? 'One moment…' : onEmail ? 'Send my code' : 'Sign in'}
                onPress={() => void (onEmail ? sendCode() : verify())}
              />
              {onEmail ? null : (
                <View style={styles.links}>
                  <TextButton
                    tone="onLight"
                    label={wait > 0 ? `Send a new code in ${wait}s` : 'Send a new code'}
                    onPress={() => (wait > 0 || busy ? undefined : void sendCode())}
                  />
                  <TextButton
                    tone="onLight"
                    label="Use a different email"
                    onPress={() => {
                      setStep('email');
                      setError('');
                    }}
                  />
                </View>
              )}
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </SceneBackground>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { flexGrow: 1, justifyContent: 'center', padding: space.screen, gap: space.s16 },
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
    ...textStyle('bodyMedium'),
    color: colors.night,
  },
  code: { ...textStyle('display'), fontSize: 32, letterSpacing: 8, textAlign: 'center' },
  error: {
    ...textStyle('body'),
    color: colors.coralInk,
    backgroundColor: colors.coralTint,
    borderRadius: radius.chip,
    padding: space.s12,
    overflow: 'hidden',
  },
  links: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
});
