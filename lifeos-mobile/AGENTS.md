# Expo

Pinned to **SDK 54** for App Store Expo Go.

Read versioned docs: https://docs.expo.dev/versions/v54.0.0/

## Architecture

- Entry: `App.tsx` → Firebase auth → `RootNavigator` (wrapped in `GestureHandlerRootView`)
- Data: `src/lib/firebase.ts` RTDB under `users/{uid}/…`
- Auth: HTTPS `/shell-auth` bridge → Google ID token → `signInWithCredential`
- Parked WebView shell: `App.webview.tsx`
- Handwriting: Library note editor **Draw** mode (`HandwritingCanvas` + Skia). Ink lives on `note.ink` in RTDB; web preserves the field but does not render strokes. After pulling deps that add Skia/reanimated, restart Expo with `-c`.
