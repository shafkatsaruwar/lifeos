# Handoff: Career hub on iOS (Expo)

Branch: `cursor/ios-career-hub-b1ae`

## Where Career appears

- **Tab bar:** `CareerTab` (label “Career”, Feather `target`) between Work and Library when `enableCareerOS !== false`.
- **Settings → Environments:** free toggle “Career” (same copy pattern as Home/School).
- **Settings → Workspace colors:** Career tint (default `#0f766e`, matches web).
- **Onboarding interests:** optional “Career” chip writes `enableCareerOS`.
- **Deep link:** `…/career` → `CareerTab` / `CareerDashboard`.

## Data

- Firebase path `users/{uid}/career` — same blob as web (`normalizeCareerHub` / `emptyCareerHub` from shared `lib/careerHelpers` + `lib/careerTypes`).
- Wired through `Workspace.career` + `updateCareer` in `LifeOSContext` / `App.tsx` / `firebase.ts`.

## MVP included

- Overview metrics (active / interviews / follow-ups), needs attention, upcoming interviews, recent activity.
- Applications list (search, swipe delete, long-press / detail stage move).
- Pipeline lanes for non-terminal stages.
- Interviews list (read synced interviews; create still web-first).
- Add application modal (title, company, stage, priority) via shared `createApplication`.

## Deferred

- Full web surfaces: companies, contacts, documents, analytics, CSV import/export, interview composer, document linking.
- Capture-bar `/career` shortcuts.
- Native push for interview reminders.

## Delivery

- **JS-only** → EAS Update / OTA after merge to `main` (no native modules or `app.json` plugin changes).
- Path A: pull branch on Mac → Metro / Expo Go for UI check; Path B: merge → wait for EAS Update Action → force-quit & reopen TestFlight app.

## Verify locally

```bash
cd lifeos-mobile
npx tsc --noEmit
# Metro (device/simulator already signed in):
npx expo start
# Enable Career in Settings if the tab is hidden; open Career → Add application.
```
