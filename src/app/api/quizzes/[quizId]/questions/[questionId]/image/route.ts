import { NextResponse } from 'next/server';
import { generateQuestionImage } from '@/Lib/Ai/ImageGen';
import { runMigrations } from '@/Lib/Db/Migrate';
import { updateQuestion } from '@/Lib/Db/Queries';

interface Params {
  params: Promise<{ quizId: string; questionId: string }>;
}

export async function POST(req: Request, { params }: Params) {
  await runMigrations();

  const { questionId } = await params;
  const { imagePrompt } = await req.json() as { imagePrompt?: string };
  const prompt = imagePrompt?.trim();

  if (!prompt) {
    return NextResponse.json({ error: 'imagePrompt is required' }, { status: 400 });
  }

  const imageUrl = await generateQuestionImage(prompt);
  const updated = await updateQuestion(questionId, {
    imagePrompt: prompt,
    imageUrl,
  });

  if (!updated) {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }

  return NextResponse.json(updated);
}
