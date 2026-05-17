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
    prompt: 'Soft, short UI tap sound. Single subtle click. Minimal, clean.',
    durationSeconds: 0.3,
    promptInfluence: 0.4,
  },
  {
    name: 'correct',
    prompt: 'Bright pleasant chime confirming a correct answer. Two ascending notes, warm and rewarding.',
    durationSeconds: 0.6,
    promptInfluence: 0.35,
  },
  {
    name: 'wrong',
    prompt: 'Gentle low buzz indicating an incorrect answer. Soft and short, not harsh or punishing.',
    durationSeconds: 0.5,
    promptInfluence: 0.4,
  },
  {
    name: 'complete',
    prompt: 'Short warm fanfare celebrating quiz completion. Triumphant but compact, ending on a major chord.',
    durationSeconds: 1.2,
    promptInfluence: 0.4,
  },
  {
    name: 'newBest',
    prompt: 'Exciting sparkling celebration sound for a new high score. Upbeat ascending arpeggio with bell-like shimmer.',
    durationSeconds: 1.4,
    promptInfluence: 0.4,
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
