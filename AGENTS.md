# LifeOS

A personal productivity "life operating system": tasks, projects, spaces, notes, calendar, and a focus timer, with AI-assisted natural-language task creation and calendar integrations. The primary product is a Next.js web app; there are additional optional surfaces (a Tauri desktop wrapper, an Expo mobile app in `lifeos-mobile/`, and a browser extension in `lifeos-context-radar/`).

## Cursor Cloud specific instructions

Scope note: the core product is the Next.js web app at the repo root. The dependency update script installs only the root web app's dependencies. The other surfaces are optional and not needed to exercise the core product:
- `lifeos-mobile/` (Expo) is a separate npm project with its own `package-lock.json`; run `npm install` there separately if you need it.
- `src-tauri/` (Tauri desktop) requires a Rust toolchain that is not installed by default.
- `lifeos-context-radar/` is a plain-JS Chrome extension with no build step.

Running / testing the web app (commands live in root `package.json`):
- Dev server: `npm run dev` serves the UI and all backend API routes (`app/api/**`) in-process on `http://localhost:3000`.
- Lint: `npm run lint` (ESLint flat config). Expected to pass with warnings only, no errors. Note: `npm run lint` currently also lints the generated `coverage/` report, producing harmless extra warnings.
- Tests: `npm test` (Jest). Type-check with `npx tsc --noEmit`.

Non-obvious gotchas:
- No local backend/database process exists. Persistence/auth is Firebase (a hosted cloud service). Firebase and the AI/calendar integrations are configured via env vars in `.env.local` (see `.env.example`); none of them are required to run or demo the app locally.
- The login screen shows a "Dev: Test Login" button ONLY when the hostname is `localhost` or `127.0.0.1`. Use it to enter the app without Firebase credentials — it signs in as a local test user (`lib/constants.ts` `TEST_USER`). Access the app via `http://localhost:3000` (not the LAN IP) so this button appears.
- With no Firebase env vars, cloud sync is a no-op by design (`lib/dataSync.ts` early-returns when `NEXT_PUBLIC_FIREBASE_DB_URL` is unset), so the app runs fully on local/in-memory state.
- Root `.npmrc` sets `legacy-peer-deps=true`; installs rely on this, so use plain `npm install`.

Creating a task (quick smoke test): on the "Now" view, type `/t <task title>` in the command input and press Enter.
