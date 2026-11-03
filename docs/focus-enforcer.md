# Focus Enforcer (enforce tasks)

Mobile accountability product for **starting and staying on a LifeOS task** at a planned time. Separate from web **FocusMode** (timer / immersive focus UI).

Primary surfaces (iOS): task detail → **Enforce focus**, or Settings → Focus Enforcer. Screens: setup, live session, history.

---

## What it does

1. You pick a **task**, a **start time**, a **duration**, optional **live-camera proof**, and optional **repeat**.
2. At the scheduled start, LifeOS notifies you to begin.
3. If you delay, **escalations** fire at fixed offsets from start (gentle → firm → severe).
4. Once active, **mid-session checks** ask “still working?” (ack) or request a **live photo**.
5. You complete or abandon; history tracks on-time starts and check outcomes.

---

## Session lifecycle

| Status | Meaning |
|--------|---------|
| `scheduled` | Planned; start + escalation notifications armed |
| `escalating` | Past start; escalating nag level |
| `active` | Started; mid-session checks scheduled |
| `completed` | Finished |
| `abandoned` | Quit without completing |

Escalation levels: `gentle` → `firm` → `severe`.

---

## Scheduling & escalations

Prefs (`FocusEnforcerPrefs`):

- `enabled` — master switch (Settings).
- `escalateOffsetsMin` — **absolute** minutes from `scheduledStartAt` (default `[5, 10, 15]` → T+5 / T+10 / T+15, **not** sequential gaps).
- `photoCheckChance` — probability a mid-session check requires a live photo (default `0.5`).

At `scheduledStartAt`, a start notification fires (“Focus Enforcer — Start now”). Escalation copy gets sharper each step.

---

## Mid-session checks

After you actually start (`actualStartAt`), checks are randomized across the duration:

- Short sessions (&lt; 25 min): usually one check.
- Longer sessions: two (or three if &gt; 90 min), spaced apart.
- Kind: `ack` (“Still working?”) or `photo` (“Show me you’re still on…”).

Responses: `still_working` | `photo_pass` | `photo_fail` | `override` | `missed`.

---

## Live proof (camera)

When `proofRequired` is on (or a photo check fires):

- Proof type is always **`live_camera`** — library uploads are not verified proof.
- Phases: `start` | `check` | `complete`.
- Result: `match`, `confidence`, `reason`, optional `manualOverride`.

Needs a **native EAS / TestFlight build** (not Expo Go).

---

## Repeat

After complete or abandon, optionally spawn the next session:

| Value | Label |
|-------|--------|
| `never` | Does not repeat |
| `daily` | Every day |
| `weekdays` | Mon–Fri |
| `weekly` | Every week |

Repeating sessions share a `seriesId`. Next start keeps the same clock time and advances until after “now”.

---

## History metrics (last 30 days by default)

Primary UI metric: **`onTimePlannedPercent`**

- On-time = started within **2 minutes** of `scheduledStartAt`.
- Denominator = **all planned** sessions (never-started sessions lower the rate).

Also tracked: started / completed counts, average start delay, checks passed/failed, distraction recoveries, verified-focus %, manual overrides.

---

## Data & notifications

| Item | Detail |
|------|--------|
| Firebase | `users/{uid}/focusEnforcer` (prefs + sessions) |
| Notification ids | Prefixed `fe:` — survive workspace sync |
| Shared logic | `lib/focusEnforcer/` (types, timing, metrics, copy, recurrence) |
| Mobile | `lifeos-mobile/src/lib/focusEnforcer/` (store, schedule, camera, verify, session actions) |
| Screens | `FocusEnforcerSetupScreen`, `FocusEnforcerSessionScreen`, `FocusEnforcerHistoryScreen` |
| Bridge | `FocusEnforcerBridge` (reconcile / notifications while app is open) |

---

## Not the same as FocusMode

| Focus Enforcer | FocusMode (web) |
|----------------|-----------------|
| Planned start + escalate + proof | In-session timer / checklist / notes |
| iOS production builds | Web (and related focus strip) |
| Accountability | Immersive focus UI |

Do not merge the two products; they share the idea of “focus on a task,” not the same engine.

---

## Quick user path (iOS)

1. Open a task → **Enforce focus** (or Settings → Focus Enforcer history / prefs).
2. Set start time, duration, proof, repeat → schedule.
3. When notified, open the session → start (and prove if required).
4. Answer mid-session checks; complete or abandon.
5. Review on-time rate in History.
