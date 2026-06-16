import { insertAnalyticsEvent } from '@/Lib/Db/Queries';
import type { AnalyticsEventType } from '@/Lib/Types';

// Fire-and-forget first-party analytics. Best-effort: a logging failure must
// never break the request that triggered it. Server-side only.
export async function track(
  type: AnalyticsEventType,
  opts: { userId?: string | null; quizId?: string | null } = {},
): Promise<void> {
  try {
    await insertAnalyticsEvent({ type, userId: opts.userId ?? null, quizId: opts.quizId ?? null });
  } catch {
    // swallow — analytics is non-critical
  }
}
