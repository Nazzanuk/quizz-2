import { NextResponse } from 'next/server';
import { generateQuiz } from '@/Lib/Ai/Gemini';
import { scheduleQuizImages } from '@/Lib/Ai/QuizImages';
import {
  insertQuiz,
  insertQuestions,
  getUserCredits,
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
  const { topic: rawTopic, material: rawMaterial, count } = body as {
    topic?: string;
    material?: string;
    count?: number;
  };

  // Cap the free-text fields before they reach the model — they drive token
  // cost, and an unbounded paste shouldn't be billable to one credit.
  const topic = typeof rawTopic === 'string' ? rawTopic.slice(0, MAX_TOPIC_LENGTH) : undefined;
  const material = typeof rawMaterial === 'string' ? rawMaterial.slice(0, MAX_MATERIAL_LENGTH) : undefined;

  if (!topic?.trim() && !material?.trim()) {
    return NextResponse.json(
      { error: 'Provide a topic or material' },
      { status: 400 },
    );
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
    });
  } catch (err) {
    // Refund the credit if generation never produced anything.
    await refundCredit(sessionUser.id);
    throw err;
  }

  const quizId = crypto.randomUUID();

  const quiz = await insertQuiz({
    id: quizId,
    ownerId: sessionUser.id,
    title: generated.title,
    description: generated.description,
    topic: topic ?? undefined,
    sourceMaterial: material ?? undefined,
    format: 'mcq',
    questionCount: generated.questions.length,
    questionsPerRun: DEFAULT_QUESTIONS_PER_RUN,
  });

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
