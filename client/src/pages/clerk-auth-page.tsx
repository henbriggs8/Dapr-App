import { useEffect, useMemo, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { ArrowLeft, ArrowRight, Check, Eye, EyeOff, Loader2 } from 'lucide-react';
import { Icon } from "@/components/ui/icon";
import { useSignIn, useSignUp, useAuth as useClerkAuth } from '@clerk/clerk-react';
import { useLocation } from 'wouter';
import { useAuth } from '@/hooks/use-auth';
import { resolveUrl, queryClient } from '@/lib/queryClient';

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
      <Icon icon={ArrowLeft} size="sm" />
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

// ─── Animated word cycler ─────────────────────────────────────────────────────

const CYCLE_WORDS = ['cleaned', 'detailed', 'vacuumed', 'foamed', 'shined', 'refreshed', 'Dapr.'];

function AnimatedWordCycler() {
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const id = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIndex(i => (i + 1) % CYCLE_WORDS.length);
        setVisible(true);
      }, 280);
    }, 2400);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="mt-8 mb-1 text-center select-none">
      <p className="text-[22px] font-bold tracking-[-0.02em] text-[#111] leading-tight">
        Get your car{' '}
        {/* Fixed-width bucket — sized to "refreshed", the longest word */}
        <span style={{ display: 'inline-block', width: '6.8em', textAlign: 'center', verticalAlign: 'baseline' }}>
          <span
            style={{
              color: '#8c52ff',
              display: 'inline-block',
              opacity: visible ? 1 : 0,
              transform: visible ? 'translateY(0px)' : 'translateY(-5px)',
              transition: 'opacity 0.26s ease, transform 0.26s ease',
            }}
          >
            {CYCLE_WORDS[index]}
          </span>
        </span>
      </p>
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
  const digits = phone.replace(/\D/g, '');
  const canSubmit = digits.length >= 10;

  const formatDisplay = (raw: string) => {
    const d = raw.replace(/\D/g, '').slice(0, 10);
    if (d.length <= 3) return d;
    if (d.length <= 6) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
    return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
  };

  return (
    <div className="flex flex-col min-h-screen bg-white">
      {/* App icon */}
      <div className="flex flex-col items-center pt-20 pb-8">
        <div className="w-20 h-20 rounded-[22px] overflow-hidden shadow-md mb-5">
          <img
            src="/assets/dapper-app-icon-dark.svg"
            alt="Dapr"
            className="w-full h-full"
          />
        </div>
        <p className="text-[11px] font-semibold tracking-widest text-[#8c52ff] uppercase">Dapr</p>
      </div>

      <div className="flex-1 flex flex-col px-6 pt-2 pb-10">
        <h1 className="text-[28px] font-semibold leading-[1.05] tracking-[-0.03em] text-[#111] mb-8">
          Enter your phone<br />to get started
        </h1>

        {/* Phone input with +1 prefix */}
        <div className={`flex h-12 items-center border border-[#ececec] bg-[#f6f6f6] mb-2`}>
          <div className="flex h-full w-[52px] shrink-0 items-center justify-center border-r border-[#ececec] text-[14px] font-medium text-[#111]">
            +1
          </div>
          <input
            value={formatDisplay(phone)}
            onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
            onKeyDown={(e) => e.key === 'Enter' && canSubmit && onNext()}
            placeholder="(555) 000-0000"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            autoFocus
            className="h-full flex-1 bg-transparent px-4 text-[14px] text-[#111] outline-none placeholder:text-[#a3a3a3]"
          />
        </div>

        {error && <ErrorBanner msg={error} />}

        <AnimatedWordCycler />

        <div className="mt-auto pt-6 flex flex-col gap-3">
          <button
            type="button"
            onClick={onNext}
            disabled={!canSubmit || loading}
            className={primaryBtn}
          >
            {loading ? <Icon icon={Loader2} size="sm" className="animate-spin" /> : (
              <>Next <Icon icon={ArrowRight} size="sm" /></>
            )}
          </button>

          {/* Google — shown on both web and native iOS */}
          <>
            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-[#ececec]" />
              <span className="text-[11px] text-[#aaa]">or</span>
              <div className="h-px flex-1 bg-[#ececec]" />
            </div>

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
              Continue with Google
            </button>
          </>

          {/* Detail Pro sign-in */}
          <p className="text-center text-[12px] text-[#aaa] pt-1">
            A detail pro?{" "}
            <button
              type="button"
              onClick={() => window.location.href = "/provider-auth"}
              className="text-[#8c52ff] font-medium underline-offset-2 hover:underline"
            >
              Sign in as a Detail Pro
            </button>
          </p>
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
          {show ? <Icon icon={EyeOff} size="sm" /> : <Icon icon={Eye} size="sm" />}
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
          <Icon icon={ArrowLeft} size="sm" />
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={!password.trim() || loading}
          className={`${mutedBtn} min-w-[100px]`}
        >
          {loading ? <Icon icon={Loader2} size="sm" className="animate-spin" /> : (
            <>Next <Icon icon={ArrowRight} size="sm" /></>
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
          <Icon icon={ArrowLeft} size="sm" />
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={code.length < 6 || loading}
          className={`${mutedBtn} min-w-[100px]`}
        >
          {loading ? <Icon icon={Loader2} size="sm" className="animate-spin" /> : (
            <>Verify <Icon icon={ArrowRight} size="sm" /></>
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
        {loading ? <Icon icon={Loader2} size="sm" className="animate-spin" /> : required ? 'Send code' : 'Save email'}
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
            {showPw ? <Icon icon={EyeOff} size="sm" /> : <Icon icon={Eye} size="sm" />}
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
        {loading ? <Icon icon={Loader2} size="sm" className="animate-spin" /> : 'Set password'}
      </button>
    </div>
  );
}

function WelcomeScreen({ onContinue }: { onContinue: () => void }) {
  return (
    <div className="flex flex-col min-h-screen bg-white px-6 pt-24 pb-10">
      <div className="flex h-14 w-14 items-center justify-center rounded-full border-[3px] border-[#8c52ff]">
        <Icon icon={Check} size="lg" className="text-[#8c52ff]" />
      </div>

      <h1 className="mt-7 text-[30px] font-semibold tracking-[-0.04em] text-[#111]">All set.</h1>
      <p className="mt-4 max-w-[260px] text-[13px] leading-5 text-[#9b9b9b]">
        You're signed in. Tap continue to start booking your car wash.
      </p>

      <button type="button" onClick={onContinue} className={`${mutedBtn} mt-8 w-fit`}>
        Continue <Icon icon={ArrowRight} size="sm" />
      </button>
    </div>
  );
}

function ProfileInfoScreen({
  phone,
  email,
  setEmail,
  firstName,
  setFirstName,
  lastName,
  setLastName,
  password,
  setPassword,
  onBack,
  onNext,
  loading,
  error,
}: {
  phone: string;
  email: string;
  setEmail: (v: string) => void;
  firstName: string;
  setFirstName: (v: string) => void;
  lastName: string;
  setLastName: (v: string) => void;
  password: string;
  setPassword: (v: string) => void;
  onBack: () => void;
  onNext: () => void;
  loading: boolean;
  error: string;
}) {
  const [showPw, setShowPw] = useState(false);
  const [confirmPw, setConfirmPw] = useState('');
  const [localError, setLocalError] = useState('');

  const handleNext = () => {
    setLocalError('');
    if (password.length < 8) { setLocalError('Password must be at least 8 characters.'); return; }
    if (password !== confirmPw) { setLocalError('Passwords do not match.'); return; }
    onNext();
  };

  const digits = phone.replace(/\D/g, '');
  const displayPhone = digits.length >= 10
    ? `+1 (${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
    : phone;

  const canSubmit = firstName.trim() && lastName.trim() && password.length >= 8;

  return (
    <div className="flex flex-col min-h-screen bg-white px-6 pt-14 pb-10">
      <BackButton onBack={onBack} />

      <h1 className="text-[26px] font-semibold tracking-[-0.03em] text-[#111] mb-1">
        Create your account
      </h1>
      <p className="text-[13px] text-[#9b9b9b] mb-8">{displayPhone}</p>

      <div className="flex flex-col gap-3">
        <input
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          placeholder="First name"
          autoComplete="given-name"
          className={inputCls}
        />
        <input
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
          placeholder="Last name"
          autoComplete="family-name"
          className={inputCls}
        />

        {/* Email address */}
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email address"
          type="email"
          inputMode="email"
          autoComplete="email"
          className={inputCls}
        />

        {/* Password */}
        <div className="relative">
          <input
            type={showPw ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Create a password"
            autoComplete="new-password"
            className={`${inputCls} pr-12`}
          />
          <button
            type="button"
            onClick={() => setShowPw(v => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#707070]"
          >
            {showPw ? <Icon icon={EyeOff} size="sm" /> : <Icon icon={Eye} size="sm" />}
          </button>
        </div>
        <input
          type={showPw ? 'text' : 'password'}
          value={confirmPw}
          onChange={(e) => setConfirmPw(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && canSubmit && handleNext()}
          placeholder="Confirm password"
          autoComplete="new-password"
          className={inputCls}
        />
      </div>

      {(localError || error) && <ErrorBanner msg={localError || error} />}

      <div className="mt-auto pt-8 flex flex-col gap-4">
        <button
          type="button"
          onClick={handleNext}
          disabled={!canSubmit || loading}
          className={primaryBtn}
        >
          {loading ? <Icon icon={Loader2} size="sm" className="animate-spin" /> : (
            <>Create account <Icon icon={ArrowRight} size="sm" /></>
          )}
        </button>
        <p className="text-center text-[11px] leading-4 text-[#a0a0a0] px-4">
          By proceeding, you consent to receive SMS messages from Dapr to the number provided.
        </p>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

type Step = 'landing' | 'profileInfo' | 'password' | 'phoneOtp' | 'emailOtp' | 'emailCollect' | 'setPassword' | 'welcome';

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
  const { isSignedIn, getToken } = useClerkAuth();
  const { user: localUser } = useAuth();

  // syncError drives the error state on the loading screen (never infinite)
  const [syncError, setSyncError] = useState<string | null>(null);

  // Log every time isSignedIn changes
  useEffect(() => {
    console.log(`[Auth] isSignedIn changed to ${isSignedIn}`);
  }, [isSignedIn]);

  // After Clerk marks the session active, the /api/user TanStack query has
  // staleTime:Infinity and won't refetch on its own. We call clerk-sync here
  // which creates the local user if needed, then push it straight into the
  // cache so the loading screen unblocks immediately.
  //
  // Hard 15-second timeout ensures the loading screen is never infinite.
  useEffect(() => {
    if (!isSignedIn || localUser) return;
    console.log('[Auth] isSignedIn=true and no localUser — starting sync');
    setSyncError(null);
    let cancelled = false;

    const hardTimeout = setTimeout(() => {
      if (!cancelled) {
        cancelled = true;
        console.log('[Auth] loading screen timeout/failure path triggered (15 s)');
        setSyncError('Account setup timed out. Please check your connection and try again.');
      }
    }, 15000);

    const sync = async () => {
      // Poll until Clerk SDK has a token (up to 20 × 300 ms = 6 s)
      let token: string | null = null;
      for (let i = 0; i < 20 && !cancelled; i++) {
        console.log(`[Auth] getToken attempt #${i + 1}`);
        try { token = await getToken(); } catch (e) {
          console.log(`[Auth] getToken threw:`, String(e));
        }
        console.log(`[Auth] getToken resolved with ${token ? 'token (' + token.slice(0, 20) + '…)' : 'null'}`);
        if (token) break;
        await new Promise<void>(r => setTimeout(r, 300));
      }

      if (cancelled) return;

      if (token) {
        try {
          const syncUrl = resolveUrl('/api/auth/clerk-sync');
          console.log(`[Auth] calling ${syncUrl}`);
          const syncRes = await fetch(syncUrl, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
            credentials: 'include',
          });
          const syncBody = await syncRes.text();
          console.log(`[Auth] /api/auth/clerk-sync response status=${syncRes.status} body=${syncBody}`);
          if (syncRes.ok && !cancelled) {
            clearTimeout(hardTimeout);
            queryClient.setQueryData(['/api/user'], JSON.parse(syncBody));
            console.log('[Auth] localUser set from clerk-sync — loading screen exit triggered');
            return;
          }
          // Non-OK from clerk-sync — fall through to /api/user direct call
        } catch (e) {
          console.log(`[Auth] /api/auth/clerk-sync threw: ${String(e)}`);
        }
      }

      if (cancelled) return;

      // Fallback: direct GET /api/user with whatever auth we have
      try {
        const userUrl = resolveUrl('/api/user');
        console.log(`[Auth] /api/user request fired (fallback) — ${userUrl}`);
        const userRes = await fetch(userUrl, {
          credentials: 'include',
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const userBody = await userRes.text();
        console.log(`[Auth] /api/user response status=${userRes.status} body=${userBody}`);
        if (userRes.ok && !cancelled) {
          clearTimeout(hardTimeout);
          queryClient.setQueryData(['/api/user'], JSON.parse(userBody));
          console.log('[Auth] localUser set from /api/user fallback — loading screen exit triggered');
          return;
        }
      } catch (e) {
        console.log(`[Auth] /api/user threw: ${String(e)}`);
      }

      if (cancelled) return;

      // Last-resort: let TanStack re-run the query itself
      console.log('[Auth] invalidating /api/user query (last resort)');
      queryClient.invalidateQueries({ queryKey: ['/api/user'] });
    };

    sync();
    return () => {
      cancelled = true;
      clearTimeout(hardTimeout);
    };
  }, [isSignedIn, localUser]);

  const { signIn, setActive: setSignInActive, isLoaded: signInLoaded } = useSignIn();
  const { signUp, setActive: setSignUpActive, isLoaded: signUpLoaded } = useSignUp();

  // Demo mode: ?demo=1 in URL lets you preview sign-up screens without Clerk
  const params = new URLSearchParams(window.location.search);
  const isDemo = params.get('demo') === '1';
  const rawRedirect = params.get('redirect') || '';
  // Only allow same-origin in-app paths to avoid open-redirect; keep query string.
  const safeRedirect =
    rawRedirect.startsWith('/') && !rawRedirect.startsWith('//') && !rawRedirect.startsWith('/auth')
      ? rawRedirect
      : '';
  const postAuthDest = safeRedirect || '/';

  const [step, setStep] = useState<Step>(isDemo ? 'profileInfo' : 'landing');
  // Landing: phone identifier
  const [landingPhone, setLandingPhone] = useState(isDemo ? '5550000000' : '');
  // Sign-in password screen
  const [password, setPassword] = useState('');
  // OTP code
  const [otpCode, setOtpCode] = useState('');
  // OTP subtitle phone hint (set when sign-in returns phone factor)
  const [otpPhoneHint, setOtpPhoneHint] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mode, setMode] = useState<'signIn' | 'signUp'>('signIn');
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [pendingSessionId, setPendingSessionId] = useState<string | null>(null);
  const [signUpNeedsEmail, setSignUpNeedsEmail] = useState(false);
  // Sign-up profile info
  const [signUpFirstName, setSignUpFirstName] = useState('');
  const [signUpLastName, setSignUpLastName] = useState('');
  const [signUpEmail, setSignUpEmail] = useState('');
  const [signUpPassword, setSignUpPassword] = useState('');

  // Navigate to redirect destination (or home) once local user is synced.
  // Must be in effect, not render.
  useEffect(() => {
    if (localUser) {
      console.log('[Auth] loading screen exit triggered — navigating to', postAuthDest);
      navigate(postAuthDest);
    }
  }, [localUser]);

  if (isSignedIn && !localUser) {
    if (syncError) {
      return (
        <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-4 px-8">
          <p className="text-sm text-red-500 text-center">{syncError}</p>
          <button
            className="px-4 py-2 rounded-lg bg-[#8c52ff] text-white text-sm font-medium"
            onClick={() => {
              console.log('[Auth] user tapped retry — reloading');
              window.location.reload();
            }}
          >
            Try again
          </button>
        </div>
      );
    }
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

  // E.164 from the landing phone number
  const e164 = `+1${landingPhone.replace(/\D/g, '')}`;

  const clerkError = (err: any): string => {
    // Log everything so the actual error is visible in the console
    try {
      console.error('Clerk error raw:', err);
      console.error('Clerk error message:', err?.message);
      console.error('Clerk error errors:', err?.errors);
      console.error('Clerk error status:', err?.status);
    } catch (_) {}
    const first = err?.errors?.[0];
    if (!first) {
      return err?.message ?? 'Something went wrong. Please try again.';
    }
    const code = first.code ?? '';
    if (code === 'form_identifier_not_found') return '__new_user__';
    if (code === 'form_password_incorrect') return 'Incorrect password. Please try again.';
    if (code === 'form_code_incorrect') return 'Incorrect code. Please try again.';
    if (code === 'too_many_requests') return 'Too many attempts. Please wait a moment.';
    if (code === 'oauth_callback_invalid' || code === 'oauth_access_denied') return 'Google sign-in was cancelled or denied.';
    if (code === 'external_account_not_found') return 'No account found for this Google account. Please sign up first.';
    if (code === 'oauth_provider_not_enabled_for_environment') return 'Google sign-in is not enabled. Please configure it in the Clerk dashboard.';
    return first.longMessage ?? first.message ?? `Error: ${code}`;
  };

  // ── Step handlers ──────────────────────────────────────────────────────────

  const handleEmailNext = async () => {
    setError('');
    setLoading(true);
    try {
      const result = await signIn!.create({ identifier: e164 });

      // Determine which first factor to use — prefer password, then phone OTP, then email OTP
      const factors = result.supportedFirstFactors ?? [];
      const passwordFactor = factors.find((f: any) => f.strategy === 'password');
      const phoneFactor = factors.find((f: any) => f.strategy === 'phone_code');
      const emailFactor = factors.find((f: any) => f.strategy === 'email_code');

      setMode('signIn');

      if (passwordFactor) {
        setStep('password');
      } else if (phoneFactor) {
        setOtpPhoneHint((phoneFactor as any).safeIdentifier ?? '');
        await signIn!.prepareFirstFactor({
          strategy: 'phone_code',
          phoneNumberId: (phoneFactor as any).phoneNumberId,
        });
        setOtpCode('');
        setStep('phoneOtp');
      } else if (emailFactor) {
        await signIn!.prepareFirstFactor({
          strategy: 'email_code',
          emailAddressId: (emailFactor as any).emailAddressId,
        });
        setOtpCode('');
        setStep('emailOtp');
      } else {
        setError('No supported sign-in method found for this account.');
      }
    } catch (err: any) {
      const msg = clerkError(err);
      if (msg === '__new_user__') {
        setMode('signUp');
        setStep('profileInfo');
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleProfileInfoNext = async () => {
    setError('');
    if (isDemo) { setStep('phoneOtp'); return; }
    setLoading(true);
    try {
      // Store profile info for onboarding pre-fill
      localStorage.setItem('onboardingFirstName', signUpFirstName.trim());
      localStorage.setItem('onboardingLastName', signUpLastName.trim());
      if (signUpEmail.trim()) {
        localStorage.setItem('pendingEmail', signUpEmail.trim());
        localStorage.setItem('pendingSignUpEmail', signUpEmail.trim());
      }

      // Create the user via our backend admin API with phone + password + optional email.
      // This completely bypasses Clerk's sign-up flow.
      const resp = await fetch(resolveUrl('/api/auth/clerk/complete-signup'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: signUpEmail.trim() || undefined,
          phoneNumber: e164,
          firstName: signUpFirstName.trim() || 'New',
          lastName: signUpLastName.trim() || 'User',
          password: signUpPassword,
        }),
      });
      if (!resp.ok) {
        const body = await resp.json().catch(() => ({}));
        throw new Error(body.error ?? 'Could not create account. Please try again.');
      }

      // Sign in directly with email + password — no OTP needed.
      const result = await signIn!.create({
        identifier: e164,
        password: signUpPassword,
      });
      if (result.status === 'complete') {
        await setSignInActive!({ session: result.createdSessionId });
        setStep('welcome');
        return;
      }
      // Fallback: if Clerk needs something else, go to password screen
      setMode('signIn');
      setStep('password');
    } catch (err: any) {
      setError(err.message ?? clerkError(err));
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordNext = async () => {
    setError('');
    setLoading(true);
    console.log('[Auth] password submit started');
    try {
      const result = await signIn!.attemptFirstFactor({
        strategy: 'password',
        password,
      });
      console.log(`[Auth] Clerk sign-in result status=${result.status}`);

      if (result.status === 'complete') {
        console.log('[Auth] Clerk sign-in success — calling setSignInActive');
        await setSignInActive!({ session: result.createdSessionId });
        console.log('[Auth] setSignInActive resolved — setting step to welcome');
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
    if (isDemo) { setStep('welcome'); return; }
    setLoading(true);
    try {
      if (mode === 'signUp') {
        const result = await signUp!.attemptPhoneNumberVerification({ code: otpCode });
        if (result.status === 'complete') {
          await setSignUpActive!({ session: result.createdSessionId });
          setOtpCode('');
          setStep('welcome');
        } else {
          setError(`Verification failed (${result.status}). Please try again.`);
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
          // Try to use phone as second factor if available
          const secondFactors = (result as any).supportedSecondFactors ?? [];
          const phoneSF = secondFactors.find((f: any) => f.strategy === 'phone_code');
          if (phoneSF) {
            await signIn!.prepareSecondFactor({ strategy: 'phone_code' });
            setOtpCode('');
            // Stay on phoneOtp step — next verify call will use second factor
          } else {
            setError('A second verification step is required. Please contact support.');
          }
        } else {
          setError(`Verification returned unexpected status (${result.status}). Please try again.`);
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
      if (Capacitor.isNativePlatform()) {
        // Google blocks OAuth inside WKWebView (embedded browsers).
        // Open the flow in SFSafariViewController via @capacitor/browser,
        // then handle the deep-link callback to complete auth inside the app.
        const { Browser } = await import('@capacitor/browser');
        const { App } = await import('@capacitor/app');

        const deepLink = 'com.autodapper.app://sso-callback';

        // Create the sign-in to get Clerk's OAuth redirect URL
        const si = await signIn!.create({
          strategy: 'oauth_google',
          redirectUrl: deepLink,
          actionCompleteRedirectUrl: deepLink,
        } as any);

        const oauthUrl = (si as any).firstFactorVerification?.externalVerificationRedirectURL?.toString();
        if (!oauthUrl) throw new Error('Could not generate Google sign-in URL');

        // Listen for the app being reopened via the deep link
        const listener = await App.addListener('appUrlOpen', async ({ url }) => {
          if (url.startsWith('com.autodapper.app://')) {
            await listener.remove();
            await Browser.close();
            // Strip custom scheme and redirect WebView to /sso-callback with Clerk params
            const params = url.replace('com.autodapper.app://sso-callback', '');
            window.location.href = '/sso-callback' + params;
          }
        });

        await Browser.open({ url: oauthUrl });
      } else {
        await signIn!.authenticateWithRedirect({
          strategy: 'oauth_google',
          redirectUrl: '/sso-callback',
          redirectUrlComplete: '/',
        });
      }
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
        phone={landingPhone}
        setPhone={setLandingPhone}
        onNext={handleEmailNext}
        onGoogle={handleGoogleSignIn}
        loading={loading}
        error={error}
      />
    );
  }

  if (step === 'profileInfo') {
    return (
      <ProfileInfoScreen
        phone={landingPhone}
        email={signUpEmail}
        setEmail={setSignUpEmail}
        firstName={signUpFirstName}
        setFirstName={setSignUpFirstName}
        lastName={signUpLastName}
        setLastName={setSignUpLastName}
        password={signUpPassword}
        setPassword={setSignUpPassword}
        onBack={() => { setStep('landing'); setError(''); }}
        onNext={handleProfileInfoNext}
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
        subtitle={`We sent a 6-digit code to ${otpPhoneHint || e164 || 'your phone'}. It may take a moment to arrive.`}
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
