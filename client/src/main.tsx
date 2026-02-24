import { StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";
import { ClerkProvider } from "@clerk/clerk-react";
import App from "./App";
import { SplashScreen } from "./components/splash-screen";
import "./index.css";

const CLERK_PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

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

// Ensure window is defined before accessing document
const rootElement = document.getElementById("root");

// Only render if root element exists
if (rootElement) {
  createRoot(rootElement).render(
    <StrictMode>
      {CLERK_PUBLISHABLE_KEY ? (
        <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY}>
          <Root />
        </ClerkProvider>
      ) : (
        <Root />
      )}
    </StrictMode>
  );
}
