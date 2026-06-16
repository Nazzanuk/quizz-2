import { NextResponse } from 'next/server';
import { generateQuestionMetadata } from '@/Lib/Ai/Gemini';
import {
  getQuestionAggregateStats,
  getQuestions,
  getQuiz,
  getQuizAggregateStats,
  updateQuestionHostMetadata,
} from '@/Lib/Db/Queries';
import { runMigrations } from '@/Lib/Db/Migrate';
import { clientIp, enforceRateLimit } from '@/Lib/RateLimit';

interface Params {
  params: Promise<{ quizId: string }>;
}

export async function POST(req: Request, { params }: Params) {
  await runMigrations();
  const { quizId } = await params;

  // Public + can trigger a Gemini metadata call, so rate-limit by IP.
  const limited = await enforceRateLimit(`hostsession:${clientIp(req)}`, 20, 60_000);
  if (limited) return limited;

  const quiz = await getQuiz(quizId);
  if (!quiz) {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }

  const questions = await getQuestions(quizId);
  const enrichedQuestions = await ensureQuestionMetadata(quiz.topic, quiz.title, questions);
  const questionStats = await getQuestionAggregateStats(
    quizId,
    enrichedQuestions.map((question) => question.id),
  );
  const quizStats = await getQuizAggregateStats(quizId);

  return NextResponse.json({
    intro: '',
    questionStats,
    quizStats,
    questions: enrichedQuestions.map((question) => ({
      id: question.id,
      category: question.category,
      difficulty: question.difficulty,
      explanation: question.explanation,
      factText: question.factText,
      tags: question.tags,
    })),
  });
}

async function ensureQuestionMetadata(
  topic: string | null,
  title: string,
  questions: Awaited<ReturnType<typeof getQuestions>>,
) {
  const missing = questions.filter((question) =>
    !question.category
    || !question.difficulty
    || !question.explanation
    || !question.factText
    || !question.tags?.length);

  if (missing.length === 0) return questions;

  try {
    const generated = await generateQuestionMetadata({
      topic,
      title,
      questions: missing,
    });
    const generatedById = new Map(generated.map((item) => [item.id, item]));

    const nextQuestions = [...questions];
    for (let index = 0; index < nextQuestions.length; index += 1) {
      const question = nextQuestions[index];
      const metadata = generatedById.get(question.id);
      if (!metadata) continue;

      const updated = await updateQuestionHostMetadata(question.id, metadata);
      if (updated) nextQuestions[index] = updated;
    }

    return nextQuestions;
  } catch {
    return questions;
  }
}
