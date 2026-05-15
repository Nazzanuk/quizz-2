'use client';

import { useRouter } from 'next/navigation';
import { useSetAtom } from 'jotai';
import { useQuiz } from '@/Lib/Hooks/UseQuiz';
import { deleteQuiz } from '@/Lib/Api/Client';
import { confirmDialogAtom } from '@/State/UiAtoms';
import AppShell from '@/Features/Shared/AppShell';
import BlobField from '@/Features/Shared/BlobField';
import LoadingSpinner from '@/Features/Shared/LoadingSpinner';
import QuizHeader from './QuizHeader';
import QuestionList from './QuestionList';
import ActionBar from './ActionBar';
import styles from './DetailView.module.css';

interface DetailViewProps {
  quizId: string;
}

export default function DetailView({ quizId }: DetailViewProps) {
  const { quiz, questions } = useQuiz(quizId);
  const router = useRouter();
  const setConfirm = useSetAtom(confirmDialogAtom);

  const handleDelete = () => {
    setConfirm({
      title: 'Delete quiz',
      message: 'This will permanently remove the quiz and all its questions.',
      confirmLabel: 'Delete',
      onConfirm: async () => {
        await deleteQuiz(quizId);
        router.push('/');
      },
    });
  };

  if (!quiz) {
    return (
      <AppShell>
        <div className={styles.center}><LoadingSpinner /></div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <BlobField />
      <div className={styles.content}>
        <QuizHeader quiz={quiz} />
        <QuestionList questions={questions} />
        <ActionBar
          quizId={quizId}
          hasQuestions={questions.length > 0}
          onDelete={handleDelete}
        />
      </div>
    </AppShell>
  );
}
