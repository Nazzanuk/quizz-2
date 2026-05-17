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
  optionImages: text('option_images'),
  imageUrl: text('image_url'),
  imagePrompt: text('image_prompt'),
  format: text('format').notNull(),
  category: text('category'),
  difficulty: text('difficulty'),
  explanation: text('explanation'),
  factText: text('fact_text'),
  tags: text('tags'),
  order: integer('order').notNull(),
});

export const images = sqliteTable('images', {
  id: text('id').primaryKey(),
  data: text('data').notNull(),
  mimeType: text('mime_type').notNull(),
});

export const quizResults = sqliteTable('quiz_results', {
  id: text('id').primaryKey(),
  quizId: text('quiz_id').notNull(),
  correct: integer('correct').notNull(),
  total: integer('total').notNull(),
  perQuestion: text('per_question').notNull(),
  createdAt: text('created_at').notNull(),
});

export const quizRuns = sqliteTable('quiz_runs', {
  id: text('id').primaryKey(),
  quizId: text('quiz_id').notNull(),
  mode: text('mode').notNull(),
  hostPersona: text('host_persona').notNull(),
  correct: integer('correct').notNull(),
  total: integer('total').notNull(),
  bestStreak: integer('best_streak').notNull(),
  elapsedMs: integer('elapsed_ms').notNull(),
  recap: text('recap'),
  createdAt: text('created_at').notNull(),
});

export const questionAttempts = sqliteTable('question_attempts', {
  id: text('id').primaryKey(),
  runId: text('run_id')
    .notNull()
    .references(() => quizRuns.id, { onDelete: 'cascade' }),
  quizId: text('quiz_id').notNull(),
  questionId: text('question_id').notNull(),
  orderIndex: integer('order_index').notNull(),
  selectedAnswer: text('selected_answer'),
  confidence: text('confidence'),
  correct: integer('correct').notNull(),
  timedOut: integer('timed_out').notNull(),
  responseMs: integer('response_ms').notNull(),
  streakBefore: integer('streak_before').notNull(),
  streakAfter: integer('streak_after').notNull(),
  wasFinalQuestion: integer('was_final_question').notNull(),
  hostMode: text('host_mode').notNull(),
  createdAt: text('created_at').notNull(),
});
