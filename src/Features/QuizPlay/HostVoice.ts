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
const VOICE_GENERATION_ISSUE_CODES = [
  'voice-generation-slow',
  'voice-generation-failed',
  'voice-generation-timeout',
  'voice-generation-config-missing',
  'voice-generation-provider-unreachable',
  'voice-generation-provider-rejected',
  'voice-generation-request-invalid',
  'voice-generation-empty-audio',
  'voice-generation-decode-failed',
] as const;
const PREVIEW_LINES: Record<HostPersona, string> = {
  sarcastic_pub_host: 'Right then. Voice check. If you can hear this, the quizmaster is awake.',
};

interface HostAudioErrorPayload {
  stage?: string;
  message?: string;
  detail?: string;
}

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
  const timeout = createTimeoutController(VOICE_TIMEOUT_MS);
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
      signal: timeout.signal,
      body: JSON.stringify({
        text,
        hostPersona,
        prefetch,
      }),
    });

    if (!response.ok) {
      const failure = await readHostAudioError(response);
      return reportVoiceGenerationFailure(failure);
    }

    const context = ensureVoiceContext();
    if (!context) {
      reportAudioIssue({
        code: 'voice-api-unavailable',
        channel: 'voice',
        level: 'error',
        message: 'Host voice is unavailable in this browser.',
      });
      return null;
    }

    const buffer = await response.arrayBuffer();
    if (buffer.byteLength === 0) {
      return reportVoiceGenerationFailure({
        code: 'voice-generation-empty-audio',
        message: 'Host voice was generated without any audio data.',
        detail: 'The audio endpoint returned an empty response body.',
      });
    }

    let decoded: AudioBuffer;
    try {
      decoded = await context.decodeAudioData(buffer.slice(0));
    } catch (error: unknown) {
      return reportVoiceGenerationFailure({
        code: 'voice-generation-decode-failed',
        message: 'Host voice was generated, but this browser could not decode it.',
        detail: formatErrorDetail(error) ?? 'decodeAudioData failed for the returned audio stream.',
      });
    }

    clearVoiceGenerationIssues();
    if (performance.now() - startedAt <= SLOW_VOICE_MS) {
      clearAudioIssue('voice-generation-slow');
    }

    return decoded;
  } catch (error: unknown) {
    if (timeout.didTimeout()) {
      return reportVoiceGenerationFailure({
        code: 'voice-generation-timeout',
        message: 'Host voice request timed out.',
        detail: `The server did not respond within ${VOICE_TIMEOUT_MS / 1000} seconds.`,
      });
    }

    return reportVoiceGenerationFailure({
      code: 'voice-generation-failed',
      message: 'Host voice request could not be completed.',
      detail: formatErrorDetail(error) ?? 'The browser could not reach the audio endpoint.',
    });
  } finally {
    window.clearTimeout(slowTimer);
    timeout.cancel();
    clearAudioIssue('voice-generation-slow');
  }
}

function clearVoiceGenerationIssues(): void {
  VOICE_GENERATION_ISSUE_CODES.forEach(clearAudioIssue);
}

function reportVoiceGenerationFailure(issue: {
  code: string;
  message: string;
  detail?: string;
}): null {
  clearVoiceGenerationIssues();
  reportAudioIssue({
    code: issue.code,
    channel: 'voice',
    level: 'error',
    message: issue.message,
    detail: issue.detail,
  });
  return null;
}

async function readHostAudioError(response: Response): Promise<{
  code: string;
  message: string;
  detail?: string;
}> {
  const statusDetail = `${response.status} ${response.statusText}`;
  const fallback = {
    code: 'voice-generation-failed',
    message: 'Host voice failed to generate.',
    detail: statusDetail,
  };

  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json')) {
    return fallback;
  }

  try {
    const payload = await response.json() as HostAudioErrorPayload;
    const message = typeof payload.message === 'string' && payload.message.trim()
      ? payload.message.trim()
      : fallback.message;
    const detail = typeof payload.detail === 'string' && payload.detail.trim()
      ? payload.detail.trim()
      : statusDetail;
    return {
      code: mapHostAudioErrorCode(payload.stage),
      message,
      detail,
    };
  } catch {
    return fallback;
  }
}

function mapHostAudioErrorCode(stage?: string): string {
  switch (stage) {
    case 'configuration':
      return 'voice-generation-config-missing';
    case 'request':
      return 'voice-generation-request-invalid';
    case 'upstream-request':
      return 'voice-generation-provider-unreachable';
    case 'upstream-response':
      return 'voice-generation-provider-rejected';
    default:
      return 'voice-generation-failed';
  }
}

function formatErrorDetail(error: unknown): string | undefined {
  if (!(error instanceof Error)) return undefined;
  const message = error.message.trim();
  if (!message || message === error.name) return error.name;
  return `${error.name}: ${message}`;
}

function createTimeoutController(timeoutMs: number): {
  signal: AbortSignal;
  didTimeout: () => boolean;
  cancel: () => void;
} {
  const controller = new AbortController();
  let timedOut = false;
  const timerId = window.setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);

  return {
    signal: controller.signal,
    didTimeout: () => timedOut,
    cancel: () => window.clearTimeout(timerId),
  };
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
