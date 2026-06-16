import { NextResponse } from 'next/server';
import { getQuiz, getQuizRun } from '@/Lib/Db/Queries';
import { runMigrations } from '@/Lib/Db/Migrate';

interface Params {
  params: Promise<{ quizId: string; runId: string }>;
}

export async function GET(_req: Request, { params }: Params) {
  await runMigrations();
  const { quizId, runId } = await params;
  const [quiz, run] = await Promise.all([
    getQuiz(quizId),
    getQuizRun(runId),
  ]);

  if (!quiz || !run || run.quizId !== quizId) {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }

  return NextResponse.json({
    run,
    attempts: [],
    questions: [],
    quiz: {
      title: quiz.title,
      topic: quiz.topic,
    },
  });
}
