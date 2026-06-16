import { NextResponse } from 'next/server';
import { env } from '@/Lib/Env';
import { clientIp, enforceRateLimit } from '@/Lib/RateLimit';
import { MAX_HOST_TEXT_LENGTH, TTS_TIMEOUT_MS } from '@/Lib/Constants';

// ElevenLabs "v3" is the `eleven_v3` model ID. The public TTS REST endpoints
// remain under `/v1/text-to-speech/...` per the official docs.
const DEFAULT_MODEL_ID = env.ELEVENLABS_MODEL_ID ?? 'eleven_v3';
// Hardcoded so a bad deploy-time env override cannot break the host voice.
const HOST_VOICE_ID = 'JBFqnCBsd6RMkjVDRZzb';

type HostAudioErrorStage =
  | 'request'
  | 'configuration'
  | 'upstream-request'
  | 'upstream-response';

interface HostAudioErrorBody {
  error: string;
  stage: HostAudioErrorStage;
  message: string;
  detail?: string;
}

export async function POST(req: Request) {
  // Public (anonymous players use host voice mid-game), so guard the paid TTS
  // provider with a per-IP rate limit instead of auth.
  const limited = await enforceRateLimit(`tts:${clientIp(req)}`, 40, 60_000);
  if (limited) return limited;

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return errorResponse(400, {
      error: 'invalid request body',
      stage: 'request',
      message: 'Host voice request body could not be parsed.',
      detail: 'Expected JSON with a non-empty text field.',
    });
  }

  const rawText = typeof body.text === 'string' ? body.text.trim() : '';
  if (!rawText) {
    return errorResponse(400, {
      error: 'text is required',
      stage: 'request',
      message: 'Host voice request text was empty.',
      detail: 'The audio endpoint needs a non-empty text string to generate speech.',
    });
  }
  // Cap the characters billed to the TTS provider on any single call.
  const text = rawText.slice(0, MAX_HOST_TEXT_LENGTH);

  const apiKey = env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    console.error('[host audio] ELEVENLABS_API_KEY is missing');
    return errorResponse(503, {
      error: 'voice unavailable',
      stage: 'configuration',
      message: 'Host voice is not configured on the server.',
      detail: 'ELEVENLABS_API_KEY is missing.',
    });
  }

  let upstream: Response;
  try {
    upstream = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${HOST_VOICE_ID}/stream`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'xi-api-key': apiKey,
          Accept: 'audio/mpeg',
        },
        body: JSON.stringify({
          text,
          model_id: DEFAULT_MODEL_ID,
          output_format: 'mp3_44100_128',
          voice_settings: {
            stability: body.prefetch ? 0.45 : 0.38,
            similarity_boost: 0.72,
            style: 0.35,
            use_speaker_boost: true,
          },
        }),
        signal: AbortSignal.timeout(TTS_TIMEOUT_MS),
      },
    );
  } catch (error: unknown) {
    const detail = formatErrorDetail(error);
    console.error('[host audio] failed to reach ElevenLabs', detail ?? 'unknown error');
    return errorResponse(502, {
      error: 'voice provider unreachable',
      stage: 'upstream-request',
      message: 'The server could not reach the voice provider.',
      detail,
    });
  }

  if (!upstream.ok || !upstream.body) {
    if (!upstream.ok) {
      const detail = formatUpstreamFailure(upstream, await readUpstreamError(upstream));
      console.error('[host audio] ElevenLabs rejected the request', detail);
      return errorResponse(502, {
        error: 'voice generation failed',
        stage: 'upstream-response',
        message: 'The voice provider rejected the host voice request.',
        detail,
      });
    }

    console.error('[host audio] ElevenLabs returned no response body');
    return errorResponse(502, {
      error: 'voice generation failed',
      stage: 'upstream-response',
      message: 'The voice provider returned no audio stream.',
      detail: 'The upstream response completed without an audio body.',
    });
  }

  return new Response(upstream.body, {
    status: 200,
    headers: {
      'Content-Type': 'audio/mpeg',
      'Cache-Control': body.prefetch
        ? 'private, max-age=600'
        : 'no-store',
    },
  });
}

function errorResponse(status: number, body: HostAudioErrorBody) {
  return NextResponse.json(body, { status });
}

async function readUpstreamError(upstream: Response): Promise<string | undefined> {
  const contentType = upstream.headers.get('content-type') ?? '';

  try {
    if (contentType.includes('application/json')) {
      const payload = await upstream.json();
      if (payload && typeof payload === 'object') {
        const detail =
          pickString(payload.detail)
          ?? pickString(payload.message)
          ?? pickString(payload.error);
        return detail?.trim() || undefined;
      }
    }

    const text = (await upstream.text()).trim();
    return text || undefined;
  } catch {
    return undefined;
  }
}

function pickString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function formatUpstreamFailure(upstream: Response, detail?: string): string {
  const status = `${upstream.status} ${upstream.statusText}`;
  if (!detail) return status;
  return `${status}: ${detail}`;
}

function formatErrorDetail(error: unknown): string | undefined {
  if (!(error instanceof Error)) return undefined;
  const message = error.message.trim();
  if (!message || message === error.name) return error.name;
  return `${error.name}: ${message}`;
}
