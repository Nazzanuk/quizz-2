/**
 * Resets EVERY user's credit balance to the current default (STARTER_CREDITS).
 * Use after changing the default so existing users get the new allowance too.
 *
 * DRY RUN BY DEFAULT — prints the user count and current balances. Re-run with
 * --apply to actually write.
 *
 * Note: this sets credits to exactly STARTER_CREDITS for everyone (it does not
 * preserve a higher hoarded balance), and stamps the monthly-refresh time to now
 * so the next top-up is a full month away.
 *
 * Usage (against production):
 *   TURSO_DATABASE_URL=libsql://... TURSO_AUTH_TOKEN=... \
 *     npm run reset-credits             # dry run
 *   TURSO_DATABASE_URL=... TURSO_AUTH_TOKEN=... \
 *     npm run reset-credits -- --apply  # write
 */

import './load-env'; // must run before any module that reads env at import time
import { db } from '../src/Lib/Db/Client';
import { user } from '../src/Lib/Db/Schema';
import { runMigrations } from '../src/Lib/Db/Migrate';
import { STARTER_CREDITS } from '../src/Lib/Constants';

async function main() {
  const apply = process.argv.includes('--apply');
  await runMigrations();

  const rows = await db.select({ id: user.id, credits: user.credits }).from(user);
  if (rows.length === 0) {
    console.log('No users found.');
    return;
  }

  const total = rows.reduce((sum, r) => sum + (r.credits ?? 0), 0);
  console.log(`${rows.length} user(s), ${total} credits total currently.`);
  console.log(`Target: ${STARTER_CREDITS} credits each.`);

  if (!apply) {
    console.log(`\nDry run: re-run with --apply to set all ${rows.length} user(s) to ${STARTER_CREDITS}.`);
    return;
  }

  const now = new Date().toISOString();
  await db.update(user).set({ credits: STARTER_CREDITS, creditsRefreshedAt: now });
  console.log(`\nReset ${rows.length} user(s) to ${STARTER_CREDITS} credits.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
