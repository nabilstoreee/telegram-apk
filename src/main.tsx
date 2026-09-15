import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { SettingsProvider } from './contexts/SettingsContext.tsx';
import './index.css';

// Client-side Security Shield: Disable right-click & DevTools shortcuts to prevent easy code scraping/inspection
if (process.env.NODE_ENV === 'production' || true) {
  // Disable Right Click
  document.addEventListener('contextmenu', (e) => {
    e.preventDefault();
  });

  // Disable F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+C, Ctrl+U, Ctrl+S
  document.addEventListener('keydown', (e) => {
    // Disable F12
    if (e.key === 'F12') {
      e.preventDefault();
      return false;
    }

    // Disable Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+C
    if (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J' || e.key === 'C' || e.key === 'i' || e.key === 'j' || e.key === 'c')) {
      e.preventDefault();
      return false;
    }

    // Disable Ctrl+U (View Source) and Ctrl+S (Save Page)
    if (e.ctrlKey && (e.key === 'U' || e.key === 'u' || e.key === 'S' || e.key === 's')) {
      e.preventDefault();
      return false;
    }
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SettingsProvider>
      <App />
    </SettingsProvider>
  </StrictMode>,
);

