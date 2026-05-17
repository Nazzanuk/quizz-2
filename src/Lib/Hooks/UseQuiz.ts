'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAtom, useSetAtom } from 'jotai';
import { currentQuizAtom, currentQuestionsAtom, isLoadingAtom } from '@/State/QuizAtoms';
import { fetchQuiz } from '@/Lib/Api/Client';
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
  const [quiz, setQuiz] = useAtom(currentQuizAtom);
  const [questions, setQuestions] = useAtom(currentQuestionsAtom);
  const setLoading = useSetAtom(isLoadingAtom);
  const [imagesPending, setImagesPending] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const pollStartedAt = Date.now();
    let lastSnapshot: string | null = null;
    let staleCount = 0;

    setLoading(true);

    const tick = async () => {
      const data = await fetchQuiz(id);
      if (cancelled) return;
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

  return { quiz, questions, imagesPending, patchQuiz, patchQuestion, addQuestions };
}
