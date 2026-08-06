# LifeOS Mobile (Phase 1 — iPhone web shell)

This Expo app opens the **real web LifeOS** inside a native WebView so the UI matches the website (colors, fonts, features).

**Important:** pinned to **Expo SDK 54** so it works with the **App Store Expo Go** (newer SDKs are not on the App Store yet).

Legacy native screens remain in `App.native-legacy.tsx` + `src/` for a later native rebuild (they need their own SDK restore later).

## Run on iPhone (Expo Go)

```bash
cd lifeos-mobile
cp .env.example .env   # optional — defaults to production LifeOS
npm install
npx expo start
```

1. Open **Expo Go** from the App Store (no update needed for SDK 54).
2. Scan the QR code with your iPhone.
3. Sign in with the same Google account you use on web LifeOS.

If you still see an SDK mismatch, force-quit Expo Go and scan again after `npx expo start` finishes.

## Optional `.env`

```bash
# Defaults to https://lifeos-mu-three.vercel.app
EXPO_PUBLIC_LIFEOS_URL=https://lifeos-mu-three.vercel.app
```

## Plan

1. Try this web shell in Expo Go
2. If it feels stuck → new native UI matching web design tokens
3. Android after iPhone feels right
