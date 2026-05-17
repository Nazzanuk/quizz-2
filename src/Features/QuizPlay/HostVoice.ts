import type { HostPersona } from '@/Lib/Types';

const audioCache = new Map<string, string>();
let currentAudio: HTMLAudioElement | null = null;

export async function prefetchHostVoice(
  text: string,
  hostPersona: HostPersona,
): Promise<void> {
  const key = cacheKey(text, hostPersona);
  if (audioCache.has(key)) return;

  const src = await fetchVoiceBlobUrl(text, hostPersona, true);
  if (src) audioCache.set(key, src);
}

export async function playHostVoice(args: {
  text: string;
  hostPersona: HostPersona;
  prefetch?: boolean;
}): Promise<void> {
  const key = cacheKey(args.text, args.hostPersona);
  const cached = audioCache.get(key);
  const src = cached ?? await fetchVoiceBlobUrl(args.text, args.hostPersona, Boolean(args.prefetch));
  if (!src) return;
  if (!cached) audioCache.set(key, src);

  stopHostVoice();
  currentAudio = new Audio(src);
  currentAudio.preload = 'auto';
  currentAudio.play().catch(() => {});
}

export function stopHostVoice(): void {
  if (!currentAudio) return;
  currentAudio.pause();
  currentAudio.currentTime = 0;
  currentAudio = null;
}

async function fetchVoiceBlobUrl(
  text: string,
  hostPersona: HostPersona,
  prefetch: boolean,
): Promise<string | null> {
  try {
    const response = await fetch('/api/host/audio', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text,
        hostPersona,
        prefetch,
      }),
    });

    if (!response.ok) return null;
    const blob = await response.blob();
    return URL.createObjectURL(blob);
  } catch {
    return null;
  }
}

function cacheKey(text: string, hostPersona: HostPersona): string {
  return `${hostPersona}:${text}`;
}
