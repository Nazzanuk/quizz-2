import { NextResponse } from 'next/server';
import { getUserCredits } from '@/Lib/Db/Queries';
import { runMigrations } from '@/Lib/Db/Migrate';
import { getSessionUser } from '@/Lib/Auth/Session';

// Returns the signed-in creator's account + a fresh, monthly-refreshed credit
// balance. The session cookie carries a credits snapshot, but this reflects
// deductions and the lazy monthly top-up.
export async function GET(req: Request) {
  await runMigrations();

  const sessionUser = await getSessionUser(req);
  if (!sessionUser) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const credits = (await getUserCredits(sessionUser.id)) ?? 0;

  return NextResponse.json({
    id: sessionUser.id,
    name: sessionUser.name,
    email: sessionUser.email,
    image: sessionUser.image,
    credits,
  });
}
