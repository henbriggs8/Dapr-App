import { StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { SplashScreen } from "./components/splash-screen";
import "./index.css";

function Root() {
  const [showSplash, setShowSplash] = useState(true);

  if (showSplash) {
    return <SplashScreen onComplete={() => setShowSplash(false)} />;
  }

  return <App />;
}

// Ensure window is defined before accessing document
const rootElement = document.getElementById("root");

// Only render if root element exists
if (rootElement) {
  createRoot(rootElement).render(
    <StrictMode>
      <Root />
    </StrictMode>
  );
}
