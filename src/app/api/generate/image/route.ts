import { NextResponse } from 'next/server';
import { generateCoverImage } from '@/Lib/Ai/ImageGen';
import { getQuiz, updateQuiz } from '@/Lib/Db/Queries';
import { runMigrations } from '@/Lib/Db/Migrate';
import { getSessionUser } from '@/Lib/Auth/Session';

export async function POST(req: Request) {
  await runMigrations();

  const sessionUser = await getSessionUser(req);
  if (!sessionUser) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { quizId, topic } = await req.json();

  if (!quizId || !topic) {
    return NextResponse.json(
      { error: 'quizId and topic are required' },
      { status: 400 },
    );
  }

  const quiz = await getQuiz(quizId);
  if (!quiz) {
    return NextResponse.json({ error: 'Quiz not found' }, { status: 404 });
  }
  if (quiz.ownerId !== sessionUser.id) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const imageUrl = await generateCoverImage(topic);
  await updateQuiz(quizId, { coverImageUrl: imageUrl });

  return NextResponse.json({ coverImageUrl: imageUrl });
}
