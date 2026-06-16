'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSetAtom } from 'jotai';
import {
  ApiError,
  deleteAdminQuiz,
  fetchAdminQuizzes,
  setQuizStatus,
  setQuizVisibility,
} from '@/Lib/Api/Client';
import { QUIZ_VISIBILITIES, type AdminQuizRow, type QuizVisibility } from '@/Lib/Types';
import { addToastAtom, confirmDialogAtom } from '@/State/UiAtoms';
import Card from '@/Features/Shared/Card';
import Button from '@/Features/Shared/Button';
import styles from './AdminPanels.module.css';

export default function QuizzesPanel() {
  const [search, setSearch] = useState('');
  const [quizzes, setQuizzes] = useState<AdminQuizRow[] | null>(null);
  const [forbidden, setForbidden] = useState(false);
  const addToast = useSetAtom(addToastAtom);
  const setConfirm = useSetAtom(confirmDialogAtom);

  const load = useCallback((q: string) => {
    fetchAdminQuizzes(q)
      .then((data) => {
        setQuizzes(data);
        setForbidden(false);
      })
      .catch((err) => {
        if (err instanceof ApiError && (err.status === 403 || err.status === 401)) setForbidden(true);
        setQuizzes([]);
      });
  }, []);

  // Debounce search.
  useEffect(() => {
    const id = window.setTimeout(() => load(search), 300);
    return () => window.clearTimeout(id);
  }, [search, load]);

  const patch = (id: string, fields: Partial<AdminQuizRow>) =>
    setQuizzes((prev) => prev?.map((q) => (q.id === id ? { ...q, ...fields } : q)) ?? prev);

  const changeVisibility = async (quiz: AdminQuizRow, visibility: QuizVisibility) => {
    patch(quiz.id, { visibility });
    try {
      await setQuizVisibility(quiz.id, visibility);
      addToast({ message: `Visibility: ${visibility}`, type: 'success' });
    } catch {
      addToast({ message: "Couldn't change visibility", type: 'error' });
    }
  };

  const toggleBlock = async (quiz: AdminQuizRow) => {
    const next = quiz.status === 'blocked' ? 'active' : 'blocked';
    patch(quiz.id, { status: next });
    try {
      await setQuizStatus(quiz.id, next);
    } catch {
      addToast({ message: "Couldn't update status", type: 'error' });
    }
  };

  const confirmDelete = (quiz: AdminQuizRow) => {
    setConfirm({
      title: 'Delete quiz',
      message: `Permanently delete "${quiz.title}" and all its runs, results, and images. This cannot be undone.`,
      confirmLabel: 'Delete',
      onConfirm: async () => {
        try {
          await deleteAdminQuiz(quiz.id);
          setQuizzes((prev) => prev?.filter((q) => q.id !== quiz.id) ?? prev);
          addToast({ message: `Deleted "${quiz.title}"`, type: 'success' });
        } catch {
          addToast({ message: "Couldn't delete that quiz", type: 'error' });
        }
      },
    });
  };

  return (
    <div className={styles.panel}>
      <div className={styles.toolbar}>
        <input
          className={styles.search}
          type="search"
          placeholder="Search title, topic, or owner email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search quizzes"
        />
      </div>

      {forbidden ? (
        <Card color="lavender" className={styles.state}><p>You don&apos;t have access.</p></Card>
      ) : quizzes === null ? (
        <Card color="bg" className={styles.state}><p>Loading quizzes…</p></Card>
      ) : quizzes.length === 0 ? (
        <Card color="sage" className={styles.state}><p>No quizzes match.</p></Card>
      ) : (
        quizzes.map((quiz) => (
          <Card key={quiz.id} color={quiz.status === 'blocked' ? 'lavender' : 'bg'} className={styles.card}>
            <div className={styles.rowTop}>
              <a href={`/quiz/${quiz.id}`} className={styles.title}>{quiz.title}</a>
            </div>
            <p className={styles.sub}>
              {quiz.ownerName ? `${quiz.ownerName} · ${quiz.ownerEmail}` : 'No owner'}
            </p>
            <div className={styles.badges}>
              <span className={styles.badge}>{quiz.visibility}</span>
              {quiz.status === 'blocked' && <span className={`${styles.badge} ${styles.badgeWarn}`}>Blocked</span>}
              <span className={styles.badge}>{quiz.questionCount} Qs</span>
              <span className={styles.badge}>{quiz.runCount} runs</span>
              {quiz.reportCount > 0 && <span className={`${styles.badge} ${styles.badgeWarn}`}>{quiz.reportCount} reports</span>}
            </div>
            <div className={styles.actions}>
              <select
                className={styles.select}
                value={quiz.visibility}
                onChange={(e) => changeVisibility(quiz, e.target.value as QuizVisibility)}
                aria-label={`Visibility for ${quiz.title}`}
              >
                {QUIZ_VISIBILITIES.map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
              <Button variant={quiz.status === 'blocked' ? 'secondary' : 'primary'} onClick={() => toggleBlock(quiz)}>
                {quiz.status === 'blocked' ? 'Unblock' : 'Block'}
              </Button>
              <button type="button" className={styles.danger} onClick={() => confirmDelete(quiz)}>
                Delete
              </button>
            </div>
          </Card>
        ))
      )}
    </div>
  );
}
