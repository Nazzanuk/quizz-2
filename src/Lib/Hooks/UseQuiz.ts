'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAtom, useSetAtom } from 'jotai';
import { currentQuizAtom, currentQuestionsAtom, isLoadingAtom } from '@/State/QuizAtoms';
import { ApiError, fetchQuiz } from '@/Lib/Api/Client';
import type { Quiz, Question, QuizWithQuestions } from '@/Lib/Types';

const POLL_INTERVAL_MS = 3000;
const MAX_POLL_DURATION_MS = 90_000;
const STALE_POLLS_TO_STOP = 3;

function imageSnapshot(data: QuizWithQuestions): string {
  return JSON.stringify({
    cover: data.coverImageUrl,
    qs: data.questions.map((q) => [q.imageUrl, q.optionImages]),
  });
}

export function useQuiz(id: string, options: { poll?: boolean } = {}) {
  const { poll = false } = options;
  const [storedQuiz, setQuiz] = useAtom(currentQuizAtom);
  const [storedQuestions, setQuestions] = useAtom(currentQuestionsAtom);
  const setLoading = useSetAtom(isLoadingAtom);
  const [imagesPending, setImagesPending] = useState(false);
  // Tracks a failed initial fetch (e.g. the quiz was deleted/made private, or a
  // network error) so consumers can show a real error screen instead of an
  // endless loading skeleton. Keyed by id so it self-resets when id changes.
  const [errorState, setErrorState] = useState<{ id: string; error: ApiError | Error } | null>(null);
  const error = errorState?.id === id ? errorState.error : null;
  const quiz = storedQuiz?.id === id ? storedQuiz : null;
  const questions = quiz ? storedQuestions : [];

  useEffect(() => {
    let cancelled = false;
    let loaded = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const pollStartedAt = Date.now();
    let lastSnapshot: string | null = null;
    let staleCount = 0;

    setLoading(true);
    setQuiz(null);
    setQuestions([]);

    const tick = async () => {
      let data: QuizWithQuestions;
      try {
        data = await fetchQuiz(id);
      } catch (err) {
        if (cancelled) return;
        // Keep any already-loaded quiz on screen if a later poll fails; only
        // surface the error when the initial fetch never succeeded.
        setLoading(false);
        setImagesPending(false);
        if (!loaded) {
          setErrorState({ id, error: err instanceof Error ? err : new Error('Failed to load quiz') });
        }
        return;
      }
      if (cancelled) return;
      loaded = true;
      setErrorState((prev) => (prev?.id === id ? null : prev));
      setQuiz(data);
      setQuestions(data.questions);
      setLoading(false);

      if (!poll) return;

      const snapshot = imageSnapshot(data);
      if (snapshot === lastSnapshot) staleCount++;
      else {
        staleCount = 0;
        lastSnapshot = snapshot;
      }

      const overBudget = Date.now() - pollStartedAt > MAX_POLL_DURATION_MS;
      const settled = staleCount >= STALE_POLLS_TO_STOP;

      if (!overBudget && !settled) {
        setImagesPending(true);
        timer = setTimeout(tick, POLL_INTERVAL_MS);
      } else {
        setImagesPending(false);
      }
    };

    tick();

    return () => {
      cancelled = true;
      setImagesPending(false);
      if (timer) clearTimeout(timer);
    };
  }, [id, poll]); // eslint-disable-line react-hooks/exhaustive-deps

  const patchQuiz = useCallback((data: Partial<Quiz>) => {
    setQuiz((prev) => (prev ? { ...prev, ...data } : prev));
  }, [setQuiz]);

  const patchQuestion = useCallback((questionId: string, data: Partial<Question>) => {
    setQuestions((prev) =>
      prev.map((q) => (q.id === questionId ? { ...q, ...data } : q)),
    );
  }, [setQuestions]);

  const addQuestions = useCallback((newQuestions: Question[]) => {
    setQuestions((prev) => [...prev, ...newQuestions]);
    setQuiz((prev) =>
      prev ? { ...prev, questionCount: prev.questionCount + newQuestions.length } : prev,
    );
  }, [setQuestions, setQuiz]);

  const removeQuestion = useCallback((questionId: string) => {
    setQuestions((prev) => prev.filter((q) => q.id !== questionId));
    setQuiz((prev) =>
      prev ? { ...prev, questionCount: Math.max(0, prev.questionCount - 1) } : prev,
    );
  }, [setQuestions, setQuiz]);

  const notFound = error instanceof ApiError && error.status === 404;

  return { quiz, questions, imagesPending, error, notFound, patchQuiz, patchQuestion, addQuestions, removeQuestion };
}
