import { NextResponse } from 'next/server';
import { listReportedQuizzes } from '@/Lib/Db/Queries';
import { runMigrations } from '@/Lib/Db/Migrate';
import { getAdminUser } from '@/Lib/Auth/Admin';

// Admin-only moderation feed of reported quizzes.
export async function GET(req: Request) {
  await runMigrations();
  const admin = await getAdminUser(req);
  if (!admin) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }
  const reports = await listReportedQuizzes();
  return NextResponse.json(reports);
}
