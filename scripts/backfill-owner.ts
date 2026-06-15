/**
 * One-off backfill: assign every ownerless quiz (those created before auth
 * landed) to an existing user, so they show up in that user's dashboard.
 *
 * The admin must sign in with Google at least once first, so their user row
 * exists. Then run this against the same database the app uses.
 *
 * Usage (local):
 *   npx tsx scripts/backfill-owner.ts you@example.com
 *
 * Usage (Turso):
 *   TURSO_DATABASE_URL=libsql://... TURSO_AUTH_TOKEN=... \
 *     npx tsx scripts/backfill-owner.ts you@example.com
 *
 * Idempotent: only touches rows where owner_id IS NULL.
 */

import { runMigrations } from '../src/Lib/Db/Migrate';
import { getUserByEmail, backfillQuizOwner } from '../src/Lib/Db/Queries';

async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error('Usage: npx tsx scripts/backfill-owner.ts <admin-email>');
    process.exit(1);
  }

  await runMigrations();

  const user = await getUserByEmail(email);
  if (!user) {
    console.error(
      `No user found for "${email}". Sign in with that Google account once, then re-run.`,
    );
    process.exit(1);
  }

  const count = await backfillQuizOwner(user.id, 'unlisted');
  console.log(`Assigned ${count} ownerless quiz(zes) to ${user.email} (${user.id}).`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
