import { NextResponse } from 'next/server';
import { generateQuiz } from '@/Lib/Ai/Gemini';
import { scheduleQuizImages } from '@/Lib/Ai/QuizImages';
import {
  insertQuiz,
  insertQuestions,
  getUserCredits,
  getQuizByIdempotencyKey,
  getRecentQuizByTopic,
  deductCredit,
  refundCredit,
} from '@/Lib/Db/Queries';
import { runMigrations } from '@/Lib/Db/Migrate';
import { getSessionUser } from '@/Lib/Auth/Session';
import { enforceRateLimit } from '@/Lib/RateLimit';
import { track } from '@/Lib/Analytics';
import {
  DEFAULT_QUESTION_COUNT,
  DEFAULT_QUESTIONS_PER_RUN,
  MAX_MATERIAL_LENGTH,
  MAX_QUESTION_COUNT,
  MAX_TOPIC_LENGTH,
  MIN_QUESTION_COUNT,
  RETRY_DEDUP_WINDOW_MS,
} from '@/Lib/Constants';

function clampCount(value: number | undefined): number {
  const n = Math.floor(value ?? DEFAULT_QUESTION_COUNT);
  if (!Number.isFinite(n)) return DEFAULT_QUESTION_COUNT;
  return Math.max(MIN_QUESTION_COUNT, Math.min(MAX_QUESTION_COUNT, n));
}

export async function POST(req: Request) {
  await runMigrations();

  // Creator-gated + metered: AI generation costs money, so require a signed-in
  // user with at least one credit. Anonymous players never reach here.
  const sessionUser = await getSessionUser(req);
  if (!sessionUser) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const limited = await enforceRateLimit(`gen:${sessionUser.id}`, 10, 60_000);
  if (limited) return limited;

  const body = await req.json();
  const { topic: rawTopic, material: rawMaterial, count, idempotencyKey: rawKey } = body as {
    topic?: string;
    material?: string;
    count?: number;
    idempotencyKey?: string;
  };

  // Cap the free-text fields before they reach the model — they drive token
  // cost, and an unbounded paste shouldn't be billable to one credit.
  const topic = typeof rawTopic === 'string' ? rawTopic.slice(0, MAX_TOPIC_LENGTH) : undefined;
  const material = typeof rawMaterial === 'string' ? rawMaterial.slice(0, MAX_MATERIAL_LENGTH) : undefined;
  const idempotencyKey = typeof rawKey === 'string' && rawKey.trim() ? rawKey.trim().slice(0, 64) : null;

  if (!topic?.trim() && !material?.trim()) {
    return NextResponse.json(
      { error: 'Provide a topic or material' },
      { status: 400 },
    );
  }

  // Safe retry: if this exact attempt already produced a quiz (e.g. the previous
  // response was lost and the user hit Generate again), return it without
  // generating again or spending another credit.
  if (idempotencyKey) {
    const existing = await getQuizByIdempotencyKey(sessionUser.id, idempotencyKey);
    if (existing) return NextResponse.json(existing, { status: 200 });
  }

  // Content-level retry guard (backstop for when the idempotency key didn't
  // carry over — a different tab, cleared storage, etc.): if this owner just
  // created a quiz on the same topic, return it instead of generating — and
  // charging — again. Skipped for material-only quizzes (no stable topic key).
  const normalizedTopic = topic?.trim().toLowerCase();
  if (normalizedTopic) {
    const since = new Date(Date.now() - RETRY_DEDUP_WINDOW_MS).toISOString();
    const recent = await getRecentQuizByTopic(sessionUser.id, normalizedTopic, since);
    if (recent) return NextResponse.json(recent, { status: 200 });
  }

  // Apply any due monthly refresh, then spend one credit up front. If the
  // deduction fails the user is out of credits — bail before calling the model.
  await getUserCredits(sessionUser.id);
  const remaining = await deductCredit(sessionUser.id);
  if (remaining === null) {
    return NextResponse.json(
      { error: 'out_of_credits' },
      { status: 403 },
    );
  }

  let generated;
  try {
    generated = await generateQuiz({
      topic,
      material,
      count: clampCount(count),
      // Cancel the model call if the client disconnects, so an abandoned slow
      // request stops instead of finishing and silently creating a quiz.
      abortSignal: req.signal,
    });
  } catch (err) {
    // Refund the credit if generation never produced anything.
    await refundCredit(sessionUser.id);
    throw err;
  }

  const quizId = crypto.randomUUID();

  let quiz;
  try {
    quiz = await insertQuiz({
      id: quizId,
      ownerId: sessionUser.id,
      title: generated.title,
      description: generated.description,
      topic: topic ?? undefined,
      sourceMaterial: material ?? undefined,
      format: 'mcq',
      questionCount: generated.questions.length,
      questionsPerRun: DEFAULT_QUESTIONS_PER_RUN,
      idempotencyKey,
    });
  } catch (err) {
    // A concurrent request with the same key won the unique index — return its
    // quiz and refund this request's credit so the retry isn't double-charged.
    if (idempotencyKey) {
      const existing = await getQuizByIdempotencyKey(sessionUser.id, idempotencyKey);
      if (existing) {
        await refundCredit(sessionUser.id);
        return NextResponse.json(existing, { status: 200 });
      }
    }
    await refundCredit(sessionUser.id);
    throw err;
  }

  const questionRows = generated.questions.map((q, i) => ({
    id: crypto.randomUUID(),
    quizId,
    questionText: q.questionText,
    answerText: q.answerText,
    options: q.options,
    optionImages: null as null, // written only after ALL option images succeed
    imageUrl: null as string | null,
    imagePrompt: q.imageDescription ?? null,
    format: q.format,
    category: q.category,
    difficulty: q.difficulty,
    explanation: q.explanation,
    factText: q.factText,
    tags: q.tags,
    order: i,
  }));

  await insertQuestions(questionRows);

  // Fire-and-forget image generation, bounded by a hard per-quiz image budget.
  scheduleQuizImages({
    quizId,
    coverTopic: topic ?? generated.title,
    questions: generated.questions,
    rowIds: questionRows.map((row) => row.id),
  });

  await track('quiz_created', { userId: sessionUser.id, quizId: quiz.id });
  return NextResponse.json(quiz, { status: 201 });
}
