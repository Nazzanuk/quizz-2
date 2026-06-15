import { NextResponse } from 'next/server';
import {
  getUserCredits,
  getUsername,
  isUsernameTaken,
  setUsername,
} from '@/Lib/Db/Queries';
import { runMigrations } from '@/Lib/Db/Migrate';
import { getSessionUser } from '@/Lib/Auth/Session';
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
