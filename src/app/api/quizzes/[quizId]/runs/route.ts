import { NextResponse } from 'next/server';
import { listRunsForQuiz } from '@/Lib/Db/Queries';
import { runMigrations } from '@/Lib/Db/Migrate';

interface Params {
  params: Promise<{ quizId: string }>;
}

export async function GET(req: Request, { params }: Params) {
  await runMigrations();
  const { quizId } = await params;
  const url = new URL(req.url);
  const limit = parseLimit(url.searchParams.get('limit'), 5);
  const runs = await listRunsForQuiz(quizId, limit);
  return NextResponse.json(runs);
}

function parseLimit(value: string | null, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(1, Math.min(50, Math.floor(parsed)));
}
