import { NextResponse } from 'next/server';
import { generateQuiz } from '@/Lib/Ai/Gemini';
import { scheduleQuizImages } from '@/Lib/Ai/QuizImages';
import {
  getQuiz,
  getQuestions,
  insertQuestions,
  updateQuiz,
  getUserCredits,
  deductCredit,
  refundCredit,
} from '@/Lib/Db/Queries';
import { runMigrations } from '@/Lib/Db/Migrate';
import { getSessionUser } from '@/Lib/Auth/Session';
import { enforceRateLimit } from '@/Lib/RateLimit';
import { MAX_QUESTION_COUNT, MIN_QUESTION_COUNT } from '@/Lib/Constants';

interface Params {
  params: Promise<{ quizId: string }>;
}

export async function POST(req: Request, { params }: Params) {
  await runMigrations();
  const { quizId } = await params;

  const sessionUser = await getSessionUser(req);
  if (!sessionUser) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { count = 5 } = await req.json();
  const safeCount = Math.max(
    MIN_QUESTION_COUNT,
    Math.min(MAX_QUESTION_COUNT, Math.floor(Number(count) || 5)),
  );

  const quiz = await getQuiz(quizId);
  if (!quiz) return NextResponse.json({ error: 'not found' }, { status: 404 });
  if (quiz.ownerId !== sessionUser.id) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const limited = await enforceRateLimit(`gen:${sessionUser.id}`, 10, 60_000);
  if (limited) return limited;

  // Adding questions runs the model again — meter it like quiz generation.
  await getUserCredits(sessionUser.id);
  const remaining = await deductCredit(sessionUser.id);
  if (remaining === null) {
    return NextResponse.json({ error: 'out_of_credits' }, { status: 403 });
  }

  const existing = await getQuestions(quizId);
  const existingTexts = existing.map((q) => q.questionText);
  const maxOrder = existing.reduce((m, q) => Math.max(m, q.order), -1);

  let generated;
  try {
    generated = await generateQuiz({
      topic: quiz.topic ?? undefined,
      material: quiz.sourceMaterial ?? undefined,
      count: safeCount,
      existingQuestions: existingTexts,
    });
  } catch (err) {
    await refundCredit(sessionUser.id);
    throw err;
  }

  const newRows = generated.questions.map((q, i) => ({
    id: crypto.randomUUID(),
    quizId,
    questionText: q.questionText,
    answerText: q.answerText,
    options: q.options,
    optionImages: null as null,
    imageUrl: null as string | null,
    imagePrompt: q.imageDescription ?? null,
    format: q.format,
    category: q.category,
    difficulty: q.difficulty,
    explanation: q.explanation,
    factText: q.factText,
    tags: q.tags,
    order: maxOrder + 1 + i,
  }));

  await insertQuestions(newRows);
  await updateQuiz(quizId, { questionCount: existing.length + newRows.length });

  // Fire-and-forget image generation, bounded by the per-generation image budget.
  scheduleQuizImages({
    quizId,
    questions: generated.questions,
    rowIds: newRows.map((row) => row.id),
  });

  const freshQuestions = await getQuestions(quizId);
  const newIds = new Set(newRows.map((r) => r.id));
  return NextResponse.json(freshQuestions.filter((q) => newIds.has(q.id)), { status: 201 });
}
