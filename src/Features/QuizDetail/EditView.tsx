'use client';

import { useEffect, useState } from 'react';
import { useSetAtom } from 'jotai';
import { useTransitionRouter } from '@/Features/Shared/Navigate';
import { useSession } from '@/Lib/Auth/Client';
import { useQuiz } from '@/Lib/Hooks/UseQuiz';
import {
  createQuestion,
  deleteQuestion,
  deleteQuiz,
  generateMoreQuestions,
  updateQuiz,
} from '@/Lib/Api/Client';
import { DEFAULT_QUESTIONS_PER_RUN, QUESTION_COUNT_OPTIONS } from '@/Lib/Constants';
import type { QuizVisibility } from '@/Lib/Types';
import { addToastAtom, confirmDialogAtom } from '@/State/UiAtoms';
import AppShell from '@/Features/Shared/AppShell';
import BlobField from '@/Features/Shared/BlobField';
import Button from '@/Features/Shared/Button';
import Card from '@/Features/Shared/Card';
import QuizUnavailable from '@/Features/Shared/QuizUnavailable';
import QuizHeader from './QuizHeader';
import QuestionList from './QuestionList';
import styles from './DetailView.module.css';

interface EditViewProps {
  quizId: string;
}

const VISIBILITY_OPTIONS: { value: QuizVisibility; label: string }[] = [
  { value: 'private', label: 'Private' },
  { value: 'unlisted', label: 'Unlisted' },
  { value: 'public', label: 'Public' },
];

const VISIBILITY_HINT: Record<QuizVisibility, string> = {
  private: 'Only you can open this quiz.',
  unlisted: 'Anyone with the link can play. Hidden from Discover.',
  public: 'Listed in Discover for everyone to find.',
};

export default function EditView({ quizId }: EditViewProps) {
  const { quiz, questions, imagesPending, error, notFound, patchQuiz, patchQuestion, addQuestions, removeQuestion } = useQuiz(quizId, { poll: true });
  const { data: session, isPending } = useSession();
  const [addingQuestions, setAddingQuestions] = useState(false);
  const [addingManual, setAddingManual] = useState(false);
  const { navigate, back, replace } = useTransitionRouter();
  const setConfirm = useSetAtom(confirmDialogAtom);
  const addToast = useSetAtom(addToastAtom);

  // Editing is owner-only (the API enforces this too). Anyone else who reaches
  // /edit directly is bounced back to the read-only detail page.
  const isOwner = Boolean(session?.user && quiz && quiz.ownerId === session.user.id);
  useEffect(() => {
    if (isPending || !quiz) return;
    if (!isOwner) replace(`/quiz/${quizId}`);
  }, [isPending, quiz, isOwner, quizId, replace]);

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

  // New questions append to the end of the list; nudge it into view so the user
  // can see what was added instead of nothing visibly changing.
  const scrollToNewQuestions = () => {
    requestAnimationFrame(() => {
      window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
    });
  };

  const handleAddQuestions = async () => {
    setAddingQuestions(true);
    try {
      const newQuestions = await generateMoreQuestions(quizId, 5);
      addQuestions(newQuestions);
      scrollToNewQuestions();
    } catch {
      addToast({ message: "Couldn't generate more questions — try again.", type: 'error' });
    } finally {
      setAddingQuestions(false);
    }
  };

  const handleAddManual = async () => {
    setAddingManual(true);
    try {
      const created = await createQuestion(quizId);
      addQuestions([created]);
      scrollToNewQuestions();
    } catch {
      addToast({ message: "Couldn't add a question — try again.", type: 'error' });
    } finally {
      setAddingManual(false);
    }
  };

  const handleDeleteQuestion = (questionId: string) => {
    setConfirm({
      title: 'Delete question',
      message: 'This removes the question from the quiz. This cannot be undone.',
      confirmLabel: 'Delete',
      onConfirm: async () => {
        try {
          await deleteQuestion(quizId, questionId);
          removeQuestion(questionId);
        } catch {
          addToast({ message: "Couldn't delete that question — try again.", type: 'error' });
        }
      },
    });
  };

  const handleSetPerRun = async (value: number) => {
    const previous = quiz?.questionsPerRun ?? DEFAULT_QUESTIONS_PER_RUN;
    patchQuiz({ questionsPerRun: value });
    try {
      await updateQuiz(quizId, { questionsPerRun: value });
    } catch {
      patchQuiz({ questionsPerRun: previous });
      addToast({ message: "Couldn't update questions per run — try again.", type: 'error' });
    }
  };

  const handleSetVisibility = async (value: QuizVisibility) => {
    const previous = quiz?.visibility;
    patchQuiz({ visibility: value });
    try {
      await updateQuiz(quizId, { visibility: value });
    } catch {
      if (previous) patchQuiz({ visibility: previous });
      addToast({ message: "Couldn't update visibility — try again.", type: 'error' });
    }
  };

  if (!quiz && error) {
    return <QuizUnavailable notFound={notFound} />;
  }

  // Hold the loading state until ownership is confirmed so the edit UI never
  // flashes for a non-owner (who is being redirected away).
  if (!quiz || isPending || !isOwner) {
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

        <div className={styles.perRun}>
          <div className={styles.perRunText}>
            <span className={styles.perRunLabel}>Visibility</span>
            <span className={styles.perRunSub}>{VISIBILITY_HINT[quiz.visibility]}</span>
          </div>
          <div className={styles.perRunPills}>
            {VISIBILITY_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                className={`${styles.perRunPill} ${quiz.visibility === option.value ? styles.perRunPillActive : ''}`}
                onClick={() => handleSetVisibility(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

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
