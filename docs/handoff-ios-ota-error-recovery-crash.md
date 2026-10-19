# Handoff: iOS SIGABRT was Expo Updates ErrorRecovery

## Crash evidence (TestFlight build 58)

```
Exception Type: EXC_CRASH (SIGABRT)
Launch → crash ~6s
StartupProcedure.throwException
ErrorRecovery.crash()
ErrorRecovery.notify(newRemoteLoadStatus:)
```

This is **not** a Career UI crash. Expo Updates aborted the process because a remote OTA failed to load cleanly during startup.

## Contributing factors

1. `checkAutomatically: ON_LOAD` + `fallbackToCacheTimeout: 0` (native) — eager remote load with no grace period for embedded JS.
2. `applyOtaUpdateIfAvailable()` called `Updates.reloadAsync()` from JS on every mount — races native startup recovery.
3. JS boot throws (e.g. RTDB object-shaped `tasks` → `.filter is not a function` on Now) mark the remote update as failed → ErrorRecovery SIGABRT.

## Fixes shipped

- Stop `reloadAsync` in `lifeos-mobile/src/lib/ota.ts` (prefetch only; next cold start applies).
- `fallbackToCacheTimeout: 5000` in app config (**needs next native/TestFlight build** to take effect).
- Coerce RTDB lists in `loadWorkspace` (`asArray`), harden WidgetsBridge/notification sync, FloatingTabBar worklet safety.

## If still looping on device

Delete the TestFlight app and reinstall (clears a poisoned downloaded update). Then force-quit once after the good OTA lands.
