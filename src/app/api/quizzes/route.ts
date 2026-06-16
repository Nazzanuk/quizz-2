import { NextResponse } from 'next/server';
import { listQuizzes, insertQuiz } from '@/Lib/Db/Queries';
import { runMigrations } from '@/Lib/Db/Migrate';
import { getSessionUser } from '@/Lib/Auth/Session';
import { track } from '@/Lib/Analytics';
import { normalizeQuizFormat } from '@/Lib/Types';
import {
  MAX_QUIZ_DESCRIPTION_LENGTH,
  MAX_QUIZ_TITLE_LENGTH,
  MAX_TOPIC_LENGTH,
} from '@/Lib/Constants';

// The dashboard feed: only the signed-in creator's own quizzes.
export async function GET(req: Request) {
  await runMigrations();
  const sessionUser = await getSessionUser(req);
  if (!sessionUser) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const list = await listQuizzes(sessionUser.id);
  return NextResponse.json(list);
}

export async function POST(req: Request) {
  await runMigrations();
  const sessionUser = await getSessionUser(req);
  if (!sessionUser) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));

  const title = typeof body.title === 'string' ? body.title.trim() : '';
  if (!title || !body.format) {
    return NextResponse.json(
      { error: 'title and format are required' },
      { status: 400 },
    );
  }

  const description = typeof body.description === 'string'
    ? body.description.trim().slice(0, MAX_QUIZ_DESCRIPTION_LENGTH) || undefined
    : undefined;
  const topic = typeof body.topic === 'string'
    ? body.topic.trim().slice(0, MAX_TOPIC_LENGTH) || undefined
    : undefined;

  const quiz = await insertQuiz({
    id: crypto.randomUUID(),
    ownerId: sessionUser.id,
    title: title.slice(0, MAX_QUIZ_TITLE_LENGTH),
    description,
    topic,
    // Coerce to a known format so an arbitrary string can't land in the DB.
    format: normalizeQuizFormat(body.format),
  });

  await track('quiz_created', { userId: sessionUser.id, quizId: quiz.id });
  return NextResponse.json(quiz, { status: 201 });
}
