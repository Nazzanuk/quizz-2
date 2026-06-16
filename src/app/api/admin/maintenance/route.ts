import { NextResponse } from 'next/server';
import {
  applyDedupe,
  backfillQuizOwner,
  previewDedupe,
  resetAllCredits,
} from '@/Lib/Db/Queries';
import { runMigrations } from '@/Lib/Db/Migrate';
import { getAdminUser } from '@/Lib/Auth/Admin';
import { enforceRateLimit } from '@/Lib/RateLimit';

type Action = 'dedupe-preview' | 'dedupe-apply' | 'reset-credits' | 'backfill-owners';
const ACTIONS: Action[] = ['dedupe-preview', 'dedupe-apply', 'reset-credits', 'backfill-owners'];

// Admin-only: in-app versions of the maintenance scripts.
export async function POST(req: Request) {
  await runMigrations();
  const admin = await getAdminUser(req);
  if (!admin) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }
  const limited = await enforceRateLimit(`admin-maint:${admin.id}`, 10, 60_000);
  if (limited) return limited;

  const body = await req.json().catch(() => ({})) as { action?: unknown; windowMin?: unknown };
  if (typeof body.action !== 'string' || !ACTIONS.includes(body.action as Action)) {
    return NextResponse.json({ error: 'invalid action' }, { status: 400 });
  }
  const action = body.action as Action;
  const windowMin = Number.isFinite(Number(body.windowMin)) && Number(body.windowMin) > 0
    ? Math.floor(Number(body.windowMin))
    : 30;

  switch (action) {
    case 'dedupe-preview': {
      const bursts = await previewDedupe(windowMin);
      const totalToDelete = bursts.reduce((sum, b) => sum + b.remove.length, 0);
      return NextResponse.json({ bursts, totalToDelete });
    }
    case 'dedupe-apply':
      return NextResponse.json(await applyDedupe(windowMin));
    case 'reset-credits':
      return NextResponse.json(await resetAllCredits());
    case 'backfill-owners': {
      const assigned = await backfillQuizOwner(admin.id, 'unlisted');
      return NextResponse.json({ assigned });
    }
  }
}
