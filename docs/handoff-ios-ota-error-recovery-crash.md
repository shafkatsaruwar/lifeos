# Handoff: iOS launch crash

## Build 58 (1.0.0)
Expo Updates `ErrorRecovery.crash()` SIGABRT (`ON_LOAD`). OTA cannot fix.

## Build 67 (1.0.1)
IPA confirmed `EXUpdatesEnabled=false` — **not** an Updates abort.
Likely cause: frameless `UIWindow` created in `AppDelegate` then reused in
`SceneDelegate` (expo-dev-launcher bootstrap from `e674d93`), which breaks
UIScene on iOS 26/27. New Arch was also on by default.

## Builds 68–70 (1.0.2) — EAS failed
`newArchEnabled: false` broke `pod install`: Reanimated 4.x asserts New Arch.
Do **not** disable New Arch on this SDK.

## Build 71 (1.0.2) — still crashed
Hermes SIGSEGV (not Updates). Stack matches RN 0.81 bug:
`performVoidMethodInvocation` → `convertNSExceptionToJSError` off-thread
corrupts JSI (facebook/react-native#56265 / 4083a6f). Build used
**React-Core-prebuilt**, so patch-package alone could not land.

## Build 72+ (1.0.2) — ship this
- Patch `RCTTurboModule.mm` void NSException path (`@throw` instead of JSError)
- Force `RCT_USE_PREBUILT_RNCORE=0` so the patch compiles into the binary
- Exclude `expo-dev-client` from production autolinking
- Defer `maybeCompleteAuthSession`; `.catch` on `Linking.getInitialURL`
- Scene fix + Updates off + New Arch on (Reanimated) + P1 harden still apply

```bash
git fetch origin
git checkout cursor/fix-ios-native-updates-b1ae
git pull
npx eas build --platform ios --profile production --auto-submit
```

Delete LifeOS, install **1.0.2**, confirm TestFlight shows 1.0.2 (not 58/67).
If it still crashes, paste a crash log that shows **build 68+ / 1.0.2**.
