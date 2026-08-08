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
