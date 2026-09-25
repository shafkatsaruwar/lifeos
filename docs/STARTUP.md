# LifeOS — Startup Guide

How to get in, what to do first, and how the main surfaces work.  
For install/deploy, see the root [README](../README.md).

---

## 1. Open the app

**Web:** `npm run dev` → [http://localhost:3000](http://localhost:3000)

- Confirm you are **13+** (age gate).
- **Dev: Test Login** on localhost (no Firebase), or **Sign in with Google** when Firebase is configured.

**iOS:** configure `lifeos-mobile/.env`, then `cd lifeos-mobile && npm start` (see mobile README). Same cloud account as web when Firebase matches.

---

## 2. What you see as a new user

New accounts start with two environments only:

| Environment | What it’s for |
|-------------|----------------|
| **Life** (LifeOS / Home) | Personal home base — Now, tasks, spaces, notes, calendar |
| **School** | Classes, coursework, grades |

Work, Study Abroad, Treasury, and Mastery stay **off** until you enable them in **Settings → Workspace**.

**Existing accounts keep their current environment toggles** — nothing is flipped off for people who already use the app.

---

## 3. First 5 minutes

1. **Set your name** when prompted (greeting on Now).
2. Stay on **Now** — that’s the daily cockpit.
3. Create a task: in the capture bar type  
   `/t Finish reading chapter 3`  
   and press Enter.
4. Open **Tasks** to see the list; click a task for the detail workspace.
5. Open **School** → add a class when you’re ready for coursework.

Optional: **Calendar** for events; **Library / Notes** for writing (handwriting is strongest on iPad).

---

## 4. Capture commands (Now bar)

Type `/` to see hints. Common ones:

| Command | Action |
|---------|--------|
| `/t …` | New task |
| `/break` | Break |
| `/focus` | Start focus on the current priority |
| `/tm …` | Thought → Brain inbox |

Work / Study Abroad / Mastery shortcuts (`/w`, `/sa`, `/mos`) appear only when those packs are enabled.

---

## 5. Focus

From Now or a task, start **Focus**. Use the timer, checklist, and notes. Exit with Esc / Exit focus. On iPhone, Focus Enforcer and Live Activities are available in production builds.

---

## 6. Settings worth knowing

- **Workspace** — theme, accent, **which environments are on**
- **Notifications** — digest / focus / calendar (browser or device)
- **Focus defaults** — default session length & energy
- **Calendar** — week start, default view; connect Google / Outlook / iCloud when configured
- **Privacy & data** — export/import JSON, sync, session replay stays off by default
- **Plan & billing** — free plan today; renewal/cancel copy is ready for paid plans later

---

## 7. SchoolOS quick path

1. Enable **School** (on by default for new users).
2. Add a **class** (code, term, color).
3. Add **assignments** with due dates / points.
4. Link tasks to a class when capturing school work.
5. Use grade helpers / syllabus import when you need them (see PRD).

---

## 8. Sync & devices

- Data lives under `users/{yourUid}/…` in Firebase when configured.
- Web and iOS share the same account.
- Without Firebase env vars, web runs **local-only** (fine for demos).

---

## 9. Turning on more packs later

Settings → Workspace (or environment toggles on mobile Settings):

- Work  
- Study Abroad  
- Treasury  
- Mastery (MasterOS — teaching OS; best on web / iPad)

Restart isn’t required; nav updates after save/sync.

---

## 10. If something’s missing

| Symptom | Check |
|---------|--------|
| No Dev Test Login | Use `localhost`, not a LAN IP |
| Google sign-in fails | Firebase Authorized domains + `NEXT_PUBLIC_FIREBASE_*` |
| Mobile can’t sign in | `EXPO_PUBLIC_FIREBASE_*` and `EXPO_PUBLIC_LIFEOS_URL` |
| Extra environments for a brand-new account | Should be Life + School only; enable others in Settings |
| Existing account lost Work/Treasury | Shouldn’t happen — report if flags were wiped |

More depth: [PRD](./PRD.md) · [Architecture](./architecture.md) · [Design system](./design-system.md)
