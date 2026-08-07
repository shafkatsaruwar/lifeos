# Expo

Pinned to **SDK 54** for App Store Expo Go.

Read versioned docs: https://docs.expo.dev/versions/v54.0.0/

## Architecture

- Entry: `App.tsx` → Firebase auth → `RootNavigator` (wrapped in `GestureHandlerRootView`)
- Data: `src/lib/firebase.ts` RTDB under `users/{uid}/…`
- Auth: HTTPS `/shell-auth` bridge → Google ID token → `signInWithCredential`
- Parked WebView shell: `App.webview.tsx`
- **Notebooks (primary handwriting):** Library → **Notebooks** → notebook → page → `PageCanvasScreen` (PencilKit). Metadata: `users/{uid}/notebookHub`. Pages: `users/{uid}/notebookPages/{pageId}` (per-page writes). Types in `src/types.ts` (`Notebook`, `NotebookPage`, …). Helpers: `src/lib/notebooks.ts`.
- Legacy single-note Draw mode still exists on `NoteEditorScreen` / `note.ink`.
- PencilKit **does not work in Expo Go** — needs a native iOS build (`npx expo run:ios` or EAS `development-device` / `preview` / `production`).
