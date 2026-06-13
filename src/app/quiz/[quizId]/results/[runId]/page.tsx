import type { Metadata } from 'next';
import ResultsPage from '@/Features/QuizResults/ResultsPage';
import { buildRunMetadata } from '@/Lib/SocialMetadata';

interface Props {
  params: Promise<{ quizId: string; runId: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { quizId, runId } = await params;
  return buildRunMetadata(quizId, runId);
}

export default async function QuizResultsRoute({ params }: Props) {
  const { quizId, runId } = await params;
  return <ResultsPage quizId={quizId} runId={runId} />;
}
