// Tiny in-memory TTL cache for hot, viewer-independent read aggregations
// (Discover feed, leaderboard cores). Per-instance — that's fine for caching:
// each server reduces its own DB load, and entries expire within the TTL.

interface Entry<T> {
  value: T;
  expiresAt: number;
}

const store = new Map<string, Entry<unknown>>();
const MAX_ENTRIES = 1000;

function purgeExpired(now: number): void {
  for (const [key, entry] of store) {
    if (entry.expiresAt <= now) store.delete(key);
  }
}

// Drops every cached entry whose key starts with `prefix`. Used to force a
// recompute after a write (e.g. re-attributing runs invalidates `lb:` cores).
export function invalidateCacheByPrefix(prefix: string): void {
  for (const key of store.keys()) {
    if (key.startsWith(prefix)) store.delete(key);
  }
}

// Returns the cached value if fresh, else computes via fn(), caches, and returns.
export async function cached<T>(key: string, ttlMs: number, fn: () => Promise<T>): Promise<T> {
  const now = Date.now();
  const hit = store.get(key);
  if (hit && hit.expiresAt > now) return hit.value as T;

  const value = await fn();
  if (store.size > MAX_ENTRIES) purgeExpired(now);
  store.set(key, { value, expiresAt: now + ttlMs });
  return value;
}
