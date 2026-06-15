import { z } from 'zod';

// Centralised, validated access to server environment variables. Only import
// this from server code (routes, DB/auth/AI modules, scripts) — it reads
// secrets that must never reach a client bundle.
//
// The schema is parsed once at module load: malformed values (e.g. a non-URL
// auth base) fail fast — including during `next build` in CI. Presence of the
// external-service secrets is NOT required at load time (so builds and local
// dev without keys still work); instead `requireServerEnv` asserts a value when
// a feature actually needs it, producing a clear error instead of a silent ''.

// An env var set to an empty string is treated as unset, so a blank value can
// never slip through as '' (the old GOOGLE_CLIENT_ID ?? '' footgun).
const emptyToUndefined = (value: unknown) => (value === '' ? undefined : value);
const optionalString = z.preprocess(emptyToUndefined, z.string().min(1).optional());
const optionalUrl = z.preprocess(emptyToUndefined, z.url().optional());

const schema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // Database (Turso / libsql). Omit both for local dev — the client falls back
  // to a local SQLite file.
  TURSO_DATABASE_URL: optionalString,
  TURSO_AUTH_TOKEN: optionalString,

  // Auth (Better Auth + Google).
  BETTER_AUTH_SECRET: optionalString,
  BETTER_AUTH_URL: optionalUrl,
  GOOGLE_CLIENT_ID: optionalString,
  GOOGLE_CLIENT_SECRET: optionalString,

  // AI generation.
  GOOGLE_AI_API_KEY: optionalString,
  REPLICATE_API_TOKEN: optionalString,

  // Host voice (optional feature; absence degrades gracefully).
  ELEVENLABS_API_KEY: optionalString,
  ELEVENLABS_MODEL_ID: optionalString,

  // Comma-separated list of admin emails (moderation access). Optional.
  ADMIN_EMAILS: optionalString,
});

function parseEnv(): z.infer<typeof schema> {
  const result = schema.safeParse(process.env);
  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `  - ${issue.path.join('.') || '(root)'}: ${issue.message}`)
      .join('\n');
    throw new Error(`Invalid environment variables:\n${issues}`);
  }
  return result.data;
}

export const env = parseEnv();

export type ServerEnv = typeof env;

// Asserts that a required env var is present, throwing a clear, actionable error
// at the point of use rather than letting an empty/undefined value reach an SDK.
export function requireServerEnv<K extends keyof ServerEnv>(
  key: K,
): NonNullable<ServerEnv[K]> {
  const value = env[key];
  if (value === undefined || value === null || value === '') {
    throw new Error(
      `Missing required environment variable ${String(key)}. ` +
        'Set it in your deployment environment (see .env.example).',
    );
  }
  return value as NonNullable<ServerEnv[K]>;
}
