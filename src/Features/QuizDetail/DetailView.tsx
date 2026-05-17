'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSetAtom } from 'jotai';
import { useTransitionRouter } from '@/Features/Shared/Navigate';
import { useQuiz } from '@/Lib/Hooks/UseQuiz';
import { deleteQuiz, updateQuiz, getResultsSummary, generateMoreQuestions } from '@/Lib/Api/Client';
import { confirmDialogAtom, addToastAtom } from '@/State/UiAtoms';
import { haptic } from '@/Features/Shared/Haptic';
import type { ResultsSummary } from '@/Lib/Types';
import AppShell from '@/Features/Shared/AppShell';
import BlobField from '@/Features/Shared/BlobField';
import Button from '@/Features/Shared/Button';
import Card from '@/Features/Shared/Card';
import QuizHeader from './QuizHeader';
import QuestionList from './QuestionList';
import styles from './DetailView.module.css';

interface DetailViewProps {
  quizId: string;
}

export default function DetailView({ quizId }: DetailViewProps) {
  const { quiz, questions, imagesPending, patchQuiz, patchQuestion, addQuestions } = useQuiz(quizId, { poll: true });
  const [editing, setEditing] = useState(false);
  const [stats, setStats] = useState<ResultsSummary | null>(null);
  const [addingQuestions, setAddingQuestions] = useState(false);
  const { navigate } = useTransitionRouter();
  const setConfirm = useSetAtom(confirmDialogAtom);
  const addToast = useSetAtom(addToastAtom);

  useEffect(() => {
    getResultsSummary(quizId)
      .then(setStats)
      .catch(() => {});
  }, [quizId]);

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

  const handleShare = async () => {
    const url = `${window.location.origin}/quiz/${quizId}/play`;
    await navigator.clipboard.writeText(url).catch(() => {});
    addToast({ message: 'Link copied', type: 'success' });
    haptic('tap');
  };

  const handleAddQuestions = async () => {
    setAddingQuestions(true);
    try {
      const newQuestions = await generateMoreQuestions(quizId, 5);
      addQuestions(newQuestions);
    } catch {
      // silently ignore — user can retry
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
        <QuizHeader
          quiz={quiz}
          editing={editing}
          onSave={handleSaveHeader}
          imagesPending={imagesPending}
        />

        {questions.length > 0 && (
          <>
            <Link href={`/quiz/${quizId}/play`} className={styles.playLink}>
              <Button variant="primary" fullWidth>Play quiz</Button>
            </Link>
            <div className={styles.metaRow}>
              {stats && stats.count > 0 && (
                <span className={styles.statsText}>
                  {stats.count} {stats.count === 1 ? 'play' : 'plays'}
                  {stats.best !== null && ` · Best: ${stats.best}%`}
                </span>
              )}
              <button className={styles.shareBtn} onClick={handleShare}>
                Share link
              </button>
            </div>
          </>
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
          imagesPending={imagesPending}
          onUpdate={patchQuestion}
        />

        {editing && (
          <div className={styles.editActions}>
            <button
              className={styles.addBtn}
              onClick={handleAddQuestions}
              disabled={addingQuestions}
            >
              {addingQuestions ? 'Adding…' : '+ Add 5 questions'}
            </button>
            <div className={styles.deleteWrap}>
              <Button variant="ghost" onClick={handleDelete}>Delete quiz</Button>
            </div>
          </div>
        )}
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
