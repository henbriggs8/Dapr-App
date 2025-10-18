import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ClerkProvider } from "@clerk/clerk-react";
import App from "./App";
import "./index.css";

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

// Ensure window is defined before accessing document
const rootElement = document.getElementById("root");

// Only render if root element exists
if (rootElement) {
  // If Clerk key is provided, wrap with ClerkProvider; otherwise run without it
  if (PUBLISHABLE_KEY) {
    createRoot(rootElement).render(
      <StrictMode>
        <ClerkProvider 
          publishableKey={PUBLISHABLE_KEY} 
          afterSignOutUrl="/"
          allowedRedirectOrigins={[window.location.origin]}
        >
          <App />
        </ClerkProvider>
      </StrictMode>
    );
  } else {
    // Run without Clerk (legacy auth only)
    createRoot(rootElement).render(
      <StrictMode>
        <App />
      </StrictMode>
    );
  }
}
