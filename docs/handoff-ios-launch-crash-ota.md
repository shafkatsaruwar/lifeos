# Handoff: iOS launch crash after #155 OTA

## Root cause

Cold-start crash after the Attention + Executive + Career OTA (`main@2a85765`): Career hub wired `firebase` → `../../../lib/careerHelpers` / `careerTypes` and eagerly imported `CareerDashboardScreen` into `RootNavigator`, so any Career module resolution/init failure took down the whole app before UI.

## Fix (`cursor/fix-ios-launch-crash-b1ae`)

- Metro-safe copies: `lifeos-mobile/src/lib/career/careerTypes.ts` + `careerHelpers.ts` (no monorepo `lib/` or `lifeos-kernel` import).
- Launch-safe bootstrap: `careerSafe.ts` (`safeEmptyCareerHub` / `safeNormalizeCareerHub`) used by `firebase.ts`.
- Soft-load Career UI via `careerGate.ts`; register `CareerTab` + linking only when the screen module loads.
- Harden `emptyCareerHub` Intl + `dashboardMetrics` missing `startsAt`.

## OTA retry (Path B)

1. Merge this PR to `main` (EAS Update Action publishes automatically).
2. Wait for **EAS Update (OTA)** green on `main`.
3. On the phone: force-quit LifeOS → reopen (cold start downloads update).
4. If still on the broken update: Settings → scroll to app version / force-quit twice, or reinstall TestFlight build then reopen once OTA is live.

No new native binary required (JS-only).

## Verify locally

```bash
cd lifeos-mobile
npx tsc --noEmit
npx expo export --platform ios --output-dir /tmp/lifeos-export-crashfix
```
