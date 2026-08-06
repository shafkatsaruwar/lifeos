# LifeOS Mobile (Phase 1 — iPhone web shell)

Expo WebView that loads real web LifeOS so UI matches the site.

Pinned to **Expo SDK 54** for App Store Expo Go.

Google sign-in inside the WebView uses **native Expo Google auth**, then injects the session into the website (popup/redirect auth breaks in iOS WebViews).

## Run on iPhone

```bash
cd lifeos-mobile
cp .env.example .env
# fill Google client IDs (required for sign-in)
npm install
npx expo start
```

1. Force-quit Expo Go, scan QR
2. Tap **Home** if you land on a blank/auth error page
3. Sign in with Google on the LifeOS login screen

## Required `.env`

```bash
EXPO_PUBLIC_LIFEOS_URL=https://lifeos-mu-three.vercel.app
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=....apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=....apps.googleusercontent.com
```

Create those OAuth clients in the same Google Cloud project as web LifeOS.  
iOS bundle ID: `com.shafkatsaruwar.lifeos`

**Note:** Web auth bridge changes must be deployed (merge this PR) before production sign-in works from the shell.

## Plan

1. Web shell in Expo Go (this)
2. If UX feels stuck → new native UI
3. Android later
