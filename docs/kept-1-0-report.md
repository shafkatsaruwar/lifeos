# Kept 1.0 — final report

## 1. Features

| Feature | Status |
|---------|--------|
| First-class web nav item **Kept** | Implemented + tested (Reticle) |
| iOS Kept tab | Implemented (JS); device mic not tested here |
| Speak/type SAVE | Implemented; web typed SAVE verified |
| Secure save (`users/{uid}/kept`, strip ownerId, server timestamps on API) | Implemented |
| FIND / UPDATE w/ location history / LIST / FORGET | Implemented; unit tests + web SAVE/detail verified |
| Browse / search / places chips | Implemented (web + iOS) |
| Private flag (exclude from Spotlight) | Implemented on model + UI |
| Soft spring motion + reduceMotion | Implemented (web Framer; iOS Vibration/scale gated) |
| Siri Remember / Find | Implemented in Swift + JS bridge — **needs native rebuild**; not device-tested |
| Spotlight indexing | **Not shipped** — see gaps |

## 2. Files (primary)

- `lib/kept/**` — types, normalize, match, parse, intents, execute, speech, server
- `app/api/kept/route.ts` — auth + intent + execute + upsert-hub
- `app/components/Kept/KeptPage.tsx` — web UI
- `app/page.tsx` / `app/globals.css` — nav + styles (minimal wiring)
- `database.rules.json`, `FIREBASE_RULES.md`, `lib/constants.ts`
- `__tests__/kept.test.ts`
- `lifeos-mobile/src/screens/KeptScreen.tsx`, `lib/kept/*`, `navigation/RootNavigator.tsx`, `FloatingTabBar.tsx`
- `lifeos-mobile/targets/siri/AddTaskIntent.swift` (+ Remember/Find), `SiriKeptBridge.tsx`, `lib/siri/kept.ts`
- `docs/kept-native-gaps.md`

## 3. DB + rules

- Path: `users/{uid}/kept` → `{ items: KeptItem[], updatedAt }`
- Location history bounded to 20 entries per item (newest-first, consecutive dedupe)
- Rules: user-scoped read/write; `ownerId` on items must equal `$uid` if present
- Server `/api/kept` strips `ownerId` and stamps `updatedAt` with server clock
- Client also syncs via `syncDataToFirebase('kept', …)` / mobile `saveKeptHub` for offline-friendly local use (Test Login has no Firebase token)

## 4. Voice approach

- **Web:** Web Speech API when available; always-editable transcript + Go; phases Idle/Listening/Processing/Confirm/Done/Error
- **iOS:** existing `expo-speech-recognition` wrapper; text fallback always; Vibration feedback (no new haptics dependency)
- Intent: local heuristic parser first; optional Anthropic via `/api/kept` action `intent` with **targeted** candidate retrieval (never whole collection); AI proposes, app executes; fabricated locations rejected

## 5. Siri status

**Implemented in repo, not device-tested.** `RememberKeptIntent` / `FindKeptIntent` + shortcuts in `targets/siri/AddTaskIntent.swift`; JS `SiriKeptBridge` drains App Group `lifeosPendingKeptCommands`. Requires a new native iOS build (OTA insufficient for App Intents).

## 6. Spotlight status

**Not buildable / not shipped here.** No CoreSpotlight writer in the Expo project. Private items would need exclusion + delete-on-forget. See `docs/kept-native-gaps.md`.

## 7. Tests

- Unit: `__tests__/kept.test.ts` — **13 passed** (normalize, parse, match, execute, intents, privacy, retrieval bound, serverNow)
- Reticle (web): Dev Test Login **verified yes**; open Kept **verified yes**; SAVE via transcript → detail with “kitchen drawer” **verified yes** (localStorage hub updated)
- `tsc --noEmit`: only pre-existing `.next` motion-lab stub noise (unrelated)
- ESLint on Kept paths: clean enough to ship (no blocking errors expected)

## 8. Manual setup

1. Publish Firebase RTDB rules from `database.rules.json`
2. Web: `npm run dev` → http://localhost:3000 → Dev Test Login → sidebar **Kept** (or `?view=kept`)
3. Optional: `ANTHROPIC_API_KEY` for AI-assisted intent when heuristics CLARIFY
4. iOS: pull branch → `eas build` from `lifeos-mobile/` so speech module + Siri intents are in the binary

## 9. Limitations

- Test Login cannot call authenticated `/api/kept` (no Firebase ID token) — local execute + localStorage/Firebase client path still works
- Spotlight not indexed
- Siri not verified on a physical iPhone in this environment
- Optional photos: web shows URL if set; iOS ImagePicker stores local URI (no new cloud Storage pipeline)
- Tab bar denser on iPhone with Kept added

## 10. Exact test steps

### Web — **implemented + tested**
1. Open http://localhost:3000 (dev server: tmux `kept-dev`)
2. Dev: Test Login → Continue on name modal
3. Sidebar → **Kept**
4. Type `remember my keys in the kitchen drawer` → Go → detail shows keys @ kitchen drawer
5. Back → search / place chip / Forget as desired

### iPhone — **implemented, planned device test**
1. Build from this branch (native rebuild for Siri + speech)
2. Open Kept tab → allow mic → say or type a SAVE → confirm list/detail
3. Shortcuts / Siri: “Remember something in LifeOS” / “Find something in LifeOS”
4. Mark private → confirm it would be excluded once Spotlight lands

### Planned only
- Spotlight search results for non-private items
- Production Firebase rules publish confirmation
- Paid / Apple Developer account flows (none required beyond existing)
