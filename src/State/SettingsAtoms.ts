import { atom } from 'jotai';
import { getMuted, setMuted } from '@/Features/Shared/Sound';
import { getHapticEnabled, setHapticEnabled } from '@/Features/Shared/Haptic';
import {
  getPlayerProfile,
  setPlayerHostMode,
  setPlayerHideTextUi,
  setPlayerHostVoiceEnabled,
  setPlayerReadQuestionsAloud,
} from '@/Lib/PlayerProfile';
import type { HostMode } from '@/Lib/Types';

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

const baseHostVoiceEnabledAtom = atom(
  typeof window !== 'undefined' ? getPlayerProfile().hostVoiceEnabled : true,
);

export const hostVoiceEnabledAtom = atom(
  (get) => get(baseHostVoiceEnabledAtom),
  (_get, set, value: boolean) => {
    setPlayerHostVoiceEnabled(value);
    set(baseHostVoiceEnabledAtom, value);
  },
);

const baseHideTextUiAtom = atom(
  typeof window !== 'undefined' ? getPlayerProfile().hideTextUi : true,
);

export const hideTextUiAtom = atom(
  (get) => get(baseHideTextUiAtom),
  (_get, set, value: boolean) => {
    setPlayerHideTextUi(value);
    set(baseHideTextUiAtom, value);
  },
);

const baseReadQuestionsAloudAtom = atom(
  typeof window !== 'undefined' ? getPlayerProfile().readQuestionsAloud : true,
);

export const readQuestionsAloudAtom = atom(
  (get) => get(baseReadQuestionsAloudAtom),
  (_get, set, value: boolean) => {
    setPlayerReadQuestionsAloud(value);
    set(baseReadQuestionsAloudAtom, value);
  },
);

const baseHostModeAtom = atom<HostMode>(
  typeof window !== 'undefined' ? getPlayerProfile().preferredMode : 'quick',
);

export const hostModeAtom = atom(
  (get) => get(baseHostModeAtom),
  (_get, set, value: HostMode) => {
    setPlayerHostMode(value);
    set(baseHostModeAtom, value);
  },
);

export const settingsOpenAtom = atom(false);
