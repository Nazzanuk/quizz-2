import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const quizzes = sqliteTable('quizzes', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  description: text('description'),
  topic: text('topic'),
  sourceMaterial: text('source_material'),
  coverImageUrl: text('cover_image_url'),
  format: text('format').notNull(),
  questionCount: integer('question_count').default(0),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const questions = sqliteTable('questions', {
  id: text('id').primaryKey(),
  quizId: text('quiz_id')
    .notNull()
    .references(() => quizzes.id, { onDelete: 'cascade' }),
  questionText: text('question_text').notNull(),
  answerText: text('answer_text').notNull(),
  options: text('options'),
  imageUrl: text('image_url'),
  format: text('format').notNull(),
  order: integer('order').notNull(),
});
