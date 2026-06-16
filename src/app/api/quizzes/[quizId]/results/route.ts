import { NextResponse } from 'next/server';
import { getResultsSummary, insertQuizResult, insertQuizRun } from '@/Lib/Db/Queries';
import { runMigrations } from '@/Lib/Db/Migrate';
import { getSessionUser } from '@/Lib/Auth/Session';
import { clientIp, enforceRateLimit } from '@/Lib/RateLimit';
import { track } from '@/Lib/Analytics';
import {
  normalizeHostConfidenceLevel,
  normalizeHostMode,
  normalizeHostPersona,
  normalizeQuizFormat,
  type SaveResultRequest,
} from '@/Lib/Types';

interface Params {
  params: Promise<{ quizId: string }>;
}

export async function GET(_req: Request, { params }: Params) {
  await runMigrations();
  const { quizId } = await params;
  const summary = await getResultsSummary(quizId);
  return NextResponse.json(summary);
}

export async function POST(req: Request, { params }: Params) {
  await runMigrations();
  const { quizId } = await params;

  // Anonymous writes are allowed (anonymous play posts results), so rate-limit
  // by IP to blunt leaderboard/stat flooding.
  const limited = await enforceRateLimit(`result:${clientIp(req)}`, 30, 60_000);
  if (limited) return limited;

  const body = await req.json() as Partial<SaveResultRequest> & {
    correct: number;
    total: number;
    perQuestion: Record<string, string>;
  };

  // Scores are client-reported; reject impossible shapes before they pollute
  // the per-quiz aggregates and leaderboard.
  const total = toCount(body.total);
  const correct = toCount(body.correct);
  if (total === null || correct === null || correct > total) {
    return NextResponse.json({ error: 'invalid result' }, { status: 400 });
  }
  const perQuestion = body.perQuestion && typeof body.perQuestion === 'object'
    ? body.perQuestion
    : {};

  await insertQuizResult({
    id: crypto.randomUUID(),
    quizId,
    correct,
    total,
    perQuestion,
  });

  if (body.runId && Array.isArray(body.attempts)) {
    // Attribute the run to the signed-in player; null for anonymous plays.
    const sessionUser = await getSessionUser(req);
    await insertQuizRun({
      id: body.runId,
      quizId,
      userId: sessionUser?.id ?? null,
      mode: normalizeHostMode(body.mode),
      hostPersona: normalizeHostPersona(body.hostPersona),
      correct,
      total,
      bestStreak: body.bestStreak ?? 0,
      elapsedMs: body.elapsedMs ?? 0,
      recap: body.recap ?? null,
      attempts: body.attempts.map((attempt) => ({
        questionId: attempt.questionId,
        orderIndex: attempt.orderIndex,
        selectedAnswer: attempt.selectedAnswer ?? null,
        confidence: normalizeHostConfidenceLevel(attempt.confidence),
        correct: attempt.correct,
        timedOut: attempt.timedOut,
        responseMs: attempt.responseMs,
        streakBefore: attempt.streakBefore,
        streakAfter: attempt.streakAfter,
        wasFinalQuestion: attempt.wasFinalQuestion,
        playFormat: attempt.playFormat ? normalizeQuizFormat(attempt.playFormat) : null,
      })),
    });
    await track('run_completed', { userId: sessionUser?.id ?? null, quizId });
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}

// A non-negative integer (with a sane upper bound), or null if the value can't
// be a legitimate question count.
function toCount(value: unknown): number | null {
  const n = Math.floor(Number(value));
  if (!Number.isFinite(n) || n < 0 || n > 10_000) return null;
  return n;
}
