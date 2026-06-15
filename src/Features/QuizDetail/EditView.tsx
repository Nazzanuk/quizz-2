'use client';

import { useState } from 'react';
import { useSetAtom } from 'jotai';
import { useTransitionRouter } from '@/Features/Shared/Navigate';
import { useQuiz } from '@/Lib/Hooks/UseQuiz';
import {
  createQuestion,
  deleteQuestion,
  deleteQuiz,
  generateMoreQuestions,
  updateQuiz,
} from '@/Lib/Api/Client';
import { DEFAULT_QUESTIONS_PER_RUN, QUESTION_COUNT_OPTIONS } from '@/Lib/Constants';
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
  const { quiz, questions, imagesPending, patchQuiz, patchQuestion, addQuestions, removeQuestion } = useQuiz(quizId, { poll: true });
  const [addingQuestions, setAddingQuestions] = useState(false);
  const [addingManual, setAddingManual] = useState(false);
  const { navigate, back } = useTransitionRouter();
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

  const handleAddManual = async () => {
    setAddingManual(true);
    try {
      const created = await createQuestion(quizId);
      addQuestions([created]);
    } finally {
      setAddingManual(false);
    }
  };

  const handleDeleteQuestion = async (questionId: string) => {
    removeQuestion(questionId);
    await deleteQuestion(quizId, questionId).catch(() => {});
  };

  const handleSetPerRun = async (value: number) => {
    patchQuiz({ questionsPerRun: value });
    await updateQuiz(quizId, { questionsPerRun: value }).catch(() => {});
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

        {questions.length >= 2 && (() => {
          const total = questions.length;
          const current = Math.min(quiz.questionsPerRun ?? DEFAULT_QUESTIONS_PER_RUN, total);
          const options = Array.from(
            new Set([...QUESTION_COUNT_OPTIONS.filter((n) => n < total), total]),
          ).sort((a, b) => a - b);
          return (
            <div className={styles.perRun}>
              <div className={styles.perRunText}>
                <span className={styles.perRunLabel}>Questions per run</span>
                <span className={styles.perRunSub}>Picked at random each time you play.</span>
              </div>
              <div className={styles.perRunPills}>
                {options.map((n) => (
                  <button
                    key={n}
                    type="button"
                    className={`${styles.perRunPill} ${n === current ? styles.perRunPillActive : ''}`}
                    onClick={() => handleSetPerRun(n)}
                  >
                    {n === total ? `All (${total})` : n}
                  </button>
                ))}
              </div>
            </div>
          );
        })()}

        <div className={styles.questionsHeader}>
          <h2 className={styles.questionsTitle}>
            Questions
            <span className={styles.count}>{questions.length}</span>
          </h2>
          <button
            className={styles.editToggle}
            onClick={() => {
              // Deep links land here with no in-app history to go back to
              if (window.history.length > 1) {
                back();
              } else {
                navigate(`/quiz/${quizId}`);
              }
            }}
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
          onDelete={handleDeleteQuestion}
        />

        <div className={styles.editActions}>
          <button
            className={styles.addBtn}
            onClick={handleAddManual}
            disabled={addingManual}
          >
            {addingManual ? 'Adding...' : '+ Add a question manually'}
          </button>
          <button
            className={styles.addBtn}
            onClick={handleAddQuestions}
            disabled={addingQuestions}
          >
            {addingQuestions ? 'Generating...' : '+ Generate 5 questions'}
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
