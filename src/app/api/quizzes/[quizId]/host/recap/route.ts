import { NextResponse } from 'next/server';
import { generateHostRecap } from '@/Lib/Ai/Gemini';
import { getQuiz } from '@/Lib/Db/Queries';
import { runMigrations } from '@/Lib/Db/Migrate';
import { clientIp, enforceRateLimit } from '@/Lib/RateLimit';
import { MAX_HOST_LIST_ITEMS, MAX_HOST_LIST_ITEM_LENGTH } from '@/Lib/Constants';
import {
  normalizeHostMode,
  normalizeHostPersona,
  type HostRecapRequest,
  type PlayerProfile,
} from '@/Lib/Types';

// Keep the model prompt bounded: cap how many context items a request can pass
// and how long each can be.
function boundList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === 'string')
    .slice(0, MAX_HOST_LIST_ITEMS)
    .map((item) => item.slice(0, MAX_HOST_LIST_ITEM_LENGTH));
}

interface Params {
  params: Promise<{ quizId: string }>;
}

export async function POST(req: Request, { params }: Params) {
  await runMigrations();
  const { quizId } = await params;

  // Public + expensive (a Gemini call), so rate-limit by IP.
  const limited = await enforceRateLimit(`recap:${clientIp(req)}`, 20, 60_000);
  if (limited) return limited;

  const quiz = await getQuiz(quizId);
  if (!quiz) {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }

  const body = await req.json() as HostRecapRequest;
  const profile = body.profile ?? getFallbackProfile();
  const recap = await generateHostRecap({
    title: quiz.title,
    topic: quiz.topic,
    mode: normalizeHostMode(body.mode),
    score: body.summary.total > 0 ? Math.round((body.summary.correct / body.summary.total) * 100) : 0,
    correct: body.summary.correct,
    total: body.summary.total,
    bestStreak: body.summary.bestStreak,
    wrongCount: body.summary.wrongCount,
    fastestAnswerMs: body.summary.fastestAnswerMs,
    averageAnswerMs: body.summary.averageAnswerMs,
    previousBest: body.summary.previousBest,
    isNewBest: body.summary.isNewBest,
    strengths: boundList(body.strengths),
    weaknesses: boundList(body.weaknesses),
    profile: {
      ...profile,
      selectedHost: normalizeHostPersona(body.hostPersona),
    },
  });

  return NextResponse.json({ recap });
}

function getFallbackProfile(): PlayerProfile {
  return {
    totalRuns: 0,
    totalQuestions: 0,
    totalCorrect: 0,
    bestPct: null,
    bestStreak: 0,
    fastestMs: null,
    lastPlayedAt: null,
    preferredMode: 'default',
    hostVoiceEnabled: false,
    hideTextUi: false,
    readQuestionsAloud: false,
    selectedHost: 'sarcastic_pub_host',
    categories: {},
    quizzes: {},
    recentRecaps: [],
  };
}
