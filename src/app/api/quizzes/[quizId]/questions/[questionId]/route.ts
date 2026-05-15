import { NextResponse } from 'next/server';
import { updateQuestion } from '@/Lib/Db/Queries';

interface Params {
  params: Promise<{ quizId: string; questionId: string }>;
}

export async function PUT(req: Request, { params }: Params) {
  const { questionId } = await params;
  const body = await req.json();
  const updated = await updateQuestion(questionId, body);

  if (!updated) {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }

  return NextResponse.json(updated);
}
