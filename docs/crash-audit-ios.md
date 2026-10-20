# LifeOS iOS crash audit (2026-10-20)

Scope: `lifeos-mobile` TestFlight launches and early runtime. Tip: `f00d830` / branch `cursor/fix-ios-native-updates-b1ae`.

## What actually crashed in the wild

| Build | Version | What died | Mechanism |
|-------|---------|-----------|-----------|
| **58** | 1.0.0 | Confirmed (crash logs) | Expo Updates `StartupProcedure` → `ErrorRecovery.crash()` SIGABRT. Native `ON_LOAD` + bad/failed OTA. **OTA cannot fix this binary.** |
| **67** | 1.0.1 | User-reported; IPA audited | `EXUpdatesEnabled=false` baked correctly → **not** ErrorRecovery. Likely UIScene + frameless AppDelegate bootstrap window (expo-dev-client pattern) + New Arch default ON. |
| **64–65** | 1.0.0 | Intermediate | Updates still on (`ON_ERROR_RECOVERY`); ErrorRecovery path still live. |
| **68–70** | 1.0.2 | EAS errored | `newArchEnabled: false` → CocoaPods: Reanimated 4.x requires New Arch. |
| **71** | 1.0.2 | Confirmed crash log | Hermes `EXC_BAD_ACCESS` / SIGSEGV ~2.7s after launch. Concurrent `performVoidMethodInvocation` → `convertNSExceptionToJSError` (RN 0.81 prebuilt bug; upstream #56265). |
| **72+ tip** | not TF yet | — | Patch RCTTurboModule void-exception path + force RN **source** build (prebuilt ignored patches). |

No crash log for build 67 was pasted — diagnosis is from IPA config + git history.

## Confirmed fixed on tip (do not reintroduce)

1. **Frameless bootstrap window** — AppDelegate must not create `UIWindow(frame:)`; SceneDelegate always `UIWindow(windowScene:)`.
2. **`updates.enabled: false`** — removes ErrorRecovery from the hot path (symbols remain linked).
3. **Do not set `newArchEnabled: false`** — Reanimated 4.x fails pod install without New Arch (builds 68–70).
4. **RN 0.81 TurboModule void NSException patch** — must build RN from source (`RCT_USE_PREBUILT_RNCORE=0`) or the fix never lands in the IPA.
5. **Career off** — `CAREER_IOS_ENABLED = false`; soft gates in `careerSafe` / `careerGate`.
6. **No JS `Updates.reloadAsync()`** on boot.
7. **Firebase / notifications import** try/catch (mostly).
8. **P1 boot harden** — Auth/workspace/database/ErrorBoundary (commit `23b990f`).

## Remaining crash / blank risks (ranked)

### P0 — would kill launch again if we slip

| # | Risk | Where | Fix |
|---|------|-------|-----|
| 1 | Re-enable Updates (or drop `enabled:false` while URL stays) | `app.config.js` | Keep `enabled: false` until 1.0.2 boots clean; verify every IPA’s `Expo.plist` |
| 2 | SceneDelegate not linked but Info.plist still references it | `plugins/withLifeOSSceneLifecycle.js` | Fail prebuild hard if Sources miss `SceneDelegate.swift` |
| 3 | Reintroduce AppDelegate bootstrap for “dev launcher” | `targets/scene/AppDelegate.swift` | Never in production; tip comments already warn |

### P1 — blank app / hard fail without SIGABRT

| # | Risk | Where | Fix |
|---|------|-------|-----|
| 4 | Unprotected `maybeCompleteAuthSession` (duplicate) | `src/components/Auth.tsx:29` | try/catch or remove; App.tsx already wraps |
| 5 | Workspace load failure → infinite “Opening LifeOS…” | `App.tsx` loadWorkspace catch | Set empty workspace / retry / sign out |
| 6 | `firebaseConfigured` but `auth == null` → sign-in throws | `Auth.tsx` + `firebase.ts` | Gate buttons on `Boolean(auth)` |
| 7 | `database == null` → `subscribeWorkspacePart` throws | `firebase.ts` | No-op if `!database` |
| 8 | No root ErrorBoundary | App tree | Boundary around post-auth UI |

### P2 — unhandled promises / blast radius

| # | Risk | Where |
|---|------|-------|
| 9 | `getInitialURL` / notification response without `.catch` | Widgets / Synapse / Share / Siri / Notifications bridges |
| 10 | Eager `RootNavigator` imports all screens at cold start | `RootNavigator.tsx` |
| 11 | Widget URL force-unwraps (extension only) | `LifeOSWidget.swift` |
| 12 | Dev-client frameless window patch | `patches/expo-dev-launcher+…` (Debug profiles only) |

## Boot graph (what runs before first paint)

```
index.ts
  → gesture-handler
  → App.tsx
       → firebase (app/auth/db IIFEs)
       → Auth.tsx (maybeCompleteAuthSession — unprotected)
       → static import of RootNavigator + all bridges
       → bridges mount only after auth+workspace
```

## Ship checklist for next TestFlight (1.0.2+)

1. Tip includes scene fix + Updates off + New Arch left on + P1 harden.
2. `eas build --profile production --auto-submit` from branch tip.
3. Delete old LifeOS; install **1.0.2**; confirm TestFlight card version.
4. If it still dies, paste a crash log that shows **that** build number (not 58).

## Out of scope this pass

- Web app Reticle crawl (separate surface; not the TestFlight abort).
- Android.
