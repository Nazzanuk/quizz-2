import { NextResponse } from 'next/server';
import { getRunTotals, listRecentRuns } from '@/Lib/Db/Queries';
import { runMigrations } from '@/Lib/Db/Migrate';

export async function GET(req: Request) {
  await runMigrations();
  const url = new URL(req.url);
  const limit = parseLimit(url.searchParams.get('limit'), 12);
  const [runs, totals] = await Promise.all([
    listRecentRuns(limit),
    getRunTotals(),
  ]);

  return NextResponse.json({ runs, totals });
}

function parseLimit(value: string | null, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(1, Math.min(100, Math.floor(parsed)));
}
