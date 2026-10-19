# Kept — native Siri / Spotlight status

## Siri / App Intents — **implemented (needs native rebuild)**

Source: `lifeos-mobile/targets/siri/AddTaskIntent.swift` (copied into the iOS app target by `plugins/withLifeOSSiri.js` on prebuild).

| Intent | Phrases (examples) | Runtime path |
|--------|--------------------|--------------|
| `RememberKeptIntent` | “Remember something in LifeOS” | App Group `lifeosPendingKeptCommands` → `SiriKeptBridge` → Firebase `users/{uid}/kept` |
| `FindKeptIntent` | “Find something in LifeOS” | Same queue → FIND → alert + Kept tab |

**Not tested on device in this Cloud Agent environment** (no Mac / TestFlight run here). Requires a new EAS/native iOS build so the updated Swift intents ship in the binary — OTA/JS alone is not enough for App Intents.

Deep-link fallbacks: `lifeos://kept-remember?name=…&location=…`, `lifeos://kept-find?query=…`.

## Spotlight — **not buildable here**

CoreSpotlight / `CSSearchableIndex` indexing is **not wired**.

Gaps:
1. No existing Spotlight / CoreSpotlight module in the Expo app or `targets/`.
2. Private Kept items must be excluded — would need an index writer that skips `privacy === "private"` and deletes docs on privacy flip / forget.
3. Cloud Agent cannot compile or run an iOS binary to verify Spotlight results.

**Planned shape (not shipped):** index non-private items with title=`name`, contentDescription=`location`, uniqueIdentifier=`kept:{id}`, domain=`kept`; remove on FORGET / private.

## Mic / speech on iOS

Uses existing `expo-speech-recognition` via `src/lib/speechRecognition.ts`. Available only in builds that include that native module (not Expo Go). Text fallback is always present on the Kept screen.
