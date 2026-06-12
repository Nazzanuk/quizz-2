import EditView from '@/Features/QuizDetail/EditView';

interface Props {
  params: Promise<{ quizId: string }>;
}

export default async function QuizEditPage({ params }: Props) {
  const { quizId } = await params;
  return <EditView quizId={quizId} />;
}
