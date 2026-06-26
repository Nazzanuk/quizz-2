'use client';

import { useEffect } from 'react';
import { useAtomValue } from 'jotai';
import { largeTextAtom, reduceMotionAtom } from '@/State/SettingsAtoms';

// Mirrors the large-text / reduce-motion preferences onto <html> as data
// attributes so plain CSS in globals.css can react to them. A matching inline
// script in the layout sets these before first paint (no flash); this keeps
// them in sync when the toggles change at runtime. Renders nothing.
export default function PreferencesSync() {
  const largeText = useAtomValue(largeTextAtom);
  const reduceMotion = useAtomValue(reduceMotionAtom);

  useEffect(() => {
    const el = document.documentElement;
    if (largeText) el.dataset.largeText = 'true';
    else delete el.dataset.largeText;
  }, [largeText]);

  useEffect(() => {
    const el = document.documentElement;
    if (reduceMotion) el.dataset.reduceMotion = 'true';
    else delete el.dataset.reduceMotion;
  }, [reduceMotion]);

  return null;
}
