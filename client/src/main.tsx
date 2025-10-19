import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Ensure window is defined before accessing document
const rootElement = document.getElementById("root");

// Only render if root element exists
if (rootElement) {
  // Always render the app without ClerkProvider for now
  // Clerk auth can be added later when properly configured
  createRoot(rootElement).render(
    <StrictMode>
      <App />
    </StrictMode>
  );
}
