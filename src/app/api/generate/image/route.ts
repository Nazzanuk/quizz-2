import { NextResponse } from 'next/server';
import { generateCoverImage } from '@/Lib/Ai/ImageGen';
import { updateQuiz } from '@/Lib/Db/Queries';

export async function POST(req: Request) {
  const { quizId, topic } = await req.json();

  if (!quizId || !topic) {
    return NextResponse.json(
      { error: 'quizId and topic are required' },
      { status: 400 },
    );
  }

  const imageUrl = await generateCoverImage(topic);
  const updated = await updateQuiz(quizId, { coverImageUrl: imageUrl });

  if (!updated) {
    return NextResponse.json({ error: 'Quiz not found' }, { status: 404 });
  }

  return NextResponse.json({ coverImageUrl: imageUrl });
}
