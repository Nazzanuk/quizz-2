import { NextResponse } from 'next/server';
import { insertQuizResult, getResultsSummary } from '@/Lib/Db/Queries';
import { runMigrations } from '@/Lib/Db/Migrate';

interface Params {
  params: Promise<{ quizId: string }>;
}

export async function GET(_req: Request, { params }: Params) {
  await runMigrations();
  const { quizId } = await params;
  const summary = await getResultsSummary(quizId);
  return NextResponse.json(summary);
}

export async function POST(req: Request, { params }: Params) {
  await runMigrations();
  const { quizId } = await params;
  const { correct, total, perQuestion } = await req.json();

  await insertQuizResult({
    id: crypto.randomUUID(),
    quizId,
    correct,
    total,
    perQuestion,
  });

  return NextResponse.json({ ok: true }, { status: 201 });
}
