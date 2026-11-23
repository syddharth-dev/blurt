import { fireEvent, render, screen } from '@testing-library/react-native';
import { authErrorCopy, cleanCode, isCompleteCode, looksLikeEmail } from './authCopy';
import { SignInScreen } from './SignInScreen';

const mockAuth = { signInWithOtp: jest.fn(), verifyOtp: jest.fn() };
jest.mock('@/shared/auth/supabase', () => ({
  supabase: {
    auth: {
      signInWithOtp: (...a: unknown[]) => mockAuth.signInWithOtp(...a),
      verifyOtp: (...a: unknown[]) => mockAuth.verifyOtp(...a),
    },
  },
}));

describe('auth copy', () => {
  it('turns Supabase errors into Pip-voice messages', () => {
    expect(authErrorCopy({ code: 'otp_expired' })).toBe(
      "That code didn't work. Check it, or send a new one.",
    );
    expect(authErrorCopy({ code: 'over_email_send_rate_limit' })).toBe(
      'Too many tries. Wait a minute, then try again.',
    );
    expect(authErrorCopy({ status: 0, message: 'Network request failed' })).toBe(
      'No connection. Check your Wi-Fi and try again.',
    );
    expect(authErrorCopy({ code: 'mystery' })).not.toMatch(/wrong!|error/i);
    expect(
      authErrorCopy({
        code: 'unexpected_failure',
        status: 500,
        message: 'Error sending magic link email',
      }),
    ).toBe("Couldn't send the email right now. Try again in a minute.");
  });

  it('checks emails and accepts 6–10 digit codes (this project sends 8)', () => {
    expect(looksLikeEmail(' ana@school.edu ')).toBe(true);
    expect(looksLikeEmail('ana@school')).toBe(false);
    expect(cleanCode('1234 5678')).toBe('12345678');
    expect(cleanCode('12345678901234')).toBe('1234567890');
    expect(isCompleteCode('12345')).toBe(false);
    expect(isCompleteCode('123456')).toBe(true);
    expect(isCompleteCode('12345678')).toBe(true);
  });
});

describe('SignInScreen', () => {
  afterEach(() => jest.clearAllMocks());

  it('sends a code to the email, then verifies all 8 digits', async () => {
    mockAuth.signInWithOtp.mockResolvedValue({ error: null });
    mockAuth.verifyOtp.mockResolvedValue({ error: null });
    await render(<SignInScreen />);
    await fireEvent.changeText(screen.getByLabelText('Your email'), ' Ana@School.edu ');
    await fireEvent.press(screen.getByText('Send my code'));
    expect(mockAuth.signInWithOtp).toHaveBeenCalledWith({
      email: 'ana@school.edu',
      options: { shouldCreateUser: true },
    });
    expect(await screen.findByText('Check your email.')).toBeOnTheScreen();
    await fireEvent.changeText(screen.getByLabelText('Code from the email'), '12345678');
    await fireEvent.press(screen.getByText('Sign in'));
    expect(mockAuth.verifyOtp).toHaveBeenCalledWith({
      email: 'ana@school.edu',
      token: '12345678',
      type: 'email',
    });
  });

  it("shows a friendly message when the code doesn't work", async () => {
    mockAuth.signInWithOtp.mockResolvedValue({ error: null });
    mockAuth.verifyOtp.mockResolvedValue({ error: { code: 'otp_expired', status: 403 } });
    await render(<SignInScreen />);
    await fireEvent.changeText(screen.getByLabelText('Your email'), 'ana@school.edu');
    await fireEvent.press(screen.getByText('Send my code'));
    await fireEvent.changeText(await screen.findByLabelText('Code from the email'), '00000000');
    await fireEvent.press(screen.getByText('Sign in'));
    expect(
      await screen.findByText("That code didn't work. Check it, or send a new one."),
    ).toBeOnTheScreen();
  });

  it('rejects an email that does not look right before sending anything', async () => {
    await render(<SignInScreen />);
    await fireEvent.changeText(screen.getByLabelText('Your email'), 'ana');
    await fireEvent.press(screen.getByText('Send my code'));
    expect(
      screen.getByText("That email doesn't look right. Check it and try again."),
    ).toBeOnTheScreen();
    expect(mockAuth.signInWithOtp).not.toHaveBeenCalled();
  });
});
