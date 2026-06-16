/**
 * Removes accidental duplicate quizzes (e.g. created when a slow "generate"
 * appeared to fail and the user retried). Groups quizzes by owner + title and
 * keeps the EARLIEST in each group, deleting the rest with the app's full
 * cleanup (questions, runs, results, attempts, images).
 *
 * DRY RUN BY DEFAULT — it only prints what it would do. Review the output, then
 * re-run with --apply to actually delete.
 *
 * Heads-up: two genuinely different quizzes that share an owner and title will
 * be treated as duplicates, so always check the dry-run list first.
 *
 * Usage (against production):
 *   TURSO_DATABASE_URL=libsql://... TURSO_AUTH_TOKEN=... \
 *     npx tsx scripts/dedupe-quizzes.ts            # dry run
 *   TURSO_DATABASE_URL=... TURSO_AUTH_TOKEN=... \
 *     npx tsx scripts/dedupe-quizzes.ts --apply    # delete
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
  createdAt: string;
  questionCount: number | null;
}

async function main() {
  const apply = process.argv.includes('--apply');
  await runMigrations();

  const rows: Row[] = await db
    .select({
      id: quizzes.id,
      ownerId: quizzes.ownerId,
      title: quizzes.title,
      createdAt: quizzes.createdAt,
      questionCount: quizzes.questionCount,
    })
    .from(quizzes);

  const groups = new Map<string, Row[]>();
  for (const row of rows) {
    const key = `${row.ownerId ?? 'none'}::${row.title.trim().toLowerCase()}`;
    const list = groups.get(key) ?? [];
    list.push(row);
    groups.set(key, list);
  }

  const toDelete: Row[] = [];
  for (const list of groups.values()) {
    if (list.length < 2) continue;
    const sorted = [...list].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    const [keep, ...extras] = sorted;
    console.log(`\nDuplicate group "${keep.title}" (owner ${keep.ownerId ?? 'none'}): ${list.length} copies`);
    console.log(`  KEEP   ${keep.id}  ${keep.createdAt}  (${keep.questionCount ?? 0} Qs)`);
    for (const extra of extras) {
      console.log(`  DELETE ${extra.id}  ${extra.createdAt}  (${extra.questionCount ?? 0} Qs)`);
      toDelete.push(extra);
    }
  }

  if (toDelete.length === 0) {
    console.log('\nNo duplicate quizzes found.');
    return;
  }

  if (!apply) {
    console.log(`\nDry run: ${toDelete.length} quiz(zes) would be deleted. Re-run with --apply to delete.`);
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
