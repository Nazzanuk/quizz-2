import { NextResponse } from 'next/server';
import {
  deleteQuestion,
  getQuiz,
  getQuestions,
  updateQuestion,
  updateQuiz,
} from '@/Lib/Db/Queries';
import { runMigrations } from '@/Lib/Db/Migrate';
import { getSessionUser } from '@/Lib/Auth/Session';

interface Params {
  params: Promise<{ quizId: string; questionId: string }>;
}

export async function PUT(req: Request, { params }: Params) {
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

  const body = await req.json();
  const updated = await updateQuestion(questionId, body);

  if (!updated) {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }

  return NextResponse.json(updated);
}

export async function DELETE(req: Request, { params }: Params) {
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

  await deleteQuestion(questionId);
  // Keep the quiz's cached count in sync with what's actually stored.
  const remaining = await getQuestions(quizId);
  await updateQuiz(quizId, { questionCount: remaining.length });
  return NextResponse.json({ ok: true });
}
