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
- Firebase config is **env-only** — there is no baked-in production project in the repo. Copy `.env.example` → `.env.local`.
- New users get **LifeOS + SchoolOS** only; returning users keep existing environment flags (`lib/settingsDefaults.ts`).
- Root `.npmrc` sets `legacy-peer-deps=true`; installs rely on this, so use plain `npm install`.

Creating a task (quick smoke test): on the "Now" view, type `/t <task title>` in the command input and press Enter.

Reticle verification (dev-only proof layer):
- SDK is wired via `withReticle()` in `next.config.ts` and `<ReticleDev />` in `app/layout.tsx`. Bridge port defaults to **4400** (not the Next dev port).
- After changing Reticle wiring or `next.config.ts`, restart `npm run dev` and hard-reload the browser tab — HMR does not pick up the Reticle plugin.
- Start daemon if needed: `npx @reticlehq/server serve` (background). Open/connect: `npx @reticlehq/server open http://localhost:3000`.
- MCP tools (`reticle_*`) load after a Cursor window reload (registered in `~/.cursor/mcp.json` by `reticle init`). Until reload, use `npx @reticlehq/server status` to confirm daemon + session.
- Saved flow: `.reticle/flows/lifeos-8af22c44/dev-test-login.json` (Dev Test Login → dashboard). Replay: `reticle_run({ tool: "reticle_flow_replay", args: { flowName: "dev-test-login" } })` or `/reticle` skill.
- Use `http://localhost:3000` (not LAN IP) so "Dev: Test Login" appears on the login screen.

<!-- reticle:begin (managed by `reticle init` — edit outside these markers) -->
## Verifying with Reticle

This app is instrumented by **Reticle**, an in-app verification layer exposed as `reticle_*` MCP tools and the `npx @reticlehq/server` CLI (always through npx: Reticle's server is not installed into this project). Verifying is part of "done", not an optional extra.

**Verify when you have changed something a user can see or do.** A component, a form, a route, a request, a piece of state that reaches the screen. Do it BEFORE telling the user it is complete. Reading the diff proves nothing and unit tests do not run the app.

**Do not reach for Reticle when the change cannot show up in the running app.** It costs tool calls and the user's patience, and a verdict over an unrelated flow proves nothing about what you changed. Skip it for: documentation, comments, tests, build config, CI, dependency bumps with no user-facing effect, backend or CLI work with no UI surface, and any change to a project that is not a running web app. Say in one line that you skipped verification and why, rather than silently not doing it.

**How to verify:**

- Drive the flow with `reticle_act_and_wait({ ref, action, until })`. It names the consequence you expect BEFORE the action, which is the difference between a check and a rationalisation.
- Batch a multi-step journey (a login, a form) into one `reticle_act_sequence` rather than one round trip per field.
- Read the surrounding evidence with `reticle_snapshot`, `reticle_state`, `reticle_network`, `reticle_console`.
- **Only `reticle_act_and_wait` and `reticle_assert` produce a verdict.** `reticle_act` and everything else move or read the app and prove nothing, so a session ending without one of those two has no result however many tools it used.
- Covered flows: `npx @reticlehq/server gate` reports which recorded flows the changed files affect and whether they still pass.

**Nothing connected? Get the app running.**

**If no dev server is listening, start one yourself.** Read the project's own dev script out of `package.json` (`dev`, `start`, whatever this project calls it), run it in the BACKGROUND, tell the user in one line that it is running and how to stop it, then carry on. Stopping to ask is how a verification turn ends with nothing verified.

Five guards, none optional:

1. **Never start a second one.** If something is already listening on the app's port, use it.
2. **Never guess the command.** It comes from `package.json` scripts. If there is no recognisable dev script, say so and stop rather than inventing one.
3. **Never kill anything.** Not a dev server, not a daemon, not a port holder — including one you started.
4. **Background it, and say so.** The user must know a server is running and how to stop it. A dev server the human does not know about is the same failure one step later.
5. **The permission prompt belongs to your host.** Never try to bypass, suppress or auto-approve it, and take a refusal as the answer.

A dev server that is already running does not pick up an edited build config or a newly created plugin file — restart it and hard-reload the tab. And if a server IS listening and still nothing connects, the cause is the SDK not loading in the page, not a missing dev server; do not tell the user to start one they are already running.

**Honesty, which is the whole point:**

- **`verified: "unknown"` is not a pass.** It means Reticle drove the app and could not tell what happened; `verifiedReason` says which clause decided that. Report it as unknown, never as working.
- **Never weaken a check to make it green.** Downgrading, skipping or deleting an assertion is a finding, not a fix.
- **If Reticle cannot run** (no daemon, or this is not a running web app), say so. Do not skip verification silently.
- **Setup is not finished until one real flow has been driven and produced a verdict.** `init` exiting 0, the tools appearing, and a session being listed are all things that happen before anything has been verified.

**The `/reticle` skill runs this whole loop for you** — detect, connect, drive one flow, report. If your client does not have it, install it once: `/plugin marketplace add reticlehq/reticle` then `/plugin install reticle@reticlehq` in Claude Code, or `npx skills add reticlehq/reticle` anywhere the skills CLI works.

**Report Reticle's own defects with `reticle_feedback` the moment you notice**, then carry on with your task. You are the user Reticle is built for and the only one who can say what it cost you, and that knowledge is gone when your context is.

📄 **The rest is in [RETICLE.md](./RETICLE.md): what to do when the tools are missing, when a result carries `version_skew` or `update_available`, when `reticle_state` comes back empty, and how to write a feedback report that can be acted on. Read it when you hit one of those, not before.**
<!-- reticle:end -->
