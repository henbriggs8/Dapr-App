import { StrictMode, useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { ClerkProvider, useAuth } from "@clerk/clerk-react";
import App from "./App";
import { SplashScreen } from "./components/splash-screen";
import { setClerkTokenGetter } from "@/lib/queryClient";
import "./index.css";

const CLERK_PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

// Registers the Clerk token getter with queryClient so native API calls
// can include Authorization: Bearer <token> headers automatically.
function ClerkTokenBridge() {
  const { getToken } = useAuth();
  useEffect(() => {
    setClerkTokenGetter(() => getToken());
  }, [getToken]);
  return null;
}

function Root() {
  const alreadyShown = sessionStorage.getItem('splash_shown') === 'true';
  const [showSplash, setShowSplash] = useState(!alreadyShown);

  if (showSplash) {
    return <SplashScreen onComplete={() => {
      sessionStorage.setItem('splash_shown', 'true');
      setShowSplash(false);
    }} />;
  }

  return <App />;
}

const rootElement = document.getElementById("root");

if (rootElement) {
  createRoot(rootElement).render(
    <StrictMode>
      {CLERK_PUBLISHABLE_KEY ? (
        <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY}>
          <ClerkTokenBridge />
          <Root />
        </ClerkProvider>
      ) : (
        <Root />
      )}
    </StrictMode>
  );
}
