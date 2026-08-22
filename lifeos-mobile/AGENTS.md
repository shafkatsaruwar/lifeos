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
- **EAS Update (OTA):** optional Path B helper. JS-only changes on `main` can publish via `.github/workflows/eas-update.yml` to `production`. Needs GitHub secrets `EXPO_TOKEN` + `EAS_PROJECT_ID`. Native module / plugin changes still need a full EAS binary.

## Cursor Cloud specific instructions

- When giving the user Mac terminal commands, assume their shell is already in **`lifeos-mobile/`**. Do not prefix with `cd lifeos-mobile` unless they are clearly at the repo root. For git ops that need the monorepo root, say so explicitly (e.g. `cd ..` then the command).
- **Two delivery paths (both in use):**
  - **Path A (default) — Mac local build:** Cloud Agent is often used from the phone for ideas. Agent pushes a branch to GitHub (backup + delivery). On the Mac, user pulls that branch and runs `eas build` / `eas submit` from **local files** (Synapse-style). End every Path A task with the exact `git fetch` / `checkout` / `pull` + build commands — do not require merge/OTA for them to build.
  - **Path B — ship to phone now:** Only when the user asks to ship / TestFlight / “put it on my phone” — publish OTA and/or start `eas build` + `eas submit` from the agent. Say clearly when a new TestFlight install is required vs a relaunch after OTA.
- Simulator/Metro ≠ TestFlight. Metro is live local JS. TestFlight is the store binary (+ OTA if wired). Never assume phone TF matches the simulator until Path A build or Path B ship has landed.
