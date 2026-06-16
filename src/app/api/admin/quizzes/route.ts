import { NextResponse } from 'next/server';
import { listAllQuizzes } from '@/Lib/Db/Queries';
import { runMigrations } from '@/Lib/Db/Migrate';
import { getAdminUser } from '@/Lib/Auth/Admin';
import { enforceRateLimit } from '@/Lib/RateLimit';

// Admin-only: list/search ALL quizzes with owner + run/report counts.
export async function GET(req: Request) {
  await runMigrations();
  const admin = await getAdminUser(req);
  if (!admin) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }
  const limited = await enforceRateLimit(`admin-quizzes:${admin.id}`, 60, 60_000);
  if (limited) return limited;

  const url = new URL(req.url);
  const search = url.searchParams.get('search') ?? undefined;
  const limitParam = Number(url.searchParams.get('limit'));
  const limit = Number.isFinite(limitParam) ? Math.min(Math.max(1, Math.floor(limitParam)), 200) : 100;

  return NextResponse.json(await listAllQuizzes({ search, limit }));
}
