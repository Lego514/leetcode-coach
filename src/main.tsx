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
import { openDemoFromLink } from './store/demo';
import { initInstallPrompt } from './store/install';
import 'dsa-whiteboard/board.css';
import './styles.css';

void initMonitoring();
initInstallPrompt();
applyTheme();
applyLogo();
applyLocaleToDocument();
// README、履歷上的試用連結（…/?demo）：空的瀏覽器直接看到示範資料
void openDemoFromLink();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

void initCloud();
initPwaUpdates();
