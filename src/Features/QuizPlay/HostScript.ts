import { HOST_MODE_CONFIG } from '@/Lib/Constants';
import type {
  HostConfidenceLevel,
  HostMode,
  PlayerProfile,
  Question,
  QuestionAggregateStats,
  SaveResultAttemptInput,
} from '@/Lib/Types';

export function shouldPromptConfidence(args: {
  question: Question;
  index: number;
  total: number;
  streak: number;
  previousWasWrong: boolean;
}): boolean {
  return args.index + 1 === args.total
    || args.question.difficulty === 'hard'
    || args.streak >= 3
    || args.previousWasWrong;
}

export function buildQuestionOpener(args: {
  question: Question;
  index: number;
  total: number;
  streak: number;
  mode: HostMode;
  stats?: QuestionAggregateStats;
  profile: PlayerProfile;
}): string {
  const { question, index, total, streak, stats, profile } = args;
  const base: string[] = [];

  if (index === 0) {
    base.push(question.difficulty === 'easy'
      ? 'Warm-up one. Try not to overcomplicate basic literacy.'
      : 'Straight in, then. No gentle easing here.');
  } else if (index + 1 === total) {
    base.push(streak >= 3
      ? 'Final question. Try not to fumble the landing.'
      : 'Last one. Plenty of time to rescue this.');
  } else if (question.difficulty === 'hard') {
    base.push('This is where people suddenly become revisionist historians about what they “definitely knew”.');
  } else if (question.difficulty === 'easy') {
    base.push('Comfortably gettable, this. Don’t invent problems.');
  } else {
    base.push('Right, keep it moving.');
  }

  if (stats && stats.attempts >= 5 && stats.correctPct !== null && stats.correctPct <= 25) {
    base.push(`Only ${stats.correctPct}% of players have landed it. Pleasantly rude, that.`);
  }

  const category = question.category?.trim();
  if (category) {
    const profileCategory = profile.categories[category];
    if (profileCategory && profileCategory.seen >= 3) {
      const accuracy = Math.round((profileCategory.correct / profileCategory.seen) * 100);
      if (accuracy >= 75) {
        base.push(`You normally behave yourself on ${category.toLowerCase()}.`);
      } else if (accuracy <= 45) {
        base.push(`${category} again. Historically, not your cleanest work.`);
      }
    }
  }

  return compress(base, args.mode);
}

export function buildConfidencePrompt(confidence: HostConfidenceLevel | null): string {
  if (confidence === 'arrogant') return 'Arrogant. Brave. Slightly suspect.';
  if (confidence === 'confident') return 'Confident. Reasonable. We love measured delusion.';
  if (confidence === 'safe') return 'Safe. Cautious. Very adult of you.';
  return 'How sure are you, then?';
}

export function buildAnswerReaction(args: {
  question: Question;
  attempt: SaveResultAttemptInput;
  mode: HostMode;
  stats?: QuestionAggregateStats;
  previousWasWrong: boolean;
}): string {
  const { question, attempt, stats, previousWasWrong, mode } = args;
  const parts: string[] = [];
  const showFactDrops = HOST_MODE_CONFIG[mode].showFactDrops;
  const answer = question.answerText;

  if (attempt.correct) {
    if (attempt.confidence === 'arrogant') {
      parts.push('Annoyingly, that swagger was justified.');
    } else if (attempt.streakAfter >= 5) {
      parts.push(`That’s ${attempt.streakAfter} in a row. Confidence becoming a public hazard now.`);
    } else if (previousWasWrong) {
      parts.push('There we are. Redemption arc back on the rails.');
    } else if (attempt.responseMs <= 1800) {
      parts.push('Correct. Suspiciously quick, that.');
    } else {
      parts.push('Correct. Eventually, but correctly.');
    }
  } else if (attempt.timedOut) {
    parts.push(`Time. The answer was ${answer}. You let that one die on stage.`);
  } else {
    if (attempt.confidence === 'arrogant') {
      parts.push(`Arrogant was a choice. ${answer} was the correct one.`);
    } else if (attempt.responseMs <= 1800) {
      parts.push(`Nope. Impressively immediate, though. ${answer} was right.`);
    } else {
      parts.push(`Not quite. ${answer} was the answer.`);
    }
  }

  if (stats && stats.attempts >= 5 && stats.correctPct !== null) {
    if (attempt.correct && stats.correctPct <= 30) {
      parts.push(`Only ${stats.correctPct}% get that right. Welcome to the smug minority.`);
    } else if (!attempt.correct && stats.correctPct >= 75) {
      parts.push(`To make it worse, ${stats.correctPct}% usually get that one.`);
    }
  }

  if (showFactDrops) {
    const detail = attempt.correct
      ? question.factText ?? question.explanation
      : question.explanation ?? question.factText;
    if (detail) parts.push(detail);
  }

  return compress(parts, mode);
}

export function getRunInsights(args: {
  questions: Question[];
  attempts: SaveResultAttemptInput[];
}): { strengths: string[]; weaknesses: string[] } {
  const byCategory = new Map<string, { seen: number; correct: number }>();
  const questionById = new Map(args.questions.map((question) => [question.id, question]));

  for (const attempt of args.attempts) {
    const category = questionById.get(attempt.questionId)?.category?.trim();
    if (!category) continue;
    const current = byCategory.get(category) ?? { seen: 0, correct: 0 };
    current.seen += 1;
    current.correct += attempt.correct ? 1 : 0;
    byCategory.set(category, current);
  }

  const ranked = [...byCategory.entries()]
    .map(([category, stats]) => ({
      category,
      seen: stats.seen,
      accuracy: stats.seen > 0 ? stats.correct / stats.seen : 0,
    }))
    .filter((item) => item.seen > 0)
    .sort((a, b) => b.accuracy - a.accuracy);

  return {
    strengths: ranked.filter((item) => item.accuracy >= 0.75).slice(0, 2).map((item) => item.category),
    weaknesses: [...ranked].reverse().filter((item) => item.accuracy <= 0.5).slice(0, 2).map((item) => item.category),
  };
}

export function averageResponseMs(attempts: SaveResultAttemptInput[]): number | null {
  if (attempts.length === 0) return null;
  const total = attempts.reduce((sum, attempt) => sum + attempt.responseMs, 0);
  return Math.round(total / attempts.length);
}

export function fastestResponseMs(attempts: SaveResultAttemptInput[]): number | null {
  if (attempts.length === 0) return null;
  return attempts.reduce((best, attempt) => Math.min(best, attempt.responseMs), Number.POSITIVE_INFINITY);
}

function compress(parts: string[], mode: HostMode): string {
  const filtered = parts.filter(Boolean);
  if (filtered.length === 0) return '';
  if (mode === 'quick') return filtered[0];
  return filtered.slice(0, 2).join(' ');
}
