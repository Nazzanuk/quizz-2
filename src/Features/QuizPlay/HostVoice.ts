import type { HostPersona } from '@/Lib/Types';
import { clearAudioIssue, reportAudioIssue } from '@/Lib/AudioDiagnostics';

const audioCache = new Map<string, AudioBuffer>();
const inflightAudio = new Map<string, Promise<AudioBuffer | null>>();
let voiceContext: AudioContext | null = null;
let voiceGain: GainNode | null = null;
let currentSource: AudioBufferSourceNode | null = null;
let pendingPlayback:
  | {
    text: string;
    hostPersona: HostPersona;
    prefetch?: boolean;
  }
  | null = null;
let playbackRequestId = 0;

const SLOW_VOICE_MS = 1200;
const VOICE_TIMEOUT_MS = 8000;
const PREVIEW_LINES: Record<HostPersona, string> = {
  sarcastic_pub_host: 'Right then. Voice check. If you can hear this, the quizmaster is awake.',
};

export async function primeHostVoice(): Promise<void> {
  const context = ensureVoiceContext();
  if (!context) {
    reportAudioIssue({
      code: 'voice-api-unavailable',
      channel: 'voice',
      level: 'error',
      message: 'Host voice is unavailable in this browser.',
    });
    return;
  }

  try {
    if (context.state === 'suspended') {
      await context.resume();
    }
    clearAudioIssue('voice-api-unavailable');
    clearAudioIssue('voice-playback-blocked');
  } catch (error: unknown) {
    reportAudioIssue({
      code: 'voice-playback-blocked',
      channel: 'voice',
      level: 'warning',
      message: 'Host voice is waiting for a tap before it can play.',
      detail: error instanceof Error ? error.name : undefined,
    });
  }
}

export async function prefetchHostVoice(
  text: string,
  hostPersona: HostPersona,
): Promise<void> {
  const key = cacheKey(text, hostPersona);
  if (audioCache.has(key)) return;

  const buffer = await fetchVoiceBuffer(text, hostPersona, true);
  if (buffer) audioCache.set(key, buffer);
}

export async function playHostVoice(args: {
  text: string;
  hostPersona: HostPersona;
  prefetch?: boolean;
}): Promise<void> {
  const requestId = ++playbackRequestId;
  const key = cacheKey(args.text, args.hostPersona);
  const cached = audioCache.get(key);
  const buffer = cached ?? await fetchVoiceBuffer(
    args.text,
    args.hostPersona,
    Boolean(args.prefetch),
  );
  if (!buffer || requestId !== playbackRequestId) return;
  if (!cached) audioCache.set(key, buffer);

  const context = ensureVoiceContext();
  if (!context || !voiceGain) {
    reportAudioIssue({
      code: 'voice-api-unavailable',
      channel: 'voice',
      level: 'error',
      message: 'Host voice is unavailable in this browser.',
    });
    return;
  }

  if (context.state !== 'running') {
    pendingPlayback = args;
    reportAudioIssue({
      code: 'voice-playback-blocked',
      channel: 'voice',
      level: 'warning',
      message: 'Host voice is waiting for a tap before it can play.',
    });
    void retryPendingPlayback(key);
    return;
  }

  stopHostVoice();

  try {
    const source = context.createBufferSource();
    source.buffer = buffer;
    source.connect(voiceGain);
    source.onended = () => {
      if (currentSource === source) {
        currentSource = null;
      }
    };
    source.start(0);
    currentSource = source;
    pendingPlayback = null;
    clearAudioIssue('voice-playback-blocked');
    clearAudioIssue('voice-playback-failed');
    clearAudioIssue('voice-api-unavailable');
  } catch (error: unknown) {
    reportAudioIssue({
      code: 'voice-playback-failed',
      channel: 'voice',
      level: 'error',
      message: 'Host voice failed to play.',
      detail: error instanceof Error ? error.name : undefined,
    });
  }
}

export function stopHostVoice(): void {
  if (!currentSource) return;
  currentSource.stop();
  currentSource.disconnect();
  currentSource = null;
}

export function notifyHostAudioInteraction(): void {
  void resumePendingPlayback();
}

export async function playHostVoicePreview(hostPersona: HostPersona): Promise<void> {
  await primeHostVoice();
  await playHostVoice({
    text: PREVIEW_LINES[hostPersona],
    hostPersona,
    prefetch: true,
  });
}

async function resumePendingPlayback(): Promise<void> {
  await primeHostVoice();
  if (!pendingPlayback) return;
  const playback = pendingPlayback;
  pendingPlayback = null;
  await playHostVoice(playback);
}

async function retryPendingPlayback(expectedKey: string): Promise<void> {
  await primeHostVoice();
  if (!pendingPlayback) return;

  const pendingKey = cacheKey(pendingPlayback.text, pendingPlayback.hostPersona);
  if (pendingKey !== expectedKey) return;

  const playback = pendingPlayback;
  pendingPlayback = null;
  await playHostVoice(playback);
}

async function fetchVoiceBuffer(
  text: string,
  hostPersona: HostPersona,
  prefetch: boolean,
): Promise<AudioBuffer | null> {
  const key = cacheKey(text, hostPersona);
  const inflight = inflightAudio.get(key);
  if (inflight) return inflight;

  const promise = fetchVoiceBufferInner(text, hostPersona, prefetch);
  inflightAudio.set(key, promise);
  const result = await promise;
  inflightAudio.delete(key);
  return result;
}

async function fetchVoiceBufferInner(
  text: string,
  hostPersona: HostPersona,
  prefetch: boolean,
): Promise<AudioBuffer | null> {
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
      clearAudioIssue('voice-generation-slow');
      return null;
    }
    const context = ensureVoiceContext();
    if (!context) {
      reportAudioIssue({
        code: 'voice-api-unavailable',
        channel: 'voice',
        level: 'error',
        message: 'Host voice is unavailable in this browser.',
      });
      clearAudioIssue('voice-generation-slow');
      return null;
    }
    const buffer = await response.arrayBuffer();
    const decoded = await context.decodeAudioData(buffer.slice(0));
    clearAudioIssue('voice-generation-slow');
    clearAudioIssue('voice-generation-failed');
    if (performance.now() - startedAt <= SLOW_VOICE_MS) {
      clearAudioIssue('voice-generation-slow');
    }
    return decoded;
  } catch (error: unknown) {
    const detail = error instanceof Error ? error.name : 'request failed';
    reportAudioIssue({
      code: 'voice-generation-failed',
      channel: 'voice',
      level: 'error',
      message: 'Host voice failed to generate.',
      detail,
    });
    clearAudioIssue('voice-generation-slow');
    return null;
  } finally {
    window.clearTimeout(slowTimer);
  }
}

function ensureVoiceContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (voiceContext && voiceGain) return voiceContext;

  const Ctx = window.AudioContext ?? (
    window as unknown as { webkitAudioContext?: typeof AudioContext }
  ).webkitAudioContext;
  if (!Ctx) return null;

  voiceContext = new Ctx();
  voiceGain = voiceContext.createGain();
  voiceGain.gain.value = 1;
  voiceGain.connect(voiceContext.destination);
  return voiceContext;
}

function cacheKey(text: string, hostPersona: HostPersona): string {
  return `${hostPersona}:${text}`;
}
