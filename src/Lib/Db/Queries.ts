import { and, desc, eq, gt, inArray, sql } from 'drizzle-orm';
import { db } from './Client';
import { quizzes, questions, images, quizResults, quizRuns, questionAttempts, user, session, account, quizReports } from './Schema';
import {
  normalizeHostConfidenceLevel,
  normalizeHostMode,
  normalizeHostPersona,
  normalizeQuestionDifficulty,
  normalizeQuizFormat,
  normalizeQuizStatus,
  normalizeQuizVisibility,
  type HostMode,
  type HostPersona,
  type LeaderboardEntry,
  type QuestionAttempt,
  type Question,
  type QuestionAggregateStats,
  type QuestionDifficulty,
  type Quiz,
  type QuizAggregateStats,
  type QuizFormat,
  type QuizStatus,
  type ReportedQuiz,
  type TopQuiz,
  type QuizRun,
  type QuizRunWithTitle,
  type QuizVisibility,
  type StatsTotals,
  type ResultsSummary,
  type SaveResultAttemptInput,
} from '../Types';
import { STARTER_CREDITS } from '../Constants';
import { nowISO } from '../Utils';
import { cached } from '../Cache';

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
  data: Partial<Pick<Quiz, 'title' | 'description' | 'coverImageUrl' | 'questionCount' | 'questionsPerRun' | 'visibility'>>,
): Promise<Quiz | undefined> {
  const [row] = await db
    .update(quizzes)
    .set({ ...data, updatedAt: nowISO() })
    .where(eq(quizzes.id, id))
    .returning();
  return row ? parseQuiz(row) : undefined;
}

// Extracts the stored image id from an /api/images/:id URL, else null.
function imageIdFromUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const match = /\/api\/images\/([^/?#]+)/.exec(url);
  return match ? match[1] : null;
}

// Collects every image id referenced by a set of cover URLs and question rows
// (question image + option images). Operates on raw rows (optionImages is JSON).
function collectImageIds(params: {
  coverImageUrls?: (string | null)[];
  questions?: { imageUrl: string | null; optionImages: string | null }[];
}): string[] {
  const ids = new Set<string>();
  for (const url of params.coverImageUrls ?? []) {
    const id = imageIdFromUrl(url);
    if (id) ids.add(id);
  }
  for (const question of params.questions ?? []) {
    const id = imageIdFromUrl(question.imageUrl);
    if (id) ids.add(id);
    if (question.optionImages) {
      try {
        const urls = JSON.parse(question.optionImages) as (string | null)[];
        for (const optionUrl of urls) {
          const optionId = imageIdFromUrl(optionUrl);
          if (optionId) ids.add(optionId);
        }
      } catch {
        // malformed JSON — nothing to collect
      }
    }
  }
  return [...ids];
}

async function deleteImagesByIds(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  await db.delete(images).where(inArray(images.id, ids));
}

// Fully removes a quiz and everything tied to it. FK cascades are off in libsql,
// so questions/runs/results/attempts and stored images are deleted explicitly.
export async function deleteQuiz(id: string): Promise<void> {
  const [quizRow] = await db.select().from(quizzes).where(eq(quizzes.id, id));
  const questionRows = await db.select().from(questions).where(eq(questions.quizId, id));
  const imageIds = collectImageIds({
    coverImageUrls: [quizRow?.coverImageUrl ?? null],
    questions: questionRows,
  });

  await db.delete(questionAttempts).where(eq(questionAttempts.quizId, id));
  await db.delete(quizRuns).where(eq(quizRuns.quizId, id));
  await db.delete(quizResults).where(eq(quizResults.quizId, id));
  await db.delete(questions).where(eq(questions.quizId, id));
  await db.delete(quizzes).where(eq(quizzes.id, id));
  await deleteImagesByIds(imageIds);
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
  const [row] = await db.select().from(questions).where(eq(questions.id, id));
  await db.delete(questions).where(eq(questions.id, id));
  if (row) {
    await deleteImagesByIds(collectImageIds({ questions: [row] }));
  }
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
  userId: string | null;
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
    userId: data.userId,
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

// Scoped to a single player: each user only sees their own run history for the
// quiz, never everyone else's.
export async function listRunsForQuiz(
  quizId: string,
  userId: string,
  limit = 5,
): Promise<QuizRun[]> {
  const rows = await db
    .select()
    .from(quizRuns)
    .where(and(eq(quizRuns.quizId, quizId), eq(quizRuns.userId, userId)))
    .orderBy(desc(quizRuns.createdAt))
    .limit(limit);
  return rows.map(parseQuizRun);
}

// The personal Progress feed: only the signed-in player's own runs.
export async function listRecentRuns(userId: string, limit = 12): Promise<QuizRunWithTitle[]> {
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
    .where(eq(quizRuns.userId, userId))
    .orderBy(desc(quizRuns.createdAt))
    .limit(limit);

  return rows.map((row) => ({
    ...parseQuizRun(row),
    quizTitle: row.quizTitle ?? 'Untitled quiz',
    quizTopic: row.quizTopic ?? null,
  }));
}

// Personal lifetime totals for the Progress page, scoped to one player.
export async function getRunTotals(userId: string): Promise<StatsTotals> {
  const rows = await db.select().from(quizRuns).where(eq(quizRuns.userId, userId));
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

  const runIds = rows.map((row) => row.id);
  const attempts = runIds.length > 0
    ? await db.select().from(questionAttempts).where(inArray(questionAttempts.runId, runIds))
    : [];
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

// Per-quiz leaderboard plus the quiz's average score. Averages and play counts
// include anonymous runs (a true picture of how the quiz plays); the ranked
// entries only include signed-in players, taking each player's single best run.
// Aggregation happens in JS — fine at a quiz's run volume and far simpler than
// SQL window functions through the query builder.
// Viewer-independent core: averages, play count, and the full ranked list. This
// is the expensive part (loads + aggregates all the quiz's runs), so it's cached
// briefly; per-request `yourRank` is derived from it without re-querying.
const LEADERBOARD_TTL_MS = 30_000;

async function computeLeaderboardCore(quizId: string): Promise<{
  averagePct: number | null;
  totalPlays: number;
  ranked: LeaderboardEntry[];
}> {
  const runs = await db
    .select({
      userId: quizRuns.userId,
      correct: quizRuns.correct,
      total: quizRuns.total,
      bestStreak: quizRuns.bestStreak,
    })
    .from(quizRuns)
    .where(eq(quizRuns.quizId, quizId));

  const scored = runs.filter((run) => run.total > 0);
  const averagePct = scored.length > 0
    ? Math.round(
      scored.reduce((sum, run) => sum + (run.correct / run.total) * 100, 0) / scored.length,
    )
    : null;

  const byUser = new Map<string, { bestRatio: number; plays: number; bestStreak: number }>();
  for (const run of runs) {
    if (!run.userId || run.total <= 0) continue;
    const ratio = run.correct / run.total;
    const current = byUser.get(run.userId);
    if (!current) {
      byUser.set(run.userId, { bestRatio: ratio, plays: 1, bestStreak: run.bestStreak });
    } else {
      current.bestRatio = Math.max(current.bestRatio, ratio);
      current.plays += 1;
      current.bestStreak = Math.max(current.bestStreak, run.bestStreak);
    }
  }

  const names = await getUserDisplayNames([...byUser.keys()]);
  const ranked: LeaderboardEntry[] = [...byUser.entries()]
    .map(([userId, agg]) => ({
      userId,
      name: names.get(userId) ?? 'Player',
      bestPct: Math.round(agg.bestRatio * 100),
      plays: agg.plays,
      bestStreak: agg.bestStreak,
    }))
    .sort((a, b) =>
      b.bestPct - a.bestPct ||
      b.bestStreak - a.bestStreak ||
      b.plays - a.plays ||
      a.name.localeCompare(b.name));

  return { averagePct, totalPlays: runs.length, ranked };
}

export async function getQuizLeaderboard(
  quizId: string,
  limit = 10,
  viewerId?: string | null,
): Promise<{
  averagePct: number | null;
  totalPlays: number;
  entries: LeaderboardEntry[];
  yourRank: number | null;
}> {
  const core = await cached(`lb:${quizId}`, LEADERBOARD_TTL_MS, () => computeLeaderboardCore(quizId));
  const yourIndex = viewerId ? core.ranked.findIndex((entry) => entry.userId === viewerId) : -1;

  return {
    averagePct: core.averagePct,
    totalPlays: core.totalPlays,
    entries: core.ranked.slice(0, limit),
    yourRank: yourIndex >= 0 ? yourIndex + 1 : null,
  };
}

// The Discover feed: most-played quizzes that anyone can open. Private quizzes
// are excluded, and the inner join means only quizzes with at least one run
// surface — so unplayed drafts never leak into the global feed.
export async function getTopQuizzes(limit = 5): Promise<TopQuiz[]> {
  return cached(`discover:${limit}`, 30_000, async () => {
    const rows = await db
      .select({ quiz: quizzes, plays: sql<number>`count(${quizRuns.id})` })
      .from(quizzes)
      .innerJoin(quizRuns, eq(quizRuns.quizId, quizzes.id))
      // Discover lists only quizzes the creator explicitly made public, and never
      // anything taken down by moderation.
      .where(and(
        eq(quizzes.visibility, 'public'),
        sql`(${quizzes.status} IS NULL OR ${quizzes.status} != 'blocked')`,
      ))
      .groupBy(quizzes.id)
      .orderBy(desc(sql`count(${quizRuns.id})`))
      .limit(limit);

    return rows.map((row) => ({ ...parseQuiz(row.quiz), plays: Number(row.plays) }));
  });
}

// Maps user ids to their public display name (chosen username, else Google name).
async function getUserDisplayNames(userIds: string[]): Promise<Map<string, string>> {
  if (userIds.length === 0) return new Map();
  const rows = await db
    .select({ id: user.id, name: user.name, username: user.username })
    .from(user)
    .where(inArray(user.id, userIds));
  return new Map(rows.map((row) => [row.id, row.username?.trim() || row.name]));
}

// --- Usernames -------------------------------------------------------------

export async function getUsername(userId: string): Promise<string | null> {
  const [row] = await db
    .select({ username: user.username })
    .from(user)
    .where(eq(user.id, userId));
  return row?.username ?? null;
}

// Case-insensitive availability check, ignoring the caller's own current handle.
export async function isUsernameTaken(username: string, excludeUserId: string): Promise<boolean> {
  const rows = await db
    .select({ id: user.id })
    .from(user)
    .where(sql`lower(${user.username}) = lower(${username})`);
  return rows.some((row) => row.id !== excludeUserId);
}

export async function setUsername(userId: string, username: string): Promise<void> {
  await db.update(user).set({ username }).where(eq(user.id, userId));
}

// --- Moderation: reports & takedowns ---------------------------------------

export async function insertQuizReport(data: {
  quizId: string;
  reporterId: string | null;
  reason: string | null;
}): Promise<void> {
  await db.insert(quizReports).values({
    id: crypto.randomUUID(),
    quizId: data.quizId,
    reporterId: data.reporterId,
    reason: data.reason,
    createdAt: nowISO(),
  });
}

export async function setQuizStatus(quizId: string, status: QuizStatus): Promise<void> {
  await db.update(quizzes).set({ status, updatedAt: nowISO() }).where(eq(quizzes.id, quizId));
}

// Admin moderation view: every reported quiz with its report count, latest
// report time, and the distinct reasons given.
export async function listReportedQuizzes(): Promise<ReportedQuiz[]> {
  const reports = await db.select().from(quizReports);
  if (reports.length === 0) return [];

  const quizIds = [...new Set(reports.map((r) => r.quizId))];
  const quizRows = await db.select().from(quizzes).where(inArray(quizzes.id, quizIds));
  const quizById = new Map(quizRows.map((row) => [row.id, parseQuiz(row)]));

  const grouped = new Map<string, ReportedQuiz>();
  for (const report of reports) {
    const quiz = quizById.get(report.quizId);
    const entry = grouped.get(report.quizId) ?? {
      quizId: report.quizId,
      title: quiz?.title ?? 'Deleted quiz',
      status: quiz?.status ?? 'active',
      visibility: quiz?.visibility ?? 'unlisted',
      reportCount: 0,
      lastReportedAt: report.createdAt,
      reasons: [] as string[],
    };
    entry.reportCount += 1;
    if (report.createdAt > entry.lastReportedAt) entry.lastReportedAt = report.createdAt;
    if (report.reason && !entry.reasons.includes(report.reason)) entry.reasons.push(report.reason);
    grouped.set(report.quizId, entry);
  }

  return [...grouped.values()].sort((a, b) => b.lastReportedAt.localeCompare(a.lastReportedAt));
}

// --- Data export & account deletion (GDPR/CCPA) ----------------------------

// Gathers everything tied to a user for a self-service data export.
export async function exportUserData(userId: string): Promise<{
  exportedAt: string;
  account: { id: string; name: string; email: string; username: string | null } | null;
  quizzes: Array<Quiz & { questions: Question[] }>;
  runs: Array<QuizRun & { attempts: QuestionAttempt[] }>;
}> {
  const [account_] = await db
    .select({ id: user.id, name: user.name, email: user.email, username: user.username })
    .from(user)
    .where(eq(user.id, userId));

  const ownedQuizzes = await db
    .select()
    .from(quizzes)
    .where(eq(quizzes.ownerId, userId))
    .orderBy(desc(quizzes.updatedAt));
  const quizIds = ownedQuizzes.map((row) => row.id);
  const quizQuestions = quizIds.length > 0
    ? await db.select().from(questions).where(inArray(questions.quizId, quizIds)).orderBy(questions.order)
    : [];

  const runs = await db
    .select()
    .from(quizRuns)
    .where(eq(quizRuns.userId, userId))
    .orderBy(desc(quizRuns.createdAt));
  const runIds = runs.map((row) => row.id);
  const attempts = runIds.length > 0
    ? await db.select().from(questionAttempts).where(inArray(questionAttempts.runId, runIds))
    : [];

  return {
    exportedAt: nowISO(),
    account: account_ ?? null,
    quizzes: ownedQuizzes.map((row) => ({
      ...parseQuiz(row),
      questions: quizQuestions.filter((q) => q.quizId === row.id).map(parseQuestion),
    })),
    runs: runs.map((row) => ({
      ...parseQuizRun(row),
      attempts: attempts.filter((a) => a.runId === row.id).map(parseQuestionAttempt),
    })),
  };
}

// Permanently erases a user and all their data. Child rows are deleted
// explicitly rather than via FK cascade, since libsql does not enforce
// foreign-key cascades by default.
export async function deleteUserAndData(userId: string): Promise<void> {
  const ownedQuizRows = await db.select().from(quizzes).where(eq(quizzes.ownerId, userId));
  const quizIds = ownedQuizRows.map((row) => row.id);
  const ownedQuestionRows = quizIds.length > 0
    ? await db.select().from(questions).where(inArray(questions.quizId, quizIds))
    : [];
  const imageIds = collectImageIds({
    coverImageUrls: ownedQuizRows.map((row) => row.coverImageUrl ?? null),
    questions: ownedQuestionRows,
  });
  const userRuns = await db.select({ id: quizRuns.id }).from(quizRuns).where(eq(quizRuns.userId, userId));
  const userRunIds = userRuns.map((row) => row.id);

  // Attempts: those on the user's owned quizzes, plus those from the user's own
  // runs on anyone's quiz.
  if (quizIds.length > 0) {
    await db.delete(questionAttempts).where(inArray(questionAttempts.quizId, quizIds));
  }
  if (userRunIds.length > 0) {
    await db.delete(questionAttempts).where(inArray(questionAttempts.runId, userRunIds));
  }

  // Runs + results + questions + quizzes + images for the user's owned quizzes.
  if (quizIds.length > 0) {
    await db.delete(quizRuns).where(inArray(quizRuns.quizId, quizIds));
    await db.delete(quizResults).where(inArray(quizResults.quizId, quizIds));
    await db.delete(questions).where(inArray(questions.quizId, quizIds));
    await db.delete(quizzes).where(inArray(quizzes.id, quizIds));
    await deleteImagesByIds(imageIds);
  }

  // The user's own runs on other people's quizzes.
  await db.delete(quizRuns).where(eq(quizRuns.userId, userId));

  // Auth rows, then the user record itself.
  await db.delete(session).where(eq(session.userId, userId));
  await db.delete(account).where(eq(account.userId, userId));
  await db.delete(user).where(eq(user.id, userId));
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
    status: normalizeQuizStatus(row.status),
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
