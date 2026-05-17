export type SoundName = 'tap' | 'correct' | 'wrong' | 'complete' | 'newBest';

import { clearAudioIssue, reportAudioIssue } from '@/Lib/AudioDiagnostics';

const SOUND_NAMES: SoundName[] = ['tap', 'correct', 'wrong', 'complete', 'newBest'];
const STORAGE_KEY = 'quizz.soundMuted';
const VOLUME = 0.5;

let ctx: AudioContext | null = null;
let masterGain: GainNode | null = null;
let muted = false;
let primed = false;
let loaded = false;
let loadPromise: Promise<void> | null = null;
const buffers = new Map<SoundName, AudioBuffer>();
const pendingSounds: SoundName[] = [];

if (typeof window !== 'undefined') {
  muted = localStorage.getItem(STORAGE_KEY) === '1';
}

export async function primeAudio(): Promise<void> {
  if (primed || typeof window === 'undefined') return;
  primed = true;

  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) {
      reportAudioIssue({
        code: 'sfx-api-unavailable',
        channel: 'sfx',
        level: 'error',
        message: 'Sound effects are unavailable in this browser.',
      });
      return;
    }
    ctx = new Ctx();
    masterGain = ctx.createGain();
    masterGain.gain.value = VOLUME;
    masterGain.connect(ctx.destination);

    // Unlock iOS — schedule a silent buffer
    const buf = ctx.createBuffer(1, 1, 22050);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.connect(masterGain);
    src.start(0);

    clearAudioIssue('sfx-api-unavailable');
    loadPromise = loadAllSounds();
    await loadPromise;
  } catch {
    reportAudioIssue({
      code: 'sfx-init-failed',
      channel: 'sfx',
      level: 'error',
      message: 'Sound effects failed to initialize.',
    });
  }
}

async function loadAllSounds(): Promise<void> {
  if (!ctx || loaded) return;
  loaded = true;

  let failedCount = 0;
  await Promise.all(
    SOUND_NAMES.map(async (name) => {
      try {
        const res = await fetch(`/sounds/${name}.mp3`);
        if (!res.ok) {
          failedCount += 1;
          return;
        }
        const arr = await res.arrayBuffer();
        const buffer = await ctx!.decodeAudioData(arr);
        buffers.set(name, buffer);
      } catch {
        failedCount += 1;
      }
    }),
  );

  if (failedCount > 0) {
    reportAudioIssue({
      code: 'sfx-files-missing',
      channel: 'sfx',
      level: 'warning',
      message: 'Some sound files failed to load.',
      detail: `${failedCount} file${failedCount === 1 ? '' : 's'} could not be decoded.`,
    });
  } else {
    clearAudioIssue('sfx-files-missing');
  }

  flushPendingSounds();
}

export function playSound(name: SoundName): void {
  if (muted) return;

  if (!ctx || !masterGain) {
    queuePendingSound(name);
    void primeAudio();
    return;
  }

  const buffer = buffers.get(name);
  if (!buffer) {
    if (loadPromise) {
      queuePendingSound(name);
      void loadPromise.then(() => flushPendingSounds());
    } else if (loaded) {
      reportAudioIssue({
        code: 'sfx-buffer-missing',
        channel: 'sfx',
        level: 'warning',
        message: 'A sound effect was requested before it was ready.',
      });
    } else {
      queuePendingSound(name);
      void primeAudio();
    }
    return;
  }

  if (ctx.state === 'suspended') {
    ctx.resume().catch(() => {});
  }

  const src = ctx.createBufferSource();
  src.buffer = buffer;
  src.connect(masterGain);
  src.start(0);
  clearAudioIssue('sfx-buffer-missing');
  clearAudioIssue('sfx-init-failed');
}

export function getMuted(): boolean {
  return muted;
}

export function setMuted(value: boolean): void {
  muted = value;
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, value ? '1' : '0');
  }
}

function queuePendingSound(name: SoundName): void {
  pendingSounds.push(name);
}

function flushPendingSounds(): void {
  if (!ctx || !masterGain || pendingSounds.length === 0) return;
  const queue = pendingSounds.splice(0, pendingSounds.length);
  queue.forEach((name) => playSound(name));
}
