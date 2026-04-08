import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, Eye, EyeOff, ChevronDown, Loader2 } from 'lucide-react';
import { useSignIn, useSignUp, useAuth as useClerkAuth } from '@clerk/clerk-react';
import { useLocation } from 'wouter';
import { useAuth } from '@/hooks/use-auth';

// ─── Shared style tokens ────────────────────────────────────────────────────

const primaryBtn =
  'inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#111] px-5 text-[14px] font-medium text-white transition active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed';

const mutedBtn =
  'inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[#f1f1f1] px-5 text-[14px] font-medium text-[#111] transition hover:bg-[#e9e9e9] active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed';

const inputCls =
  'h-12 w-full border border-[#ececec] bg-[#f6f6f6] px-4 text-[14px] text-[#111] outline-none placeholder:text-[#a3a3a3] focus:border-[#d7d7d7] transition rounded-none';

const otpInputCls =
  'h-14 w-12 border border-[#dcdcdc] bg-white text-center text-[20px] font-semibold outline-none focus:border-black rounded-none transition';

// ─── Sub-components ──────────────────────────────────────────────────────────

function BackButton({ onBack }: { onBack: () => void }) {
  return (
    <button
      type="button"
      onClick={onBack}
      className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f1f1f1] text-[#111] transition hover:bg-[#e9e9e9] mb-8"
    >
      <ArrowLeft className="h-4 w-4" />
    </button>
  );
}

function ErrorBanner({ msg }: { msg: string }) {
  return (
    <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-[12px] text-red-600 border border-red-100">
      {msg}
    </p>
  );
}

function OtpGrid({
  code,
  setCode,
  prefix,
  length = 6,
}: {
  code: string;
  setCode: (v: string) => void;
  prefix: string;
  length?: number;
}) {
  const digits = useMemo(() => {
    const arr = Array(length).fill('');
    code.slice(0, length).split('').forEach((d, i) => { arr[i] = d; });
    return arr;
  }, [code, length]);

  const focus = (i: number) => {
    const el = document.querySelector<HTMLInputElement>(`[data-otp-${prefix}="${i}"]`);
    el?.focus();
  };

  const update = (i: number, val: string) => {
    const clean = val.replace(/\D/g, '').slice(-1);
    const next = [...digits];
    next[i] = clean;
    setCode(next.join(''));
    if (clean) focus(i + 1);
  };

  const onKey = (i: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !digits[i]) focus(i - 1);
  };

  return (
    <div className="flex gap-2">
      {digits.map((digit, i) => (
        <input
          key={i}
          ref={(el) => el?.setAttribute(`data-otp-${prefix}`, String(i))}
          value={digit}
          onChange={(e) => update(i, e.target.value)}
          onKeyDown={(e) => onKey(i, e)}
          className={otpInputCls}
          inputMode="numeric"
          maxLength={1}
        />
      ))}
    </div>
  );
}

// ─── Screens ─────────────────────────────────────────────────────────────────

function LandingScreen({
  phone,
  setPhone,
  onNext,
  onGoogle,
  loading,
  error,
}: {
  phone: string;
  setPhone: (v: string) => void;
  onNext: () => void;
  onGoogle: () => void;
  loading: boolean;
  error: string;
}) {
  return (
    <div className="flex flex-col min-h-screen bg-white">
      {/* Hero image */}
      <div className="h-[42vh] overflow-hidden">
        <img
          src="/dapper-jeep-desert.jpg"
          alt="Dapper mobile car wash"
          className="w-full h-full object-cover"
        />
      </div>

      <div className="flex-1 flex flex-col px-6 pt-8 pb-10">
        <p className="text-[10px] font-semibold tracking-widest text-[#8c52ff] uppercase mb-3">Dapper</p>
        <h1 className="text-[28px] font-semibold leading-[1.05] tracking-[-0.03em] text-[#111] mb-8">
          Use your phone number<br />to set up your Dapper account
        </h1>

        {/* Phone input */}
        <div className="flex h-12 items-center border border-[#ececec] bg-[#f6f6f6] mb-2">
          <div className="flex h-full w-[72px] shrink-0 items-center justify-center gap-1 border-r border-[#ececec] text-[13px] text-[#111]">
            <span>+1</span>
            <ChevronDown className="h-3 w-3 text-[#999]" />
          </div>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
            onKeyDown={(e) => e.key === 'Enter' && onNext()}
            placeholder="(555) 000-0000"
            className="h-full flex-1 bg-transparent px-4 text-[14px] text-[#111] outline-none placeholder:text-[#b2b2b2]"
            inputMode="tel"
          />
        </div>

        {error && <ErrorBanner msg={error} />}

        <div className="mt-auto pt-6 flex flex-col gap-3">
          <button
            type="button"
            onClick={onNext}
            disabled={phone.length < 10 || loading}
            className={primaryBtn}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : (
              <>Next <ArrowRight className="h-4 w-4" /></>
            )}
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-[#ececec]" />
            <span className="text-[11px] text-[#aaa]">or</span>
            <div className="h-px flex-1 bg-[#ececec]" />
          </div>

          {/* Google */}
          <button
            type="button"
            onClick={onGoogle}
            className="flex h-12 w-full items-center justify-center gap-3 border border-[#e0e0e0] bg-white text-[14px] font-medium text-[#111] transition hover:bg-[#fafafa] active:scale-[0.99] rounded-full"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Sign up with Google
          </button>
        </div>
      </div>
    </div>
  );
}

function PasswordScreen({
  password,
  setPassword,
  onBack,
  onNext,
  loading,
  error,
  onForgot,
}: {
  password: string;
  setPassword: (v: string) => void;
  onBack: () => void;
  onNext: () => void;
  loading: boolean;
  error: string;
  onForgot: () => void;
}) {
  const [show, setShow] = useState(false);

  return (
    <div className="flex flex-col min-h-screen bg-white px-6 pt-14 pb-10">
      <BackButton onBack={onBack} />

      <h1 className="text-[26px] font-semibold tracking-[-0.03em] text-[#111] mb-8">
        Welcome back
      </h1>

      <div className="relative">
        <input
          type={show ? 'text' : 'password'}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && onNext()}
          placeholder="Enter your password"
          className={`${inputCls} pr-12`}
        />
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-[#707070]"
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>

      {error && <ErrorBanner msg={error} />}

      <div className="mt-5 flex flex-col gap-2.5">
        <button
          type="button"
          onClick={onForgot}
          className="w-fit rounded-full bg-[#f1f1f1] px-4 py-2 text-[13px] font-medium text-[#111]"
        >
          I've forgotten my password
        </button>
      </div>

      <div className="mt-auto pt-6 flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="flex h-11 w-11 items-center justify-center rounded-full bg-[#f1f1f1]"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={!password.trim() || loading}
          className={`${mutedBtn} min-w-[100px]`}
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : (
            <>Next <ArrowRight className="h-4 w-4" /></>
          )}
        </button>
      </div>
    </div>
  );
}

function OtpScreen({
  title,
  subtitle,
  code,
  setCode,
  prefix,
  onBack,
  onNext,
  loading,
  error,
  onResend,
  resendLabel = 'Resend code',
}: {
  title: string;
  subtitle: string;
  code: string;
  setCode: (v: string) => void;
  prefix: string;
  onBack: () => void;
  onNext: () => void;
  loading: boolean;
  error: string;
  onResend?: () => void;
  resendLabel?: string;
}) {
  return (
    <div className="flex flex-col min-h-screen bg-white px-6 pt-14 pb-10">
      <BackButton onBack={onBack} />

      <h1 className="text-[26px] font-semibold tracking-[-0.03em] text-[#111] mb-2">
        {title}
      </h1>
      <p className="text-[13px] text-[#8a8a8a] mb-8 leading-5">{subtitle}</p>

      <OtpGrid code={code} setCode={setCode} prefix={prefix} length={6} />

      {error && <ErrorBanner msg={error} />}

      {onResend && (
        <button
          type="button"
          onClick={onResend}
          className="mt-5 w-fit rounded-full bg-[#f1f1f1] px-4 py-2 text-[12px] text-[#666]"
        >
          {resendLabel}
        </button>
      )}

      <div className="mt-auto pt-6 flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="flex h-11 w-11 items-center justify-center rounded-full bg-[#f1f1f1]"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={code.length < 6 || loading}
          className={`${mutedBtn} min-w-[100px]`}
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : (
            <>Verify <ArrowRight className="h-4 w-4" /></>
          )}
        </button>
      </div>
    </div>
  );
}

function EmailCollectScreen({
  onSubmit,
  loading,
  error,
  required = false,
}: {
  onSubmit: (email: string) => void;
  loading: boolean;
  error: string;
  required?: boolean;
}) {
  const [email, setEmail] = useState('');
  return (
    <div className="flex flex-col min-h-screen bg-white px-6 pt-14 pb-10">
      <p className="text-[11px] font-semibold uppercase tracking-widest text-[#8c52ff] mb-6">
        {required ? 'Almost there' : 'One more thing'}
      </p>
      <h1 className="text-[28px] font-semibold tracking-[-0.04em] text-[#111] leading-tight">
        {required ? 'Verify your email' : 'Add your email'}
      </h1>
      <p className="mt-3 text-[13px] leading-5 text-[#9b9b9b]">
        {required
          ? "We'll send a quick code to confirm your email address."
          : 'Your email lets you reset your password and receive booking confirmations.'}
      </p>

      <div className="mt-8 space-y-3">
        <input
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          onChange={e => setEmail(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && email.trim() && onSubmit(email.trim())}
          className={`${inputCls} rounded-xl`}
        />
        {error && <ErrorBanner msg={error} />}
      </div>

      <button
        type="button"
        disabled={loading || !email.trim()}
        onClick={() => onSubmit(email.trim())}
        className={`${primaryBtn} mt-6`}
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : required ? 'Send code' : 'Save email'}
      </button>

      {!required && (
        <button
          type="button"
          onClick={() => onSubmit('')}
          className="mt-4 text-center text-[13px] text-[#9b9b9b] underline-offset-2 hover:underline"
        >
          Skip for now
        </button>
      )}
    </div>
  );
}

function SetPasswordScreen({
  onSubmit,
  loading,
  error,
}: {
  onSubmit: (password: string) => void;
  loading: boolean;
  error: string;
}) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [localError, setLocalError] = useState('');

  const handleSubmit = () => {
    setLocalError('');
    if (newPassword.length < 8) {
      setLocalError('Password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setLocalError('Passwords do not match.');
      return;
    }
    onSubmit(newPassword);
  };

  return (
    <div className="flex flex-col min-h-screen bg-white px-6 pt-14 pb-10">
      <p className="text-[11px] font-semibold uppercase tracking-widest text-[#8c52ff] mb-6">Reset password</p>
      <h1 className="text-[28px] font-semibold tracking-[-0.04em] text-[#111] leading-tight">
        Set a new password
      </h1>
      <p className="mt-3 text-[13px] leading-5 text-[#9b9b9b]">
        Choose a strong password you haven't used before.
      </p>

      <div className="mt-8 space-y-3">
        <div className="relative">
          <input
            type={showPw ? 'text' : 'password'}
            placeholder="New password"
            value={newPassword}
            onChange={e => setNewPassword(e.target.value)}
            className={`${inputCls} rounded-xl pr-12`}
          />
          <button
            type="button"
            onClick={() => setShowPw(v => !v)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-[#9b9b9b]"
          >
            {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        <input
          type={showPw ? 'text' : 'password'}
          placeholder="Confirm new password"
          value={confirmPassword}
          onChange={e => setConfirmPassword(e.target.value)}
          className={`${inputCls} rounded-xl`}
        />
        {(localError || error) && <ErrorBanner msg={localError || error} />}
      </div>

      <button
        type="button"
        disabled={loading}
        onClick={handleSubmit}
        className={`${primaryBtn} mt-6`}
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Set password'}
      </button>
    </div>
  );
}

function WelcomeScreen({ onContinue }: { onContinue: () => void }) {
  return (
    <div className="flex flex-col min-h-screen bg-white px-6 pt-24 pb-10">
      <div className="flex h-14 w-14 items-center justify-center rounded-full border-[3px] border-[#8c52ff]">
        <Check className="h-7 w-7 text-[#8c52ff]" strokeWidth={3} />
      </div>

      <h1 className="mt-7 text-[30px] font-semibold tracking-[-0.04em] text-[#111]">All set.</h1>
      <p className="mt-4 max-w-[260px] text-[13px] leading-5 text-[#9b9b9b]">
        You're signed in. Tap continue to start booking your car wash.
      </p>

      <button type="button" onClick={onContinue} className={`${mutedBtn} mt-8 w-fit`}>
        Continue <ArrowRight className="h-4 w-4" />
      </button>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

type Step = 'landing' | 'password' | 'phoneOtp' | 'emailOtp' | 'emailCollect' | 'setPassword' | 'welcome';

export default function ClerkAuthPage() {
  const CLERK_AVAILABLE = !!import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

  if (!CLERK_AVAILABLE) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <p className="text-sm text-gray-500">Authentication not configured.</p>
      </div>
    );
  }

  return <AuthFlow />;
}

function AuthFlow() {
  const [, navigate] = useLocation();
  const { isSignedIn } = useClerkAuth();
  const { user: localUser } = useAuth();

  const { signIn, setActive: setSignInActive, isLoaded: signInLoaded } = useSignIn();
  const { signUp, setActive: setSignUpActive, isLoaded: signUpLoaded } = useSignUp();

  const [step, setStep] = useState<Step>('landing');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mode, setMode] = useState<'signIn' | 'signUp'>('signIn');
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [pendingSessionId, setPendingSessionId] = useState<string | null>(null);
  const [signUpNeedsEmail, setSignUpNeedsEmail] = useState(false);

  // Navigate home once local user is synced (must be in effect, not render)
  useEffect(() => {
    if (localUser) navigate('/');
  }, [localUser]);

  if (isSignedIn && !localUser) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center">
        <div className="w-5 h-5 rounded-full border-2 border-[#8c52ff] border-t-transparent animate-spin mb-3" />
        <p className="text-sm text-gray-400">Setting up your account…</p>
      </div>
    );
  }

  if (!signInLoaded || !signUpLoaded) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-5 h-5 rounded-full border-2 border-[#8c52ff] border-t-transparent animate-spin" />
      </div>
    );
  }

  // Normalize phone to E.164
  const e164 = `+1${phone.replace(/\D/g, '')}`;

  const clerkError = (err: any): string => {
    const first = err?.errors?.[0];
    if (!first) return 'Something went wrong. Please try again.';
    const code = first.code ?? '';
    if (code === 'form_identifier_not_found') return '__new_user__';
    if (code === 'form_password_incorrect') return 'Incorrect password. Please try again.';
    if (code === 'form_code_incorrect') return 'Incorrect code. Please try again.';
    if (code === 'too_many_requests') return 'Too many attempts. Please wait a moment.';
    return first.longMessage ?? first.message ?? 'Something went wrong.';
  };

  // ── Step handlers ──────────────────────────────────────────────────────────

  const handlePhoneNext = async () => {
    setError('');
    setLoading(true);
    try {
      const result = await signIn!.create({ identifier: e164 });

      // Determine which first factor to use
      const factors = result.supportedFirstFactors ?? [];
      const phoneFactor = factors.find((f: any) => f.strategy === 'phone_code');
      const passwordFactor = factors.find((f: any) => f.strategy === 'password');
      const emailFactor = factors.find((f: any) => f.strategy === 'email_code');

      setMode('signIn');

      if (passwordFactor) {
        setStep('password');
      } else if (phoneFactor) {
        await signIn!.prepareFirstFactor({
          strategy: 'phone_code',
          phoneNumberId: phoneFactor.phoneNumberId,
        });
        setOtpCode('');
        setStep('phoneOtp');
      } else if (emailFactor) {
        await signIn!.prepareFirstFactor({
          strategy: 'email_code',
          emailAddressId: emailFactor.emailAddressId,
        });
        setOtpCode('');
        setStep('emailOtp');
      } else {
        setError('No supported sign-in method found for this account.');
      }
    } catch (err: any) {
      const msg = clerkError(err);
      if (msg === '__new_user__') {
        // New user — start sign-up
        try {
          setMode('signUp');
          await signUp!.create({ phoneNumber: e164 });
          await signUp!.preparePhoneNumberVerification({ strategy: 'phone_code' });
          setOtpCode('');
          setStep('phoneOtp');
        } catch (signUpErr: any) {
          setError(clerkError(signUpErr));
        }
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordNext = async () => {
    setError('');
    setLoading(true);
    try {
      const result = await signIn!.attemptFirstFactor({
        strategy: 'password',
        password,
      });

      if (result.status === 'complete') {
        await setSignInActive!({ session: result.createdSessionId });
        setStep('welcome');
      } else if (result.status === 'needs_second_factor') {
        // Prepare phone second factor
        const factors = result.supportedSecondFactors ?? [];
        const phoneFactor = factors.find((f: any) => f.strategy === 'phone_code');
        if (phoneFactor) {
          await signIn!.prepareSecondFactor({ strategy: 'phone_code' });
          setOtpCode('');
          setStep('phoneOtp');
        } else {
          setError('Second factor required but not supported in this flow.');
        }
      }
    } catch (err: any) {
      setError(clerkError(err));
    } finally {
      setLoading(false);
    }
  };

  const handlePhoneOtpNext = async () => {
    setError('');
    setLoading(true);
    try {
      if (mode === 'signUp') {
        const result = await signUp!.attemptPhoneNumberVerification({ code: otpCode });
        if (result.status === 'complete') {
          // Phone-only sign-up complete — optionally collect email
          setPendingSessionId(result.createdSessionId!);
          setSignUpNeedsEmail(false);
          setOtpCode('');
          setStep('emailCollect');
        } else if (result.status === 'missing_requirements') {
          // Clerk also requires email for sign-up
          setSignUpNeedsEmail(true);
          setPendingSessionId(null);
          setOtpCode('');
          setStep('emailCollect');
        } else {
          setError(`Verification error (status: ${result.status}). Please try again.`);
        }
      } else {
        const strategy = isResettingPassword ? 'reset_password_phone_code' : 'phone_code';
        const result = await signIn!.attemptFirstFactor({ strategy, code: otpCode });
        if (result.status === 'complete') {
          await setSignInActive!({ session: result.createdSessionId });
          setIsResettingPassword(false);
          setStep('welcome');
        } else if (result.status === 'needs_new_password') {
          setOtpCode('');
          setStep('setPassword');
        } else if (result.status === 'needs_second_factor') {
          setError('Additional verification required.');
        }
      }
    } catch (err: any) {
      setError(clerkError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleEmailOtpNext = async () => {
    setError('');
    setLoading(true);
    try {
      if (signUpNeedsEmail) {
        // Verifying email as part of sign-up completion
        const result = await signUp!.attemptEmailAddressVerification({ code: otpCode });
        if (result.status === 'complete') {
          setSignUpNeedsEmail(false);
          await setSignUpActive!({ session: result.createdSessionId });
          setStep('welcome');
        } else {
          setError(`Verification incomplete (status: ${result.status}). Please try again.`);
        }
      } else {
        // Sign-in via email code
        const result = await signIn!.attemptFirstFactor({
          strategy: 'email_code',
          code: otpCode,
        });
        if (result.status === 'complete') {
          await setSignInActive!({ session: result.createdSessionId });
          setStep('welcome');
        }
      }
    } catch (err: any) {
      setError(clerkError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError('');
    try {
      if (signUpNeedsEmail && step === 'emailOtp') {
        // Resend email verification code during sign-up
        await signUp!.prepareEmailAddressVerification({ strategy: 'email_code' });
      } else if (mode === 'signUp') {
        await signUp!.preparePhoneNumberVerification({ strategy: 'phone_code' });
      } else if (isResettingPassword) {
        await signIn!.create({ strategy: 'reset_password_phone_code', identifier: e164 });
      } else {
        const factor = signIn!.supportedFirstFactors?.find((f: any) => f.strategy === 'phone_code') as any;
        if (factor) await signIn!.prepareFirstFactor({ strategy: 'phone_code', phoneNumberId: factor.phoneNumberId });
      }
    } catch {
      setError('Failed to resend. Please wait a moment and try again.');
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    try {
      await signIn!.authenticateWithRedirect({
        strategy: 'oauth_google',
        redirectUrl: '/sso-callback',
        redirectUrlComplete: '/',
      });
    } catch (err: any) {
      setError(clerkError(err));
    }
  };

  const handleForgotPassword = async () => {
    setError('');
    setLoading(true);
    try {
      await signIn!.create({
        strategy: 'reset_password_phone_code',
        identifier: e164,
      });
      setOtpCode('');
      setIsResettingPassword(true);
      setStep('phoneOtp');
    } catch (err: any) {
      setError(clerkError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleSetPassword = async (newPassword: string) => {
    setError('');
    setLoading(true);
    try {
      const result = await signIn!.resetPassword({ password: newPassword });
      if (result.status === 'complete') {
        await setSignInActive!({ session: result.createdSessionId });
        setIsResettingPassword(false);
        setStep('welcome');
      } else {
        setError('Could not reset password. Please try again.');
      }
    } catch (err: any) {
      setError(clerkError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleEmailCollect = async (email: string) => {
    setError('');
    setLoading(true);
    try {
      if (signUpNeedsEmail) {
        if (!email) {
          setError('An email address is required to complete sign-up.');
          setLoading(false);
          return;
        }
        // Tell Clerk about the email and send verification code
        await signUp!.update({ emailAddress: email });
        await signUp!.prepareEmailAddressVerification({ strategy: 'email_code' });
        localStorage.setItem('pendingEmail', email);
        setOtpCode('');
        setStep('emailOtp');
      } else {
        // Email is optional — save locally and activate session
        if (email) localStorage.setItem('pendingEmail', email);
        if (pendingSessionId) {
          await setSignUpActive!({ session: pendingSessionId });
          setPendingSessionId(null);
        }
        setStep('welcome');
      }
    } catch (err: any) {
      setError(clerkError(err));
    } finally {
      setLoading(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  if (step === 'landing') {
    return (
      <LandingScreen
        phone={phone}
        setPhone={setPhone}
        onNext={handlePhoneNext}
        onGoogle={handleGoogleSignIn}
        loading={loading}
        error={error}
      />
    );
  }

  if (step === 'password') {
    return (
      <PasswordScreen
        password={password}
        setPassword={setPassword}
        onBack={() => { setStep('landing'); setError(''); }}
        onNext={handlePasswordNext}
        loading={loading}
        error={error}
        onForgot={handleForgotPassword}
      />
    );
  }

  if (step === 'phoneOtp') {
    return (
      <OtpScreen
        title="Enter the code"
        subtitle={`We sent a 6-digit code to ${e164}. It may take a moment to arrive.`}
        code={otpCode}
        setCode={setOtpCode}
        prefix="phone"
        onBack={() => { setStep('landing'); setError(''); setOtpCode(''); }}
        onNext={handlePhoneOtpNext}
        loading={loading}
        error={error}
        onResend={handleResend}
        resendLabel="Resend code"
      />
    );
  }

  if (step === 'emailOtp') {
    return (
      <OtpScreen
        title="Check your email"
        subtitle={signUpNeedsEmail
          ? `We sent a 6-digit code to ${localStorage.getItem('pendingEmail') ?? 'your email'}. Check your inbox and spam folder.`
          : "We sent a 6-digit code to your email address. Check your inbox and spam folder."}
        code={otpCode}
        setCode={setOtpCode}
        prefix="email"
        onBack={() => {
          setStep(signUpNeedsEmail ? 'emailCollect' : 'landing');
          setError('');
          setOtpCode('');
        }}
        onNext={handleEmailOtpNext}
        loading={loading}
        error={error}
        onResend={signUpNeedsEmail ? handleResend : undefined}
        resendLabel="Resend code"
      />
    );
  }

  if (step === 'emailCollect') {
    return <EmailCollectScreen onSubmit={handleEmailCollect} loading={loading} error={error} required={signUpNeedsEmail} />;
  }

  if (step === 'setPassword') {
    return (
      <SetPasswordScreen
        onSubmit={handleSetPassword}
        loading={loading}
        error={error}
      />
    );
  }

  if (step === 'welcome') {
    return <WelcomeScreen onContinue={() => navigate('/')} />;
  }

  return null;
}
