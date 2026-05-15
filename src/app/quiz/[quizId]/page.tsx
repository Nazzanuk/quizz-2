import DetailView from '@/Features/QuizDetail/DetailView';

interface Props {
  params: Promise<{ quizId: string }>;
}

export default async function QuizDetailPage({ params }: Props) {
  const { quizId } = await params;
  return <DetailView quizId={quizId} />;
}
