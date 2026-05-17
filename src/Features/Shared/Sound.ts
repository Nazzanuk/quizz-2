export type SoundName = 'tap' | 'correct' | 'wrong' | 'complete' | 'newBest';

const SOUND_NAMES: SoundName[] = ['tap', 'correct', 'wrong', 'complete', 'newBest'];
const STORAGE_KEY = 'quizz.soundMuted';
const VOLUME = 0.5;

let ctx: AudioContext | null = null;
let masterGain: GainNode | null = null;
let muted = false;
let primed = false;
let loaded = false;
const buffers = new Map<SoundName, AudioBuffer>();

if (typeof window !== 'undefined') {
  muted = localStorage.getItem(STORAGE_KEY) === '1';
}

export async function primeAudio(): Promise<void> {
  if (primed || typeof window === 'undefined') return;
  primed = true;

  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
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

    await loadAllSounds();
  } catch {
    // Audio unavailable — playSound becomes no-op
  }
}

async function loadAllSounds(): Promise<void> {
  if (!ctx || loaded) return;
  loaded = true;

  await Promise.all(
    SOUND_NAMES.map(async (name) => {
      try {
        const res = await fetch(`/sounds/${name}.mp3`);
        if (!res.ok) return;
        const arr = await res.arrayBuffer();
        const buffer = await ctx!.decodeAudioData(arr);
        buffers.set(name, buffer);
      } catch {
        // missing or undecodable — skip
      }
    }),
  );
}

export function playSound(name: SoundName): void {
  if (muted || !ctx || !masterGain) return;
  if (typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const buffer = buffers.get(name);
  if (!buffer) return;

  if (ctx.state === 'suspended') {
    ctx.resume().catch(() => {});
  }

  const src = ctx.createBufferSource();
  src.buffer = buffer;
  src.connect(masterGain);
  src.start(0);
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
