import { NextResponse } from 'next/server';
import { getQuiz, setQuizStatus } from '@/Lib/Db/Queries';
import { runMigrations } from '@/Lib/Db/Migrate';
import { getAdminUser } from '@/Lib/Auth/Admin';
import { isQuizStatus } from '@/Lib/Types';

interface Params {
  params: Promise<{ quizId: string }>;
}

// Admin-only: block (take down) or unblock a quiz.
export async function PATCH(req: Request, { params }: Params) {
  await runMigrations();
  const admin = await getAdminUser(req);
  if (!admin) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const { quizId } = await params;
  const body = await req.json().catch(() => ({}));
  if (typeof body.status !== 'string' || !isQuizStatus(body.status)) {
    return NextResponse.json({ error: 'invalid status' }, { status: 400 });
  }

  const quiz = await getQuiz(quizId);
  if (!quiz) {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }

  await setQuizStatus(quizId, body.status);
  return NextResponse.json({ ok: true, status: body.status });
}
