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
    'First ball over the net. Do not volley it into the car park.',
    'Starting kindly. Suspicious, but kindly.',
    'A small courtesy from the quiz. Spend it wisely.',
    'Easy opener. The trap is assuming there is a trap.',
    'A polite beginning. Try not to make it dramatic.',
    'Soft launch for the brain. Minimal paperwork required.',
  ],
  firstHard: [
    'Straight in, then. No gentle easing here.',
    'No warm-up tonight. Straight off the deep end.',
    'First question, and it already has teeth.',
    'We open with a proper one. Brace accordingly.',
    'No shallow end today. Shoes off, dignity optional.',
    'A nasty opener. Very democratic: everyone suffers.',
    'Starting with a wallop. Character-building, allegedly.',
    'The quiz has chosen violence early.',
    'First up: a question with elbows.',
    'Opening gambit: mildly hostile.',
  ],
  finalOnStreak: [
    'Final question. Try not to fumble the landing.',
    'Last one. A streak like that deserves a tidy finish.',
    'One left. Hot hands have dropped easier than this.',
    'The closer. Stick the landing and we say nothing more about it.',
    'Final hurdle. Do not trip over the ribbon.',
    'Last serve. The streak is watching from the balcony.',
    'One more. Keep the wheels on until the car park.',
    'Closing time. Finish it without inventing a tragedy.',
    'Final one. A clean exit would be tasteful.',
  ],
  final: [
    'Last one. Plenty of time to rescue this.',
    'Final question. Redemption is still technically on the table.',
    'And we arrive at the end. Make it count.',
    'One more, then the judging begins.',
    'Last call. Put something sensible on the board.',
    'Final stop. Check your pockets for spare knowledge.',
    'One question left. Heroics remain legally available.',
    'The finish line appears, looking judgemental.',
    'Last one. Leave with evidence of schooling.',
    'Final swing. Aim somewhere near the facts.',
  ],
  hard: [
    'This is where people suddenly become revisionist historians about what they “definitely knew”.',
    'A spicy one. Guess with conviction if you must.',
    'Difficulty just went up a gear. Pretend you noticed gracefully.',
    'Proper thinker, this one. Take a breath.',
    'Here comes the separator. Sheep, goats, et cetera.',
    'This one has corners. Mind your shins.',
    'A question with a clipboard and no sense of mercy.',
    'Not impossible. Merely rude.',
    'Here is a little intellectual pothole for you.',
    'A tougher plate. Chew before swallowing.',
    'This is not a vibes-only question, tragically.',
    'A hard one. Time to look accidentally scholarly.',
    'Careful now. This one rewards reading the label.',
  ],
  easy: [
    'Comfortably gettable, this. Don’t invent problems.',
    'A kind one. Accept the gift.',
    'Should be routine. Famous last words, obviously.',
    'Nothing sneaky here. Probably.',
    'This should be in range. Do not over-steer.',
    'An approachable one. Approach it, then.',
    'Friendly enough. Which is when people get silly.',
    'A tap-in, if you know where the goal is.',
    'This one is wearing a name badge.',
    'Low fence. Still possible to fall over it.',
    'A generous question. Rare. Enjoy the weather.',
    'Readable, reachable, and still somehow missable.',
  ],
  mid: [
    'Right, keep it moving.',
    'On we go.',
    'Next up. Eyes forward.',
    'No dawdling. Here’s another.',
    'Onwards. The quiz waits for no one.',
    'Next round. Shoulders back.',
    'Another one. Stay with the room.',
    'New question, same suspicious atmosphere.',
    'Keep the pencil sharp.',
    'We proceed, with moderate concern.',
    'Next item on the menu.',
    'Back to business.',
    'Fresh question. Old pressure.',
    'Let us see what falls out of the memory cupboard.',
    'Steady hands now.',
    'Question incoming. Try looking prepared.',
    'We move. The facts are not moving with us.',
    'Another chance to look composed.',
    'The board turns. Your move.',
    'Next one. No ceremony.',
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
    (cat: string) => `${cat}. Your numbers here are annoyingly respectable.`,
    (cat: string) => `This is ${cat}, where you have previously looked employable.`,
  ],
  categoryWeak: [
    (cat: string) => `${cat} again. Historically, not your cleanest work.`,
    (cat: string) => `Ah, ${cat}. Your old nemesis returns.`,
    (cat: string) => `${cat}. Past performance suggests caution.`,
    (cat: string) => `${cat}. The archive has concerns.`,
    (cat: string) => `It is ${cat}, where your record has made several faces.`,
  ],
};

function pick<T>(pool: T[], seed: string): T {
  return pool[hashString(seed) % pool.length];
}

const INTRO_LINES = {
  firstRun: [
    (title: string, count: number) => `${title}. ${count} questions, one scoreboard, and a limited supply of dignity.`,
    (title: string, count: number) => `Welcome to ${title}: ${count} chances to prove this was a good idea.`,
    (title: string, count: number) => `${title}. ${count} questions. I have low expectations and a pencil.`,
    (title: string, count: number) => `Fresh round: ${title}. ${count} questions between you and a very public number.`,
  ],
  returning: [
    (title: string, best: number) => `${title} again. Your best is ${best}%, so the benchmark is already gossiping.`,
    (title: string, best: number) => `Back to ${title}. The score to beat is ${best}%, inconveniently recorded.`,
    (title: string, best: number) => `${title}. Previous best: ${best}%. Try to improve without looking surprised.`,
    (title: string, best: number) => `Another tilt at ${title}. ${best}% is the line in the sand.`,
  ],
  hard: [
    (title: string, hardCount: number) => `${title}. ${hardCount} hard ones in the mix, because comfort builds no character.`,
    (title: string, hardCount: number) => `${title}. I count ${hardCount} nastier questions. Lovely weather for panic.`,
    (title: string, hardCount: number) => `${title}. ${hardCount} hard questions are waiting with clipboards.`,
  ],
  topic: [
    (topic: string, count: number) => `${count} questions on ${topic}. A neat little audit of what stuck.`,
    (topic: string, count: number) => `${topic}, ${count} questions, and no room for interpretive dance.`,
    (topic: string, count: number) => `Tonight's topic is ${topic}. ${count} questions. Try not to negotiate with them.`,
  ],
  mixed: [
    (count: number) => `${count} questions from the mixed bag. Some of them may even be friendly.`,
    (count: number) => `Mixed round, ${count} questions. Excellent conditions for misplaced confidence.`,
    (count: number) => `${count} questions, several moods, one increasingly visible score.`,
  ],
};

const RECAP_LINES = {
  score: [
    (correct: number, total: number) => `${correct} out of ${total}.`,
    (correct: number, total: number) => `Final tally: ${correct}/${total}.`,
    (correct: number, total: number) => `Scoreboard says ${correct} from ${total}.`,
    (correct: number, total: number) => `${correct} correct, ${total - correct} left making statements to police.`,
  ],
  strongStreak: [
    (n: number) => `A ${n}-question streak gave the room something to discuss.`,
    (n: number) => `${n} in a row was genuinely decent, annoyingly.`,
    (n: number) => `Best streak ${n}. Proof that momentum briefly visited.`,
    (n: number) => `You strung together ${n}, which almost looked planned.`,
  ],
  weakStreak: [
    'No major streak, but the structure remained mostly upright.',
    'No heroic run of answers, but nobody had to call safety.',
    'The streak column stayed modest. Very tasteful.',
    'No huge streaks today. The engine coughed but continued.',
  ],
  speed: [
    (ms: number) => `Fastest answer ${formatMs(ms)}.`,
    (ms: number) => `Quickest strike: ${formatMs(ms)}.`,
    (ms: number) => `Fastest correct-looking reflex: ${formatMs(ms)}.`,
    (ms: number) => `Best pace moment came in at ${formatMs(ms)}.`,
  ],
  strengths: [
    (items: string[]) => `You looked sharp on ${items.join(' and ')}.`,
    (items: string[]) => `${items.join(' and ')} behaved nicely for you.`,
    (items: string[]) => `The bright spots were ${items.join(' and ')}.`,
  ],
  weaknesses: [
    (items: string[]) => `${items.join(' and ')} still need a quiet word.`,
    (items: string[]) => `${items.join(' and ')} made unnecessary theatre.`,
    (items: string[]) => `Have a word with ${items.join(' and ')} before the next outing.`,
  ],
  pace: [
    'The pace suggested confidence, recklessness, or both.',
    'You moved quickly enough to worry the furniture.',
    'Tempo was high. Accuracy filed a separate report.',
  ],
};

export function buildSessionIntro(args: {
  title: string;
  topic?: string | null;
  count: number;
  mode: HostMode;
  profile: PlayerProfile;
  categories: string[];
  hardCount: number;
  seed?: string;
}): string {
  const seed = `${args.seed ?? ''}:${args.title}:${args.count}:intro`;
  const title = args.title.trim() || 'This quiz';
  const topic = args.topic?.trim();

  if (args.profile.bestPct !== null && args.profile.totalRuns > 0) {
    return compress([
      pick(INTRO_LINES.returning, `${seed}:returning`)(title, args.profile.bestPct),
      args.hardCount >= 2
        ? pick(INTRO_LINES.hard, `${seed}:hard`)(title, args.hardCount)
        : '',
    ], args.mode);
  }

  if (args.hardCount >= Math.max(2, Math.ceil(args.count / 3))) {
    return pick(INTRO_LINES.hard, `${seed}:hard`)(title, args.hardCount);
  }

  if (topic) {
    return pick(INTRO_LINES.topic, `${seed}:topic`)(topic.toLowerCase(), args.count);
  }

  if (args.categories.length >= 3) {
    return pick(INTRO_LINES.mixed, `${seed}:mixed`)(args.count);
  }

  return pick(INTRO_LINES.firstRun, `${seed}:first`)(title, args.count);
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
    'The confidence was loud, and irritatingly accurate.',
    'You strutted into that one and somehow did not fall over.',
    'Correct with swagger. I will be billing you for the atmosphere.',
    'Smugness authorized, briefly.',
  ],
  correctStreak: [
    (n: number) => `That’s ${n} in a row. Confidence becoming a public hazard now.`,
    (n: number) => `${n} straight. Someone check this for wires.`,
    (n: number) => `A ${n}-question streak. Starting to look premeditated.`,
    (n: number) => `${n} on the bounce. The room is getting suspicious.`,
    (n: number) => `${n} consecutive. Try not to develop a brand.`,
    (n: number) => `That makes ${n}. Momentum has entered the chat.`,
  ],
  correctRedemption: [
    'There we are. Redemption arc back on the rails.',
    'Bounced back. Very dignified of you.',
    'Recovery noted. We’ll pretend the last one never happened.',
    'Back from the dead. Lovely stuff.',
    'That steadies the ship. The previous wobble is under review.',
    'A clean recovery. Put that in the brochure.',
    'Back in business. The shame drawer closes for now.',
    'Corrective action completed.',
  ],
  correctFast: [
    'Correct. Suspiciously quick, that.',
    'Right, and instantly. Either brilliance or a lucky reflex.',
    'Barely let me finish. Correct, though.',
    'Snap answer, correct answer. Showing off slightly.',
    'Correct before the dust settled.',
    'Fast and right. Dangerous combination.',
    'That was quick enough to look rehearsed.',
    'Immediate and accurate. Rude, frankly.',
    'Correct at speed. The keyboard barely got a vote.',
  ],
  correctSlow: [
    'Correct. Eventually, but correctly.',
    'Got there. Scenic route, but got there.',
    'Correct. The pause was for drama, I assume.',
    'Right answer. The hesitation will be discussed later.',
    'Correct after a respectful amount of theatre.',
    'You found it in the back cupboard. Counts all the same.',
    'Right answer, late entrance.',
    'Correct. The suspense was unpaid labor.',
    'Took the long corridor, arrived at the right door.',
  ],
  timeout: [
    (a: string) => `Time. The answer was ${a}. You let that one die on stage.`,
    (a: string) => `The clock wins. It was ${a}, for the record.`,
    (a: string) => `Nothing? Bold strategy. ${a} was the answer.`,
    (a: string) => `Time’s up. ${a}. Even a wild guess would’ve had a chance.`,
    (a: string) => `And the timer takes the point. ${a}, if you were curious.`,
    (a: string) => `That silence cost you. ${a} was sitting right there.`,
    (a: string) => `Too late. ${a}. The clock is unbearably smug.`,
    (a: string) => `No answer submitted. ${a} was the escape hatch.`,
  ],
  wrongArrogant: [
    (a: string) => `Arrogant was a choice. ${a} was the correct one.`,
    (a: string) => `All that confidence, and it was ${a}. Delicious.`,
    (a: string) => `Swagger: maximum. Accuracy: not so much. ${a}.`,
    (a: string) => `Bold call. Wrong call. ${a} was the one.`,
    (a: string) => `That confidence wrote a cheque to ${a}. It bounced.`,
    (a: string) => `Full swagger, wrong postcode. ${a} was home.`,
    (a: string) => `You said it like a courtroom verdict. ${a} disagrees.`,
    (a: string) => `Confidence arrived first. ${a} brought the facts.`,
  ],
  wrongFast: [
    (a: string) => `Nope. Impressively immediate, though. ${a} was right.`,
    (a: string) => `Instant and incorrect. Efficient, at least. It was ${a}.`,
    (a: string) => `Quick on the buzzer, wrong on the facts. ${a}.`,
    (a: string) => `Fast miss. ${a} had not even taken its coat off.`,
    (a: string) => `You sprinted past ${a}, which was unfortunate.`,
    (a: string) => `Rapid, decisive, incorrect. ${a}.`,
    (a: string) => `The speed was impressive. The answer was ${a}.`,
  ],
  wrong: [
    (a: string) => `Not quite. ${a} was the answer.`,
    (a: string) => `Afraid not. ${a} was what we wanted.`,
    (a: string) => `No. The answer was ${a}. Moving swiftly on.`,
    (a: string) => `Close-ish. The correct answer was ${a}.`,
    (a: string) => `That’s a miss. ${a}, for future reference.`,
    (a: string) => `Not that. ${a} was the sensible option.`,
    (a: string) => `Incorrect. ${a} was waving from the correct pile.`,
    (a: string) => `Missed it. ${a} takes the point.`,
    (a: string) => `No joy there. ${a} was the one.`,
    (a: string) => `That lands wide. ${a}, officially.`,
    (a: string) => `Wrong turn. ${a} was the signpost.`,
  ],
  smugMinority: [
    (pct: number) => `Only ${pct}% get that right. Welcome to the smug minority.`,
    (pct: number) => `Just ${pct}% manage that one. Quietly impressive.`,
    (pct: number) => `${pct}% success rate, and you’re in it. Noted.`,
    (pct: number) => `${pct}% get there. You may be pleased, but quietly.`,
    (pct: number) => `That one only falls for ${pct}%. Decent work.`,
  ],
  commonMiss: [
    (pct: number) => `To make it worse, ${pct}% usually get that one.`,
    (pct: number) => `${pct}% of players land that. Just saying.`,
    (pct: number) => `That one has a ${pct}% success rate. So. Yes.`,
    (pct: number) => `${pct}% usually make it through there. Awkward filing.`,
    (pct: number) => `For context, ${pct}% get that. Context can be cruel.`,
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

export function buildFallbackRecap(args: {
  correct: number;
  total: number;
  bestStreak: number;
  fastestMs: number | null;
  averageMs: number | null;
  strengths: string[];
  weaknesses: string[];
  mode: HostMode;
  seed?: string;
}): string {
  const seed = `${args.seed ?? ''}:${args.correct}:${args.total}:recap`;
  const parts = [
    pick(RECAP_LINES.score, `${seed}:score`)(args.correct, args.total),
    args.bestStreak >= 3
      ? pick(RECAP_LINES.strongStreak, `${seed}:streak`)(args.bestStreak)
      : pick(RECAP_LINES.weakStreak, `${seed}:streak`),
    args.fastestMs !== null
      ? pick(RECAP_LINES.speed, `${seed}:speed`)(args.fastestMs)
      : '',
    args.strengths.length > 0
      ? pick(RECAP_LINES.strengths, `${seed}:strengths`)(args.strengths)
      : '',
    args.weaknesses.length > 0
      ? pick(RECAP_LINES.weaknesses, `${seed}:weaknesses`)(args.weaknesses)
      : '',
    args.averageMs !== null && args.averageMs <= 2200
      ? pick(RECAP_LINES.pace, `${seed}:pace`)
      : '',
  ].filter(Boolean);

  return compress(parts, args.mode);
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

function formatMs(value: number): string {
  return `${(value / 1000).toFixed(1)}s`;
}
