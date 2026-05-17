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
    format TEXT NOT NULL,
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

  for (const stmt of [
    sql`ALTER TABLE questions ADD COLUMN image_url TEXT`,
    sql`ALTER TABLE questions ADD COLUMN option_images TEXT`,
  ]) {
    try {
      await db.run(stmt);
    } catch {
      // column already exists — ignore
    }
  }
}
