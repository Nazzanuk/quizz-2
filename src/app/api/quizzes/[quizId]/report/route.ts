import { NextResponse } from 'next/server';
import { getQuiz, insertQuizReport } from '@/Lib/Db/Queries';
import { runMigrations } from '@/Lib/Db/Migrate';
import { getSessionUser } from '@/Lib/Auth/Session';

interface Params {
  params: Promise<{ quizId: string }>;
}

const MAX_REASON_LENGTH = 500;

// Lets a signed-in user flag a quiz for moderation. Requiring auth keeps report
// spam down; the report surfaces in the admin moderation view.
export async function POST(req: Request, { params }: Params) {
  await runMigrations();
  const { quizId } = await params;

  const sessionUser = await getSessionUser(req);
  if (!sessionUser) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const quiz = await getQuiz(quizId);
  if (!quiz) {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));
  const reason = typeof body.reason === 'string'
    ? body.reason.trim().slice(0, MAX_REASON_LENGTH) || null
    : null;

  await insertQuizReport({ quizId, reporterId: sessionUser.id, reason });
  return NextResponse.json({ ok: true }, { status: 201 });
}
