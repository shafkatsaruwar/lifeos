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

## Immediate mitigation (done)

Published **roll-back-to-embedded** on production / runtime `1.0.0` so build 58 uses its September embedded JS (commit `317ab263`, pre-Career):

- Update group: `285b4a54-aa19-4a50-aa36-2db041251e9a`
- Message: `emergency: re-assert embedded rollback after main OTA`

**User must delete + reinstall TestFlight** (or clear update cache) then open once so the client receives the rollback directive.

Note: every push to `main` republishes an OTA via GitHub Actions and can overwrite the rollback — re-run:

```bash
cd lifeos-mobile
npx eas-cli@latest update:roll-back-to-embedded \
  --channel production --runtime-version 1.0.0 --platform ios --non-interactive \
  --message "emergency: re-assert embedded rollback"
```

## Proper fix (needs native build 59+)

In app config (already on main `4d1c803`):

- `checkAutomatically: "ON_ERROR_RECOVERY"`
- `fallbackToCacheTimeout: 5000`
- No JS `Updates.reloadAsync()` on mount
- Auth init never throws at import

`eas build --platform ios --profile production --auto-submit` failed here (multi-target credentials need interactive setup for `com.example.lifeos` targets). Run from a machine with credentials access:

```bash
cd lifeos-mobile
npx eas build --platform ios --profile production --auto-submit
```

Confirm the build uses `com.shafkatsaruwar.lifeos` (TestFlight id), not the placeholder `com.example.lifeos` if that still appears in local config.
