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

## Build 72 (1.0.2) — may still crash
TurboModule patch + RN source build. If user still on 1.0.2, confirm
TestFlight **build number** (71 = unpatched Hermes bug).

## Build 73 (1.0.3) — still crashed
JS fatal: `RCTExceptionsManager.reportFatal` → `RCTFatal` → SIGABRT (~2s).
Different from Hermes SIGSEGV (71). Role was Non UI.

## Build 74+ (1.0.4) — ship this
- Soft-fail JS fatals: ErrorUtils handler + `RCTSetFatalHandler` (no SIGABRT)
- Drop Gesture Handler v2 API from tab bar / zoom (no worklets)
- Defer notification handler + lazy-load RootNavigator
- Keep Old Arch, no Reanimated/dev-client, Live Activity JS off, Updates off

```bash
git fetch origin
git checkout cursor/fix-ios-native-updates-b1ae
git pull
cd lifeos-mobile
npx eas build --platform ios --profile production --auto-submit
```

Delete LifeOS, install **1.0.4** (build 74+).
