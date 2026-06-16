import { NextResponse } from 'next/server';
import { listUsers } from '@/Lib/Db/Queries';
import { runMigrations } from '@/Lib/Db/Migrate';
import { getAdminUser } from '@/Lib/Auth/Admin';
import { enforceRateLimit } from '@/Lib/RateLimit';

// Admin-only: list all users with credits and quiz/run counts.
export async function GET(req: Request) {
  await runMigrations();
  const admin = await getAdminUser(req);
  if (!admin) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }
  const limited = await enforceRateLimit(`admin-users:${admin.id}`, 60, 60_000);
  if (limited) return limited;

  return NextResponse.json(await listUsers());
}
