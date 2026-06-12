import { NextResponse } from 'next/server';
import { getQuestions, getQuizRun, getRunAttempts } from '@/Lib/Db/Queries';
import { runMigrations } from '@/Lib/Db/Migrate';

interface Params {
  params: Promise<{ quizId: string; runId: string }>;
}

export async function GET(_req: Request, { params }: Params) {
  await runMigrations();
  const { quizId, runId } = await params;
  const run = await getQuizRun(runId);

  if (!run || run.quizId !== quizId) {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }

  const attempts = await getRunAttempts(runId);
  const questions = await getQuestions(quizId);
  const questionById = new Map(questions.map((question) => [question.id, question]));
  const attemptedQuestions = attempts
    .map((attempt) => questionById.get(attempt.questionId))
    .filter((question) => question != null);

  return NextResponse.json({
    run,
    attempts,
    questions: attemptedQuestions,
  });
}
