import ResultsPage from '@/Features/QuizResults/ResultsPage';

interface Props {
  params: Promise<{ quizId: string; runId: string }>;
}

export default async function QuizResultsRoute({ params }: Props) {
  const { quizId, runId } = await params;
  return <ResultsPage quizId={quizId} runId={runId} />;
}
