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
  if ((error.status ?? 0) >= 500 || /sending|smtp|mail/i.test(error.message ?? '')) {
    return "Couldn't send the email right now. Try again in a minute.";
  }
  if (code === 'signup_disabled' || code === 'email_provider_disabled') {
    return "Email sign-in isn't switched on yet. Ask your teacher.";
  }
  return 'Something went wrong. Try again in a moment.';
}

/** Developer-only detail for an auth error: name, status, code and message. */
export function authErrorDetail(error: {
  name?: string;
  code?: string;
  status?: number;
  message?: string;
}): string {
  return [error.name, error.status, error.code, error.message]
    .filter((v) => v !== undefined && v !== '')
    .join(' · ');
}

export const looksLikeEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());

/**
 * Supabase sends 6–10 digit codes depending on the project's "Email OTP length" setting
 * (this project uses 8). Accept any length in that range; keep only digits while typing.
 */
export const CODE_LENGTH = { min: 6, max: 10 } as const;
export const cleanCode = (s: string) => s.replace(/\D/g, '').slice(0, CODE_LENGTH.max);
export const isCompleteCode = (s: string) =>
  s.length >= CODE_LENGTH.min && s.length <= CODE_LENGTH.max;
