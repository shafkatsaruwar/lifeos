# LifeOS Mobile (Phase 2 — native iPhone app)

Native Expo app for LifeOS. Same Firebase cloud data as the web app — not a WebView shell.

Pinned to **Expo SDK 54** for App Store Expo Go.

## Run on iPhone / Simulator

```bash
cd lifeos-mobile
cp .env.example .env
# fill Firebase + Google web client ID
npm install
npx expo start
```

1. Force-quit Expo Go, scan QR (or press `i` for Simulator)
2. Sign in with Google
3. Land on **Now** — Tasks, Calendar, Life, School, Library in the tab bar
4. Settings is the gear on Now

## Required `.env`

```bash
EXPO_PUBLIC_LIFEOS_URL=https://lifeos-mu-three.vercel.app
EXPO_PUBLIC_FIREBASE_API_KEY=...
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=...
EXPO_PUBLIC_FIREBASE_DATABASE_URL=...
EXPO_PUBLIC_FIREBASE_PROJECT_ID=...
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=....apps.googleusercontent.com
```

Google sign-in uses the HTTPS `/shell-auth` bridge (Expo Go cannot use `exp://` redirects), then signs into Firebase natively with the Google ID token.

iOS bundle ID: `com.shafkatsaruwar.lifeos`

## Tabs

| Tab | Purpose |
|-----|---------|
| Now | Current task, capture, focus, ambient |
| Tasks | List + detail |
| Calendar | Upcoming / month / iCal |
| Life | LifeOS hub |
| School | SchoolOS hub |
| Library | Notes, Brain, Resources |

## Legacy WebView shell

Phase 1 WebView entry is parked at `App.webview.tsx` if you ever need it.

## Plan

1. ~~Web shell in Expo Go~~
2. **Native UI (this)** — Now-first tabs, Firebase sync
3. Android later
