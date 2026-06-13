import type { Metadata } from 'next';
import { getQuiz, getQuizRun, getRunAttempts } from '@/Lib/Db/Queries';
import { runMigrations } from '@/Lib/Db/Migrate';
import type { QuestionAttempt, Quiz, QuizRun } from '@/Lib/Types';

const SITE_NAME = 'Quizz';

export async function buildQuizMetadata(quizId: string): Promise<Metadata> {
  const quiz = await getQuizForMetadata(quizId);
  if (!quiz) {
    return {
      title: 'Quiz not found',
      description: 'This quiz could not be found.',
      robots: { index: false, follow: false },
    };
  }

  const title = `${quiz.title} quiz`;
  const description = buildQuizDescription(quiz);
  const url = `/quiz/${quiz.id}`;
  const image = buildImage(quiz);

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      siteName: SITE_NAME,
      type: 'website',
      images: image ? [image] : undefined,
    },
    twitter: {
      card: image ? 'summary_large_image' : 'summary',
      title,
      description,
      images: image ? [image.url] : undefined,
    },
  };
}

export async function buildRunMetadata(quizId: string, runId: string): Promise<Metadata> {
  const detail = await getRunForMetadata(quizId, runId);
  if (!detail) {
    return {
      title: 'Quiz result not found',
      description: 'This completed quiz result could not be found.',
      robots: { index: false, follow: false },
    };
  }

  const pct = scorePct(detail.run);
  const title = `${pct}% on ${detail.quiz.title}`;
  const description = buildRunDescription(detail.run, detail.attempts);
  const url = `/quiz/${quizId}/results/${runId}`;
  const image = buildImage(detail.quiz);

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      siteName: SITE_NAME,
      type: 'article',
      publishedTime: detail.run.createdAt,
      images: image ? [image] : undefined,
    },
    twitter: {
      card: image ? 'summary_large_image' : 'summary',
      title,
      description,
      images: image ? [image.url] : undefined,
    },
  };
}

async function getQuizForMetadata(quizId: string): Promise<Quiz | undefined> {
  await runMigrations();
  return getQuiz(quizId);
}

async function getRunForMetadata(
  quizId: string,
  runId: string,
): Promise<{
  quiz: Quiz;
  run: QuizRun;
  attempts: QuestionAttempt[];
} | null> {
  await runMigrations();
  const [quiz, run] = await Promise.all([
    getQuiz(quizId),
    getQuizRun(runId),
  ]);

  if (!quiz || !run || run.quizId !== quizId) return null;

  const attempts = await getRunAttempts(runId);
  return { quiz, run, attempts };
}

function buildQuizDescription(quiz: Quiz): string {
  if (quiz.description) return quiz.description;
  if (quiz.topic) {
    return `Take a ${quiz.questionCount}-question quiz about ${quiz.topic}.`;
  }
  return `Take this ${quiz.questionCount}-question quiz and compare your score.`;
}

function buildRunDescription(run: QuizRun, attempts: QuestionAttempt[]): string {
  const pct = scorePct(run);
  const proof = attempts.length > 0
    ? `${attempts.length} answer receipts`
    : `${run.total} questions`;
  return `Scored ${pct}%: ${run.correct}/${run.total} correct, best streak ${run.bestStreak}. View ${proof} before you start the quiz.`;
}

function scorePct(run: Pick<QuizRun, 'correct' | 'total'>): number {
  return run.total > 0 ? Math.round((run.correct / run.total) * 100) : 0;
}

function buildImage(quiz: Quiz): { url: string; alt: string } | undefined {
  if (!quiz.coverImageUrl) return undefined;
  return {
    url: quiz.coverImageUrl,
    alt: quiz.title,
  };
}
