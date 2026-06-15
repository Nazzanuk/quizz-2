import { NextResponse } from 'next/server';
import { sql } from 'drizzle-orm';
import { db } from '@/Lib/Db/Client';

// DB-backed fixed-window rate limiter. The counter lives in the shared Turso DB,
// so the limit is enforced across all server instances (unlike an in-memory
// limiter, which only protects a single process).

export function clientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return req.headers.get('x-real-ip') ?? 'unknown';
}

interface RateLimitResult {
  allowed: boolean;
  retryAfterSec: number;
}

async function checkRateLimit(key: string, limit: number, windowMs: number): Promise<RateLimitResult> {
  const now = Date.now();
  const windowId = Math.floor(now / windowMs);
  const expiresAt = (windowId + 1) * windowMs;
  const windowKey = `${key}:${windowId}`;

  // Best-effort sweep of expired counters (indexed on expires_at).
  await db.run(sql`DELETE FROM rate_limits WHERE expires_at < ${now}`).catch(() => {});

  try {
    const result = await db.run(sql`
      INSERT INTO rate_limits (key, count, expires_at)
      VALUES (${windowKey}, 1, ${expiresAt})
      ON CONFLICT(key) DO UPDATE SET count = count + 1
      RETURNING count
    `);
    const row = result.rows[0] as { count?: number } | undefined;
    const count = Number(row?.count ?? 1);
    return { allowed: count <= limit, retryAfterSec: Math.ceil((expiresAt - now) / 1000) };
  } catch {
    // Fail open: never let a limiter error take down a legitimate request.
    return { allowed: true, retryAfterSec: 0 };
  }
}

// Enforces a rate limit and returns a 429 response when exceeded, else null.
// Usage: `const limited = await enforceRateLimit(key, 10, 60_000); if (limited) return limited;`
export async function enforceRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): Promise<NextResponse | null> {
  const { allowed, retryAfterSec } = await checkRateLimit(key, limit, windowMs);
  if (allowed) return null;
  return NextResponse.json(
    { error: 'rate_limited', message: 'Too many requests. Please slow down.' },
    { status: 429, headers: { 'Retry-After': String(retryAfterSec) } },
  );
}
