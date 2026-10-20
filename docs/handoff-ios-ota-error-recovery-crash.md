# Handoff: iOS launch crash

## Build 58 (1.0.0)
Expo Updates `ErrorRecovery.crash()` SIGABRT (`ON_LOAD`). OTA cannot fix.

## Build 67 (1.0.1)
IPA confirmed `EXUpdatesEnabled=false` — **not** an Updates abort.
Likely cause: frameless `UIWindow` created in `AppDelegate` then reused in
`SceneDelegate` (expo-dev-launcher bootstrap from `e674d93`), which breaks
UIScene on iOS 26/27. New Arch was also on by default.

## Build 68+ (1.0.2) — ship this
Branch tip restores known-good scene lifecycle (`1a6a1b2` shape):
- AppDelegate does **not** create a bootstrap window
- SceneDelegate always `UIWindow(windowScene:)`
- `newArchEnabled: false`
- `expo-dev-client` only on development EAS profiles
- Updates still `enabled: false`

```bash
git fetch origin
git checkout cursor/fix-ios-native-updates-b1ae
git pull
npx eas build --platform ios --profile production --auto-submit
```

Delete LifeOS, install **1.0.2**, confirm TestFlight shows 1.0.2 (not 58/67).
If it still crashes, paste a crash log that shows **build 68+ / 1.0.2**.
