import { NextResponse } from 'next/server';
import { generateQuiz } from '@/Lib/Ai/Gemini';
import { generateQuestionImage } from '@/Lib/Ai/ImageGen';
import {
  getQuiz,
  getQuestions,
  insertQuestions,
  updateQuiz,
  updateQuestionImage,
  updateQuestionOptionImages,
} from '@/Lib/Db/Queries';
import { runMigrations } from '@/Lib/Db/Migrate';

interface Params {
  params: Promise<{ quizId: string }>;
}

export async function POST(req: Request, { params }: Params) {
  await runMigrations();
  const { quizId } = await params;
  const { count = 5 } = await req.json();

  const quiz = await getQuiz(quizId);
  if (!quiz) return NextResponse.json({ error: 'not found' }, { status: 404 });

  const existing = await getQuestions(quizId);
  const existingTexts = existing.map((q) => q.questionText);
  const maxOrder = existing.reduce((m, q) => Math.max(m, q.order), -1);

  const generated = await generateQuiz({
    topic: quiz.topic ?? undefined,
    material: quiz.sourceMaterial ?? undefined,
    format: 'mcq',
    count,
    existingQuestions: existingTexts,
  });

  const newRows = generated.questions.map((q, i) => ({
    id: crypto.randomUUID(),
    quizId,
    questionText: q.questionText,
    answerText: q.answerText,
    options: q.options,
    optionImages: null as null,
    imageUrl: null as string | null,
    format: 'mcq' as const,
    order: maxOrder + 1 + i,
  }));

  await insertQuestions(newRows);
  await updateQuiz(quizId, { questionCount: existing.length + newRows.length });

  generated.questions.forEach((q, i) => {
    const row = newRows[i];
    if (q.imageDescription) {
      generateQuestionImage(q.imageDescription)
        .then((url) => updateQuestionImage(row.id, url))
        .catch(() => {});
    }
    if (q.optionImageDescriptions?.some((d) => d)) {
      Promise.all(
        q.optionImageDescriptions.map((desc) =>
          desc ? generateQuestionImage(desc).catch(() => null) : Promise.resolve(null),
        ),
      )
        .then((urls) => {
          if (urls.every((u) => u != null)) {
            updateQuestionOptionImages(row.id, urls as string[]);
          }
        })
        .catch(() => {});
    }
  });

  const freshQuestions = await getQuestions(quizId);
  const newIds = new Set(newRows.map((r) => r.id));
  return NextResponse.json(freshQuestions.filter((q) => newIds.has(q.id)), { status: 201 });
}
