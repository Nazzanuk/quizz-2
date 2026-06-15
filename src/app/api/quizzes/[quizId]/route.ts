import { NextResponse } from 'next/server';
import { getQuiz, getQuestions, updateQuiz, deleteQuiz } from '@/Lib/Db/Queries';
import { runMigrations } from '@/Lib/Db/Migrate';
import { getSessionUser } from '@/Lib/Auth/Session';
import { isQuizVisibility, type Quiz } from '@/Lib/Types';

interface Params {
  params: Promise<{ quizId: string }>;
}

// Public read so shared links play without a login wall. 'private' quizzes are
// only visible to their owner; 'unlisted'/'public' are readable by anyone with
// the link.
export async function GET(req: Request, { params }: Params) {
  await runMigrations();
  const { quizId } = await params;
  const quiz = await getQuiz(quizId);

  if (!quiz) {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }

  if (quiz.visibility === 'private') {
    const sessionUser = await getSessionUser(req);
    if (!sessionUser || sessionUser.id !== quiz.ownerId) {
      // Don't leak existence of a private quiz.
      return NextResponse.json({ error: 'not found' }, { status: 404 });
    }
  }

  const questions = await getQuestions(quizId);
  return NextResponse.json({ ...quiz, questions });
}

export async function PUT(req: Request, { params }: Params) {
  await runMigrations();
  const { quizId } = await params;

  const sessionUser = await getSessionUser(req);
  if (!sessionUser) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const existing = await getQuiz(quizId);
  if (!existing) {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }
  if (existing.ownerId !== sessionUser.id) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));

  // Whitelist editable fields — never trust the raw body (prevents overwriting
  // ownerId, timestamps, etc. via mass assignment).
  const patch: Partial<Pick<Quiz, 'title' | 'description' | 'questionsPerRun' | 'visibility'>> = {};
  if (typeof body.title === 'string') patch.title = body.title;
  if (typeof body.description === 'string' || body.description === null) patch.description = body.description;
  if (typeof body.questionsPerRun === 'number' || body.questionsPerRun === null) {
    patch.questionsPerRun = body.questionsPerRun;
  }
  if (body.visibility !== undefined) {
    if (typeof body.visibility !== 'string' || !isQuizVisibility(body.visibility)) {
      return NextResponse.json({ error: 'invalid visibility' }, { status: 400 });
    }
    patch.visibility = body.visibility;
  }

  const updated = await updateQuiz(quizId, patch);

  if (!updated) {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }

  return NextResponse.json(updated);
}

export async function DELETE(req: Request, { params }: Params) {
  await runMigrations();
  const { quizId } = await params;

  const sessionUser = await getSessionUser(req);
  if (!sessionUser) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const existing = await getQuiz(quizId);
  if (!existing) {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }
  if (existing.ownerId !== sessionUser.id) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  await deleteQuiz(quizId);
  return NextResponse.json({ ok: true });
}
