import { NextResponse } from 'next/server';

// ElevenLabs "v3" is the `eleven_v3` model ID. The public TTS REST endpoints
// remain under `/v1/text-to-speech/...` per the official docs.
const DEFAULT_MODEL_ID = process.env.ELEVENLABS_MODEL_ID ?? 'eleven_v3';
// Official ElevenLabs quickstart example voice: "George"
const DEFAULT_VOICE_ID = process.env.ELEVENLABS_VOICE_ID ?? 'JBFqnCBsd6RMkjVDRZzb';
const PUB_HOST_VOICE_ID = process.env.ELEVENLABS_VOICE_ID_SARCASTIC_PUB_HOST ?? DEFAULT_VOICE_ID;

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const text = typeof body.text === 'string' ? body.text.trim() : '';
  if (!text) {
    return NextResponse.json({ error: 'text is required' }, { status: 400 });
  }

  const apiKey = process.env.ELEVENLABS_API_KEY;
  const voiceId = resolveVoiceId(body.hostPersona);
  if (!apiKey || !voiceId) {
    return NextResponse.json({ error: 'voice unavailable' }, { status: 503 });
  }

  const upstream = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream`,
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
    },
  );

  if (!upstream.ok || !upstream.body) {
    return NextResponse.json({ error: 'voice generation failed' }, { status: 502 });
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

function resolveVoiceId(hostPersona: unknown): string {
  if (hostPersona === 'sarcastic_pub_host') return PUB_HOST_VOICE_ID;
  return DEFAULT_VOICE_ID;
}
