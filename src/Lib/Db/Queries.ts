import { eq, desc } from 'drizzle-orm';
import { db } from './Client';
import { quizzes, questions } from './Schema';
import type { Quiz, Question, QuizFormat } from '../Types';
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

export async function insertQuestions(
  items: (Omit<Question, 'options'> & { options?: string[] | null })[],
): Promise<void> {
  if (items.length === 0) return;
  await db.insert(questions).values(
    items.map((q) => ({
      ...q,
      options: q.options ? JSON.stringify(q.options) : null,
    })),
  );
}

export async function updateQuiz(
  id: string,
  data: Partial<Pick<Quiz, 'title' | 'description' | 'coverImageUrl'>>,
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
  data: { questionText?: string; answerText?: string; options?: string[] | null },
): Promise<Question | undefined> {
  const set: Partial<typeof questions.$inferInsert> = {};
  if (data.questionText !== undefined) set.questionText = data.questionText;
  if (data.answerText !== undefined) set.answerText = data.answerText;
  if (data.options !== undefined) set.options = data.options ? JSON.stringify(data.options) : null;

  const [row] = await db
    .update(questions)
    .set(set)
    .where(eq(questions.id, id))
    .returning();
  return row ? parseQuestion(row) : undefined;
}

function parseQuestion(row: typeof questions.$inferSelect): Question {
  return {
    ...row,
    options: row.options ? JSON.parse(row.options) : null,
  } as Question;
}
