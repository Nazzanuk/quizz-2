'use client';

import { useEffect } from 'react';
import { useAtom, useSetAtom } from 'jotai';
import { currentQuizAtom, currentQuestionsAtom, isLoadingAtom } from '@/State/QuizAtoms';
import { fetchQuiz } from '@/Lib/Api/Client';

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

  return { quiz, questions };
}
