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
