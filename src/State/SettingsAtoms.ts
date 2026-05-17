import { atom } from 'jotai';
import { getMuted, setMuted } from '@/Features/Shared/Sound';
import { getHapticEnabled, setHapticEnabled } from '@/Features/Shared/Haptic';

const baseSoundMutedAtom = atom(
  typeof window !== 'undefined' ? getMuted() : false,
);

export const soundMutedAtom = atom(
  (get) => get(baseSoundMutedAtom),
  (_get, set, value: boolean) => {
    setMuted(value);
    set(baseSoundMutedAtom, value);
  },
);

const baseHapticEnabledAtom = atom(
  typeof window !== 'undefined' ? getHapticEnabled() : true,
);

export const hapticEnabledAtom = atom(
  (get) => get(baseHapticEnabledAtom),
  (_get, set, value: boolean) => {
    setHapticEnabled(value);
    set(baseHapticEnabledAtom, value);
  },
);

export const settingsOpenAtom = atom(false);
