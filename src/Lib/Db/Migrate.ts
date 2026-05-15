import { db } from './Client';
import { sql } from 'drizzle-orm';

let done = false;

export async function runMigrations(): Promise<void> {
  if (done) return;
  done = true;
  // Add image_url to questions — no-op if already present
  try {
    await db.run(sql`ALTER TABLE questions ADD COLUMN image_url TEXT`);
  } catch {
    // column already exists
  }
}
