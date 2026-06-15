import { NextResponse } from 'next/server';
import { listQuizzes, insertQuiz } from '@/Lib/Db/Queries';
import { runMigrations } from '@/Lib/Db/Migrate';
import { getSessionUser } from '@/Lib/Auth/Session';

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

  const body = await req.json();

  if (!body.title || !body.format) {
    return NextResponse.json(
      { error: 'title and format are required' },
      { status: 400 },
    );
  }

  const quiz = await insertQuiz({
    id: crypto.randomUUID(),
    ownerId: sessionUser.id,
    title: body.title,
    description: body.description,
    topic: body.topic,
    format: body.format,
  });

  return NextResponse.json(quiz, { status: 201 });
}
