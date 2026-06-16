import { NextResponse } from 'next/server';
import { runMigrations } from '@/Lib/Db/Migrate';
import { getSessionUser } from '@/Lib/Auth/Session';
import { track } from '@/Lib/Analytics';
import { clientIp, enforceRateLimit } from '@/Lib/RateLimit';
import { isAnalyticsEventType } from '@/Lib/Types';

// Client-trackable event types — kept tight so this open beacon can't be used to
// forge server-only events (sign_in, quiz_created, etc.).
const CLIENT_TRACKABLE = new Set(['quiz_shared']);

export async function POST(req: Request) {
  await runMigrations();

  const limited = await enforceRateLimit(`track:${clientIp(req)}`, 60, 60_000);
  if (limited) return limited;

  const body = await req.json().catch(() => ({}));
  const type = typeof body.type === 'string' ? body.type : '';
  if (!isAnalyticsEventType(type) || !CLIENT_TRACKABLE.has(type)) {
    return NextResponse.json({ error: 'invalid event' }, { status: 400 });
  }

  const quizId = typeof body.quizId === 'string' ? body.quizId : null;
  const sessionUser = await getSessionUser(req);
  await track(type, { userId: sessionUser?.id ?? null, quizId });
  return NextResponse.json({ ok: true }, { status: 202 });
}
