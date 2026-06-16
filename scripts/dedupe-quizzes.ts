/**
 * Removes accidental duplicate quizzes — the ones created when a slow "generate"
 * appeared to fail and the user retried. Retries produce a *different* AI title
 * each time but keep the same topic, so duplicates are detected by
 * (owner + topic) AND being created within a short time window of each other
 * (a retry burst). The EARLIEST in each burst is kept; the rest are deleted with
 * the app's full cleanup (questions, runs, results, attempts, images).
 *
 * DRY RUN BY DEFAULT — it only prints what it would do. Review the output, then
 * re-run with --apply to actually delete.
 *
 * Quizzes with no topic are skipped (can't be matched reliably). Same-topic
 * quizzes created far apart are treated as separate, intentional quizzes.
 *
 * Usage (against production — .env.local is auto-loaded):
 *   pnpm dedupe-quizzes            # dry run
 *   pnpm dedupe-quizzes -- --apply # delete
 *   pnpm dedupe-quizzes -- --window=10   # change the burst window (minutes)
 */

import './load-env'; // must run before any module that reads env at import time
import { db } from '../src/Lib/Db/Client';
import { quizzes } from '../src/Lib/Db/Schema';
import { deleteQuiz } from '../src/Lib/Db/Queries';
import { runMigrations } from '../src/Lib/Db/Migrate';

interface Row {
  id: string;
  ownerId: string | null;
  title: string;
  topic: string | null;
  createdAt: string;
  questionCount: number | null;
}

const DEFAULT_WINDOW_MIN = 30;

function parseWindowMin(): number {
  const arg = process.argv.find((a) => a.startsWith('--window='));
  const value = arg ? Number(arg.split('=')[1]) : NaN;
  return Number.isFinite(value) && value > 0 ? value : DEFAULT_WINDOW_MIN;
}

async function main() {
  const apply = process.argv.includes('--apply');
  const windowMs = parseWindowMin() * 60_000;
  await runMigrations();

  const rows: Row[] = await db
    .select({
      id: quizzes.id,
      ownerId: quizzes.ownerId,
      title: quizzes.title,
      topic: quizzes.topic,
      createdAt: quizzes.createdAt,
      questionCount: quizzes.questionCount,
    })
    .from(quizzes);

  // Group by owner + normalized topic (skip quizzes without a topic).
  const groups = new Map<string, Row[]>();
  for (const row of rows) {
    const topic = (row.topic ?? '').trim().toLowerCase();
    if (!topic) continue;
    const key = `${row.ownerId ?? 'none'}::${topic}`;
    const list = groups.get(key) ?? [];
    list.push(row);
    groups.set(key, list);
  }

  const toDelete: Row[] = [];
  for (const list of groups.values()) {
    if (list.length < 2) continue;
    const sorted = [...list].sort((a, b) => a.createdAt.localeCompare(b.createdAt));

    // Split the group into bursts: a new burst starts when the gap from the
    // previous quiz exceeds the window.
    let burst: Row[] = [sorted[0]];
    const flush = () => {
      if (burst.length < 2) return;
      const [keep, ...extras] = burst;
      console.log(`\nDuplicate burst — topic "${keep.topic}" (owner ${keep.ownerId ?? 'none'}): ${burst.length} copies`);
      console.log(`  KEEP   ${keep.id}  ${keep.createdAt}  ${keep.questionCount ?? 0} Qs  "${keep.title}"`);
      for (const extra of extras) {
        console.log(`  DELETE ${extra.id}  ${extra.createdAt}  ${extra.questionCount ?? 0} Qs  "${extra.title}"`);
        toDelete.push(extra);
      }
    };
    for (let i = 1; i < sorted.length; i += 1) {
      const gap = new Date(sorted[i].createdAt).getTime() - new Date(sorted[i - 1].createdAt).getTime();
      if (gap <= windowMs) {
        burst.push(sorted[i]);
      } else {
        flush();
        burst = [sorted[i]];
      }
    }
    flush();
  }

  if (toDelete.length === 0) {
    console.log('\nNo duplicate quizzes found.');
    return;
  }

  if (!apply) {
    console.log(`\nDry run: ${toDelete.length} quiz(zes) would be deleted (window ${parseWindowMin()} min). Re-run with --apply to delete.`);
    return;
  }

  for (const extra of toDelete) {
    await deleteQuiz(extra.id);
    console.log(`Deleted ${extra.id}`);
  }
  console.log(`\nDeleted ${toDelete.length} duplicate quiz(zes).`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
