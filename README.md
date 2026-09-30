# launch-film

**Turn a product idea into a premium, viral-ready launch video — rendered entirely from code.**

An agent skill for Claude Code (and any agent that supports `SKILL.md`). It interviews you, optionally studies the videos and screenshots you love, writes a beat-sheet script and a frame-exact brief, builds the film in a deterministic HTML motion engine, composes an original picture-locked soundtrack, and renders an H.264 MP4 in 9:16, 1:1 or 16:9.

<p>
  <a href="media/tandem.mp4"><img src="media/tandem.gif" width="560" alt="Tandem — 16:9 launch film made with launch-film"></a>
</p>

## See what you get
Made end to end with this skill: brief, motion, original soundtrack and render. Click to watch with sound.

| film | format | watch |
|---|---|---|
| **Tandem**: bill-splitting app launch (bold pop, 3D ticket flock, receipt split, word roller, 3D "=", phone end card) | 1920×1080 · 60 fps · 20 s | [▶ tandem.mp4](media/tandem.mp4) · [contact sheet](media/tandem-sheet.png) |

Its brief and full film code are in [`skills/launch-film/references/examples/`](skills/launch-film/references/examples/).

## Install

**skills.sh (any supported agent)**
```bash
npx skills add deepshal99/launch-film
```

**Claude Code plugin**
```
/plugin marketplace add deepshal99/launch-film
/plugin install launch-film@launch-film
```

**Manual:** copy `skills/launch-film/` into `.claude/skills/` in your project, or into `~/.claude/skills/` to use it everywhere.

**Requirements:** Node 18+ and ffmpeg. The skill installs Playwright + Chromium and the Inter font into your project on first run. [yt-dlp](https://github.com/yt-dlp/yt-dlp) is optional (for inspiration links).

## Use
Just ask:
> Make a 15 s vertical launch video for my app Orbit — it books a haircut in two taps.

> Here's a video I love: https://… — make something with this energy for our product.

or run `/launch-film`. The skill walks through:

1. **Intake:** two short rounds of questions (product, format, look, brand, message, UI, sound), with sensible defaults for anything you skip.
2. **Inspiration (optional):**
   - **Videos and links:** turned into timestamped contact sheets, a cut list and a tempo estimate the agent reads, then a written breakdown of pacing and motion grammar.
   - **Screenshots:** mined for palette, type and surface style.
3. **Script:** a hook → reveal → proof → payoff → CTA beat sheet you approve.
4. **Brief:** a six-section, frame-exact spec (the "prompt formula"). It has a beat grid, positions, keyframe tables, blur values and an entry and exit for every shot.
5. **Build:** the film is written against a small motion engine. Every pixel is a pure function of the frame number, blur follows speed, and nothing sits still.
6. **Checkpoints:** contact sheets are reviewed against a QA checklist, and you see 4 key stills.
7. **Soundtrack:** an original synthesized track from a cue sheet (tempo, chords, sections, and every SFX tied to a frame), mastered to −14 LUFS / −1 dBTP. It can also sync to a licensed track you own.
8. **Render:** Playwright captures every frame, which is encoded to H.264 yuv420p + AAC, then verified.

## What's inside
```
skills/launch-film/
  SKILL.md                     the workflow the agent follows
  references/                  intake, inspiration, brief format, motion grammar, engine API, sound design, QA
  references/examples/         a complete brief + its full film code
  assets/template/             index.html, engine.js (motion engine), film stub, demo sting, demo cue sheet
  scripts/                     setup, stills, contact sheets, render, soundtrack, master, reference + tempo analysis
```

Smoke test in any project:
```bash
bash <skill>/scripts/setup.sh launch-film --demo
node <skill>/scripts/soundtrack.mjs <skill>/assets/template/cues.example.json launch-film/out/raw.wav
bash <skill>/scripts/master.sh launch-film/out/raw.wav launch-film/out/audio.wav 4
node <skill>/scripts/render.mjs launch-film launch-film/out/audio.wav
```

## Originality
Inspiration is used for pacing, rhythm and technique. The skill won't clone someone else's video shot-for-shot or reuse third-party logos, characters, footage or music. It designs original marks and objects and composes original music instead. Your own brand assets are always fair game.

## License
MIT. The Inter font is downloaded from [@fontsource/inter](https://fontsource.org/fonts/inter) (SIL Open Font License) at setup time.
