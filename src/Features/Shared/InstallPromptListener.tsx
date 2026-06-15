'use client';

import { useEffect } from 'react';
import { ensureInstallListener } from './UseInstallPrompt';

// Mounted at the layout level so the `beforeinstallprompt` event is captured on
// first load, regardless of which screen the user lands on. Renders nothing.
export default function InstallPromptListener() {
  useEffect(() => {
    ensureInstallListener();
  }, []);
  return null;
}
