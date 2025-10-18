import { useEffect } from 'react';
import { SignIn, useAuth as useClerkAuth, useUser } from '@clerk/clerk-react';
import { useLocation } from 'wouter';
import { useAuth } from '@/hooks/use-auth';
import { useAuthToken } from '@/hooks/useAuthToken';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Loader } from '@/components/ui/loader';

export default function ClerkAuthPage() {
  const [, navigate] = useLocation();
  
  // Check if Clerk is available
  const CLERK_AVAILABLE = !!import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
  
  // Redirect to legacy auth if Clerk is not configured
  useEffect(() => {
    if (!CLERK_AVAILABLE) {
      navigate('/auth-legacy');
    }
  }, [CLERK_AVAILABLE, navigate]);
  
  // If Clerk is not available, don't render anything (will redirect)
  if (!CLERK_AVAILABLE) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader size="lg" />
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
          // Get Clerk JWT token
          const headers = await getAuthHeaders();
          
          // Sync with local database and create session
          const res = await fetch('/api/auth/clerk-sync', {
            method: 'POST',
            headers: {
              ...headers,
              'Content-Type': 'application/json'
            }
          });

          if (res.ok) {
            const userData = await res.json();
            // Update the local user query cache
            queryClient.setQueryData(['/api/user'], userData);
            
            // Navigate to home after successful sync
            navigate('/');
          }
        } catch (error) {
          console.error('Failed to sync Clerk user:', error);
        }
      } else if (localUser) {
        // User is already synced, navigate to home
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
        <div className="text-center mb-8">
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
          afterSignInUrl="/"
        />
      </div>
    </div>
  );
}
