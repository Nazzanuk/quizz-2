import type { HostPersona } from '@/Lib/Types';
import { clearAudioIssue, reportAudioIssue } from '@/Lib/AudioDiagnostics';

const audioCache = new Map<string, string>();
const inflightAudio = new Map<string, Promise<string | null>>();
let currentAudio: HTMLAudioElement | null = null;
let pendingPlayback:
  | {
    text: string;
    hostPersona: HostPersona;
    prefetch?: boolean;
  }
  | null = null;

const SLOW_VOICE_MS = 1200;
const VOICE_TIMEOUT_MS = 8000;

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

  if (typeof Audio === 'undefined') {
    reportAudioIssue({
      code: 'voice-api-unavailable',
      channel: 'voice',
      level: 'error',
      message: 'Host voice is unavailable in this browser.',
    });
    return;
  }

  stopHostVoice();
  currentAudio = new Audio(src);
  currentAudio.preload = 'auto';
  currentAudio.play()
    .then(() => {
      pendingPlayback = null;
      clearAudioIssue('voice-playback-blocked');
      clearAudioIssue('voice-playback-failed');
      clearAudioIssue('voice-api-unavailable');
    })
    .catch((error: unknown) => {
      const message = error instanceof Error ? error.name : 'Audio playback error';
      const blocked = message === 'NotAllowedError';
      reportAudioIssue({
        code: blocked ? 'voice-playback-blocked' : 'voice-playback-failed',
        channel: 'voice',
        level: blocked ? 'warning' : 'error',
        message: blocked
          ? 'Host voice is waiting for a tap before it can play.'
          : 'Host voice failed to play.',
        detail: blocked ? undefined : message,
      });
      pendingPlayback = blocked ? args : null;
    });
}

export function stopHostVoice(): void {
  if (!currentAudio) return;
  currentAudio.pause();
  currentAudio.currentTime = 0;
  currentAudio = null;
}

export function notifyHostAudioInteraction(): void {
  if (!pendingPlayback) return;
  const playback = pendingPlayback;
  pendingPlayback = null;
  void playHostVoice(playback);
}

async function fetchVoiceBlobUrl(
  text: string,
  hostPersona: HostPersona,
  prefetch: boolean,
): Promise<string | null> {
  const key = cacheKey(text, hostPersona);
  const inflight = inflightAudio.get(key);
  if (inflight) return inflight;

  const promise = fetchVoiceBlobUrlInner(text, hostPersona, prefetch);
  inflightAudio.set(key, promise);
  const result = await promise;
  inflightAudio.delete(key);
  return result;
}

async function fetchVoiceBlobUrlInner(
  text: string,
  hostPersona: HostPersona,
  prefetch: boolean,
): Promise<string | null> {
  const startedAt = performance.now();
  const timeout = AbortSignal.timeout(VOICE_TIMEOUT_MS);
  const slowTimer = window.setTimeout(() => {
    reportAudioIssue({
      code: 'voice-generation-slow',
      channel: 'voice',
      level: 'warning',
      message: 'Host voice is taking a little longer than usual.',
    });
  }, SLOW_VOICE_MS);

  try {
    const response = await fetch('/api/host/audio', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: timeout,
      body: JSON.stringify({
        text,
        hostPersona,
        prefetch,
      }),
    });

    if (!response.ok) {
      reportAudioIssue({
        code: 'voice-generation-failed',
        channel: 'voice',
        level: 'error',
        message: 'Host voice failed to generate.',
        detail: `${response.status} ${response.statusText}`,
      });
      return null;
    }
    const blob = await response.blob();
    if (performance.now() - startedAt <= SLOW_VOICE_MS) {
      clearAudioIssue('voice-generation-slow');
    }
    clearAudioIssue('voice-generation-failed');
    return URL.createObjectURL(blob);
  } catch (error: unknown) {
    const detail = error instanceof Error ? error.name : 'request failed';
    reportAudioIssue({
      code: 'voice-generation-failed',
      channel: 'voice',
      level: 'error',
      message: 'Host voice failed to generate.',
      detail,
    });
    return null;
  } finally {
    window.clearTimeout(slowTimer);
  }
}

function cacheKey(text: string, hostPersona: HostPersona): string {
  return `${hostPersona}:${text}`;
}
