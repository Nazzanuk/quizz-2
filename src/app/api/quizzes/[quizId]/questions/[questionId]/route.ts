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
import {
  MAX_ANSWER_TEXT_LENGTH,
  MAX_OPTIONS_COUNT,
  MAX_OPTION_LENGTH,
  MAX_QUESTION_TEXT_LENGTH,
} from '@/Lib/Constants';

interface Params {
  params: Promise<{ quizId: string; questionId: string }>;
}

interface QuestionPatch {
  questionText?: string;
  answerText?: string;
  options?: string[];
  imagePrompt?: string | null;
}

// Whitelist + bound the editable fields. Anything else in the body is ignored,
// and over-long strings are clamped rather than written to the DB unbounded.
function sanitizeQuestionPatch(body: unknown): QuestionPatch | null {
  if (!body || typeof body !== 'object') return null;
  const input = body as Record<string, unknown>;
  const patch: QuestionPatch = {};

  if (typeof input.questionText === 'string') {
    patch.questionText = input.questionText.slice(0, MAX_QUESTION_TEXT_LENGTH);
  }
  if (typeof input.answerText === 'string') {
    patch.answerText = input.answerText.slice(0, MAX_ANSWER_TEXT_LENGTH);
  }
  if (Array.isArray(input.options)) {
    patch.options = input.options
      .filter((option): option is string => typeof option === 'string')
      .slice(0, MAX_OPTIONS_COUNT)
      .map((option) => option.slice(0, MAX_OPTION_LENGTH));
  }
  if (typeof input.imagePrompt === 'string') {
    patch.imagePrompt = input.imagePrompt.slice(0, MAX_QUESTION_TEXT_LENGTH);
  } else if (input.imagePrompt === null) {
    patch.imagePrompt = null;
  }

  return patch;
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

  const patch = sanitizeQuestionPatch(await req.json().catch(() => null));
  if (!patch) {
    return NextResponse.json({ error: 'invalid body' }, { status: 400 });
  }
  const updated = await updateQuestion(questionId, patch);

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
