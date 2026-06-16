import { NextResponse } from 'next/server';
import { deleteQuiz, getQuiz, setQuizStatus, updateQuiz } from '@/Lib/Db/Queries';
import { runMigrations } from '@/Lib/Db/Migrate';
import { getAdminUser } from '@/Lib/Auth/Admin';
import { enforceRateLimit } from '@/Lib/RateLimit';
import { isQuizStatus, isQuizVisibility } from '@/Lib/Types';

interface Params {
  params: Promise<{ quizId: string }>;
}

// Admin-only: change a quiz's moderation status (block/unblock) and/or visibility.
export async function PATCH(req: Request, { params }: Params) {
  await runMigrations();
  const admin = await getAdminUser(req);
  if (!admin) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }
  const limited = await enforceRateLimit(`admin-quiz-patch:${admin.id}`, 60, 60_000);
  if (limited) return limited;

  const { quizId } = await params;
  const body = await req.json().catch(() => ({})) as { status?: unknown; visibility?: unknown };

  const status = typeof body.status === 'string' ? body.status : null;
  const visibility = typeof body.visibility === 'string' ? body.visibility : null;
  if (status !== null && !isQuizStatus(status)) {
    return NextResponse.json({ error: 'invalid status' }, { status: 400 });
  }
  if (visibility !== null && !isQuizVisibility(visibility)) {
    return NextResponse.json({ error: 'invalid visibility' }, { status: 400 });
  }
  if (status === null && visibility === null) {
    return NextResponse.json({ error: 'nothing to update' }, { status: 400 });
  }

  const quiz = await getQuiz(quizId);
  if (!quiz) {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }

  if (status !== null) await setQuizStatus(quizId, status);
  if (visibility !== null) await updateQuiz(quizId, { visibility });

  return NextResponse.json({ ok: true });
}

// Admin-only: permanently delete any quiz (full cascade).
export async function DELETE(req: Request, { params }: Params) {
  await runMigrations();
  const admin = await getAdminUser(req);
  if (!admin) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }
  const limited = await enforceRateLimit(`admin-quiz-delete:${admin.id}`, 20, 60_000);
  if (limited) return limited;

  const { quizId } = await params;
  const quiz = await getQuiz(quizId);
  if (!quiz) {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }

  await deleteQuiz(quizId);
  return NextResponse.json({ ok: true });
}
