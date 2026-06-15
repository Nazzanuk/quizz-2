import { and, desc, eq, gt, inArray, sql } from 'drizzle-orm';
import { db } from './Client';
import { quizzes, questions, images, quizResults, quizRuns, questionAttempts, user } from './Schema';
import {
  normalizeHostConfidenceLevel,
  normalizeHostMode,
  normalizeHostPersona,
  normalizeQuestionDifficulty,
  normalizeQuizFormat,
  normalizeQuizVisibility,
  type HostMode,
  type HostPersona,
  type QuestionAttempt,
  type Question,
  type QuestionAggregateStats,
  type QuestionDifficulty,
  type Quiz,
  type QuizAggregateStats,
  type QuizFormat,
  type QuizRun,
  type QuizRunWithTitle,
  type QuizVisibility,
  type StatsTotals,
  type ResultsSummary,
  type SaveResultAttemptInput,
} from '../Types';
import { STARTER_CREDITS } from '../Constants';
import { nowISO } from '../Utils';

// Owner-scoped: the dashboard only ever lists the signed-in creator's quizzes.
export async function listQuizzes(ownerId: string): Promise<Quiz[]> {
  const rows = await db
    .select()
    .from(quizzes)
    .where(eq(quizzes.ownerId, ownerId))
    .orderBy(desc(quizzes.updatedAt));
  return rows.map(parseQuiz);
}

export async function getQuiz(id: string): Promise<Quiz | undefined> {
  const [row] = await db.select().from(quizzes).where(eq(quizzes.id, id));
  return row ? parseQuiz(row) : undefined;
}

export async function getQuestions(quizId: string): Promise<Question[]> {
  const rows = await db
    .select()
    .from(questions)
    .where(eq(questions.quizId, quizId))
    .orderBy(questions.order);
  return rows.map(parseQuestion);
}

export async function insertQuiz(data: {
  id: string;
  ownerId?: string | null;
  visibility?: QuizVisibility;
  title: string;
  description?: string;
  topic?: string;
  sourceMaterial?: string;
  format: QuizFormat;
  questionCount?: number;
  questionsPerRun?: number | null;
}): Promise<Quiz> {
  const now = nowISO();
  const [row] = await db
    .insert(quizzes)
    .values({
      ...data,
      ownerId: data.ownerId ?? null,
      visibility: data.visibility ?? 'unlisted',
      createdAt: now,
      updatedAt: now,
    })
    .returning();
  return parseQuiz(row);
}

type InsertQuestion = {
  id: string;
  quizId: string;
  questionText: string;
  answerText: string;
  options?: string[] | null;
  optionImages?: (string | null)[] | null;
  imageUrl?: string | null;
  imagePrompt?: string | null;
  format: QuizFormat;
  category?: string | null;
  difficulty?: QuestionDifficulty | null;
  explanation?: string | null;
  factText?: string | null;
  tags?: string[] | null;
  order: number;
};

export async function insertQuestions(items: InsertQuestion[]): Promise<void> {
  if (items.length === 0) return;
  await db.insert(questions).values(
    items.map((q) => ({
      ...q,
      options: q.options ? JSON.stringify(q.options) : null,
      optionImages: q.optionImages ? JSON.stringify(q.optionImages) : null,
      imageUrl: q.imageUrl ?? null,
      imagePrompt: q.imagePrompt ?? null,
      category: q.category ?? null,
      difficulty: q.difficulty ?? null,
      explanation: q.explanation ?? null,
      factText: q.factText ?? null,
      tags: q.tags ? JSON.stringify(q.tags) : null,
    })),
  );
}

export async function updateQuiz(
  id: string,
  data: Partial<Pick<Quiz, 'title' | 'description' | 'coverImageUrl' | 'questionCount' | 'questionsPerRun'>>,
): Promise<Quiz | undefined> {
  const [row] = await db
    .update(quizzes)
    .set({ ...data, updatedAt: nowISO() })
    .where(eq(quizzes.id, id))
    .returning();
  return row as Quiz | undefined;
}

export async function deleteQuiz(id: string): Promise<void> {
  await db.delete(quizzes).where(eq(quizzes.id, id));
}

export async function updateQuestion(
  id: string,
  data: {
    questionText?: string;
    answerText?: string;
    options?: string[] | null;
    imagePrompt?: string | null;
    imageUrl?: string | null;
  },
): Promise<Question | undefined> {
  const set: Partial<typeof questions.$inferInsert> = {};
  if (data.questionText !== undefined) set.questionText = data.questionText;
  if (data.answerText !== undefined) set.answerText = data.answerText;
  if (data.options !== undefined) set.options = data.options ? JSON.stringify(data.options) : null;
  if (data.imagePrompt !== undefined) set.imagePrompt = data.imagePrompt;
  if (data.imageUrl !== undefined) set.imageUrl = data.imageUrl;

  const [row] = await db
    .update(questions)
    .set(set)
    .where(eq(questions.id, id))
    .returning();
  return row ? parseQuestion(row) : undefined;
}

export async function deleteQuestion(id: string): Promise<void> {
  await db.delete(questions).where(eq(questions.id, id));
}

export async function updateQuestionHostMetadata(
  id: string,
  data: {
    category?: string | null;
    difficulty?: QuestionDifficulty | null;
    explanation?: string | null;
    factText?: string | null;
    tags?: string[] | null;
  },
): Promise<Question | undefined> {
  const set: Partial<typeof questions.$inferInsert> = {};
  if (data.category !== undefined) set.category = data.category;
  if (data.difficulty !== undefined) set.difficulty = data.difficulty;
  if (data.explanation !== undefined) set.explanation = data.explanation;
  if (data.factText !== undefined) set.factText = data.factText;
  if (data.tags !== undefined) set.tags = data.tags ? JSON.stringify(data.tags) : null;

  const [row] = await db
    .update(questions)
    .set(set)
    .where(eq(questions.id, id))
    .returning();
  return row ? parseQuestion(row) : undefined;
}

export async function updateQuestionImage(
  id: string,
  imageUrl: string,
): Promise<void> {
  await db.update(questions).set({ imageUrl }).where(eq(questions.id, id));
}

export async function updateQuestionOptionImages(
  id: string,
  optionImages: (string | null)[],
): Promise<void> {
  await db
    .update(questions)
    .set({ optionImages: JSON.stringify(optionImages) })
    .where(eq(questions.id, id));
}

export async function insertQuizResult(data: {
  id: string;
  quizId: string;
  correct: number;
  total: number;
  perQuestion: Record<string, string>;
}): Promise<void> {
  await db.insert(quizResults).values({
    ...data,
    perQuestion: JSON.stringify(data.perQuestion),
    createdAt: nowISO(),
  });
}

export async function insertQuizRun(data: {
  id: string;
  quizId: string;
  mode: HostMode;
  hostPersona: HostPersona;
  correct: number;
  total: number;
  bestStreak: number;
  elapsedMs: number;
  recap: string | null;
  attempts: SaveResultAttemptInput[];
}): Promise<void> {
  const createdAt = nowISO();
  await db.insert(quizRuns).values({
    id: data.id,
    quizId: data.quizId,
    mode: data.mode,
    hostPersona: data.hostPersona,
    correct: data.correct,
    total: data.total,
    bestStreak: data.bestStreak,
    elapsedMs: data.elapsedMs,
    recap: data.recap,
    createdAt,
  });

  if (data.attempts.length === 0) return;

  await db.insert(questionAttempts).values(
    data.attempts.map((attempt) => ({
      id: crypto.randomUUID(),
      runId: data.id,
      quizId: data.quizId,
      questionId: attempt.questionId,
      orderIndex: attempt.orderIndex,
      selectedAnswer: attempt.selectedAnswer,
      confidence: attempt.confidence,
      correct: attempt.correct ? 1 : 0,
      timedOut: attempt.timedOut ? 1 : 0,
      responseMs: attempt.responseMs,
      streakBefore: attempt.streakBefore,
      streakAfter: attempt.streakAfter,
      wasFinalQuestion: attempt.wasFinalQuestion ? 1 : 0,
      hostMode: data.mode,
      createdAt,
    })),
  );
}

export async function getResultsSummary(quizId: string): Promise<ResultsSummary> {
  const rows = await db
    .select()
    .from(quizResults)
    .where(eq(quizResults.quizId, quizId))
    .orderBy(desc(quizResults.createdAt));

  if (rows.length === 0) return { count: 0, best: null, last: null };

  const last = rows[0];
  const bestRow = rows.reduce((acc, r) =>
    r.correct / r.total > acc.correct / acc.total ? r : acc, rows[0]);

  return {
    count: rows.length,
    best: bestRow.total > 0 ? Math.round((bestRow.correct / bestRow.total) * 100) : 0,
    last: last.total > 0 ? Math.round((last.correct / last.total) * 100) : 0,
  };
}

export async function getQuizRun(runId: string): Promise<QuizRun | undefined> {
  const [row] = await db.select().from(quizRuns).where(eq(quizRuns.id, runId));
  return row ? parseQuizRun(row) : undefined;
}

export async function getRunAttempts(runId: string): Promise<QuestionAttempt[]> {
  const rows = await db
    .select()
    .from(questionAttempts)
    .where(eq(questionAttempts.runId, runId))
    .orderBy(questionAttempts.orderIndex);
  return rows.map(parseQuestionAttempt);
}

export async function listRunsForQuiz(quizId: string, limit = 5): Promise<QuizRun[]> {
  const rows = await db
    .select()
    .from(quizRuns)
    .where(eq(quizRuns.quizId, quizId))
    .orderBy(desc(quizRuns.createdAt))
    .limit(limit);
  return rows.map(parseQuizRun);
}

export async function listRecentRuns(limit = 12): Promise<QuizRunWithTitle[]> {
  const rows = await db
    .select({
      id: quizRuns.id,
      quizId: quizRuns.quizId,
      mode: quizRuns.mode,
      hostPersona: quizRuns.hostPersona,
      correct: quizRuns.correct,
      total: quizRuns.total,
      bestStreak: quizRuns.bestStreak,
      elapsedMs: quizRuns.elapsedMs,
      recap: quizRuns.recap,
      createdAt: quizRuns.createdAt,
      quizTitle: quizzes.title,
      quizTopic: quizzes.topic,
    })
    .from(quizRuns)
    .leftJoin(quizzes, eq(quizRuns.quizId, quizzes.id))
    .orderBy(desc(quizRuns.createdAt))
    .limit(limit);

  return rows.map((row) => ({
    ...parseQuizRun(row),
    quizTitle: row.quizTitle ?? 'Untitled quiz',
    quizTopic: row.quizTopic ?? null,
  }));
}

export async function getRunTotals(): Promise<StatsTotals> {
  const rows = await db.select().from(quizRuns);
  if (rows.length === 0) {
    return {
      runs: 0,
      questions: 0,
      correct: 0,
      bestPct: null,
      averagePct: null,
      bestStreak: 0,
      fastestMs: null,
    };
  }

  let questionsTotal = 0;
  let correctTotal = 0;
  let pctTotal = 0;
  let bestPct = 0;
  let bestStreak = 0;

  rows.forEach((row) => {
    const pct = row.total > 0 ? Math.round((row.correct / row.total) * 100) : 0;
    questionsTotal += row.total;
    correctTotal += row.correct;
    pctTotal += pct;
    bestPct = Math.max(bestPct, pct);
    bestStreak = Math.max(bestStreak, row.bestStreak);
  });

  const attempts = await db.select().from(questionAttempts);
  const fastestMs = attempts.reduce<number | null>(
    (best, attempt) => best === null ? attempt.responseMs : Math.min(best, attempt.responseMs),
    null,
  );

  return {
    runs: rows.length,
    questions: questionsTotal,
    correct: correctTotal,
    bestPct,
    averagePct: Math.round(pctTotal / rows.length),
    bestStreak,
    fastestMs,
  };
}

export async function getQuestionAggregateStats(
  quizId: string,
  questionIds: string[],
): Promise<Record<string, QuestionAggregateStats>> {
  if (questionIds.length === 0) return {};

  const rows = await db
    .select()
    .from(questionAttempts)
    .where(inArray(questionAttempts.questionId, questionIds));

  const stats: Record<string, QuestionAggregateStats> = {};
  for (const questionId of questionIds) {
    const attempts = rows.filter((row) =>
      row.quizId === quizId && row.questionId === questionId);
    if (attempts.length === 0) {
      stats[questionId] = {
        attempts: 0,
        correctPct: null,
        averageResponseMs: null,
        fastestResponseMs: null,
      };
      continue;
    }

    const correctCount = attempts.filter((row) => row.correct === 1).length;
    const totalResponseMs = attempts.reduce((sum, row) => sum + row.responseMs, 0);
    const fastestResponseMs = attempts.reduce(
      (best, row) => Math.min(best, row.responseMs),
      Number.POSITIVE_INFINITY,
    );

    stats[questionId] = {
      attempts: attempts.length,
      correctPct: Math.round((correctCount / attempts.length) * 100),
      averageResponseMs: Math.round(totalResponseMs / attempts.length),
      fastestResponseMs: Number.isFinite(fastestResponseMs) ? fastestResponseMs : null,
    };
  }

  return stats;
}

export async function getQuizAggregateStats(quizId: string): Promise<QuizAggregateStats> {
  const rows = await db
    .select()
    .from(quizRuns)
    .where(eq(quizRuns.quizId, quizId));

  if (rows.length === 0) {
    return { plays: 0, bestPct: null, averagePct: null };
  }

  let totalPct = 0;
  let bestPct = 0;
  for (const row of rows) {
    const pct = row.total > 0 ? Math.round((row.correct / row.total) * 100) : 0;
    totalPct += pct;
    bestPct = Math.max(bestPct, pct);
  }

  return {
    plays: rows.length,
    bestPct,
    averagePct: Math.round(totalPct / rows.length),
  };
}

export async function insertImage(id: string, data: string, mimeType: string): Promise<void> {
  await db.insert(images).values({ id, data, mimeType });
}

export async function getImage(id: string): Promise<{ data: string; mimeType: string } | null> {
  const [row] = await db.select().from(images).where(eq(images.id, id));
  return row ? { data: row.data, mimeType: row.mimeType } : null;
}

// --- Credits ---------------------------------------------------------------

// Reads a user's current credit balance, performing a lazy monthly refresh:
// if the last refresh was in a previous calendar month, top the balance back
// up to STARTER_CREDITS (never reducing an existing higher balance). Returns
// null if the user does not exist.
export async function getUserCredits(userId: string): Promise<number | null> {
  const [row] = await db
    .select({ credits: user.credits, refreshedAt: user.creditsRefreshedAt })
    .from(user)
    .where(eq(user.id, userId));
  if (!row) return null;

  const now = new Date();
  const last = row.refreshedAt ? new Date(row.refreshedAt) : null;
  const isNewMonth =
    !last ||
    last.getUTCFullYear() !== now.getUTCFullYear() ||
    last.getUTCMonth() !== now.getUTCMonth();

  if (isNewMonth) {
    const refreshed = Math.max(row.credits, STARTER_CREDITS);
    await db
      .update(user)
      .set({ credits: refreshed, creditsRefreshedAt: now.toISOString() })
      .where(eq(user.id, userId));
    return refreshed;
  }

  return row.credits;
}

export async function getUserByEmail(
  email: string,
): Promise<{ id: string; email: string; name: string } | null> {
  const [row] = await db
    .select({ id: user.id, email: user.email, name: user.name })
    .from(user)
    .where(eq(user.email, email));
  return row ?? null;
}

// Atomically spends one credit. Returns the new balance, or null when the user
// has none left (so the caller can return 403 before touching the AI provider).
export async function deductCredit(userId: string): Promise<number | null> {
  const rows = await db
    .update(user)
    .set({ credits: sql`${user.credits} - 1` })
    .where(and(eq(user.id, userId), gt(user.credits, 0)))
    .returning({ credits: user.credits });
  return rows.length > 0 ? rows[0].credits : null;
}

// Returns a previously-spent credit, e.g. when generation throws before
// producing a quiz. Best-effort; no-op if the user vanished.
export async function refundCredit(userId: string): Promise<void> {
  await db
    .update(user)
    .set({ credits: sql`${user.credits} + 1` })
    .where(eq(user.id, userId));
}

// One-off backfill: assign every ownerless quiz to a user (admin) and stamp a
// visibility. Used by scripts/backfill-owner.ts. Returns rows affected.
export async function backfillQuizOwner(
  ownerId: string,
  visibility: QuizVisibility = 'unlisted',
): Promise<number> {
  const rows = await db
    .update(quizzes)
    .set({ ownerId, visibility })
    .where(sql`${quizzes.ownerId} IS NULL`)
    .returning({ id: quizzes.id });
  return rows.length;
}

function parseQuiz(row: typeof quizzes.$inferSelect): Quiz {
  return {
    ...row,
    ownerId: row.ownerId ?? null,
    visibility: normalizeQuizVisibility(row.visibility),
    questionCount: row.questionCount ?? 0,
  } as Quiz;
}

function parseQuestion(row: typeof questions.$inferSelect): Question {
  return {
    ...row,
    options: row.options ? JSON.parse(row.options) : null,
    optionImages: row.optionImages ? JSON.parse(row.optionImages) : null,
    imageUrl: row.imageUrl ?? null,
    imagePrompt: row.imagePrompt ?? null,
    format: normalizeQuizFormat(row.format),
    category: row.category ?? null,
    difficulty: normalizeQuestionDifficulty(row.difficulty),
    explanation: row.explanation ?? null,
    factText: row.factText ?? null,
    tags: row.tags ? JSON.parse(row.tags) : null,
  } as Question;
}

function parseQuizRun(row: {
  id: string;
  quizId: string;
  mode: string;
  hostPersona: string;
  correct: number;
  total: number;
  bestStreak: number;
  elapsedMs: number;
  recap: string | null;
  createdAt: string;
}): QuizRun {
  return {
    id: row.id,
    quizId: row.quizId,
    mode: normalizeHostMode(row.mode),
    hostPersona: normalizeHostPersona(row.hostPersona),
    correct: row.correct,
    total: row.total,
    bestStreak: row.bestStreak,
    elapsedMs: row.elapsedMs,
    recap: row.recap,
    createdAt: row.createdAt,
  };
}

function parseQuestionAttempt(row: typeof questionAttempts.$inferSelect): QuestionAttempt {
  return {
    id: row.id,
    runId: row.runId,
    quizId: row.quizId,
    questionId: row.questionId,
    orderIndex: row.orderIndex,
    selectedAnswer: row.selectedAnswer,
    confidence: normalizeHostConfidenceLevel(row.confidence),
    correct: row.correct === 1,
    timedOut: row.timedOut === 1,
    responseMs: row.responseMs,
    streakBefore: row.streakBefore,
    streakAfter: row.streakAfter,
    wasFinalQuestion: row.wasFinalQuestion === 1,
    hostMode: normalizeHostMode(row.hostMode),
    createdAt: row.createdAt,
  };
}
