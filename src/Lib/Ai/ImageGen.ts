import Replicate from 'replicate';

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN!,
});

export async function generateCoverImage(topic: string): Promise<string> {
  const prompt = [
    `Minimal, soft illustration for a quiz about "${topic}".`,
    'Warm pastel colors, organic shapes, paper-like texture.',
    'No text, no letters, no words. Abstract and calm.',
  ].join(' ');

  const output = await replicate.run('openai/gpt-image-2', {
    input: {
      prompt,
      aspect_ratio: '1:1',
      quality: 'low',
      number_of_images: 1,
      output_format: 'webp',
    },
  });

  const result = output as unknown[];
  if (!result?.[0]) throw new Error('No image URL in response');

  return String(result[0]);
}
