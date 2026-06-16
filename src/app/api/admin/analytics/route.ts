import { NextResponse } from 'next/server';
import { getAnalyticsSummary } from '@/Lib/Db/Queries';
import { runMigrations } from '@/Lib/Db/Migrate';
import { getAdminUser } from '@/Lib/Auth/Admin';

// Admin-only first-party analytics summary.
export async function GET(req: Request) {
  await runMigrations();
  const admin = await getAdminUser(req);
  if (!admin) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }
  const summary = await getAnalyticsSummary();
  return NextResponse.json(summary);
}
