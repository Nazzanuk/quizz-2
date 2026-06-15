import { db } from './Client';
import { sql } from 'drizzle-orm';

let done = false;

export async function runMigrations(): Promise<void> {
  if (done) return;
  done = true;

  await db.run(sql`CREATE TABLE IF NOT EXISTS quizzes (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    topic TEXT,
    source_material TEXT,
    cover_image_url TEXT,
    format TEXT NOT NULL,
    question_count INTEGER DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`);

  await db.run(sql`CREATE TABLE IF NOT EXISTS questions (
    id TEXT PRIMARY KEY,
    quiz_id TEXT NOT NULL,
    question_text TEXT NOT NULL,
    answer_text TEXT NOT NULL,
    options TEXT,
    option_images TEXT,
    image_url TEXT,
    image_prompt TEXT,
    format TEXT NOT NULL,
    category TEXT,
    difficulty TEXT,
    explanation TEXT,
    fact_text TEXT,
    tags TEXT,
    "order" INTEGER NOT NULL,
    FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE
  )`);

  await db.run(sql`CREATE TABLE IF NOT EXISTS images (
    id TEXT PRIMARY KEY,
    data TEXT NOT NULL,
    mime_type TEXT NOT NULL
  )`);

  await db.run(sql`CREATE TABLE IF NOT EXISTS quiz_results (
    id TEXT PRIMARY KEY,
    quiz_id TEXT NOT NULL,
    correct INTEGER NOT NULL,
    total INTEGER NOT NULL,
    per_question TEXT NOT NULL,
    created_at TEXT NOT NULL
  )`);

  await db.run(sql`CREATE TABLE IF NOT EXISTS quiz_runs (
    id TEXT PRIMARY KEY,
    quiz_id TEXT NOT NULL,
    mode TEXT NOT NULL,
    host_persona TEXT NOT NULL,
    correct INTEGER NOT NULL,
    total INTEGER NOT NULL,
    best_streak INTEGER NOT NULL,
    elapsed_ms INTEGER NOT NULL,
    recap TEXT,
    created_at TEXT NOT NULL
  )`);

  await db.run(sql`CREATE TABLE IF NOT EXISTS question_attempts (
    id TEXT PRIMARY KEY,
    run_id TEXT NOT NULL,
    quiz_id TEXT NOT NULL,
    question_id TEXT NOT NULL,
    order_index INTEGER NOT NULL,
    selected_answer TEXT,
    confidence TEXT,
    correct INTEGER NOT NULL,
    timed_out INTEGER NOT NULL,
    response_ms INTEGER NOT NULL,
    streak_before INTEGER NOT NULL,
    streak_after INTEGER NOT NULL,
    was_final_question INTEGER NOT NULL,
    host_mode TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (run_id) REFERENCES quiz_runs(id) ON DELETE CASCADE
  )`);

  // Better Auth tables (see src/Lib/Auth/Auth.ts). Timestamps + booleans are
  // INTEGER because the Drizzle schema reads/writes them in timestamp/boolean
  // mode; only Better Auth touches these tables, so the encoding stays internal.
  await db.run(sql`CREATE TABLE IF NOT EXISTS user (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    email_verified INTEGER NOT NULL DEFAULT 0,
    image TEXT,
    credits INTEGER NOT NULL DEFAULT 0,
    credits_refreshed_at TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  )`);

  await db.run(sql`CREATE TABLE IF NOT EXISTS session (
    id TEXT PRIMARY KEY,
    expires_at INTEGER NOT NULL,
    token TEXT NOT NULL UNIQUE,
    ip_address TEXT,
    user_agent TEXT,
    user_id TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE
  )`);

  await db.run(sql`CREATE TABLE IF NOT EXISTS account (
    id TEXT PRIMARY KEY,
    account_id TEXT NOT NULL,
    provider_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    access_token TEXT,
    refresh_token TEXT,
    id_token TEXT,
    access_token_expires_at INTEGER,
    refresh_token_expires_at INTEGER,
    scope TEXT,
    password TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE
  )`);

  await db.run(sql`CREATE TABLE IF NOT EXISTS verification (
    id TEXT PRIMARY KEY,
    identifier TEXT NOT NULL,
    value TEXT NOT NULL,
    expires_at INTEGER NOT NULL,
    created_at INTEGER,
    updated_at INTEGER
  )`);

  for (const stmt of [
    sql`ALTER TABLE quizzes ADD COLUMN questions_per_run INTEGER`,
    sql`ALTER TABLE questions ADD COLUMN image_url TEXT`,
    sql`ALTER TABLE questions ADD COLUMN option_images TEXT`,
    sql`ALTER TABLE questions ADD COLUMN image_prompt TEXT`,
    sql`ALTER TABLE questions ADD COLUMN category TEXT`,
    sql`ALTER TABLE questions ADD COLUMN difficulty TEXT`,
    sql`ALTER TABLE questions ADD COLUMN explanation TEXT`,
    sql`ALTER TABLE questions ADD COLUMN fact_text TEXT`,
    sql`ALTER TABLE questions ADD COLUMN tags TEXT`,
    // Ownership + visibility, added when auth landed. Existing rows get NULL
    // owner (backfilled separately) and are treated as 'unlisted' at read time.
    sql`ALTER TABLE quizzes ADD COLUMN owner_id TEXT`,
    sql`ALTER TABLE quizzes ADD COLUMN visibility TEXT`,
  ]) {
    try {
      await db.run(stmt);
    } catch {
      // column already exists — ignore
    }
  }
}
