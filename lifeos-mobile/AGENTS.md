# Expo

Pinned to **SDK 54** for App Store Expo Go.

Read versioned docs: https://docs.expo.dev/versions/v54.0.0/

## Architecture

- Entry: `App.tsx` → Firebase auth → `RootNavigator` (wrapped in `GestureHandlerRootView`)
- Data: `src/lib/firebase.ts` RTDB under `users/{uid}/…`
- Auth: HTTPS `/shell-auth` bridge → Google ID token → `signInWithCredential`
- Parked WebView shell: `App.webview.tsx`
- **Notebooks:** Library → **Notebooks** → notebook → page → `PageCanvasScreen`.
  - Ink: Apple PencilKit. Overlays: typed text + images (`PageElementsLayer`). Modes: Ink / Text / Image / Paper.
  - Data: `notebookHub` + per-page `notebookPages/{pageId}`.
  - Search: notebook names + page titles + typed text (+ recognition only if `status === "ready"`).
  - Architecture stubs (not faked): `notebookPdf.ts`, `handwritingRecognition.ts`, `notebookAi.ts`.
  - PencilKit **requires a native iOS build**, not Expo Go.
- Legacy single-note Draw mode still on `NoteEditorScreen` / `note.ink`.
