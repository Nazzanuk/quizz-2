import { toNextJsHandler } from 'better-auth/next-js';
import { getAuth } from '@/Lib/Auth/Auth';
import { runMigrations } from '@/Lib/Db/Migrate';

// The app uses hand-rolled idempotent migrations (src/Lib/Db/Migrate.ts) rather
// than drizzle-kit, so prime the auth tables before Better Auth touches the DB.
// runMigrations() is a no-op after the first call. getAuth() builds the Better
// Auth instance lazily on first request (see Auth.ts).
export async function GET(req: Request): Promise<Response> {
  await runMigrations();
  return toNextJsHandler(getAuth()).GET(req);
}

export async function POST(req: Request): Promise<Response> {
  await runMigrations();
  return toNextJsHandler(getAuth()).POST(req);
}
