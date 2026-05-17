import { eq, desc } from 'drizzle-orm';
import { db } from './Client';
import { quizzes, questions, images, quizResults } from './Schema';
import { normalizeQuizFormat, type Quiz, type Question, type QuizFormat, type ResultsSummary } from '../Types';
import { nowISO } from '../Utils';

export async function listQuizzes(): Promise<Quiz[]> {
  const rows = await db
    .select()
    .from(quizzes)
    .orderBy(desc(quizzes.updatedAt));
  return rows as Quiz[];
}

export async function getQuiz(id: string): Promise<Quiz | undefined> {
  const [row] = await db.select().from(quizzes).where(eq(quizzes.id, id));
  return row as Quiz | undefined;
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
  title: string;
  description?: string;
  topic?: string;
  sourceMaterial?: string;
  format: QuizFormat;
  questionCount?: number;
}): Promise<Quiz> {
  const now = nowISO();
  const [row] = await db
    .insert(quizzes)
    .values({ ...data, createdAt: now, updatedAt: now })
    .returning();
  return row as Quiz;
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
    })),
  );
}

export async function updateQuiz(
  id: string,
  data: Partial<Pick<Quiz, 'title' | 'description' | 'coverImageUrl' | 'questionCount'>>,
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

export async function insertImage(id: string, data: string, mimeType: string): Promise<void> {
  await db.insert(images).values({ id, data, mimeType });
}

export async function getImage(id: string): Promise<{ data: string; mimeType: string } | null> {
  const [row] = await db.select().from(images).where(eq(images.id, id));
  return row ? { data: row.data, mimeType: row.mimeType } : null;
}

function parseQuestion(row: typeof questions.$inferSelect): Question {
  return {
    ...row,
    options: row.options ? JSON.parse(row.options) : null,
    optionImages: row.optionImages ? JSON.parse(row.optionImages) : null,
    imageUrl: row.imageUrl ?? null,
    imagePrompt: row.imagePrompt ?? null,
    format: normalizeQuizFormat(row.format),
  } as Question;
}
