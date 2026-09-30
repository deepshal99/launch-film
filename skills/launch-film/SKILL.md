---
name: launch-film
description: Turn a product idea into a premium, viral-ready launch/motion video rendered from code. It asks intake questions, optionally analyses inspiration (videos, links, screenshots), writes a beat-sheet script and a frame-exact brief, builds a deterministic HTML motion film, synthesizes an original picture-locked soundtrack, and renders an H.264 MP4 at 9:16, 1:1 or 16:9. Use when the user asks for a launch video, product sting, promo/teaser, motion ad, app reveal, "make a video like this", or wants to turn a brief into a rendered film.
---

# Launch film

You are the creative director, motion designer, sound designer and render engineer. The output is an **original** launch film that feels hand-animated: nothing is ever still, blur follows speed, every event lands on the beat, and each shot has one idea with ≤ 6 words on screen.

`<skill>` below means this skill's directory. The film lives in the user's project at `<film-dir>` (default `launch-film/`, or `launch-films/<slug>/` for more than one).

**Requirements:** Node 18+, ffmpeg/ffprobe, and Playwright Chromium (`setup.sh` installs it). yt-dlp is needed only for inspiration URLs.

## Workflow (follow in order; show the user progress at each gate)

### 1. Intake → `references/intake.md`
Ask the two short question rounds: first product, format, look and inspiration; then brand, message, UI and sound. Skip anything the user already answered. When something is skipped, use the defaults table and say so in one line. Never block on optional inputs.

### 2. Inspiration (optional) → `references/inspiration.md`
- **Video or URL:** run `bash <skill>/scripts/analyze_reference.sh "<url-or-file>" <film-dir>/inspiration/<name>`, then **Read** the overview and detail sheets, `cuts.txt` and `tempo.txt`, and write `breakdown.md`: timing map, motion grammar with estimated values, and why it works.
- **Screenshots:** Read them and extract palette roles, type, density and surface treatments.
- **Originality:** inspiration informs grammar and pacing only. Never clone a video shot-for-shot, and never reuse third-party logos, marks, characters, footage or music; design original equivalents instead. If asked for an exact replica of someone else's ad, offer an original film in that style.

### 3. Script → the beat sheet in `references/intake.md`
Write `<film-dir>/script.md`: HOOK / REVEAL / PROOF ×2–4 / PAYOFF / CTA, each with seconds, the visual idea, the on-screen copy (≤ 6 words), plus one sound line. Apply the viral structure in `references/motion-grammar.md`: the hook moves in under 1 s, the wow lands at 25–35%, the payoff at about 70%, and the ending loops or holds. Show the script as a compact table and get a yes before continuing.

### 4. Brief → `references/brief-format.md`
Rewrite the approved script as the six-section brief (`<inputs> <direction> <structure> <build> <gotchas> <start>`) in `<film-dir>/brief.md`. Pick the frame grid, compute the beat grid, then give every shot a frame range, layout px, keyframe tables for the hero moves, blur values, and its entry and exit. Frame numbers in the brief are the source of truth for the code and the soundtrack. Use the worked example (`references/examples/tandem-brief.md`) as the quality bar.

### 5. Build
```bash
bash <skill>/scripts/setup.sh <film-dir>          # index.html + engine.js + film.js stub + fonts + Playwright
```
Write `<film-dir>/film.js` from the brief using the engine (`references/engine-api.md`) and the technique library (`references/motion-grammar.md`):
- **Content lives in data.** All copy and brand values go in `CFG`, and the palette roles go in `C`.
- **Shots mirror the brief:** one `shot()` per brief shot, with the brief's frame numbers verbatim.
- **Reuse components:** build the mark, cursor, phone and cards once.
- **Determinism:** everything is a pure function of `f`. Use `hash()`, never Math.random.
- **Patterns:** study `references/examples/tandem.film.js` (16:9 bold pop: 3D flock, receipt, roller, rings, 3D "=", end card).

### 6. Checkpoint stills → `references/qa-checklist.md`
```bash
bash <skill>/scripts/sheet.sh <film-dir> sheetA <12–16 frames across the hardest moments>
```
**Read** each sheet and fix what's wrong: layout, emptiness, blur that wipes shapes, near objects covering the hero, text fit. Iterate until the frames look intentional. Then show the user the 4 stills named in the brief's `<start>` (embed the PNGs). Continue unless they want changes.

### 7. Soundtrack → `references/sound-design.md`
Write `<film-dir>/cues.json` using the same bpm/beat0/fps as `film.js`, with sections and an SFX entry for every visual event.
```bash
node <skill>/scripts/soundtrack.mjs <film-dir>/cues.json <film-dir>/out/raw.wav
bash <skill>/scripts/master.sh <film-dir>/out/raw.wav <film-dir>/out/audio.wav <duration> -14 60
```
If the user supplied a licensed track, sync the grid to it with `tempo.mjs` instead.

### 8. Render + verify
```bash
node <skill>/scripts/render.mjs <film-dir> <film-dir>/out/audio.wav <film-dir>/out/<slug>.mp4
```
Then run `ffprobe` on the MP4 and build a cut-frame sheet from the encoded video (see the QA checklist). Read it before reporting.

### 9. Deliver
The final message states:
- **File:** the MP4 path, size, fps, frame count and duration.
- **Contents:** a contact sheet embedded as an image, and one line per shot describing what happens.
- **Sound:** tempo and structure, measured LUFS and peak, and whether the track is original or the user's.
- **Deviations:** any departures from the brief, with the reason.
- **Editing:** how to change copy (`CFG`) and re-render (the exact commands).

## Quality bar (self-review before every gate)
- **Always moving:** frame 0 is already moving. No crossfades, no still frames except one named hold, and every shot enters moving and exits through blur, a whip or an accelerating move.
- **Sync:** cuts sit 2 frames before a beat, and every visual event has a sound.
- **Screen space:** ≤ 6 words on screen, text ≥ 4% of frame height, and 9:16 safe areas respected.
- **Premium, not template:** a restrained palette of roles, real depth (DOF, shadows, glass), and no stock-kit look.
- **Clean output:** renders are deterministic, and no console errors appear during render.

## Files
- `scripts/`:
  - `setup.sh`: scaffold and dependencies.
  - `stills.mjs`, `sheet.sh`: frames and contact sheets.
  - `render.mjs`: master render and encode.
  - `soundtrack.mjs`, `master.sh`: original score and loudness mastering.
  - `analyze_reference.sh`, `tempo.mjs`: inspiration and beat analysis.
  - `lib-browser.mjs`: resolves Playwright from the user's project.
- `assets/template/`:
  - `index.html`, `engine.js`: the page shell and the frame-driven engine.
  - `film.stub.js`: the starting point for a new film.
  - `film.js`: the demo sting. `setup.sh --demo` scaffolds it, which is handy as a smoke test.
  - `cues.example.json`: the soundtrack cues for the demo.
- `references/`:
  - `intake.md`, `inspiration.md`, `brief-format.md`: questions, reference analysis, the brief format.
  - `motion-grammar.md`, `engine-api.md`: technique library and engine docs.
  - `sound-design.md`, `qa-checklist.md`: cue sheet schema and QA.
  - `examples/`: a full brief with its complete film code, and an example reference breakdown.
