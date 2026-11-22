/** Pip-voice messages for sign-in problems (BRAND.md voice). */
export function authErrorCopy(
  error: { code?: string; status?: number; message?: string } | null,
): string {
  if (!error) return '';
  const code = error.code ?? '';
  if (error.status === 0 || /fetch|network/i.test(error.message ?? '')) {
    return 'No connection. Check your Wi-Fi and try again.';
  }
  if (code === 'otp_expired' || code === 'invalid_credentials') {
    return "That code didn't work. Check it, or send a new one.";
  }
  if (code.startsWith('over_') || error.status === 429) {
    return 'Too many tries. Wait a minute, then try again.';
  }
  if (code === 'email_address_invalid' || code === 'validation_failed') {
    return "That email doesn't look right. Check it and try again.";
  }
  if (code === 'signup_disabled' || code === 'email_provider_disabled') {
    return "Email sign-in isn't switched on yet. Ask your teacher.";
  }
  return 'Something went wrong. Try again in a moment.';
}

export const looksLikeEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());

/** The code arrives as 6 digits; keep only digits while typing. */
export const cleanCode = (s: string) => s.replace(/\D/g, '').slice(0, 6);
