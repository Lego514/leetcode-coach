import '@fontsource-variable/jetbrains-mono';
import '@fontsource-variable/schibsted-grotesk';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { applyLocaleToDocument } from './i18n';
import { initMonitoring } from './lib/monitoring';
import { applyLogo } from './lib/logo';
import { applyTheme } from './lib/theme';
import { initPwaUpdates } from './pwa';
import { initCloud } from './store/cloud';
import { initInstallPrompt } from './store/install';
import 'dsa-whiteboard/board.css';
import './styles.css';

void initMonitoring();
initInstallPrompt();
applyTheme();
applyLogo();
applyLocaleToDocument();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

void initCloud();
initPwaUpdates();
