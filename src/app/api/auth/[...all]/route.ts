import { toNextJsHandler } from 'better-auth/next-js';
import { auth } from '@/Lib/Auth/Auth';
import { runMigrations } from '@/Lib/Db/Migrate';

const handlers = toNextJsHandler(auth);

// The app uses hand-rolled idempotent migrations (src/Lib/Db/Migrate.ts) rather
// than drizzle-kit, so prime the auth tables before Better Auth touches the DB.
// runMigrations() is a no-op after the first call.
export async function GET(req: Request): Promise<Response> {
  await runMigrations();
  return handlers.GET(req);
}

export async function POST(req: Request): Promise<Response> {
  await runMigrations();
  return handlers.POST(req);
}
