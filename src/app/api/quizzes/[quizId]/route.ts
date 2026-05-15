import { NextResponse } from 'next/server';
import { getQuiz, getQuestions, updateQuiz, deleteQuiz } from '@/Lib/Db/Queries';

interface Params {
  params: Promise<{ quizId: string }>;
}

export async function GET(_req: Request, { params }: Params) {
  const { quizId } = await params;
  const quiz = await getQuiz(quizId);

  if (!quiz) {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }

  const questions = await getQuestions(quizId);
  return NextResponse.json({ ...quiz, questions });
}

export async function PUT(req: Request, { params }: Params) {
  const { quizId } = await params;
  const body = await req.json();
  const updated = await updateQuiz(quizId, body);

  if (!updated) {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }

  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, { params }: Params) {
  const { quizId } = await params;
  await deleteQuiz(quizId);
  return NextResponse.json({ ok: true });
}
