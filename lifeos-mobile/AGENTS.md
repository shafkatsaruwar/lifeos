# Expo

Pinned to **SDK 54** for App Store Expo Go.

Read versioned docs: https://docs.expo.dev/versions/v54.0.0/

## Architecture

- Entry: `App.tsx` → Firebase auth → `RootNavigator` (wrapped in `GestureHandlerRootView`)
- Data: `src/lib/firebase.ts` RTDB under `users/{uid}/…`
- Auth: HTTPS `/shell-auth` bridge → Google ID token → `signInWithCredential`
  - Session persists via AsyncStorage (`getReactNativePersistence`). Metro aliases `@firebase/auth` → RN build so persistence is not dropped. Sign-out is explicit (Settings).
- Parked WebView shell: `App.webview.tsx`
- **Notebooks:** Library → **Notebooks** → notebook → page → `PageCanvasScreen`.
  - Ink: Apple PencilKit. Overlays: typed text + images (`PageElementsLayer`). Modes: Ink / Text / Image / Paper.
  - Data: `notebookHub` + per-page `notebookPages/{pageId}`.
  - Search: notebook names + page titles + typed text (+ recognition only if `status === "ready"`).
  - Architecture stubs (not faked): `notebookPdf.ts`, `handwritingRecognition.ts`, `notebookAi.ts`.
  - PencilKit **requires a native iOS build**, not Expo Go.
- Legacy single-note Draw mode still on `NoteEditorScreen` / `note.ink`.
- **EAS builds:** always run from `lifeos-mobile/` on latest `main`. Do not “Rebuild” a failed job (reuses old commit). After install, `eas-build-post-install` ensures `expo` is present so prebuild does not fetch Expo 57 via `npx`.
- **EAS Update (OTA / Synapse-style):** JS-only changes on `main` publish via `.github/workflows/eas-update.yml` to the `production` channel. TestFlight/production binaries built with `channel: production` pick updates up on cold start — no `git fetch` / Metro restart. Native module / `app.json` plugin changes still need a new EAS binary. Requires GitHub secrets `EXPO_TOKEN` + `EAS_PROJECT_ID`, and `EAS_PROJECT_ID` (or `EXPO_PUBLIC_EAS_PROJECT_ID`) in the environment used to publish. Config: `app.config.js`, channels on `preview` / `production` in `eas.json`.

## Cursor Cloud specific instructions

- When giving the user Mac terminal commands, assume their shell is already in **`lifeos-mobile/`**. Do not prefix with `cd lifeos-mobile` unless they are clearly at the repo root. For git ops that need the monorepo root, say so explicitly (e.g. `cd ..` then the command).
- Prefer shipping UI/JS fixes through a PR → merge to `main` so OTA can publish. Do not tell the user to `git fetch` + `expo start` for TestFlight verification when EAS Update is configured — say “merge, wait for the EAS Update Action, force-quit and reopen the app.” Still use Metro only when iterating on a branch before merge, or for native changes.
