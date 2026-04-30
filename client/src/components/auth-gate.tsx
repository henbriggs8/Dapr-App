import { SignedIn, SignedOut, SignIn, UserButton } from '@clerk/clerk-react';

interface AuthGateProps {
  children: React.ReactNode;
}

export function AuthGate({ children }: AuthGateProps) {
  return (
    <>
      <SignedOut>
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-950 rounded-2xl shadow-2xl p-8 w-full max-w-md">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                Welcome to Dapr
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
            />
          </div>
        </div>
      </SignedOut>

      <SignedIn>
        {children}
      </SignedIn>
    </>
  );
}

export function AuthUserButton() {
  return (
    <SignedIn>
      <UserButton 
        appearance={{
          elements: {
            avatarBox: "w-10 h-10"
          }
        }}
      />
    </SignedIn>
  );
}
