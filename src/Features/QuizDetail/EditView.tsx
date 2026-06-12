'use client';

import { useState } from 'react';
import { useSetAtom } from 'jotai';
import { useTransitionRouter } from '@/Features/Shared/Navigate';
import { useQuiz } from '@/Lib/Hooks/UseQuiz';
import { deleteQuiz, generateMoreQuestions, updateQuiz } from '@/Lib/Api/Client';
import { confirmDialogAtom } from '@/State/UiAtoms';
import AppShell from '@/Features/Shared/AppShell';
import BlobField from '@/Features/Shared/BlobField';
import Button from '@/Features/Shared/Button';
import Card from '@/Features/Shared/Card';
import QuizHeader from './QuizHeader';
import QuestionList from './QuestionList';
import styles from './DetailView.module.css';

interface EditViewProps {
  quizId: string;
}

export default function EditView({ quizId }: EditViewProps) {
  const { quiz, questions, imagesPending, patchQuiz, patchQuestion, addQuestions } = useQuiz(quizId, { poll: true });
  const [addingQuestions, setAddingQuestions] = useState(false);
  const { navigate } = useTransitionRouter();
  const setConfirm = useSetAtom(confirmDialogAtom);

  const handleDelete = () => {
    setConfirm({
      title: 'Delete quiz',
      message: 'This will permanently remove the quiz and all its questions.',
      confirmLabel: 'Delete',
      onConfirm: async () => {
        await deleteQuiz(quizId);
        navigate('/');
      },
    });
  };

  const handleSaveHeader = async (data: { title: string; description: string | null }) => {
    const updated = await updateQuiz(quizId, data);
    patchQuiz(updated);
  };

  const handleAddQuestions = async () => {
    setAddingQuestions(true);
    try {
      const newQuestions = await generateMoreQuestions(quizId, 5);
      addQuestions(newQuestions);
    } finally {
      setAddingQuestions(false);
    }
  };

  if (!quiz) {
    return (
      <AppShell>
        <BlobField />
        <DetailLoadingState />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <BlobField />
      <div className={styles.content}>
        <span className="neo-sticker" aria-hidden="true">Editing</span>
        <QuizHeader
          quiz={quiz}
          editing
          onSave={handleSaveHeader}
          imagesPending={imagesPending}
        />

        <div className={styles.questionsHeader}>
          <h2 className={styles.questionsTitle}>
            Questions
            <span className={styles.count}>{questions.length}</span>
          </h2>
          <button
            className={styles.editToggle}
            onClick={() => navigate(`/quiz/${quizId}`)}
          >
            Done
          </button>
        </div>

        <QuestionList
          questions={questions}
          quizId={quizId}
          editing
          imagesPending={imagesPending}
          onUpdate={patchQuestion}
        />

        <div className={styles.editActions}>
          <button
            className={styles.addBtn}
            onClick={handleAddQuestions}
            disabled={addingQuestions}
          >
            {addingQuestions ? 'Adding...' : '+ Add 5 questions'}
          </button>
          <div className={styles.deleteWrap}>
            <Button variant="ghost" onClick={handleDelete}>Delete quiz</Button>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function DetailLoadingState() {
  return (
    <div className={styles.loadingContent} aria-hidden="true">
      <div className={`uiSkeleton ${styles.loadingCover}`} />
      <div className={`uiSkeleton ${styles.loadingTitle}`} />
      <div className={`uiSkeleton ${styles.loadingDesc}`} />
      <div className={styles.loadingMetaRow}>
        <div className={`uiSkeleton ${styles.loadingMeta}`} />
        <div className={`uiSkeleton ${styles.loadingPill}`} />
      </div>
      <div className={`uiSkeleton ${styles.loadingAction}`} />
      <div className={styles.loadingQuestionsHeader}>
        <div className={`uiSkeleton ${styles.loadingQuestionsTitle}`} />
        <div className={`uiSkeleton ${styles.loadingEditToggle}`} />
      </div>
      <div className={styles.loadingQuestionList}>
        {Array.from({ length: 3 }).map((_, index) => (
          <Card
            key={index}
            color={index % 2 === 0 ? 'sage' : 'lavender'}
            className={styles.loadingQuestionCard}
          >
            <div className={`uiSkeleton ${styles.loadingQuestionImage}`} />
            <div className={styles.loadingQuestionTop}>
              <div className={`uiSkeleton ${styles.loadingQuestionNumber}`} />
            </div>
            <div className={`uiSkeleton ${styles.loadingQuestionLineLg}`} />
            <div className={`uiSkeleton ${styles.loadingQuestionLineMd}`} />
            <div className={`uiSkeleton ${styles.loadingQuestionAnswer}`} />
          </Card>
        ))}
      </div>
    </div>
  );
}
