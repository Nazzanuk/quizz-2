import { NextResponse } from 'next/server';
import { generateQuiz } from '@/Lib/Ai/Gemini';
import { generateCoverImage, generateQuestionImage } from '@/Lib/Ai/ImageGen';
import {
  insertQuiz,
  insertQuestions,
  updateQuiz,
  updateQuestionImage,
  updateQuestionOptionImages,
} from '@/Lib/Db/Queries';
import { runMigrations } from '@/Lib/Db/Migrate';
import { DEFAULT_QUESTION_COUNT } from '@/Lib/Constants';

export async function POST(req: Request) {
  await runMigrations();

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

  const generated = await generateQuiz({
    topic,
    material,
    format: 'mcq',
    count: count ?? DEFAULT_QUESTION_COUNT,
  });

  const quizId = crypto.randomUUID();

  const quiz = await insertQuiz({
    id: quizId,
    title: generated.title,
    description: generated.description,
    topic: topic ?? undefined,
    sourceMaterial: material ?? undefined,
    format: 'mcq',
    questionCount: generated.questions.length,
  });

  const questionRows = generated.questions.map((q, i) => ({
    id: crypto.randomUUID(),
    quizId,
    questionText: q.questionText,
    answerText: q.answerText,
    options: q.options,
    // Reserve slots for option images so the UI knows to render an image grid
    optionImages: q.optionImageDescriptions?.some(d => d)
      ? (q.options?.map(() => null) ?? null)
      : null,
    imageUrl: null as string | null,
    format: 'mcq' as const,
    order: i,
  }));

  await insertQuestions(questionRows);

  // All image generation is fire-and-forget — doesn't block the response
  const imageTopic = topic ?? generated.title;
  generateCoverImage(imageTopic)
    .then((url) => updateQuiz(quizId, { coverImageUrl: url }))
    .catch(() => {});

  generated.questions.forEach((q, i) => {
    const row = questionRows[i];

    if (q.imageDescription) {
      generateQuestionImage(q.imageDescription)
        .then((url) => updateQuestionImage(row.id, url))
        .catch(() => {});
    }

    if (q.optionImageDescriptions?.some(d => d)) {
      Promise.all(
        q.optionImageDescriptions.map((desc) =>
          desc ? generateQuestionImage(desc).catch(() => null) : null,
        ),
      )
        .then((urls) => updateQuestionOptionImages(row.id, urls))
        .catch(() => {});
    }
  });

  return NextResponse.json(quiz, { status: 201 });
}
