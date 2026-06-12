import Replicate from 'replicate';
import { insertImage } from '@/Lib/Db/Queries';

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN!,
});

// Matches the app's neo-brutalist UI: thick black borders, flat saturated
// colors on cream (#fffdf5), hard offset shadows, sticker-like shapes.
const QUESTION_STYLE =
  'Bold neo-brutalist flat vector illustration: recognizable subject drawn with thick black outlines, flat saturated fills in coral red, sunshine yellow, lavender, lime green and cyan, on a plain cream off-white background, hard-edged sticker-like shapes with a solid black offset drop shadow. Playful poster art, no gradients, no soft shading, no photorealism. No text, letters, words, captions, or watermarks.';

const COVER_STYLE =
  'Bold neo-brutalist abstract poster: chunky geometric shapes with thick black outlines, flat saturated fills in coral red, sunshine yellow, lavender, lime green and cyan, on a cream off-white background, hard black offset shadows, sticker-collage feel. Flat graphic design, no gradients, no photorealism. No text, letters, or words.';

const SANITIZED_FALLBACK_STYLE =
  'Abstract symbolic neo-brutalist illustration evoking the theme: bold geometric shapes, thick black outlines, flat coral red, sunshine yellow, lavender, lime and cyan fills on a cream background, hard black offset shadows. No recognizable people, brands, characters, or logos. No gradients. No text or letters.';

export async function generateCoverImage(topic: string): Promise<string> {
  const prompt = `${COVER_STYLE} The quiz topic is "${topic}".`;
  return generateWithRetry(prompt, '1:1', { label: `cover:${truncate(topic, 60)}` });
}

export async function generateQuestionImage(description: string): Promise<string> {
  const prompt = `${description}. ${QUESTION_STYLE}`;
  return generateWithRetry(prompt, '1:1', { label: `q:${truncate(description, 80)}` });
}

interface GenerateOpts {
  label: string;
}

async function generateWithRetry(
  prompt: string,
  aspectRatio: string,
  opts: GenerateOpts,
): Promise<string> {
  try {
    return await runAndStore(prompt, aspectRatio);
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    console.warn(`[image] first attempt failed (${opts.label}): ${reason}`);

    try {
      // Drop the original description and fall back to style tokens only —
      // we can't reliably edit named entities out of arbitrary text, so this
      // sacrifices specificity to guarantee a non-rejected image.
      return await runAndStore(SANITIZED_FALLBACK_STYLE, aspectRatio);
    } catch (err2) {
      const reason2 = err2 instanceof Error ? err2.message : String(err2);
      console.warn(`[image] fallback also failed (${opts.label}): ${reason2}`);
      throw err2;
    }
  }
}

async function runAndStore(prompt: string, aspect_ratio: string): Promise<string> {
  const output = await replicate.run('openai/gpt-image-2', {
    input: {
      prompt,
      aspect_ratio,
      quality: 'low',
      number_of_images: 1,
      output_format: 'webp',
    },
  });

  const result = output as unknown[];
  if (!result?.[0]) throw new Error('No image URL in response');

  const replicateUrl = String(result[0]);
  const res = await fetch(replicateUrl);
  if (!res.ok) throw new Error(`Image fetch failed: ${res.status}`);

  const buffer = await res.arrayBuffer();
  const base64 = Buffer.from(buffer).toString('base64');
  const mimeType = res.headers.get('content-type') ?? 'image/webp';

  const id = crypto.randomUUID();
  await insertImage(id, base64, mimeType);
  return `/api/images/${id}`;
}

function truncate(s: string, n: number): string {
  return s.length <= n ? s : `${s.slice(0, n)}…`;
}
