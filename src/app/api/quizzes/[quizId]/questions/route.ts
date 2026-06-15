import { NextResponse } from 'next/server';
import { getQuiz, getQuestions, insertQuestions, updateQuiz } from '@/Lib/Db/Queries';
import { runMigrations } from '@/Lib/Db/Migrate';
import { getSessionUser } from '@/Lib/Auth/Session';
import type { Question } from '@/Lib/Types';

interface Params {
  params: Promise<{ quizId: string }>;
}

// Manually add a single blank question (not auto-generated). It lands as an
// editable draft seeded with placeholder options so it is immediately valid
// to play while the user fills in the real content on the edit screen.
export async function POST(req: Request, { params }: Params) {
  await runMigrations();
  const { quizId } = await params;

  const sessionUser = await getSessionUser(req);
  if (!sessionUser) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const quiz = await getQuiz(quizId);
  if (!quiz) return NextResponse.json({ error: 'not found' }, { status: 404 });
  if (quiz.ownerId !== sessionUser.id) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const existing = await getQuestions(quizId);
  const maxOrder = existing.reduce((m, q) => Math.max(m, q.order), -1);

  const id = crypto.randomUUID();
  const options = ['Correct answer', 'Option 2', 'Option 3', 'Option 4'];

  await insertQuestions([
    {
      id,
      quizId,
      questionText: 'New question',
      answerText: options[0],
      options,
      optionImages: null,
      imageUrl: null,
      imagePrompt: null,
      format: quiz.format,
      category: null,
      difficulty: null,
      explanation: null,
      factText: null,
      tags: null,
      order: maxOrder + 1,
    },
  ]);

  await updateQuiz(quizId, { questionCount: existing.length + 1 });

  const created: Question = {
    id,
    quizId,
    questionText: 'New question',
    answerText: options[0],
    options,
    optionImages: null,
    imageUrl: null,
    imagePrompt: null,
    format: quiz.format,
    category: null,
    difficulty: null,
    explanation: null,
    factText: null,
    tags: null,
    order: maxOrder + 1,
  };

  return NextResponse.json(created, { status: 201 });
}
