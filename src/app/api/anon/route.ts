import { NextResponse } from 'next/server';
import { setAnonUsername } from '@/Lib/Db/Queries';
import { runMigrations } from '@/Lib/Db/Migrate';
import { clientIp, enforceRateLimit } from '@/Lib/RateLimit';
import { validateUsername } from '@/Lib/Types';

// Sets a guest (signed-out) player's public leaderboard name. Public, so guarded
// by a per-IP rate limit and the shared display-name validation (length, charset,
// banned words). Guest names aren't globally unique — uniqueness only applies to
// registered usernames.
export async function PATCH(req: Request) {
  await runMigrations();

  const limited = await enforceRateLimit(`anon-name:${clientIp(req)}`, 20, 60_000);
  if (limited) return limited;

  const body = await req.json().catch(() => ({})) as { anonId?: unknown; username?: unknown };
  const anonId = typeof body.anonId === 'string' ? body.anonId.trim() : '';
  const username = typeof body.username === 'string' ? body.username.trim() : '';

  if (!anonId || anonId.length > 64) {
    return NextResponse.json({ error: 'invalid id' }, { status: 400 });
  }
  const formatError = validateUsername(username);
  if (formatError) {
    return NextResponse.json({ error: formatError }, { status: 400 });
  }

  await setAnonUsername(anonId, username);
  return NextResponse.json({ username });
}
