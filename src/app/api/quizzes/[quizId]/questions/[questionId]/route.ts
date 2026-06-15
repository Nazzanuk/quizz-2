import { NextResponse } from 'next/server';
import {
  deleteQuestion,
  getQuestions,
  updateQuestion,
  updateQuiz,
} from '@/Lib/Db/Queries';
import { runMigrations } from '@/Lib/Db/Migrate';

interface Params {
  params: Promise<{ quizId: string; questionId: string }>;
}

export async function PUT(req: Request, { params }: Params) {
  await runMigrations();
  const { questionId } = await params;
  const body = await req.json();
  const updated = await updateQuestion(questionId, body);

  if (!updated) {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }

  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, { params }: Params) {
  await runMigrations();
  const { quizId, questionId } = await params;
  await deleteQuestion(questionId);
  // Keep the quiz's cached count in sync with what's actually stored.
  const remaining = await getQuestions(quizId);
  await updateQuiz(quizId, { questionCount: remaining.length });
  return NextResponse.json({ ok: true });
}
