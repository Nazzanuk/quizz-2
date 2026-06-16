import { NextResponse } from 'next/server';
import { getResultsSummary, insertQuizResult, insertQuizRun } from '@/Lib/Db/Queries';
import { runMigrations } from '@/Lib/Db/Migrate';
import { getSessionUser } from '@/Lib/Auth/Session';
import { track } from '@/Lib/Analytics';
import {
  normalizeHostConfidenceLevel,
  normalizeHostMode,
  normalizeHostPersona,
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
  const body = await req.json() as Partial<SaveResultRequest> & {
    correct: number;
    total: number;
    perQuestion: Record<string, string>;
  };

  const correct = body.correct;
  const total = body.total;
  const perQuestion = body.perQuestion;

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
      })),
    });
    await track('run_completed', { userId: sessionUser?.id ?? null, quizId });
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}
