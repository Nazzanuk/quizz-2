import { NextResponse } from 'next/server';
import { claimAnonRuns, getUsername, isUsernameTaken, setUsername } from '@/Lib/Db/Queries';
import { runMigrations } from '@/Lib/Db/Migrate';
import { getSessionUser } from '@/Lib/Auth/Session';
import { validateUsername } from '@/Lib/Types';

// Migrates a guest's anonymous runs into the signed-in account and, if the user
// has no username yet, adopts the guest name (when it's valid and still free).
export async function POST(req: Request) {
  await runMigrations();

  const sessionUser = await getSessionUser(req);
  if (!sessionUser) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({})) as { anonId?: unknown; username?: unknown };
  const anonId = typeof body.anonId === 'string' ? body.anonId.trim() : '';
  if (!anonId) {
    return NextResponse.json({ error: 'invalid id' }, { status: 400 });
  }

  const claimed = await claimAnonRuns(anonId, sessionUser.id);

  let usernameSet = false;
  const desired = typeof body.username === 'string' ? body.username.trim() : '';
  if (desired && !validateUsername(desired)) {
    const existing = await getUsername(sessionUser.id);
    if (!existing && !(await isUsernameTaken(desired, sessionUser.id))) {
      try {
        await setUsername(sessionUser.id, desired);
        usernameSet = true;
      } catch {
        usernameSet = false;
      }
    }
  }

  return NextResponse.json({ claimed, usernameSet });
}
