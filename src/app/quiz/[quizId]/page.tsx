import type { Metadata } from 'next';
import DetailView from '@/Features/QuizDetail/DetailView';
import { buildQuizMetadata } from '@/Lib/SocialMetadata';

interface Props {
  params: Promise<{ quizId: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { quizId } = await params;
  return buildQuizMetadata(quizId);
}

export default async function QuizDetailPage({ params }: Props) {
  const { quizId } = await params;
  return <DetailView quizId={quizId} />;
}
