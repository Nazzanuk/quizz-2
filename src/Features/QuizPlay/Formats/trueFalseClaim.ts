import type { Question } from '@/Lib/Types';
import { shuffleArraySeeded } from '@/Lib/Utils';

export interface TrueFalseClaim {
  // The answer proposed to the player.
  claim: string;
  // Whether the proposed answer is actually correct (i.e. "True" is right).
  isTrue: boolean;
}

// Presents an existing multiple-choice question as true/false: propose either
// the real answer (→ True) or a distractor (→ False). Seeded by the question id
// so the renderer and the answer-checker agree, and so it stays stable while the
// question is on screen.
export function getTrueFalseClaim(question: Question): TrueFalseClaim {
  const options = question.options ?? [];
  const distractors = options.filter((option) => option !== question.answerText);
  const showTrue = distractors.length === 0
    || shuffleArraySeeded([true, false], `tf-coin:${question.id}`)[0];

  if (showTrue) {
    return { claim: question.answerText, isTrue: true };
  }
  return {
    claim: shuffleArraySeeded(distractors, `tf-claim:${question.id}`)[0],
    isTrue: false,
  };
}
