/**
 * Generates the app's UI sound effects via the ElevenLabs Sound Effects API
 * and writes them to public/sounds/.
 *
 * Usage:
 *   ELEVENLABS_API_KEY=sk_... npx tsx scripts/generate-sounds.ts
 *
 * Re-run any time to regenerate; existing files are overwritten.
 */

import { writeFile, mkdir } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';

interface SoundSpec {
  name: string;
  prompt: string;
  durationSeconds: number;
  promptInfluence?: number;
}

const SOUNDS: SoundSpec[] = [
  {
    name: 'tap',
    prompt: 'Juicy tactile mobile game tap. Soft rounded click with a tiny pop, clean and satisfying, very short, no harsh attack.',
    durationSeconds: 0.5,
    promptInfluence: 0.55,
  },
  {
    name: 'correct',
    prompt: 'Juicy arcade correct answer sound. Bright pop into a fast two-note ascending sparkle, warm, rewarding, playful, polished mobile game feel.',
    durationSeconds: 0.7,
    promptInfluence: 0.6,
  },
  {
    name: 'wrong',
    prompt: 'Playful wrong answer sound for a polished quiz game. Short soft descending bloop with a tiny rubbery bonk, gentle and light, not punishing or buzzy.',
    durationSeconds: 0.55,
    promptInfluence: 0.58,
  },
  {
    name: 'complete',
    prompt: 'Compact mobile game completion stinger. Energetic celebratory fanfare with bright layered chimes, confident finish, punchy and polished, under two seconds.',
    durationSeconds: 1.1,
    promptInfluence: 0.58,
  },
  {
    name: 'newBest',
    prompt: 'Big juicy new high score celebration for a mobile quiz game. Punchy rising arpeggio, sparkling shimmer tail, exciting but classy, premium arcade reward.',
    durationSeconds: 1.35,
    promptInfluence: 0.62,
  },
];

const API_KEY = process.env.ELEVENLABS_API_KEY;
const OUT_DIR = resolve(process.cwd(), 'public', 'sounds');
const ENDPOINT = 'https://api.elevenlabs.io/v1/sound-generation';

async function generateOne(spec: SoundSpec): Promise<void> {
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      'xi-api-key': API_KEY!,
      'Content-Type': 'application/json',
      Accept: 'audio/mpeg',
    },
    body: JSON.stringify({
      text: spec.prompt,
      duration_seconds: spec.durationSeconds,
      prompt_influence: spec.promptInfluence ?? 0.3,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`ElevenLabs ${res.status} for ${spec.name}: ${body}`);
  }

  const buffer = Buffer.from(await res.arrayBuffer());
  const outPath = resolve(OUT_DIR, `${spec.name}.mp3`);
  await mkdir(dirname(outPath), { recursive: true });
  await writeFile(outPath, buffer);
  console.log(`✓ ${spec.name}.mp3 (${(buffer.length / 1024).toFixed(1)} KB)`);
}

async function main() {
  if (!API_KEY) {
    console.error('Missing ELEVENLABS_API_KEY env var.');
    process.exit(1);
  }
  console.log(`Generating ${SOUNDS.length} sounds → ${OUT_DIR}`);
  for (const spec of SOUNDS) {
    await generateOne(spec);
  }
  console.log('Done.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
