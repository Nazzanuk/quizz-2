import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { nextCookies } from 'better-auth/next-js';
import { db } from '@/Lib/Db/Client';
import { user, session, account, verification } from '@/Lib/Db/Schema';
import { STARTER_CREDITS } from '@/Lib/Constants';

// Server-only Better Auth instance. Auth data lives in the same Turso DB as the
// quizzes, via the Drizzle adapter. Google is the only provider (Creator login).
export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'sqlite',
    schema: { user, session, account, verification },
  }),
  // No outbound telemetry pings from this self-hosted app.
  telemetry: { enabled: false },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID ?? '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
    },
  },
  user: {
    additionalFields: {
      // Creator credit budget. Seeded on first sign-in; never accepted from the
      // client (input: false), only mutated server-side by the generation gate.
      credits: {
        type: 'number',
        required: false,
        defaultValue: STARTER_CREDITS,
        input: false,
      },
      // Stamp of the last monthly refresh, used for lazy top-ups.
      creditsRefreshedAt: {
        type: 'string',
        required: false,
        defaultValue: () => new Date().toISOString(),
        input: false,
      },
    },
  },
  // Lightweight built-in abuse guard (in-memory). Per-user credits are the
  // primary spend cap; this throttles raw request floods.
  rateLimit: { enabled: true },
  plugins: [nextCookies()],
});
