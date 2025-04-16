import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Ensure window is defined before accessing document
const rootElement = document.getElementById("root");

// Only render if root element exists
if (rootElement) {
  createRoot(rootElement).render(<App />);
}
