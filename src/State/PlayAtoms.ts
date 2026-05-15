import { atom } from 'jotai';

export const currentIndexAtom = atom(0);
export const userAnswersAtom = atom<Map<string, string>>(new Map());
export const playActiveAtom = atom(false);
export const showResultAtom = atom(false);

export const scoreAtom = atom((get) => {
  const answers = get(userAnswersAtom);
  let correct = 0;
  answers.forEach((value) => {
    if (value === '__correct__') correct++;
  });
  return { correct, total: answers.size };
});

export const resetPlayAtom = atom(null, (_get, set) => {
  set(currentIndexAtom, 0);
  set(userAnswersAtom, new Map());
  set(playActiveAtom, false);
  set(showResultAtom, false);
});
