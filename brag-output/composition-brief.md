# Hyperframes Composition Brief: LifeOS

## Objective
Create a short launch-style brag video for LifeOS.

## Output
- Composition directory: `brag-output/composition/`
- Rendered video: `brag-output/brag.mp4`
- Format: landscape — 1920x1080
- Duration: 20 seconds

## Source Material
- Project root: `/workspace`
- Primary files read: `README.md`, `docs/STARTUP.md`, `docs/PRD.md`, `docs/design-system.md`, `app/layout.tsx`, `app/globals.css`, `app/components/PreAuthOnboarding.tsx`, `app/page.tsx`, `public/favicon.svg`
- Product name: LifeOS
- Tagline / strongest claim: Your life, in focus.
- Key UI or visual moment to recreate: Preauth serif hero; Now capture bar typing `/t …`; Focus mode dark stage
- Copy that must appear verbatim:
  - Your life, in focus.
  - Now is your cockpit.
  - `/t Finish reading chapter 3`
  - LifeOS

## Creative Direction
- Tone preset: polished
- Creative direction: quiet premium product film for a personal OS
- Interpretation: Fewer scenes, longer holds, soft crossfades, restrained SFX, paper+ink identity
- Angle: LifeOS is the calm personal OS — capture with `/t`, enter Focus, keep life and school together
- Hook: Dark serif “Your life, in focus.”
- Outro / punchline: Brand mark + LifeOS + “Decide what matters now.”
- Avoid:
  - Generic SaaS language
  - Abstract filler visuals
  - Unrelated visual redesign
  - Purple-on-white marketing gradient washes as the whole frame

## Visual Identity
- Background: `#F6F7F9` / dark `#0a0a0c`–`#141418`
- Text: `#202124` / `#F1F1F2`
- Accent: `#625AF6` / `#8B83FF`
- Display font: Baskerville / Times New Roman (serif fallback for Iowan Old Style)
- Body font: Inter (ship local woff2 from `app/fonts/`)
- Visual references from the project: brand-mark bars, preauth title, Now card + capture bar, Focus mode

## Storyboard
Use `brag-output/brag-plan.md` as the creative contract.

Scene summary:
1. Hook — 3.2s — dark serif hero
2. Now reveal — 3.0s — cockpit UI + env chips
3. Capture — 5.5s — type `/t` + task row
4. Focus — 5.0s — dark Focus stage
5. Outro — 3.3s — mark + LifeOS

## Audio
- Audio role: warm bed / sparse professional accents
- Audio arc: quiet in → UI demo accents → Focus presence → fade under logo
- Music: `happy-beats-business-moves-vol-1-by-ende-dot-app.mp3`
- Music treatment: volume ~0.2; fade-in 0.4s; fade from ~17.5s under outro
- Music cue guidance: bundled preset `happy-beats-business-moves-vol-1-by-ende-dot-app.music-cues.json`; optional strong cues 16.02 / 17.02 / 18.02 / 20.02
- Audio-reactive treatment: subtle; brand-mark / Focus warmth with RMS
- Audio-coupled moments:
  - Scene 3 — typing keypresses + Enter click
  - Scene 3 — task row land
  - Scene 4 — soft switch into Focus
  - Scene 5 — soft logo hit
- SFX selection guidance: keyboard set for typing; soft click/drop for UI; low HF-risk picks from sfx-analysis
- Exact SFX choice: Hyperframes chooses after animation exists
- Audio files: copy music + selected SFX into `brag-output/composition/assets/`

## Hyperframes Instructions
Load hyperframes-core, hyperframes-animation, hyperframes-creative, hyperframes-keyframes, hyperframes-cli. Do not enter the generic hyperframes promo interview. Prefer native Hyperframes conventions.

Requirements:
- Show real UI recreation from LifeOS (Now + Focus).
- Keep all text readable.
- Stay within 15-25 seconds (target 20s).
- Include planned music/SFX.
- Run `npx hyperframes check` before render.
- Keep creation and rendering local.
