import { NextResponse } from 'next/server';
import { getRunTotals, listRecentRuns } from '@/Lib/Db/Queries';
import { runMigrations } from '@/Lib/Db/Migrate';
import { getSessionUser } from '@/Lib/Auth/Session';
import type { StatsTotals } from '@/Lib/Types';

const EMPTY_TOTALS: StatsTotals = {
  runs: 0,
  questions: 0,
  correct: 0,
  bestPct: null,
  averagePct: null,
  bestStreak: 0,
  fastestMs: null,
};

export async function GET(req: Request) {
  await runMigrations();
  // The Progress feed is personal. Signed-out users fall back to their local
  // device profile, so the server returns an empty payload for them.
  const sessionUser = await getSessionUser(req);
  if (!sessionUser) {
    return NextResponse.json({ runs: [], totals: EMPTY_TOTALS });
  }
  const url = new URL(req.url);
  const limit = parseLimit(url.searchParams.get('limit'), 12);
  const [runs, totals] = await Promise.all([
    listRecentRuns(sessionUser.id, limit),
    getRunTotals(sessionUser.id),
  ]);

  return NextResponse.json({ runs, totals });
}

function parseLimit(value: string | null, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(1, Math.min(100, Math.floor(parsed)));
}
