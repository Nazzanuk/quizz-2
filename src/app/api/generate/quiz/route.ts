import { NextResponse } from 'next/server';
import { generateQuiz } from '@/Lib/Ai/Gemini';
import { generateCoverImage, generateQuestionImage } from '@/Lib/Ai/ImageGen';
import {
  insertQuiz,
  insertQuestions,
  updateQuiz,
  updateQuestionImage,
  updateQuestionOptionImages,
  getUserCredits,
  deductCredit,
  refundCredit,
} from '@/Lib/Db/Queries';
import { runMigrations } from '@/Lib/Db/Migrate';
import { getSessionUser } from '@/Lib/Auth/Session';
import { enforceRateLimit } from '@/Lib/RateLimit';
import {
  DEFAULT_QUESTION_COUNT,
  DEFAULT_QUESTIONS_PER_RUN,
  MAX_QUESTION_COUNT,
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
  const { topic, material, count } = body as {
    topic?: string;
    material?: string;
    count?: number;
  };

  if (!topic && !material) {
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

  // All image generation is fire-and-forget — doesn't block the response
  const imageTopic = topic ?? generated.title;
  generateCoverImage(imageTopic)
    .then((url) => updateQuiz(quizId, { coverImageUrl: url }))
    .catch((err) =>
      console.warn(`[quiz/${quizId}] cover image failed:`, err instanceof Error ? err.message : err),
    );

  generated.questions.forEach((q, i) => {
    const row = questionRows[i];

    if (q.imageDescription) {
      generateQuestionImage(q.imageDescription)
        .then((url) => updateQuestionImage(row.id, url))
        .catch((err) =>
          console.warn(`[quiz/${quizId}] question image failed for "${truncate(q.questionText, 60)}":`, err instanceof Error ? err.message : err),
        );
    }

    if (q.optionImageDescriptions?.some(d => d)) {
      Promise.all(
        q.optionImageDescriptions.map((desc) =>
          desc ? generateQuestionImage(desc).catch(() => null) : Promise.resolve(null),
        ),
      )
        .then((urls) => {
          // Only store if every slot has a URL — partial sets cause broken image grids.
          // ImageGen retries internally with a sanitized fallback before giving up.
          if (urls.every((u) => u != null)) {
            updateQuestionOptionImages(row.id, urls as string[]);
          } else {
            const missing = urls.filter((u) => u == null).length;
            console.warn(`[quiz/${quizId}] option images for "${truncate(q.questionText, 60)}": ${missing}/4 failed — falling back to text options`);
          }
        });
    }
  });

  return NextResponse.json(quiz, { status: 201 });
}

function truncate(s: string, n: number): string {
  return s.length <= n ? s : `${s.slice(0, n)}…`;
}
