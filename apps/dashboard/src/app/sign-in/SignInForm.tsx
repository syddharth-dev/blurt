'use client';

import { useRouter } from 'next/navigation';
import { use, useEffect, useState } from 'react';
import { browser } from 'react-dom';
import { Pip } from '@/components/Pip';
import { Button, Card, Field, Input, Notice } from '@/components/ui';
import { useSession } from '@/lib/session';
import { supabase } from '@/lib/supabase';

const CODE = { min: 6, max: 10 };

/** Email + code sign-in, the same accounts and branded email as the app. */
export function SignInForm() {
  use(browser('The sign-in session is stored in the browser.'));
  const { status } = useSession();
  const router = useRouter();
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (status === 'signedIn') router.replace('/');
  }, [status, router]);

  async function sendCode(e?: React.FormEvent) {
    e?.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
      return setError("That email doesn't look right.");
    if (!supabase) return setError("Sign-in isn't set up for this dashboard yet.");
    setBusy(true);
    setError('');
    // Teachers are invited, so never create an account from this screen.
    const { error: err } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: { shouldCreateUser: false },
    });
    setBusy(false);
    if (err) {
      return setError(
        /not found|signups not allowed|otp_disabled/i.test(`${err.code} ${err.message}`)
          ? "There's no Blurt! account for that email. Ask your school's admin for an invite."
          : /rate|over_/i.test(`${err.code} ${err.message}`)
            ? 'Too many tries. Wait a minute, then try again.'
            : "Couldn't send the code. Try again in a minute.",
      );
    }
    setStep('code');
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase) return;
    if (code.length < CODE.min) return setError('Type the whole code from the email.');
    setBusy(true);
    setError('');
    const { error: err } = await supabase.auth.verifyOtp({
      email: email.trim().toLowerCase(),
      token: code,
      type: 'email',
    });
    setBusy(false);
    if (err) setError("That code didn't work. Check it, or send a new one.");
  }

  return (
    <Card className="flex w-full max-w-md flex-col items-center gap-s16 text-center">
      <Pip size={96} />
      <h1 className="font-display text-3xl text-night">
        {step === 'email' ? 'Sign in to Blurt!' : 'Check your email'}
      </h1>
      <p className="text-ink2">
        {step === 'email'
          ? "Enter your school email and I'll send you a code."
          : `I sent a code to ${email.trim()}.`}
      </p>
      {step === 'email' ? (
        <form
          noValidate
          onSubmit={(e) => void sendCode(e)}
          className="flex w-full flex-col gap-s12 text-left"
        >
          <Field label="Email">
            <Input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </Field>
          {error ? <Notice tone="error">{error}</Notice> : null}
          <Button type="submit" disabled={busy}>
            {busy ? 'One moment…' : 'Send my code'}
          </Button>
        </form>
      ) : (
        <form
          noValidate
          onSubmit={(e) => void verify(e)}
          className="flex w-full flex-col gap-s12 text-left"
        >
          <Field label="Code from the email">
            <Input
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={CODE.max}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, CODE.max))}
              className="text-center font-display text-2xl tracking-widest"
            />
          </Field>
          {error ? <Notice tone="error">{error}</Notice> : null}
          <Button type="submit" disabled={busy}>
            {busy ? 'One moment…' : 'Sign in'}
          </Button>
          <div className="flex justify-between">
            <Button variant="ghost" onClick={() => void sendCode()}>
              Send a new code
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setStep('email');
                setError('');
              }}
            >
              Different email
            </Button>
          </div>
        </form>
      )}
    </Card>
  );
}
