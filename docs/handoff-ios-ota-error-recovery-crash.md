# Handoff: iOS SIGABRT was Expo Updates ErrorRecovery

## Crash evidence

Every pasted TestFlight crash is **`Version: 1.0.0 (58)`**:

```
Exception Type: EXC_CRASH (SIGABRT)
Termination Reason: SIGNAL 6 Abort trap: 6
StartupProcedure.throwException → ErrorRecovery.crash()
```

No crash log from builds 64+ has been pasted. Rebuilds of 58 (delete/reinstall) cannot fix this — native Updates config is baked in.

## Build map

| Build | Version | Updates | Status |
|-------|---------|---------|--------|
| **58** | 1.0.0 | `ON_LOAD` / timeout 0 | Aborting — do not use |
| 64–65 | 1.0.0 | `ON_ERROR_RECOVERY` | In ASC; still has ErrorRecovery path |
| **66 / 67** | **1.0.1** | **`enabled: false`** | IPA finished; ASC submit in flight |

## What to install

1. Wait for TestFlight to show **1.0.1 (66 or 67)**.
2. Delete LifeOS from the phone (clears old Updates cache).
3. Install **1.0.1**, open once.
4. Confirm Settings / About / TestFlight card shows **1.0.1**, not 1.0.0 (58).

If it still crashes on **1.0.1**, paste the new crash log (must show build 66/67) — that would be a different bug than ErrorRecovery.

## Branch tip

`cursor/fix-ios-native-updates-b1ae` @ `c95105c`:

- `updates.enabled: false` + `checkAutomatically: NEVER`
- App version `1.0.1` (new runtime; old OTAs cannot attach)
- Firebase / notifications / WebBrowser import side effects wrapped
