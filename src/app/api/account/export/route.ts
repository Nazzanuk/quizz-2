import { NextResponse } from 'next/server';
import { exportUserData } from '@/Lib/Db/Queries';
import { runMigrations } from '@/Lib/Db/Migrate';
import { getSessionUser } from '@/Lib/Auth/Session';

// Self-service data export (GDPR/CCPA access right): returns the signed-in
// user's account, quizzes, and gameplay history as a downloadable JSON file.
export async function GET(req: Request) {
  await runMigrations();
  const sessionUser = await getSessionUser(req);
  if (!sessionUser) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const data = await exportUserData(sessionUser.id);
  return new NextResponse(JSON.stringify(data, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': 'attachment; filename="quiz-dart-data.json"',
    },
  });
}
