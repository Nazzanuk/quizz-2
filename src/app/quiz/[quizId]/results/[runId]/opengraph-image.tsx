import { getQuiz, getQuizRun } from '@/Lib/Db/Queries';
import { runMigrations } from '@/Lib/Db/Migrate';
import { OG_CONTENT_TYPE, OG_SIZE, renderOgImage } from '@/Features/Shared/OgImage';

export const alt = 'Quizz result';
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image({
  params,
}: {
  params: Promise<{ quizId: string; runId: string }>;
}) {
  const { quizId, runId } = await params;
  await runMigrations();
  const [quiz, run] = await Promise.all([getQuiz(quizId), getQuizRun(runId)]);
  const valid = run && run.quizId === quizId ? run : null;
  const pct = valid && valid.total > 0 ? Math.round((valid.correct / valid.total) * 100) : 0;

  return renderOgImage({
    eyebrow: 'Result',
    title: quiz?.title ?? 'Quizz result',
    score: valid ? `${pct}%` : null,
    subtitle: valid
      ? `${valid.correct}/${valid.total} correct · best streak ${valid.bestStreak}`
      : undefined,
    accent: '#8CFF66',
  });
}
