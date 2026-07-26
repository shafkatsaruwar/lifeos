# LifeOS Mobile

The native iPhone-first companion to LifeOS. It uses the **same Firebase account and Realtime Database** as the web app—there is no second account and no duplicate data store.

## What is in this first build

- Google sign-in
- Now, Today, Spaces, Library, and Settings tabs
- Current-task picker and optional calendar-event-to-task flow
- Native focus timer that continues when you leave the focus screen
- Notes and spaces synced with the web LifeOS data
- A first-login “What should we call you?” setup

## One-time setup

1. Copy `.env.example` to `.env`.
2. Copy the existing LifeOS Firebase web values into the four `EXPO_PUBLIC_FIREBASE_*` fields.
3. In Google Cloud, create **iOS** and **Android** OAuth client IDs in the same project as LifeOS Gmail. Add their client IDs to the matching `EXPO_PUBLIC_GOOGLE_*_CLIENT_ID` fields.
4. For the iOS OAuth client use bundle ID: `com.shafkatsaruwar.lifeos`.
5. For Android use package: `com.shafkatsaruwar.lifeos`.

## Run it on your iPhone

```bash
cd /Users/mohammed/Desktop/Cockpit/lifeos-mobile
npx expo start
```

Install **Expo Go** from the App Store, scan the QR code, and sign in. For a proper installable developer build later, run:

```bash
npx eas-cli login
npx eas-cli build:configure
npx eas-cli build --platform ios --profile development
```

Do not submit this to the App Store until you have tested sign-in and Firebase access on your actual iPhone.
