'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSetAtom } from 'jotai';
import { useQuiz } from '@/Lib/Hooks/UseQuiz';
import { deleteQuiz, updateQuiz } from '@/Lib/Api/Client';
import { confirmDialogAtom } from '@/State/UiAtoms';
import AppShell from '@/Features/Shared/AppShell';
import BlobField from '@/Features/Shared/BlobField';
import Button from '@/Features/Shared/Button';
import LoadingSpinner from '@/Features/Shared/LoadingSpinner';
import QuizHeader from './QuizHeader';
import QuestionList from './QuestionList';
import styles from './DetailView.module.css';

interface DetailViewProps {
  quizId: string;
}

export default function DetailView({ quizId }: DetailViewProps) {
  const { quiz, questions, patchQuiz, patchQuestion } = useQuiz(quizId, { poll: true });
  const [editing, setEditing] = useState(false);
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

  const handleSaveHeader = async (data: { title: string; description: string | null }) => {
    const updated = await updateQuiz(quizId, data);
    patchQuiz(updated);
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
        <QuizHeader
          quiz={quiz}
          editing={editing}
          onSave={handleSaveHeader}
        />

        {questions.length > 0 && (
          <Link href={`/quiz/${quizId}/play`} className={styles.playLink}>
            <Button variant="primary" fullWidth>Play quiz</Button>
          </Link>
        )}

        <div className={styles.questionsHeader}>
          <h2 className={styles.questionsTitle}>
            Questions
            <span className={styles.count}>{questions.length}</span>
          </h2>
          <button
            className={`${styles.editToggle} ${editing ? styles.editToggleActive : ''}`}
            onClick={() => setEditing(v => !v)}
          >
            {editing ? 'Done' : 'Edit'}
          </button>
        </div>

        <QuestionList
          questions={questions}
          quizId={quizId}
          editing={editing}
          onUpdate={patchQuestion}
        />

        {editing && (
          <div className={styles.deleteWrap}>
            <Button variant="ghost" onClick={handleDelete}>Delete quiz</Button>
          </div>
        )}
      </div>
    </AppShell>
  );
}
