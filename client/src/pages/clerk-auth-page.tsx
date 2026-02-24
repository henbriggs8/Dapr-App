import { useEffect } from 'react';
import { SignIn, useAuth as useClerkAuth, useUser } from '@clerk/clerk-react';
import { useLocation } from 'wouter';
import { useAuth } from '@/hooks/use-auth';
import { useAuthToken } from '@/hooks/useAuthToken';
import { queryClient } from '@/lib/queryClient';
import { Loader } from '@/components/ui/loader';
import dapperVan from '../dapper-van.png';

export default function ClerkAuthPage() {
  const CLERK_AVAILABLE = !!import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

  if (!CLERK_AVAILABLE) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Authentication Not Configured</h2>
          <p className="text-muted-foreground">Please configure Clerk to enable sign-in.</p>
        </div>
      </div>
    );
  }

  return <ClerkAuthPageContent />;
}

function ClerkAuthPageContent() {
  const [, navigate] = useLocation();
  const { isSignedIn } = useClerkAuth();
  const { user: clerkUser, isLoaded } = useUser();
  const { user: localUser } = useAuth();
  const { getAuthHeaders } = useAuthToken();

  useEffect(() => {
    async function syncUser() {
      if (isSignedIn && clerkUser && !localUser) {
        try {
          const headers = await getAuthHeaders();

          const res = await fetch('/api/auth/clerk-sync', {
            method: 'POST',
            headers: {
              ...headers,
              'Content-Type': 'application/json'
            }
          });

          if (res.ok) {
            const userData = await res.json();
            queryClient.setQueryData(['/api/user'], userData);
            navigate('/');
          }
        } catch (error) {
          console.error('Failed to sync Clerk user:', error);
        }
      } else if (localUser) {
        navigate('/');
      }
    }

    if (isLoaded) {
      syncUser();
    }
  }, [isSignedIn, clerkUser, localUser, isLoaded, navigate, getAuthHeaders]);

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-950 rounded-2xl shadow-2xl p-8 w-full max-w-md">
        <div className="text-center mb-6">
          <img
            src={dapperVan}
            alt="Dapper Mobile Car Wash"
            className="w-48 h-auto mx-auto mb-4"
          />
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Welcome to Dapper
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Sign in to book premium car wash services
          </p>
        </div>

        <SignIn
          appearance={{
            elements: {
              rootBox: "w-full",
              card: "shadow-none bg-transparent",
            }
          }}
          routing="path"
          path="/auth"
          fallbackRedirectUrl="/"
        />
      </div>
    </div>
  );
}
