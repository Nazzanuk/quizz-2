import { HOST_MODE_CONFIG } from '@/Lib/Constants';
import { hashString } from '@/Lib/Utils';
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

// Variant pools keep the host from repeating himself. Picks are seeded per
// question + run, so a re-render replays the exact same line instead of
// rolling a new one.
const OPENER_LINES = {
  firstEasy: [
    'Warm-up one. Try not to overcomplicate basic literacy.',
    'A gentle starter. Embarrassing to miss, frankly.',
    'Opening softball. Swing with dignity.',
    'We begin with a freebie. Cherish it.',
  ],
  firstHard: [
    'Straight in, then. No gentle easing here.',
    'No warm-up tonight. Straight off the deep end.',
    'First question, and it already has teeth.',
    'We open with a proper one. Brace accordingly.',
  ],
  finalOnStreak: [
    'Final question. Try not to fumble the landing.',
    'Last one. A streak like that deserves a tidy finish.',
    'One left. Hot hands have dropped easier than this.',
    'The closer. Stick the landing and we say nothing more about it.',
  ],
  final: [
    'Last one. Plenty of time to rescue this.',
    'Final question. Redemption is still technically on the table.',
    'And we arrive at the end. Make it count.',
    'One more, then the judging begins.',
  ],
  hard: [
    'This is where people suddenly become revisionist historians about what they “definitely knew”.',
    'A spicy one. Guess with conviction if you must.',
    'Difficulty just went up a gear. Pretend you noticed gracefully.',
    'Proper thinker, this one. Take a breath.',
    'Here comes the separator. Sheep, goats, et cetera.',
  ],
  easy: [
    'Comfortably gettable, this. Don’t invent problems.',
    'A kind one. Accept the gift.',
    'Should be routine. Famous last words, obviously.',
    'Nothing sneaky here. Probably.',
  ],
  mid: [
    'Right, keep it moving.',
    'On we go.',
    'Next up. Eyes forward.',
    'No dawdling. Here’s another.',
    'Onwards. The quiz waits for no one.',
  ],
  rareCorrect: [
    (pct: number) => `Only ${pct}% of players have landed it. Pleasantly rude, that.`,
    (pct: number) => `${pct}% success rate on this one. The graveyard is full.`,
    (pct: number) => `Fair warning: just ${pct}% get this right.`,
  ],
  categoryStrong: [
    (cat: string) => `You normally behave yourself on ${cat}.`,
    (cat: string) => `${cat}. Usually your safe ground.`,
    (cat: string) => `Historically you’re decent at ${cat}. No pressure.`,
  ],
  categoryWeak: [
    (cat: string) => `${cat} again. Historically, not your cleanest work.`,
    (cat: string) => `Ah, ${cat}. Your old nemesis returns.`,
    (cat: string) => `${cat}. Past performance suggests caution.`,
  ],
};

function pick<T>(pool: T[], seed: string): T {
  return pool[hashString(seed) % pool.length];
}

export function buildQuestionOpener(args: {
  question: Question;
  index: number;
  total: number;
  streak: number;
  mode: HostMode;
  stats?: QuestionAggregateStats;
  profile: PlayerProfile;
  seed?: string;
}): string {
  const { question, index, total, streak, stats, profile } = args;
  const seed = `${args.seed ?? ''}:${question.id}:${index}`;
  const base: string[] = [];

  if (index === 0) {
    base.push(question.difficulty === 'easy'
      ? pick(OPENER_LINES.firstEasy, `${seed}:first`)
      : pick(OPENER_LINES.firstHard, `${seed}:first`));
  } else if (index + 1 === total) {
    base.push(streak >= 3
      ? pick(OPENER_LINES.finalOnStreak, `${seed}:final`)
      : pick(OPENER_LINES.final, `${seed}:final`));
  } else if (question.difficulty === 'hard') {
    base.push(pick(OPENER_LINES.hard, `${seed}:hard`));
  } else if (question.difficulty === 'easy') {
    base.push(pick(OPENER_LINES.easy, `${seed}:easy`));
  } else {
    base.push(pick(OPENER_LINES.mid, `${seed}:mid`));
  }

  if (stats && stats.attempts >= 5 && stats.correctPct !== null && stats.correctPct <= 25) {
    base.push(pick(OPENER_LINES.rareCorrect, `${seed}:rare`)(stats.correctPct));
  }

  const category = question.category?.trim();
  if (category) {
    const profileCategory = profile.categories[category];
    if (profileCategory && profileCategory.seen >= 3) {
      const accuracy = Math.round((profileCategory.correct / profileCategory.seen) * 100);
      if (accuracy >= 75) {
        base.push(pick(OPENER_LINES.categoryStrong, `${seed}:cat`)(category.toLowerCase()));
      } else if (accuracy <= 45) {
        base.push(pick(OPENER_LINES.categoryWeak, `${seed}:cat`)(category));
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

const REACTION_LINES = {
  correctArrogant: [
    'Annoyingly, that swagger was justified.',
    'Arrogant and right. The worst combination for me personally.',
    'Called it with full chest, landed it. Fine.',
    'Insufferable, but correct. Carry on.',
  ],
  correctStreak: [
    (n: number) => `That’s ${n} in a row. Confidence becoming a public hazard now.`,
    (n: number) => `${n} straight. Someone check this for wires.`,
    (n: number) => `A ${n}-question streak. Starting to look premeditated.`,
  ],
  correctRedemption: [
    'There we are. Redemption arc back on the rails.',
    'Bounced back. Very dignified of you.',
    'Recovery noted. We’ll pretend the last one never happened.',
    'Back from the dead. Lovely stuff.',
  ],
  correctFast: [
    'Correct. Suspiciously quick, that.',
    'Right, and instantly. Either brilliance or a lucky reflex.',
    'Barely let me finish. Correct, though.',
    'Snap answer, correct answer. Showing off slightly.',
  ],
  correctSlow: [
    'Correct. Eventually, but correctly.',
    'Got there. Scenic route, but got there.',
    'Correct. The pause was for drama, I assume.',
    'Right answer. The hesitation will be discussed later.',
  ],
  timeout: [
    (a: string) => `Time. The answer was ${a}. You let that one die on stage.`,
    (a: string) => `The clock wins. It was ${a}, for the record.`,
    (a: string) => `Nothing? Bold strategy. ${a} was the answer.`,
    (a: string) => `Time’s up. ${a}. Even a wild guess would’ve had a chance.`,
  ],
  wrongArrogant: [
    (a: string) => `Arrogant was a choice. ${a} was the correct one.`,
    (a: string) => `All that confidence, and it was ${a}. Delicious.`,
    (a: string) => `Swagger: maximum. Accuracy: not so much. ${a}.`,
    (a: string) => `Bold call. Wrong call. ${a} was the one.`,
  ],
  wrongFast: [
    (a: string) => `Nope. Impressively immediate, though. ${a} was right.`,
    (a: string) => `Instant and incorrect. Efficient, at least. It was ${a}.`,
    (a: string) => `Quick on the buzzer, wrong on the facts. ${a}.`,
  ],
  wrong: [
    (a: string) => `Not quite. ${a} was the answer.`,
    (a: string) => `Afraid not. ${a} was what we wanted.`,
    (a: string) => `No. The answer was ${a}. Moving swiftly on.`,
    (a: string) => `Close-ish. The correct answer was ${a}.`,
    (a: string) => `That’s a miss. ${a}, for future reference.`,
  ],
  smugMinority: [
    (pct: number) => `Only ${pct}% get that right. Welcome to the smug minority.`,
    (pct: number) => `Just ${pct}% manage that one. Quietly impressive.`,
    (pct: number) => `${pct}% success rate, and you’re in it. Noted.`,
  ],
  commonMiss: [
    (pct: number) => `To make it worse, ${pct}% usually get that one.`,
    (pct: number) => `${pct}% of players land that. Just saying.`,
    (pct: number) => `That one has a ${pct}% success rate. So. Yes.`,
  ],
};

export function buildAnswerReaction(args: {
  question: Question;
  attempt: SaveResultAttemptInput;
  mode: HostMode;
  stats?: QuestionAggregateStats;
  previousWasWrong: boolean;
  seed?: string;
}): string {
  const { question, attempt, stats, previousWasWrong, mode } = args;
  const parts: string[] = [];
  const showFactDrops = HOST_MODE_CONFIG[mode].showFactDrops;
  const answer = question.answerText;
  const seed = `${args.seed ?? ''}:${question.id}:reaction`;

  if (attempt.correct) {
    if (attempt.confidence === 'arrogant') {
      parts.push(pick(REACTION_LINES.correctArrogant, seed));
    } else if (attempt.streakAfter >= 5) {
      parts.push(pick(REACTION_LINES.correctStreak, seed)(attempt.streakAfter));
    } else if (previousWasWrong) {
      parts.push(pick(REACTION_LINES.correctRedemption, seed));
    } else if (attempt.responseMs <= 1800) {
      parts.push(pick(REACTION_LINES.correctFast, seed));
    } else {
      parts.push(pick(REACTION_LINES.correctSlow, seed));
    }
  } else if (attempt.timedOut) {
    parts.push(pick(REACTION_LINES.timeout, seed)(answer));
  } else {
    if (attempt.confidence === 'arrogant') {
      parts.push(pick(REACTION_LINES.wrongArrogant, seed)(answer));
    } else if (attempt.responseMs <= 1800) {
      parts.push(pick(REACTION_LINES.wrongFast, seed)(answer));
    } else {
      parts.push(pick(REACTION_LINES.wrong, seed)(answer));
    }
  }

  if (stats && stats.attempts >= 5 && stats.correctPct !== null) {
    if (attempt.correct && stats.correctPct <= 30) {
      parts.push(pick(REACTION_LINES.smugMinority, `${seed}:stats`)(stats.correctPct));
    } else if (!attempt.correct && stats.correctPct >= 75) {
      parts.push(pick(REACTION_LINES.commonMiss, `${seed}:stats`)(stats.correctPct));
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
