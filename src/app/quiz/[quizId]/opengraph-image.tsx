import { getQuiz } from '@/Lib/Db/Queries';
import { runMigrations } from '@/Lib/Db/Migrate';
import { OG_CONTENT_TYPE, OG_SIZE, renderOgImage } from '@/Features/Shared/OgImage';

export const alt = 'Quizz';
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image({ params }: { params: Promise<{ quizId: string }> }) {
  const { quizId } = await params;
  await runMigrations();
  const quiz = await getQuiz(quizId);

  return renderOgImage({
    eyebrow: 'Quiz',
    title: quiz?.title ?? 'Quizz',
    subtitle: quiz
      ? quiz.topic ?? `${quiz.questionCount} ${quiz.questionCount === 1 ? 'question' : 'questions'}`
      : 'Generate, play, and share AI-powered quizzes.',
    accent: '#6DEFFF',
  });
}
