import PlayView from '@/Features/QuizPlay/PlayView';

interface Props {
  params: Promise<{ quizId: string }>;
}

export default async function PlayQuizPage({ params }: Props) {
  const { quizId } = await params;
  return <PlayView quizId={quizId} />;
}
