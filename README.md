# Quiz Dart

Quiz Dart is an AI-powered quiz PWA. Generate a quiz from a topic or your own
study notes, play fast, high-energy rounds with an AI host, and share a link so
anyone can play and compare scores — no account needed to play.

Live at [quizdart.app](https://quizdart.app).

## Features

- **AI generation** — quizzes (Google Gemini) and cover/question art (Replicate)
  from a topic or pasted material.
- **Progressive auth** — anyone can play shared links anonymously; creating
  quizzes requires Google sign-in (Better Auth).
- **Credits** — each new creator gets a free monthly bundle of generation
  credits; one quiz generation costs one credit.
- **Ownership & visibility** — your dashboard shows only your quizzes; shared
  links stay public, private quizzes stay owner-only.
- **Play mechanics** — multiple formats, streaks, confidence calls, detailed
  per-question recaps, and device-local stats.
- **PWA** — installable, offline-aware (Serwist service worker).

## Tech stack

- **Next.js 16** (App Router) + **React 19**
- **Turso / libSQL** with **Drizzle ORM**
- **Better Auth** (Google provider), data stored in the same Turso DB
- **Jotai** for client state, plain CSS modules (neo-brutalist design)
- Deployed on **Railway** (pnpm, standalone output)

## Getting started

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

With no `TURSO_*` vars set, the app uses a local SQLite file (`local.db`).

## Environment variables

Copy `.env.example` and fill in:

| Variable | Purpose |
| --- | --- |
| `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN` | Turso DB (omit for local SQLite) |
| `GOOGLE_AI_API_KEY` | Gemini quiz generation |
| `REPLICATE_API_TOKEN` | Image generation |
| `BETTER_AUTH_SECRET` | Auth signing secret (`openssl rand -base64 32`) |
| `BETTER_AUTH_URL` | Public base URL (e.g. `https://quizdart.app`) |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Google OAuth credentials |

Google OAuth redirect URI: `<BETTER_AUTH_URL>/api/auth/callback/google`.

## Scripts

- `pnpm dev` / `pnpm build` / `pnpm start` — Next.js dev / build / serve
- `pnpm lint` — ESLint
- `pnpm backfill-owner <email>` — assign pre-auth ownerless quizzes to a user
- `pnpm generate-sounds` — regenerate UI sound effects
