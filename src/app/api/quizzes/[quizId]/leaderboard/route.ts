import { NextResponse } from 'next/server';
import { getQuizLeaderboard } from '@/Lib/Db/Queries';
import { runMigrations } from '@/Lib/Db/Migrate';
import { getSessionUser } from '@/Lib/Auth/Session';

interface Params {
  params: Promise<{ quizId: string }>;
}

// Public per-quiz leaderboard + average score. Anyone can read it; a signed-in
// viewer also gets their own rank so the UI can highlight their row.
export async function GET(req: Request, { params }: Params) {
  await runMigrations();
  const { quizId } = await params;
  const url = new URL(req.url);
  const limit = parseLimit(url.searchParams.get('limit'), 10);
  const sessionUser = await getSessionUser(req);
  // Signed-out viewers can pass their guest id to get their own rank highlighted.
  const anonId = url.searchParams.get('anonId');
  const viewerId = sessionUser?.id ?? (anonId || null);
  const leaderboard = await getQuizLeaderboard(quizId, limit, viewerId);
  return NextResponse.json(leaderboard);
}

function parseLimit(value: string | null, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(1, Math.min(50, Math.floor(parsed)));
}
