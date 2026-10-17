# LifeOS

Personal life operating system — tasks, school, notes, calendar, and focus.  
**Web** (Next.js) and optional **iOS** (`lifeos-mobile/`) share Firebase Auth + Realtime Database.

## Quick start (web)

```bash
npm install
cp .env.example .env.local   # optional — blank Firebase = local-only demo
npm run dev                  # http://localhost:3000
```

On localhost, use **Dev: Test Login** (no Firebase required). Confirm the age gate, then you’re in.

With Firebase filled in `.env.local`, use **Sign in with Google** (add your domain to Firebase Authorized domains).

## How to use LifeOS

See **[docs/STARTUP.md](./docs/STARTUP.md)** for the product walkthrough (Now, Tasks, School, capture commands, Settings).

## New vs existing users

| | Environments shown |
|--|--|
| **New accounts** | **LifeOS** + **SchoolOS** only |
| **Existing accounts** | Unchanged (whatever they already had) |

Turn on Work, Study Abroad, Treasury, or Mastery later under **Settings → Workspace**.

## Setup for your own deploy

1. Create a Firebase project (Auth + Realtime Database). Copy web config into `.env.local` / `lifeos-mobile/.env`.
2. Enable Google sign-in; add `localhost` and your production host to Authorized domains.
3. Set `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` so Next can rewrite `/__/auth` (see `next.config.ts`).
4. Deploy the web app (e.g. Vercel); set the same env vars there.
5. Mobile: copy `lifeos-mobile/.env.example` → `.env`, set `EXPO_PUBLIC_LIFEOS_URL` to your web origin, change `app.json` bundle IDs / Expo owner / EAS project to yours.

Details: [docs/architecture.md](./docs/architecture.md) · [docs/agent.md](./docs/agent.md) · [lifeos-mobile/README.md](./lifeos-mobile/README.md)

## Scripts

| Command | What |
|---------|------|
| `npm run dev` | Web + API on :3000 |
| `npm test` | Jest |
| `npm run lint` | ESLint |
| `cd lifeos-mobile && npm start` | Expo Metro |

## Docs

| Doc | Purpose |
|-----|---------|
| [docs/STARTUP.md](./docs/STARTUP.md) | End-user / teammate startup guide |
| [docs/PRD.md](./docs/PRD.md) | Product requirements |
| [docs/architecture.md](./docs/architecture.md) | System map |
| [docs/design-system.md](./docs/design-system.md) | UI tokens |
| [docs/agent.md](./docs/agent.md) | Guidelines for coding agents |
