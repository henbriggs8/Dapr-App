import { useEffect } from 'react';
import { SignIn, useAuth as useClerkAuth } from '@clerk/clerk-react';
import { useLocation, Link } from 'wouter';
import { useAuth } from '@/hooks/use-auth';

export default function ClerkAuthPage() {
  const CLERK_AVAILABLE = !!import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

  if (!CLERK_AVAILABLE) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="text-center">
          <h2 className="text-lg font-semibold text-gray-900 mb-1">Authentication Not Configured</h2>
          <p className="text-sm text-gray-500">Please configure Clerk to enable sign-in.</p>
        </div>
      </div>
    );
  }

  return <ClerkAuthPageContent />;
}

function ClerkAuthPageContent() {
  const [, navigate] = useLocation();
  const { isSignedIn, isLoaded } = useClerkAuth();
  const { user: localUser } = useAuth();

  useEffect(() => {
    if (localUser) {
      navigate('/');
    }
  }, [localUser, navigate]);

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-5 h-5 rounded-full border-2 border-[#8c52ff] border-t-transparent animate-spin" />
      </div>
    );
  }

  if (isSignedIn) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6">
        <div className="w-5 h-5 rounded-full border-2 border-[#8c52ff] border-t-transparent animate-spin mb-4" />
        <p className="text-sm text-gray-500">Setting up your account...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <div className="px-6 pt-16 pb-8">
        <p className="text-xs font-semibold tracking-widest text-[#8c52ff] uppercase mb-3">Dapper</p>
        <h1 className="text-3xl font-bold text-gray-900 leading-tight mb-2">
          Welcome back
        </h1>
        <p className="text-gray-500 text-sm">
          Sign in to book premium car wash &amp; detailing services
        </p>
      </div>

      {/* Clerk form */}
      <div className="flex-1 px-2">
        <SignIn
          appearance={{
            variables: {
              colorPrimary: '#8c52ff',
              colorBackground: '#ffffff',
              colorText: '#111827',
              colorTextSecondary: '#6b7280',
              colorInputBackground: '#ffffff',
              colorInputText: '#111827',
              borderRadius: '12px',
              fontFamily: 'inherit',
              fontSize: '14px',
            },
            elements: {
              rootBox: 'w-full',
              card: 'shadow-none border-none bg-transparent p-0 w-full',
              header: 'hidden',
              headerTitle: 'hidden',
              headerSubtitle: 'hidden',
              socialButtonsBlockButton:
                'border border-gray-200 shadow-none bg-white hover:bg-gray-50 text-gray-700 font-medium rounded-xl h-12',
              socialButtonsBlockButtonText: 'font-medium',
              dividerRow: 'my-4',
              dividerText: 'text-gray-400 text-xs',
              formFieldLabel: 'text-xs font-medium text-gray-500 uppercase tracking-wide mb-1',
              formFieldInput:
                'border border-gray-200 rounded-xl h-12 px-4 text-sm text-gray-900 focus:border-[#8c52ff] focus:ring-0 focus:outline-none bg-white',
              formButtonPrimary:
                'bg-[#8c52ff] hover:bg-[#7a3ff5] text-white font-semibold rounded-xl h-12 text-sm w-full shadow-none',
              footerActionLink: 'text-[#8c52ff] font-medium hover:underline',
              footerAction: 'text-sm text-gray-500',
              identityPreviewText: 'text-sm text-gray-700',
              identityPreviewEditButton: 'text-[#8c52ff]',
              formResendCodeLink: 'text-[#8c52ff]',
              otpCodeFieldInput:
                'border border-gray-200 rounded-xl text-lg font-bold text-gray-900',
              alertText: 'text-sm',
              formFieldErrorText: 'text-xs text-red-500 mt-1',
            },
          }}
          routing="hash"
          fallbackRedirectUrl="/auth"
        />
      </div>

      {/* Provider link */}
      <div className="px-6 py-8 border-t border-gray-100 text-center">
        <p className="text-xs text-gray-400 mb-1">Are you a service provider?</p>
        <Link
          href="/provider-auth"
          className="text-sm font-semibold text-[#8c52ff] hover:underline"
        >
          Sign in to provider account →
        </Link>
      </div>
    </div>
  );
}
