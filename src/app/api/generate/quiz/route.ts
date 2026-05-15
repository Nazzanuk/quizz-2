import { NextResponse } from 'next/server';
import { generateQuiz } from '@/Lib/Ai/Gemini';
import { generateCoverImage } from '@/Lib/Ai/ImageGen';
import { insertQuiz, insertQuestions, updateQuiz } from '@/Lib/Db/Queries';
import { DEFAULT_QUESTION_COUNT } from '@/Lib/Constants';

export async function POST(req: Request) {
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

  await insertQuestions(
    generated.questions.map((q, i) => ({
      id: crypto.randomUUID(),
      quizId,
      questionText: q.questionText,
      answerText: q.answerText,
      options: q.options,
      format: 'mcq' as const,
      order: i,
    })),
  );

  // Fire image gen in background — doesn't block the response
  const imageTopic = topic ?? generated.title;
  generateCoverImage(imageTopic)
    .then((url) => updateQuiz(quizId, { coverImageUrl: url }))
    .catch(() => {});

  return NextResponse.json(quiz, { status: 201 });
}
