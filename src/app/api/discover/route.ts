import { NextResponse } from 'next/server';
import { getTopQuizzes } from '@/Lib/Db/Queries';
import { runMigrations } from '@/Lib/Db/Migrate';

// Public Discover feed: the most-played, openly-playable quizzes. No auth — the
// feed is the same for everyone, including signed-out visitors.
export async function GET(req: Request) {
  await runMigrations();
  const url = new URL(req.url);
  const limit = parseLimit(url.searchParams.get('limit'), 5);
  const quizzes = await getTopQuizzes(limit);
  return NextResponse.json(quizzes);
}

function parseLimit(value: string | null, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(1, Math.min(20, Math.floor(parsed)));
}
