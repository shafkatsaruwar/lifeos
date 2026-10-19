# Handoff: iOS SIGABRT was Expo Updates ErrorRecovery

## Crash evidence (TestFlight build 58)

```
Exception Type: EXC_CRASH (SIGABRT)
Launch → crash ~2–6s
StartupProcedure.throwException
ErrorRecovery.crash()
ErrorRecovery.notify(newRemoteLoadStatus:)
```

Expo Updates aborted because a remote OTA failed to load cleanly during native startup. Build **58** still has `checkAutomatically: ON_LOAD` + `fallbackToCacheTimeout: 0` baked in — **OTA JS cannot change that**.

## Status (2026-10-19)

| Build | Result | Notes |
|-------|--------|-------|
| 58 | Live / aborting | `ON_LOAD` binary. Delete + reinstall does not fix if embedded JS or recovery still fails. |
| 59–63 | Errored / canceled | Siri `AppShortcuts` Swift syntax on Xcode 26 |
| **64** | IPA + ASC submit finished | Safer Updates (`ON_ERROR_RECOVERY`). Wait for TestFlight processing, then install **64** (not 58). |
| **65+** | Next | `updates.enabled: false` + boot harden + app version `1.0.1` |

## What to do on the phone

1. Open TestFlight → confirm build number is **64** (or newer), not 58.
2. Delete LifeOS from the phone.
3. Install the new build from TestFlight.
4. Open once.

If TestFlight still only shows 58, wait for Apple processing (can be minutes–hours after ASC “finished”).

## Next native build (Mac)

```bash
git fetch origin
git checkout cursor/fix-ios-native-updates-b1ae
git pull
npx eas build --platform ios --profile production --auto-submit
```

This ships `1.0.1` with **Expo Updates disabled** so ErrorRecovery cannot SIGABRT. Re-enable OTA only after launch is proven.

## Rollback for anyone still on 58

```bash
cd lifeos-mobile
npx eas-cli@latest update:roll-back-to-embedded \
  --channel production --runtime-version 1.0.0 --platform ios --non-interactive \
  --message "emergency: re-assert embedded rollback"
```
