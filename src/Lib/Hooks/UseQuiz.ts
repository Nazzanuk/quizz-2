'use client';

import { useEffect } from 'react';
import { useAtom, useSetAtom } from 'jotai';
import { currentQuizAtom, currentQuestionsAtom, isLoadingAtom } from '@/State/QuizAtoms';
import { fetchQuiz } from '@/Lib/Api/Client';
import type { Quiz, Question } from '@/Lib/Types';

export function useQuiz(id: string) {
  const [quiz, setQuiz] = useAtom(currentQuizAtom);
  const [questions, setQuestions] = useAtom(currentQuestionsAtom);
  const setLoading = useSetAtom(isLoadingAtom);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    fetchQuiz(id).then((data) => {
      if (cancelled) return;
      setQuiz(data);
      setQuestions(data.questions);
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });

    return () => { cancelled = true; };
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const patchQuiz = (data: Partial<Quiz>) => {
    setQuiz(prev => prev ? { ...prev, ...data } : prev);
  };

  const patchQuestion = (questionId: string, data: Partial<Question>) => {
    setQuestions(prev => prev.map(q => q.id === questionId ? { ...q, ...data } : q));
  };

  return { quiz, questions, patchQuiz, patchQuestion };
}
