import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import { env } from '@/Lib/Env';
import * as schema from './Schema';

// No Turso URL configured → fall back to a local SQLite file for dev.
const url = env.TURSO_DATABASE_URL ?? 'file:local.db';

const client = createClient({
  url,
  authToken: env.TURSO_AUTH_TOKEN,
});

export const db = drizzle(client, { schema });
