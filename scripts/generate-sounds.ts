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
import { loadEnvConfig } from '@next/env';

// Pick up ELEVENLABS_API_KEY from .env.local like the app does.
loadEnvConfig(process.cwd());

interface SoundSpec {
  name: string;
  prompt: string;
  durationSeconds: number;
  promptInfluence?: number;
}

// Arcade-forward, high-"juice" SFX: punchy chiptune/8-bit synths with strong
// transients, the satisfying snap of a polished mobile arcade game.
const SOUNDS: SoundSpec[] = [
  {
    name: 'tap',
    prompt: 'Snappy arcade UI blip: a short bright 8-bit square-wave click with a punchy transient and tiny pitch pop, crisp and satisfying, retro video-game menu select, very short.',
    durationSeconds: 0.5,
    promptInfluence: 0.8,
  },
  {
    name: 'correct',
    prompt: 'Juicy arcade correct-answer chime: a fast bright ascending chiptune arpeggio with a coin-collect sparkle on top, punchy attack, rewarding and upbeat, classic retro video game power-up.',
    durationSeconds: 0.7,
    promptInfluence: 0.8,
  },
  {
    name: 'wrong',
    prompt: 'Arcade wrong-answer buzz: a short comedic descending chiptune bonk with a retro square-wave error blip, playful and bouncy, classic video-game miss, not harsh.',
    durationSeconds: 0.5,
    promptInfluence: 0.78,
  },
  {
    name: 'complete',
    prompt: 'Arcade level-complete jingle: an upbeat punchy chiptune victory fanfare, layered square-wave melody with a bright ascending finish and a sparkle tail, energetic 16-bit game stage clear.',
    durationSeconds: 1.2,
    promptInfluence: 0.78,
  },
  {
    name: 'newBest',
    prompt: 'Epic arcade high-score fanfare: a triumphant rising chiptune arpeggio with layered harmonies, shimmering 8-bit sparkles and a powerful punchy finish, celebratory premium retro-game new-record reward.',
    durationSeconds: 1.5,
    promptInfluence: 0.82,
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
