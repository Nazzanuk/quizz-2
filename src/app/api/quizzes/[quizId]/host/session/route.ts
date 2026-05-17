import { NextResponse } from 'next/server';
import { generateHostSessionIntro, generateQuestionMetadata } from '@/Lib/Ai/Gemini';
import {
  getQuestionAggregateStats,
  getQuestions,
  getQuiz,
  getQuizAggregateStats,
  updateQuestionHostMetadata,
} from '@/Lib/Db/Queries';
import { runMigrations } from '@/Lib/Db/Migrate';
import {
  normalizeHostMode,
  normalizeHostPersona,
  type HostMode,
  type HostPersona,
  type PlayerProfile,
} from '@/Lib/Types';

interface Params {
  params: Promise<{ quizId: string }>;
}

export async function POST(req: Request, { params }: Params) {
  await runMigrations();
  const { quizId } = await params;
  const quiz = await getQuiz(quizId);
  if (!quiz) {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));
  const mode = normalizeHostMode(body.mode);
  const hostPersona = normalizeHostPersona(body.hostPersona);
  const profile = (body.profile ?? null) as PlayerProfile | null;
  const questions = await getQuestions(quizId);
  const enrichedQuestions = await ensureQuestionMetadata(quiz.topic, quiz.title, questions);
  const questionStats = await getQuestionAggregateStats(
    quizId,
    enrichedQuestions.map((question) => question.id),
  );
  const quizStats = await getQuizAggregateStats(quizId);

  const categories = Array.from(
    new Set(
      enrichedQuestions
        .map((question) => question.category)
        .filter((value): value is string => Boolean(value)),
    ),
  ).slice(0, 4);
  const hardCount = enrichedQuestions.filter((question) => question.difficulty === 'hard').length;

  const intro = await generateHostSessionIntro({
    title: quiz.title,
    topic: quiz.topic,
    count: enrichedQuestions.length,
    mode,
    profile: profile ?? getFallbackProfile(mode, hostPersona),
    categories,
    hardCount,
  });

  return NextResponse.json({
    intro,
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

function getFallbackProfile(mode: HostMode, hostPersona: HostPersona): PlayerProfile {
  return {
    totalRuns: 0,
    totalQuestions: 0,
    totalCorrect: 0,
    bestPct: null,
    bestStreak: 0,
    fastestMs: null,
    lastPlayedAt: null,
    preferredMode: mode,
    hostVoiceEnabled: false,
    selectedHost: hostPersona,
    categories: {},
    quizzes: {},
    recentRecaps: [],
  };
}
