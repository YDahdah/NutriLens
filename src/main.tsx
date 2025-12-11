import { createRoot } from "react-dom/client";
import { GoogleOAuthProvider } from "@react-oauth/google";
import App from "./App.tsx";
import "./index.css";

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

// Suppress Cross-Origin-Opener-Policy warnings from Google OAuth library
// These occur when the library checks window.closed even in redirect mode
const isCOOPError = (message: string): boolean => {
  return message.includes('Cross-Origin-Opener-Policy') && 
         (message.includes('window.closed') || message.includes('policy would block'));
};

// Suppress console methods for COOP errors
const originalError = console.error;
const originalWarn = console.warn;
const originalLog = console.log;

console.error = (...args: any[]) => {
  const message = args[0]?.toString() || '';
  if (isCOOPError(message)) {
    return;
  }
  originalError.apply(console, args);
};

console.warn = (...args: any[]) => {
  const message = args[0]?.toString() || '';
  if (isCOOPError(message)) {
    return;
  }
  originalWarn.apply(console, args);
};

console.log = (...args: any[]) => {
  const message = args[0]?.toString() || '';
  if (isCOOPError(message)) {
    return;
  }
  originalLog.apply(console, args);
};

// Suppress unhandled errors and promise rejections related to COOP
if (typeof window !== 'undefined') {
  const originalOnError = window.onerror;
  window.onerror = (message, source, lineno, colno, error) => {
    const messageStr = String(message || '');
    if (isCOOPError(messageStr)) {
      return true; // Suppress the error
    }
    if (originalOnError) {
      return originalOnError.call(window, message, source, lineno, colno, error);
    }
    return false;
  };

  window.addEventListener('unhandledrejection', (event) => {
    const message = String(event.reason?.message || event.reason || '');
    if (isCOOPError(message)) {
      event.preventDefault();
    }
  });
}

// Register service worker for PWA
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        console.log('Service Worker registered:', registration);
      })
      .catch((error) => {
        console.log('Service Worker registration failed:', error);
      });
  });
}

createRoot(document.getElementById("root")!).render(
  <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID || ''}>
    <App />
  </GoogleOAuthProvider>
);
