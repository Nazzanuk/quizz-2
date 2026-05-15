'use client';

import { useEffect } from 'react';
import { useAtom, useSetAtom } from 'jotai';
import { quizListAtom, isLoadingAtom } from '@/State/QuizAtoms';
import { fetchQuizzes } from '@/Lib/Api/Client';

export function useQuizzes() {
  const [quizzes, setQuizzes] = useAtom(quizListAtom);
  const setLoading = useSetAtom(isLoadingAtom);

  const load = async () => {
    setLoading(true);
    try {
      const data = await fetchQuizzes();
      setQuizzes(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return { quizzes, reload: load };
}
