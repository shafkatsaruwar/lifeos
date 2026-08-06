# LifeOS Mobile (Phase 1 — iPhone web shell)

This Expo app opens the **real web LifeOS** inside a native WebView so the UI matches the website (colors, fonts, features).

We start here on purpose: try it in **Expo Go on iPhone**. If it feels stuck or awkward, we move to a new native UI that copies the web design system.

Legacy native screens are kept as `App.native-legacy.tsx` + `src/` for a later native rebuild.

## Run on iPhone (Expo Go)

```bash
cd lifeos-mobile
cp .env.example .env   # optional — defaults to production LifeOS
npm install
npx expo start
```

1. Install **Expo Go** from the App Store.
2. Scan the QR code with your iPhone Camera / Expo Go.
3. Sign in with the same Google account you use on web LifeOS.

## Optional `.env`

```bash
# Defaults to https://lifeos-mu-three.vercel.app
EXPO_PUBLIC_LIFEOS_URL=https://lifeos-mu-three.vercel.app
```

Point this at a local tunnel / preview URL if you want to test unreleased web changes.

## What this phase is / isn’t

| Is | Isn’t |
|---|---|
| Same LifeOS UI as the website | Final App Store product |
| Fast way to feel phone UX | Full native navigation/widgets |
| iPhone-first | Android polish (later) |

## Next

If Expo Go feels good → polish the shell (safe areas, auth quirks, hide double chrome).  
If it feels trapped → start the **new native** app using web colors/type, informed by what hurt.
