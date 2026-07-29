import { useEffect, useMemo, useState } from 'react';
import { SiApple } from 'react-icons/si';
import { Capacitor } from '@capacitor/core';
import { ArrowLeft, ArrowRight, Check, Eye, EyeOff, Loader2 } from 'lucide-react';
import { Icon } from "@/components/ui/icon";
import { useSignIn, useSignUp, useAuth as useClerkAuth, useClerk } from '@clerk/clerk-react';
import { useLocation } from 'wouter';
import { useAuth } from '@/hooks/use-auth';
import { resolveUrl, queryClient } from '@/lib/queryClient';

// Dev-only logger — compiled away in production builds
const devLog = (...args: unknown[]) => { if (import.meta.env.DEV) console.log(...args); };

// ─── Shared style tokens ────────────────────────────────────────────────────

const primaryBtn =
  'inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-black px-5 text-[15px] font-semibold text-white transition hover:bg-gray-900 active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed';

const inputCls =
  'h-12 w-full border border-gray-200 bg-white rounded-xl px-4 text-[14px] text-gray-900 outline-none placeholder:text-gray-400 focus:border-[#8c52ff] focus:ring-2 focus:ring-[#8c52ff]/10 transition-all';

const otpInputCls =
  'h-14 w-12 border border-gray-200 bg-white text-center text-[20px] font-semibold outline-none focus:border-black rounded-xl transition';

// ─── Layout card (centered on desktop, full-width on mobile) ─────────────────

function AuthCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white sm:bg-gray-50 flex flex-col sm:items-center sm:justify-center">
      <div className="w-full sm:max-w-[500px] bg-white sm:rounded-3xl sm:shadow-sm sm:border sm:border-gray-100 px-6 sm:px-10 pt-10 pb-10 sm:my-10">
        {children}
      </div>
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function BackButton({ onBack }: { onBack: () => void }) {
  return (
    <button
      type="button"
      onClick={onBack}
      className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-900 transition hover:bg-gray-200 mb-8"
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
    const clean = val.replace(/\D/g, '');
    if (clean.length > 1) {
      // Auto-fill / paste: spread digits across boxes starting at position i
      const next = [...digits];
      clean.slice(0, length).split('').forEach((d, j) => {
        if (i + j < length) next[i + j] = d;
      });
      setCode(next.join(''));
      focus(Math.min(i + clean.length, length - 1));
    } else {
      const next = [...digits];
      next[i] = clean;
      setCode(next.join(''));
      if (clean) focus(i + 1);
    }
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
          autoComplete={i === 0 ? 'one-time-code' : 'off'}
          maxLength={6}
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
  onApple,
  loading,
  error,
  isProviderMode,
  fromBooking,
}: {
  phone: string;
  setPhone: (v: string) => void;
  onNext: (identifier: string) => void;
  onGoogle: () => void;
  onApple: () => void;
  loading: boolean;
  error: string;
  isProviderMode?: boolean;
  fromBooking?: boolean;
}) {
  const [inputMode, setInputMode] = useState<'phone' | 'email'>('phone');
  const [email, setEmail] = useState('');

  const digits = phone.replace(/\D/g, '');
  const e164Local = `+1${digits}`;
  const phoneReady = digits.length >= 10;
  const emailReady = email.trim().length > 0;
  const canSubmit = inputMode === 'phone' ? phoneReady : emailReady;
  const identifier = inputMode === 'phone' ? e164Local : email.trim();

  const formatDisplay = (raw: string) => {
    const d = raw.replace(/\D/g, '').slice(0, 10);
    if (d.length <= 3) return d;
    if (d.length <= 6) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
    return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
  };

  return (
    <AuthCard>
      {/* Logo */}
      <div className="mb-8">
        <img src="/dapr-logo.svg" alt="Dapr" className="h-9 w-auto" />
      </div>

      {/* Context-aware heading */}
      {isProviderMode ? (
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight text-black">Dapr Pro Portal</h1>
          <p className="mt-1.5 text-sm text-gray-500">Sign in to your provider account</p>
        </div>
      ) : fromBooking ? (
        <div className="mb-8">
          <p className="text-xs font-bold text-[#8c52ff] uppercase tracking-widest mb-2">Almost there</p>
          <h1 className="text-[22px] font-bold tracking-tight text-black leading-snug">
            Create an account or log in to see services and pricing for your vehicle.
          </h1>
        </div>
      ) : (
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight text-black">Log in or create account</h1>
          <p className="mt-1.5 text-sm text-gray-500">Welcome to Dapr.</p>
        </div>
      )}

      {/* Phone / Email toggle */}
      <div className="flex mb-5 rounded-xl bg-gray-100 p-1 gap-1">
        <button
          type="button"
          onClick={() => setInputMode('phone')}
          className={`flex-1 h-9 rounded-lg text-[13px] font-medium transition-all ${
            inputMode === 'phone' ? 'bg-white text-black shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Phone
        </button>
        <button
          type="button"
          onClick={() => setInputMode('email')}
          className={`flex-1 h-9 rounded-lg text-[13px] font-medium transition-all ${
            inputMode === 'email' ? 'bg-white text-black shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Email
        </button>
      </div>

      {/* Input */}
      <div className="mb-1">
        {inputMode === 'phone' ? (
          <div className="flex h-12 items-center border border-gray-200 rounded-xl bg-white overflow-hidden focus-within:border-[#8c52ff] focus-within:ring-2 focus-within:ring-[#8c52ff]/10 transition-all">
            <div className="flex h-full items-center gap-1.5 px-3 border-r border-gray-200 shrink-0">
              <span className="text-[18px] leading-none">🇺🇸</span>
              <svg className="w-3 h-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
            <div className="flex h-full flex-1 items-center">
              <span className="pl-3 text-[14px] text-gray-900 font-medium select-none">+1</span>
              <input
                value={formatDisplay(phone)}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                onKeyDown={(e) => e.key === 'Enter' && canSubmit && onNext(identifier)}
                placeholder="(201) 555-0123"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                autoFocus
                className="h-full flex-1 bg-transparent px-2 text-[14px] text-gray-900 outline-none placeholder:text-gray-400"
              />
            </div>
          </div>
        ) : (
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && canSubmit && onNext(identifier)}
            placeholder="your@email.com"
            type="email"
            inputMode="email"
            autoComplete="email"
            autoFocus
            className={inputCls}
          />
        )}
      </div>

      {error && <ErrorBanner msg={error} />}

      {/* Continue */}
      <button
        type="button"
        onClick={() => onNext(identifier)}
        disabled={!canSubmit || loading}
        className={`${primaryBtn} mt-4`}
      >
        {loading ? <Icon icon={Loader2} size="sm" className="animate-spin" /> : 'Continue'}
      </button>

      {/* Divider */}
      <div className="flex items-center gap-3 my-5">
        <div className="h-px flex-1 bg-gray-200" />
        <span className="text-[13px] text-gray-400">or</span>
        <div className="h-px flex-1 bg-gray-200" />
      </div>

      {/* Social buttons — Apple must appear first per Apple HIG */}
      <div className="flex flex-col gap-3">
        <button
          type="button"
          onClick={onApple}
          className="flex h-12 w-full items-center justify-center gap-3 rounded-full bg-black text-[14px] font-semibold text-white transition hover:bg-gray-900 active:scale-[0.99]"
        >
          <SiApple className="h-5 w-5 shrink-0" />
          Continue with Apple
        </button>

        {!Capacitor.isNativePlatform() && (
          <button
            type="button"
            onClick={onGoogle}
            className="flex h-12 w-full items-center justify-center gap-3 rounded-full border border-gray-200 bg-white text-[14px] font-medium text-gray-900 transition hover:bg-gray-50 active:scale-[0.99]"
          >
            <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </button>
        )}
      </div>

      {/* Dapr Pro link */}
      <div className="mt-8 pt-6 border-t border-gray-100 flex flex-col items-center gap-2">
        {isProviderMode ? (
          <>
            <p className="text-center text-[12px] text-gray-400">
              New to Dapr?{' '}
              <button
                type="button"
                onClick={() => window.location.href = '/auth?provider=1&mode=signup'}
                className="text-[#8c52ff] font-medium hover:underline underline-offset-2"
              >
                Become a Dapr Pro
              </button>
            </p>
            <p className="text-center text-[12px] text-gray-400">
              Not a provider?{' '}
              <button
                type="button"
                onClick={() => window.location.href = '/auth'}
                className="text-[#8c52ff] font-medium hover:underline underline-offset-2"
              >
                Sign in as a customer
              </button>
            </p>
          </>
        ) : (
          <p className="text-center text-[12px] text-gray-400">
            A Dapr Pro?{' '}
            <button
              type="button"
              onClick={() => window.location.href = '/auth?provider=1'}
              className="text-[#8c52ff] font-medium hover:underline underline-offset-2"
            >
              Sign in as a Dapr Pro
            </button>
          </p>
        )}
      </div>
    </AuthCard>
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
    <AuthCard>
      <BackButton onBack={onBack} />

      <h1 className="text-2xl font-bold tracking-tight text-black mb-2">Welcome back</h1>
      <p className="text-sm text-gray-500 mb-8">Enter your password to continue.</p>

      <div className="relative">
        <input
          type={show ? 'text' : 'password'}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && onNext()}
          placeholder="Password"
          autoFocus
          className={`${inputCls} pr-12`}
        />
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 transition-colors"
        >
          {show ? <Icon icon={EyeOff} size="sm" /> : <Icon icon={Eye} size="sm" />}
        </button>
      </div>

      {error && <ErrorBanner msg={error} />}

      <button
        type="button"
        onClick={onNext}
        disabled={!password.trim() || loading}
        className={`${primaryBtn} mt-5`}
      >
        {loading ? <Icon icon={Loader2} size="sm" className="animate-spin" /> : 'Continue'}
      </button>

      <div className="mt-4 flex justify-center">
        <button
          type="button"
          onClick={onForgot}
          className="text-sm text-gray-500 hover:text-black transition-colors font-medium"
        >
          Forgot password?
        </button>
      </div>
    </AuthCard>
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
    <AuthCard>
      <BackButton onBack={onBack} />

      <h1 className="text-2xl font-bold tracking-tight text-black mb-2">{title}</h1>
      <p className="text-sm text-gray-500 mb-8 leading-relaxed">{subtitle}</p>

      <OtpGrid code={code} setCode={setCode} prefix={prefix} length={6} />

      {error && <ErrorBanner msg={error} />}

      <button
        type="button"
        onClick={onNext}
        disabled={code.length < 6 || loading}
        className={`${primaryBtn} mt-6`}
      >
        {loading ? <Icon icon={Loader2} size="sm" className="animate-spin" /> : 'Verify'}
      </button>

      {onResend && (
        <div className="mt-4 flex justify-center">
          <button
            type="button"
            onClick={onResend}
            className="text-sm text-gray-500 hover:text-black transition-colors font-medium"
          >
            {resendLabel}
          </button>
        </div>
      )}
    </AuthCard>
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
    <AuthCard>
      <p className="text-xs font-bold text-[#8c52ff] uppercase tracking-widest mb-3">
        {required ? 'Almost there' : 'One more thing'}
      </p>
      <h1 className="text-2xl font-bold tracking-tight text-black mb-2">
        {required ? 'Verify your email' : 'Add your email'}
      </h1>
      <p className="text-sm text-gray-500 mb-8 leading-relaxed">
        {required
          ? "We'll send a quick code to confirm your email address."
          : 'Your email lets you reset your password and receive booking confirmations.'}
      </p>

      <input
        type="email"
        inputMode="email"
        autoComplete="email"
        placeholder="you@example.com"
        value={email}
        onChange={e => setEmail(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && email.trim() && onSubmit(email.trim())}
        className={inputCls}
        autoFocus
      />
      {error && <ErrorBanner msg={error} />}

      <button
        type="button"
        disabled={loading || !email.trim()}
        onClick={() => onSubmit(email.trim())}
        className={`${primaryBtn} mt-5`}
      >
        {loading ? <Icon icon={Loader2} size="sm" className="animate-spin" /> : required ? 'Send code' : 'Save email'}
      </button>

      {!required && (
        <div className="mt-4 flex justify-center">
          <button
            type="button"
            onClick={() => onSubmit('')}
            className="text-sm text-gray-500 hover:text-black transition-colors font-medium"
          >
            Skip for now
          </button>
        </div>
      )}
    </AuthCard>
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
    <AuthCard>
      <p className="text-xs font-bold text-[#8c52ff] uppercase tracking-widest mb-3">Reset password</p>
      <h1 className="text-2xl font-bold tracking-tight text-black mb-2">Set a new password</h1>
      <p className="text-sm text-gray-500 mb-8 leading-relaxed">
        Choose a strong password you haven't used before.
      </p>

      <div className="flex flex-col gap-3">
        <div className="relative">
          <input
            type={showPw ? 'text' : 'password'}
            placeholder="New password"
            value={newPassword}
            onChange={e => setNewPassword(e.target.value)}
            className={`${inputCls} pr-12`}
            autoFocus
          />
          <button
            type="button"
            onClick={() => setShowPw(v => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 transition-colors"
          >
            {showPw ? <Icon icon={EyeOff} size="sm" /> : <Icon icon={Eye} size="sm" />}
          </button>
        </div>
        <input
          type={showPw ? 'text' : 'password'}
          placeholder="Confirm new password"
          value={confirmPassword}
          onChange={e => setConfirmPassword(e.target.value)}
          className={inputCls}
        />
      </div>

      {(localError || error) && <ErrorBanner msg={localError || error} />}

      <button
        type="button"
        disabled={loading}
        onClick={handleSubmit}
        className={`${primaryBtn} mt-5`}
      >
        {loading ? <Icon icon={Loader2} size="sm" className="animate-spin" /> : 'Set password'}
      </button>
    </AuthCard>
  );
}

function WelcomeScreen({ onContinue }: { onContinue: () => void }) {
  return (
    <AuthCard>
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#8c52ff]/10 mb-8">
        <Icon icon={Check} size="lg" className="text-[#8c52ff]" />
      </div>

      <h1 className="text-2xl font-bold tracking-tight text-black mb-2">All set.</h1>
      <p className="text-sm text-gray-500 leading-relaxed mb-8">
        You're signed in. Tap continue to get started.
      </p>

      <button type="button" onClick={onContinue} className={primaryBtn}>
        Continue <Icon icon={ArrowRight} size="sm" />
      </button>
    </AuthCard>
  );
}

function ProfileInfoScreen({
  phone,
  setPhone,
  needsPhone,
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
  setPhone?: (v: string) => void;
  needsPhone?: boolean;
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
    if (needsPhone && phone.replace(/\D/g, '').length < 10) {
      setLocalError('Please enter a valid 10-digit phone number.');
      return;
    }
    if (password.length < 8) { setLocalError('Password must be at least 8 characters.'); return; }
    if (password !== confirmPw) { setLocalError('Passwords do not match.'); return; }
    onNext();
  };

  const digits = phone.replace(/\D/g, '');
  const displayPhone = digits.length >= 10
    ? `+1 (${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
    : phone;

  const phoneValid = !needsPhone || digits.length >= 10;
  const canSubmit = firstName.trim() && lastName.trim() && password.length >= 8 && phoneValid;

  return (
    <AuthCard>
      <BackButton onBack={onBack} />

      <h1 className="text-2xl font-bold tracking-tight text-black mb-1">Create your account</h1>
      {displayPhone && <p className="text-sm text-gray-400 mb-8">{displayPhone}</p>}
      {!displayPhone && <div className="mb-8" />}

      <div className="flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-3">
          <input
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            placeholder="First name"
            autoComplete="given-name"
            className={inputCls}
            autoFocus
          />
          <input
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            placeholder="Last name"
            autoComplete="family-name"
            className={inputCls}
          />
        </div>

        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email address"
          type="email"
          inputMode="email"
          autoComplete="email"
          className={inputCls}
        />

        {/* Phone number — shown when the user signed up via email */}
        {needsPhone && (
          <input
            value={phone}
            onChange={(e) => setPhone?.(e.target.value)}
            placeholder="Phone number (10 digits)"
            type="tel"
            inputMode="numeric"
            autoComplete="tel"
            className={inputCls}
          />
        )}

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
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 transition-colors"
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

      <button
        type="button"
        onClick={handleNext}
        disabled={!canSubmit || loading}
        className={`${primaryBtn} mt-6`}
      >
        {loading ? <Icon icon={Loader2} size="sm" className="animate-spin" /> : (
          <>Create account <Icon icon={ArrowRight} size="sm" /></>
        )}
      </button>
      <p className="mt-4 text-center text-[11px] leading-4 text-gray-400 px-4">
        By proceeding, you consent to receive SMS messages from Dapr to the number provided.
      </p>
    </AuthCard>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

type Step = 'landing' | 'profileInfo' | 'password' | 'phoneOtp' | 'emailOtp' | 'emailCollect' | 'setPassword' | 'welcome' | 'applePhoneCollect' | 'applePhoneOtp';

export default function ClerkAuthPage() {
  const CLERK_AVAILABLE = !!import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

  if (!CLERK_AVAILABLE) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 text-center">
        <div>
          <p className="text-sm font-medium text-gray-800 mb-2">Missing environment variables</p>
          <p className="text-xs text-gray-500">Create a <code>.env.local</code> file with<br/><code>VITE_CLERK_PUBLISHABLE_KEY=pk_live_…</code><br/>then run <code>npm run build</code> and <code>npx cap sync ios</code></p>
        </div>
      </div>
    );
  }

  return <AuthFlow />;
}

function AuthFlow() {
  const [, navigate] = useLocation();
  const { isSignedIn, getToken } = useClerkAuth();
  const { signOut: clerkSignOut } = useClerk();
  const { user: localUser } = useAuth();

  // syncError drives the error state on the loading screen (never infinite)
  const [syncError, setSyncError] = useState<string | null>(null);

  // Log every time isSignedIn changes
  useEffect(() => {
    devLog(`[Auth] isSignedIn changed to ${isSignedIn}`);
  }, [isSignedIn]);

  // After Clerk marks the session active, the /api/user TanStack query has
  // staleTime:Infinity and won't refetch on its own. We call clerk-sync here
  // which creates the local user if needed, then push it straight into the
  // cache so the loading screen unblocks immediately.
  //
  // Hard 15-second timeout ensures the loading screen is never infinite.
  useEffect(() => {
    if (!isSignedIn || localUser) return;
    devLog('[Auth] isSignedIn=true and no localUser — starting sync');
    setSyncError(null);
    let cancelled = false;

    const hardTimeout = setTimeout(() => {
      if (!cancelled) {
        cancelled = true;
        devLog('[Auth] loading screen timeout/failure path triggered (15 s)');
        setSyncError('Account setup timed out. Please check your connection and try again.');
      }
    }, 15000);

    const sync = async () => {
      // Poll until Clerk SDK has a token (up to 20 × 300 ms = 6 s)
      let token: string | null = null;
      for (let i = 0; i < 20 && !cancelled; i++) {
        devLog(`[Auth] getToken attempt #${i + 1}`);
        try { token = await getToken(); } catch (e) {
          devLog(`[Auth] getToken threw:`, String(e));
        }
        devLog(`[Auth] getToken resolved with ${token ? 'token (' + token.slice(0, 20) + '…)' : 'null'}`);
        if (token) break;
        await new Promise<void>(r => setTimeout(r, 300));
      }

      if (cancelled) return;

      if (token) {
        try {
          const syncUrl = resolveUrl('/api/auth/clerk-sync');
          devLog(`[Auth] calling ${syncUrl}`);
          const syncRes = await fetch(syncUrl, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ isProvider: isProviderMode }),
          });
          const syncBody = await syncRes.text();
          devLog(`[Auth] /api/auth/clerk-sync response status=${syncRes.status} body=${syncBody}`);
          if (syncRes.ok && !cancelled) {
            clearTimeout(hardTimeout);
            queryClient.setQueryData(['/api/user'], JSON.parse(syncBody));
            devLog('[Auth] localUser set from clerk-sync — loading screen exit triggered');
            return;
          }
          // Non-OK from clerk-sync — fall through to /api/user direct call
        } catch (e) {
          devLog(`[Auth] /api/auth/clerk-sync threw: ${String(e)}`);
        }
      }

      if (cancelled) return;

      // Fallback: direct GET /api/user with whatever auth we have
      try {
        const userUrl = resolveUrl('/api/user');
        devLog(`[Auth] /api/user request fired (fallback) — ${userUrl}`);
        const userRes = await fetch(userUrl, {
          credentials: 'include',
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const userBody = await userRes.text();
        devLog(`[Auth] /api/user response status=${userRes.status} body=${userBody}`);
        if (userRes.ok && !cancelled) {
          clearTimeout(hardTimeout);
          queryClient.setQueryData(['/api/user'], JSON.parse(userBody));
          devLog('[Auth] localUser set from /api/user fallback — loading screen exit triggered');
          return;
        }
      } catch (e) {
        devLog(`[Auth] /api/user threw: ${String(e)}`);
      }

      if (cancelled) return;

      // Last-resort: let TanStack re-run the query itself
      devLog('[Auth] invalidating /api/user query (last resort)');
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

  // ── Clerk-load instrumentation + timeout ────────────────────────────────
  const isNative = typeof window !== 'undefined' && window.location.protocol === 'capacitor:';
  const [clerkStage, setClerkStage] = useState<string>('Loading Clerk…');
  const [clerkTimedOut, setClerkTimedOut] = useState(false);

  useEffect(() => {
    devLog(`[AuthInit] ClerkProvider mounted — signInLoaded=${signInLoaded} signUpLoaded=${signUpLoaded}`);
    devLog(`[AuthInit] isNative=${isNative}`);
  }, []);

  useEffect(() => {
    devLog(`[AuthInit] isLoaded change — signInLoaded=${signInLoaded} signUpLoaded=${signUpLoaded}`);
    if (signInLoaded && signUpLoaded) {
      devLog('[AuthInit] Clerk loaded ✓');
      setClerkStage('Clerk loaded');
    }
  }, [signInLoaded, signUpLoaded]);

  // Hard 15s timeout on Clerk JS load — surfaces failure instead of hanging.
  // Deps include signInLoaded/signUpLoaded so the effect re-runs (and cleanup
  // cancels all timers) as soon as Clerk reports it has loaded.
  useEffect(() => {
    if (signInLoaded && signUpLoaded) {
      // Clerk just loaded — any pending timers were already cleared by cleanup
      devLog('[AuthInit] watchdog cancelled — Clerk loaded ✓');
      return;
    }
    devLog('[AuthInit] starting 15s Clerk-load watchdog');
    const stages: [number, string][] = [
      [3000, 'Loading Clerk SDK…'],
      [7000, 'Still waiting for Clerk…'],
      [11000, 'Network may be slow…'],
    ];
    const timers = stages.map(([ms, label]) =>
      setTimeout(() => {
        setClerkStage(label);
        devLog(`[AuthInit] stage: ${label}`);
      }, ms)
    );
    const timeout = setTimeout(() => {
      console.error('[AuthInit] TIMEOUT — Clerk JS never loaded after 15s');
      setClerkTimedOut(true);
      setClerkStage('Failed — Clerk SDK did not load');
    }, 15000);
    return () => {
      timers.forEach(clearTimeout);
      clearTimeout(timeout);
    };
  }, [signInLoaded, signUpLoaded]);

  const params = new URLSearchParams(window.location.search);
  const isProviderMode = params.get('provider') === '1';
  const rawRedirect = params.get('redirect') || '';
  // Only allow same-origin in-app paths to avoid open-redirect; keep query string.
  const safeRedirect =
    rawRedirect.startsWith('/') && !rawRedirect.startsWith('//') && !rawRedirect.startsWith('/auth')
      ? rawRedirect
      : '';
  const postAuthDest = safeRedirect || '/';

  const [step, setStep] = useState<Step>('landing');
  // Landing: phone identifier
  const [landingPhone, setLandingPhone] = useState('');
  // Sign-in password screen
  const [password, setPassword] = useState('');
  // Set when user typed a plain username (not email/phone) — uses legacy /api/login
  const [legacyUsername, setLegacyUsername] = useState('');
  // OTP code
  const [otpCode, setOtpCode] = useState('');
  // OTP subtitle phone hint (set when sign-in returns phone factor)
  const [otpPhoneHint, setOtpPhoneHint] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mode, setMode] = useState<'signIn' | 'signUp'>('signIn');
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [isSecondFactor, setIsSecondFactor] = useState(false);
  const [pendingSessionId, setPendingSessionId] = useState<string | null>(null);
  const [signUpNeedsEmail, setSignUpNeedsEmail] = useState(false);
  // Sign-up profile info
  const [signUpFirstName, setSignUpFirstName] = useState('');
  const [signUpLastName, setSignUpLastName] = useState('');
  const [signUpEmail, setSignUpEmail] = useState('');
  const [signUpPassword, setSignUpPassword] = useState('');
  // Apple Sign-In: phone collection step
  const [appleSignUpPhone, setAppleSignUpPhone] = useState('');

  // Navigate to redirect destination (or home) once local user is synced.
  // Must be in effect, not render.
  useEffect(() => {
    if (localUser) {
      devLog('[Auth] loading screen exit triggered — navigating to', postAuthDest);
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
              devLog('[Auth] user tapped retry — reloading');
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
    if (clerkTimedOut) {
      return (
        <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-4 px-8">
          <p className="text-sm font-medium text-gray-800 text-center">Sign-in unavailable</p>
          <p className="text-xs text-red-500 text-center">
            Authentication service failed to load. Check your connection and try again.
          </p>
          <p className="text-[10px] text-gray-400 text-center font-mono">Stage: {clerkStage}</p>
          <button
            className="mt-2 px-5 py-2.5 rounded-full bg-[#8c52ff] text-white text-sm font-medium"
            onClick={() => window.location.reload()}
          >
            Retry
          </button>
        </div>
      );
    }
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-3">
        <div className="w-5 h-5 rounded-full border-2 border-[#8c52ff] border-t-transparent animate-spin" />
        <p className="text-xs text-gray-400">{clerkStage}</p>
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
    if (code === 'oauth_callback_invalid' || code === 'oauth_access_denied') return 'Sign-in was cancelled or denied.';
    if (code === 'external_account_not_found') return 'No account found for this sign-in. Please try your phone number instead.';
    if (code === 'oauth_provider_not_enabled_for_environment') return 'This sign-in method is not enabled. Please use your phone number.';
    return first.longMessage ?? first.message ?? `Error: ${code}`;
  };

  // ── Step handlers ──────────────────────────────────────────────────────────

  const handleIdentifierNext = async (id: string) => {
    setError('');
    // Plain username (no @ and doesn't start with +) → legacy Passport login
    const isUsername = !id.includes('@') && !id.startsWith('+') && !/^\d{10,}$/.test(id.replace(/\D/g, ''));
    if (isUsername) {
      setLegacyUsername(id.trim().toLowerCase());
      setStep('password');
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const result = await signIn!.create({ identifier: id });

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
    setLoading(true);
    try {
      // Store profile info for onboarding pre-fill
      localStorage.setItem('onboardingFirstName', signUpFirstName.trim());
      localStorage.setItem('onboardingLastName', signUpLastName.trim());
      if (signUpEmail.trim()) {
        localStorage.setItem('pendingEmail', signUpEmail.trim());
        localStorage.setItem('pendingSignUpEmail', signUpEmail.trim());
      }

      // Mark provider intent so App.tsx ClerkSyncInner passes isProvider:true on first sync
      if (isProviderMode) localStorage.setItem('pendingIsProvider', '1');

      // Determine whether we have a valid phone (≥10 digits) or are using email only.
      const phoneDigits = landingPhone.replace(/\D/g, '');
      const hasValidPhone = phoneDigits.length >= 10;
      const validE164 = hasValidPhone ? `+1${phoneDigits}` : undefined;
      // Use email as sign-in identifier when no valid phone was entered.
      const signInIdentifier = validE164 ?? signUpEmail.trim();
      if (!signInIdentifier) {
        throw new Error('Please enter a valid email address to continue.');
      }

      // Create the user via our backend admin API — phone is optional when email is provided.
      const resp = await fetch(resolveUrl('/api/auth/clerk/complete-signup'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: signUpEmail.trim() || undefined,
          phoneNumber: validE164,
          firstName: signUpFirstName.trim() || 'New',
          lastName: signUpLastName.trim() || 'User',
          password: signUpPassword,
        }),
      });
      if (!resp.ok) {
        const body = await resp.json().catch(() => ({}));
        throw new Error(body.error ?? 'Could not create account. Please try again.');
      }

      // Sign in directly with the right identifier + password — no OTP needed.
      const result = await signIn!.create({
        identifier: signInIdentifier,
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
    // Legacy username login — bypass Clerk, use Passport /api/login
    if (legacyUsername) {
      try {
        devLog('[LegacyLogin] POST /api/login username=', legacyUsername, 'pwLen=', password.length);
        const res = await fetch(resolveUrl('/api/login'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: legacyUsername, password }),
          credentials: 'include',
        });
        devLog('[LegacyLogin] response status=', res.status, 'ok=', res.ok);
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          setError(body.message ?? `Incorrect username or password. (${res.status})`);
          return;
        }
        const userData = await res.json();
        devLog('[LegacyLogin] success userId=', userData?.id);
        queryClient.setQueryData(['/api/user'], userData);
        setStep('welcome');
      } catch (err: any) {
        console.error('[LegacyLogin] fetch error', err);
        setError('Could not connect. Please try again.');
      } finally {
        setLoading(false);
      }
      return;
    }
    devLog('[Auth] password submit started');
    try {
      const result = await signIn!.attemptFirstFactor({
        strategy: 'password',
        password,
      });
      devLog(`[Auth] Clerk sign-in result status=${result.status}`);

      if (result.status === 'complete') {
        devLog('[Auth] Clerk sign-in success — calling setSignInActive');
        await setSignInActive!({ session: result.createdSessionId });
        devLog('[Auth] setSignInActive resolved — setting step to welcome');
        setStep('welcome');
      } else if (result.status === 'needs_second_factor') {
        // Prepare phone second factor
        const factors = result.supportedSecondFactors ?? [];
        const phoneFactor = factors.find((f: any) => f.strategy === 'phone_code');
        if (phoneFactor) {
          await signIn!.prepareSecondFactor({ strategy: 'phone_code' });
          setIsSecondFactor(true);
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
          await setSignUpActive!({ session: result.createdSessionId });
          setOtpCode('');
          setStep('welcome');
        } else {
          setError(`Verification failed (${result.status}). Please try again.`);
        }
      } else if (isSecondFactor) {
        // Password was the first factor; this OTP is the second factor (2FA)
        const result = await signIn!.attemptSecondFactor({ strategy: 'phone_code', code: otpCode });
        if (result.status === 'complete') {
          await setSignInActive!({ session: result.createdSessionId });
          setIsSecondFactor(false);
          setStep('welcome');
        } else {
          setError(`Verification returned unexpected status (${result.status}). Please try again.`);
        }
      } else {
        // Phone OTP is the primary (first) factor — e.g. password reset or phone-only sign-in
        const strategy = isResettingPassword ? 'reset_password_phone_code' : 'phone_code';
        const result = await signIn!.attemptFirstFactor({ strategy, code: otpCode });
        if (result.status === 'complete') {
          await setSignInActive!({ session: result.createdSessionId });
          setIsResettingPassword(false);
          setStep('welcome');
        } else if (result.status === 'needs_new_password') {
          setOtpCode('');
          setStep('setPassword');
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

  const getOAuthUrl = async (strategy: 'oauth_apple' | 'oauth_google', callbackUrl: string): Promise<string> => {
    // Try sign-in path first (handles existing users; Clerk auto-transfers new users)
    try {
      const si = await signIn!.create({ strategy, redirectUrl: callbackUrl, actionCompleteRedirectUrl: callbackUrl } as any);
      const url = (si as any).firstFactorVerification?.externalVerificationRedirectURL?.toString();
      if (url) { devLog('[Auth] OAuth URL from signIn:', url.slice(0, 80)); return url; }
    } catch (e) {
      devLog('[Auth] signIn.create OAuth failed, trying signUp:', e);
    }
    // Fallback: sign-up path (for brand-new users not yet in Clerk)
    const su = await signUp!.create({ strategy, redirectUrl: callbackUrl, actionCompleteRedirectUrl: callbackUrl } as any);
    const url = (su as any).verifications?.externalAccount?.externalVerificationRedirectURL?.toString()
      || (su as any).externalVerificationRedirectURL?.toString();
    if (!url) throw new Error(`Could not get OAuth URL for ${strategy}`);
    devLog('[Auth] OAuth URL from signUp:', url.slice(0, 80));
    return url;
  };

  const handleAppleSignIn = async () => {
    setError('');
    try {
      if (Capacitor.isNativePlatform()) {
        // Native Apple Sign-In: iOS sheet → Apple identity token → Clerk token exchange.
        // No browser, no redirects, no cookie domain issues.
        setLoading(true);
        const { SignInWithApple } = await import('@capacitor-community/apple-sign-in');
        devLog('[Auth] Native Apple Sign-In: requesting credential…');
        const appleResult = await SignInWithApple.authorize({
          clientId: 'com.autodapper.app',
          redirectURI: 'https://dapper-pros.replit.app',
          scopes: 'email name',
          state: '',
          nonce: '',
        });
        const { identityToken, email, givenName, familyName } = appleResult.response;
        if (!identityToken) throw new Error('Apple did not return an identity token');
        devLog('[Auth] Apple token received, exchanging with Clerk…');

        // redirect_url is required by Clerk even for native token exchange
        // (validated server-side but never followed — session is returned directly).
        const nativeRedirect = 'https://dapper-pros.replit.app/sso-callback';
        let sessionId: string | null = null;
        let clerkStatus: string = '';
        let needsSignUp = false;

        try {
          const result = await signIn!.create({
            strategy: 'oauth_apple',
            token: identityToken,
            redirectUrl: nativeRedirect,
          } as any);
          clerkStatus = result.status ?? '';
          sessionId = result.createdSessionId;
          devLog('[Auth] signIn.create status:', clerkStatus, 'sessionId:', sessionId);
          // needs_identifier = Clerk accepted the token but can't find an existing account
          // → user is new, fall through to sign-up
          if (clerkStatus === 'needs_identifier') needsSignUp = true;
        } catch (signInErr: any) {
          const code = signInErr?.errors?.[0]?.code ?? '';
          devLog('[Auth] signIn.create error code:', code, signInErr?.errors?.[0]?.message);
          if (
            code === 'form_identifier_not_found' ||
            code === 'external_account_not_found' ||
            code === 'account_not_found'
          ) {
            needsSignUp = true;
          } else {
            throw signInErr;
          }
        }

        if (needsSignUp) {
          devLog('[Auth] New Apple user — creating account via sign-up…');
          const upResult = await signUp!.create({
            strategy: 'oauth_apple',
            token: identityToken,
            redirectUrl: nativeRedirect,
            ...(email ? { emailAddress: email } : {}),
            ...(givenName ? { firstName: givenName } : {}),
            ...(familyName ? { lastName: familyName } : {}),
          } as any);
          clerkStatus = upResult.status ?? '';
          sessionId = upResult.createdSessionId;
          devLog('[Auth] signUp.create status:', clerkStatus, 'sessionId:', sessionId);
        }

        if (sessionId) {
          await setSignInActive!({ session: sessionId });
          await queryClient.invalidateQueries();
          setLoading(false);
          navigate(postAuthDest);
        } else if (clerkStatus === 'missing_requirements') {
          // Clerk created the external account but needs a phone number to complete sign-up.
          // Collect it now then verify via SMS OTP.
          setLoading(false);
          setError('');
          setStep('applePhoneCollect');
        } else {
          throw new Error(`Apple sign-in incomplete (status: ${clerkStatus || 'unknown'}). Please try again.`);
        }
      } else {
        await clerkSignOut();
        await signIn!.authenticateWithRedirect({
          strategy: 'oauth_apple',
          redirectUrl: '/sso-callback',
          redirectUrlComplete: '/',
        });
      }
    } catch (err: any) {
      const msg = clerkError(err);
      console.error('[Auth] Apple sign-in error:', msg, err);
      setError(msg);
    }
  };

  // ── Apple phone-collection handler ──────────────────────────────────────
  const handleApplePhoneNext = async () => {
    setError('');
    setLoading(true);
    try {
      const digits = appleSignUpPhone.replace(/\D/g, '');
      const e164 = `+1${digits}`;
      await signUp!.update({ phoneNumber: e164 } as any);
      await signUp!.preparePhoneNumberVerification({ strategy: 'phone_code' });
      setOtpPhoneHint(e164);
      setOtpCode('');
      setStep('applePhoneOtp');
    } catch (err: any) {
      setError(clerkError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleApplePhoneOtpNext = async () => {
    setError('');
    setLoading(true);
    try {
      const result = await signUp!.attemptPhoneNumberVerification({ code: otpCode });
      const sid = result.createdSessionId;
      if (sid) {
        await setSignUpActive!({ session: sid });
        await queryClient.invalidateQueries();
        navigate(postAuthDest);
      } else {
        setError('Verification failed — please try again.');
      }
    } catch (err: any) {
      setError(clerkError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    try {
      if (Capacitor.isNativePlatform()) {
        const { Browser } = await import('@capacitor/browser');

        // Generate a unique state key so the server can match the callback to this poll.
        const state = Math.random().toString(36).slice(2) + Date.now().toString(36);
        const callbackUrl = `https://dapper-pros.replit.app/native-sso-callback?state=${state}`;

        // Use the Clerk Account Portal to start the Google OAuth flow.
        // We cannot use signIn.create() to get a direct Google URL here because
        // the OAuth state Clerk generates is tied to the WKWebView cookie session —
        // when SFSafariViewController (a separate sandbox) picks it up, Clerk's
        // server rejects the state mismatch with authorization_invalid.
        // The Account Portal starts the flow from Clerk's own server context,
        // avoiding that cookie isolation entirely.
        const portalUrl = `https://accounts.autodapper.com/sign-in?redirect_url=${encodeURIComponent(callbackUrl)}`;

        // Stop polling if the user manually closes the browser without signing in.
        let cancelled = false;
        const browserHandle = await Browser.addListener('browserFinished', () => {
          cancelled = true;
        });

        devLog('[Auth] Google OAuth: opening Account Portal, polling state=', state);
        await Browser.open({ url: portalUrl });
        setLoading(true);

        try {
          // Poll every 2 s for up to 3 min for the Clerk callback params.
          // SFSafariViewController blocks JS custom-scheme redirects on iOS 14+,
          // so the server stores the params and we retrieve them here.
          for (let i = 0; i < 90 && !cancelled; i++) {
            await new Promise(r => setTimeout(r, 2000));
            if (cancelled) break;
            try {
              const resp = await fetch(`/api/native-sso-poll/${state}`);
              if (resp.ok) {
                const { params } = await resp.json();
                devLog('[Auth] Google SSO params received, navigating to /sso-callback');
                browserHandle.remove();
                try { await Browser.close(); } catch {}
                // Let Clerk's AuthenticateWithRedirectCallback handle the ticket
                window.location.href = '/sso-callback' + (params || '');
                return;
              }
            } catch {}
          }
        } finally {
          browserHandle.remove();
        }

        setLoading(false);
        if (!cancelled) setError('Sign-in timed out. Please try again.');
      } else {
        await clerkSignOut();
        await signIn!.authenticateWithRedirect({
          strategy: 'oauth_google',
          redirectUrl: '/sso-callback',
          redirectUrlComplete: '/',
        });
      }
    } catch (err: any) {
      setLoading(false);
      const msg = clerkError(err);
      console.error('[Auth] Google sign-in error:', msg, err);
      setError(msg);
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
        onNext={handleIdentifierNext}
        onGoogle={handleGoogleSignIn}
        onApple={handleAppleSignIn}
        loading={loading}
        error={error}
        isProviderMode={params.get('provider') === '1'}
        fromBooking={params.get('context') === 'booking'}
      />
    );
  }

  if (step === 'profileInfo') {
    return (
      <ProfileInfoScreen
        phone={landingPhone}
        setPhone={setLandingPhone}
        needsPhone={landingPhone.replace(/\D/g, '').length < 10}
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
    return <WelcomeScreen onContinue={() => navigate(postAuthDest)} />;
  }

  if (step === 'applePhoneCollect') {
    const digits = appleSignUpPhone.replace(/\D/g, '');
    const ready = digits.length >= 10;
    const formatDisplay = (raw: string) => {
      const d = raw.replace(/\D/g, '').slice(0, 10);
      if (d.length <= 3) return d;
      if (d.length <= 6) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
      return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
    };
    return (
      <AuthCard>
        <BackButton onBack={() => { setStep('landing'); setError(''); }} />
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-black mb-6">
          <SiApple className="w-7 h-7 text-white" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-black mb-2">One more step</h1>
        <p className="text-sm text-gray-500 mb-8 leading-relaxed">
          We need your mobile number to send booking confirmations and connect you with your detailer.
        </p>
        <div className="flex h-12 items-center border border-gray-200 rounded-xl bg-white overflow-hidden focus-within:border-[#8c52ff] focus-within:ring-2 focus-within:ring-[#8c52ff]/10 transition-all mb-1">
          <div className="flex h-full items-center gap-1.5 px-3 border-r border-gray-200 shrink-0">
            <span className="text-[18px] leading-none">🇺🇸</span>
          </div>
          <span className="pl-3 text-[14px] text-gray-900 font-medium select-none">+1</span>
          <input
            value={formatDisplay(appleSignUpPhone)}
            onChange={(e) => setAppleSignUpPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
            onKeyDown={(e) => e.key === 'Enter' && ready && handleApplePhoneNext()}
            placeholder="(201) 555-0123"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            autoFocus
            className="h-full flex-1 bg-transparent px-2 text-[14px] text-gray-900 outline-none placeholder:text-gray-400"
          />
        </div>
        {error && <ErrorBanner msg={error} />}
        <button
          className={`${primaryBtn} mt-5`}
          disabled={!ready || loading}
          onClick={handleApplePhoneNext}
        >
          {loading ? <Icon icon={Loader2} size="sm" className="animate-spin" /> : 'Send verification code'}
        </button>
      </AuthCard>
    );
  }

  if (step === 'applePhoneOtp') {
    return (
      <OtpScreen
        title="Enter the code"
        subtitle={`We sent a 6-digit code to ${otpPhoneHint || 'your phone'}. It may take a moment to arrive.`}
        code={otpCode}
        setCode={setOtpCode}
        prefix="apple-phone"
        onBack={() => { setStep('applePhoneCollect'); setError(''); setOtpCode(''); }}
        onNext={handleApplePhoneOtpNext}
        loading={loading}
        error={error}
      />
    );
  }

  return null;
}
