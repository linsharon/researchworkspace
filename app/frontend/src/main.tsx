import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { loadRuntimeConfig } from './lib/config.ts';
import { initializeAuthSession } from './lib/session.ts';

initializeAuthSession();

// Render immediately to avoid white screen if runtime config endpoint is slow/offline.
createRoot(document.getElementById('root')!).render(<App />);

// Load runtime configuration in background.
loadRuntimeConfig().catch((error) => {
  console.warn('Failed to load runtime configuration, using defaults:', error);
});
