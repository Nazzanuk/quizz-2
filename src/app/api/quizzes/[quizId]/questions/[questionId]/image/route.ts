import { NextResponse } from 'next/server';
import { generateQuestionImage } from '@/Lib/Ai/ImageGen';
import { runMigrations } from '@/Lib/Db/Migrate';
import { getQuiz, updateQuestion } from '@/Lib/Db/Queries';
import { getSessionUser } from '@/Lib/Auth/Session';
import { enforceRateLimit } from '@/Lib/RateLimit';

interface Params {
  params: Promise<{ quizId: string; questionId: string }>;
}

export async function POST(req: Request, { params }: Params) {
  await runMigrations();

  const { quizId, questionId } = await params;

  const sessionUser = await getSessionUser(req);
  if (!sessionUser) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const quiz = await getQuiz(quizId);
  if (!quiz) {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }
  if (quiz.ownerId !== sessionUser.id) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const limited = await enforceRateLimit(`gen:${sessionUser.id}`, 10, 60_000);
  if (limited) return limited;

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
