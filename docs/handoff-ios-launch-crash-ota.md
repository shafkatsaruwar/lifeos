# Handoff: iOS launch crash after #155 OTA (retry 3)

## Root cause

Cold-start crash after Attention + Executive + Career OTA (`main@2a85765`):

1. Career hub originally imported monorepo `../../../lib/career*` (outside Metro projectRoot) and eagerly imported `CareerDashboardScreen` into `RootNavigator`.
2. Hotfix `8a9bcc4` added Metro-safe copies + soft-load gate, but launch still **evaluated** Career on cold start.
3. Hotfix `b2d0da4` set `CAREER_IOS_ENABLED=false` in `careerGate.ts`, but `careerSafe.ts` imported missing `./careerFlag` — **firebase bootstrap threw on module resolve** and the app never opened.

## Fix (this PR)

`CAREER_IOS_ENABLED = false` in `lifeos-mobile/src/lib/careerFlag.ts` (dependency-free):

- **careerSafe** / **careerGate** / Settings import the flag from `careerFlag.ts`
- **No CareerTab** registered in `RootNavigator` while flag is false
- **No Career linking** (`buildLinking` opt-in only; default off)
- **careerSafe** returns inline empty hub — never `require`s Career modules while disabled

Re-enable later by setting `CAREER_IOS_ENABLED = true` after soft-load is proven safe on device.

## OTA retry (Path B)

1. Land on `main` (EAS Update Action publishes automatically).
2. Wait for **EAS Update (OTA)** green on `main`.
3. On the phone: **force-quit LifeOS → reopen** (cold start downloads update).
4. If still crashing: force-quit twice, or reinstall TestFlight then reopen once OTA is live.

No new native binary required (JS-only).

## Verify locally

```bash
cd lifeos-mobile
rg "CAREER_IOS_ENABLED" src/lib/careerFlag.ts
# Must resolve — no missing module
node -e "require('./src/lib/careerFlag.ts')" 2>/dev/null || true
npx expo export --platform ios --output-dir /tmp/lifeos-export-crashfix3
```
