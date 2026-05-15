import { db } from './Client';
import { sql } from 'drizzle-orm';

let done = false;

export async function runMigrations(): Promise<void> {
  if (done) return;
  done = true;
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
