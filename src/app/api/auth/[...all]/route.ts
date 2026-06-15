import { toNextJsHandler } from 'better-auth/next-js';
import { getAuth } from '@/Lib/Auth/Auth';
import { runMigrations } from '@/Lib/Db/Migrate';
import { clientIp, enforceRateLimit } from '@/Lib/RateLimit';

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
  // Distributed (DB-backed) flood guard on auth mutations, on top of Better
  // Auth's own in-memory limiter, so the cap holds across all instances.
  const limited = await enforceRateLimit(`auth:${clientIp(req)}`, 30, 60_000);
  if (limited) return limited;
  return toNextJsHandler(getAuth()).POST(req);
}
