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

  const output = await replicate.run('openai/gpt-image-1', {
    input: {
      prompt,
      size: '1024x1024',
      quality: 'low',
      n: 1,
    },
  });

  const result = output as { url: string }[];
  if (!result?.[0]?.url) {
    throw new Error('No image URL in response');
  }

  return result[0].url;
}
