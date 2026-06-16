import { NextResponse } from 'next/server';
import {
  deleteUserAndData,
  getUserCredits,
  getUsername,
  isUsernameTaken,
  setUsername,
} from '@/Lib/Db/Queries';
import { runMigrations } from '@/Lib/Db/Migrate';
import { getSessionUser } from '@/Lib/Auth/Session';
import { isAdminEmail } from '@/Lib/Auth/Admin';
import { enforceRateLimit } from '@/Lib/RateLimit';
import { validateUsername } from '@/Lib/Types';

// Returns the signed-in creator's account + a fresh, monthly-refreshed credit
// balance. The session cookie carries a credits snapshot, but this reflects
// deductions and the lazy monthly top-up.
export async function GET(req: Request) {
  await runMigrations();

  const sessionUser = await getSessionUser(req);
  if (!sessionUser) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const [credits, username] = await Promise.all([
    getUserCredits(sessionUser.id),
    getUsername(sessionUser.id),
  ]);

  return NextResponse.json({
    id: sessionUser.id,
    name: sessionUser.name,
    email: sessionUser.email,
    image: sessionUser.image,
    credits: credits ?? 0,
    username,
    isAdmin: isAdminEmail(sessionUser.email),
  });
}

// Sets or changes the user's public leaderboard handle. Enforces format and
// case-insensitive uniqueness; the DB unique index is the final backstop.
export async function PATCH(req: Request) {
  await runMigrations();

  const sessionUser = await getSessionUser(req);
  if (!sessionUser) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  // Throttle username churn (each attempt hits the uniqueness index).
  const limited = await enforceRateLimit(`username:${sessionUser.id}`, 15, 60_000);
  if (limited) return limited;

  const body = await req.json().catch(() => ({})) as { username?: unknown };
  if (typeof body.username !== 'string') {
    return NextResponse.json({ error: 'username is required' }, { status: 400 });
  }

  const username = body.username.trim();
  const formatError = validateUsername(username);
  if (formatError) {
    return NextResponse.json({ error: formatError }, { status: 400 });
  }

  if (await isUsernameTaken(username, sessionUser.id)) {
    return NextResponse.json({ error: 'That username is taken' }, { status: 409 });
  }

  try {
    await setUsername(sessionUser.id, username);
  } catch {
    // Lost a uniqueness race against the index.
    return NextResponse.json({ error: 'That username is taken' }, { status: 409 });
  }

  return NextResponse.json({ username });
}

// Permanently deletes the signed-in user's account and all their data. The
// client is expected to sign out and clear local state afterward.
export async function DELETE(req: Request) {
  await runMigrations();

  const sessionUser = await getSessionUser(req);
  if (!sessionUser) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const limited = await enforceRateLimit(`account-delete:${sessionUser.id}`, 5, 60_000);
  if (limited) return limited;

  await deleteUserAndData(sessionUser.id);
  return NextResponse.json({ ok: true });
}
