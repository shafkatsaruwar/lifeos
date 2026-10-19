# Handoff: Career removed from iOS

## Decision

Career / Job Seeker OS is **removed from the iOS app** (`CAREER_IOS_ENABLED = false` in `lifeos-mobile/src/lib/careerFlag.ts`) after repeated TestFlight crashes on open. Web Career is unchanged.

## What iOS no longer shows

- Career tab (not registered)
- Settings → Career toggle / color row
- Onboarding Career interest chip
- Deep link `…/career` (linking opt-in only)

## What still runs

- `careerSafe` returns an empty stub hub so Firebase bootstrap never loads Career helpers while the flag is false
- `enableCareerOS` in synced settings is left alone from iOS onboarding (does not turn web Career off)

## Re-enable later

1. Fix Career open crash with device logs / ErrorBoundary evidence
2. Set `CAREER_IOS_ENABLED = true`
3. OTA via main
