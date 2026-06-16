import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const quizzes = sqliteTable('quizzes', {
  id: text('id').primaryKey(),
  // null = legacy/ownerless quiz (created before auth). Backfilled to an owner
  // via scripts/backfill-owner.ts. New quizzes always get an owner.
  ownerId: text('owner_id'),
  // 'private' | 'unlisted' | 'public' — see QuizVisibility in Types.ts.
  // Unlisted is the default: playable by anyone with the link, hidden from feeds.
  visibility: text('visibility'),
  // 'active' | 'blocked' — moderation status. null = active (see QuizStatus).
  status: text('status'),
  title: text('title').notNull(),
  description: text('description'),
  topic: text('topic'),
  sourceMaterial: text('source_material'),
  coverImageUrl: text('cover_image_url'),
  format: text('format').notNull(),
  questionCount: integer('question_count').default(0),
  questionsPerRun: integer('questions_per_run'),
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

export const quizReports = sqliteTable('quiz_reports', {
  id: text('id').primaryKey(),
  quizId: text('quiz_id').notNull(),
  // null when reported by an anonymous viewer (currently report requires auth).
  reporterId: text('reporter_id'),
  reason: text('reason'),
  createdAt: text('created_at').notNull(),
});

// First-party product analytics. Privacy-light: an event type plus optional
// user/quiz ids we already store — no IPs, user agents, or other PII.
export const analyticsEvents = sqliteTable('analytics_events', {
  id: text('id').primaryKey(),
  type: text('type').notNull(),
  userId: text('user_id'),
  quizId: text('quiz_id'),
  createdAt: text('created_at').notNull(),
});

// Fixed-window rate-limit counters. Shared across instances via the DB, so the
// limit holds regardless of which server handles a request.
export const rateLimits = sqliteTable('rate_limits', {
  key: text('key').primaryKey(),
  count: integer('count').notNull(),
  expiresAt: integer('expires_at').notNull(),
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
  // null = anonymous play (shared link, signed out). Attributed runs power the
  // per-user run history and the leaderboard.
  userId: text('user_id'),
  mode: text('mode').notNull(),
  hostPersona: text('host_persona').notNull(),
  correct: integer('correct').notNull(),
  total: integer('total').notNull(),
  bestStreak: integer('best_streak').notNull(),
  elapsedMs: integer('elapsed_ms').notNull(),
  recap: text('recap'),
  createdAt: text('created_at').notNull(),
});

// ---------------------------------------------------------------------------
// Better Auth tables. Field (property) names must match Better Auth's internal
// model fields; the SQL column names are snake_case to match the rest of the DB.
// `credits` and `creditsRefreshedAt` are app-specific additional fields declared
// on the user model in src/Lib/Auth/Auth.ts.
// ---------------------------------------------------------------------------
export const user = sqliteTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: integer('email_verified', { mode: 'boolean' }).notNull().default(false),
  image: text('image'),
  // App-specific public display handle, chosen by the user (see /api/account).
  // null until set; shown on leaderboards in place of the Google name.
  username: text('username'),
  credits: integer('credits').notNull().default(0),
  creditsRefreshedAt: text('credits_refreshed_at'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

export const session = sqliteTable('session', {
  id: text('id').primaryKey(),
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
  token: text('token').notNull().unique(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

export const account = sqliteTable('account', {
  id: text('id').primaryKey(),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  idToken: text('id_token'),
  accessTokenExpiresAt: integer('access_token_expires_at', { mode: 'timestamp' }),
  refreshTokenExpiresAt: integer('refresh_token_expires_at', { mode: 'timestamp' }),
  scope: text('scope'),
  password: text('password'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

export const verification = sqliteTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }),
  updatedAt: integer('updated_at', { mode: 'timestamp' }),
});

// Guest (signed-out) players who appear on leaderboards. `id` matches the
// anonId stored in their browser; runs are attributed via quiz_runs.user_id.
export const anonPlayers = sqliteTable('anon_players', {
  id: text('id').primaryKey(),
  username: text('username'),
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
  // How the question was presented this run (mcq/jeopardy/true_false/...).
  playFormat: text('play_format'),
  createdAt: text('created_at').notNull(),
});
