import { NextResponse } from 'next/server';
import { listQuizzes, insertQuiz } from '@/Lib/Db/Queries';

export async function GET() {
  const list = await listQuizzes();
  return NextResponse.json(list);
}

export async function POST(req: Request) {
  const body = await req.json();

  if (!body.title || !body.format) {
    return NextResponse.json(
      { error: 'title and format are required' },
      { status: 400 },
    );
  }

  const quiz = await insertQuiz({
    id: crypto.randomUUID(),
    title: body.title,
    description: body.description,
    topic: body.topic,
    format: body.format,
  });

  return NextResponse.json(quiz, { status: 201 });
}
