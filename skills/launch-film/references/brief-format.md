# The brief format

The brief is the contract between the idea and the code. A good brief is so specific that two different builders would render nearly the same film. Write it to `<film-dir>/brief.md` with exactly six XML-ish sections, in this order.

Worked example: `examples/tandem-brief.md` (16:9, bold fintech pop).

---

## `<inputs>`
One paragraph. It lists every input the film needs, followed by the default used for each one if the user skips it. That makes the brief reusable as a template.

> Ask me for: product name, logo (or let you draw a mark), brand colours (or pull them from the logo), the headline pair, three proof points, the CTA, and a music track. If I skip any, use the defaults: product "Nova" …, CTA "Get Nova today", and an original synthesized track at 124 BPM.

## `<direction>`
The creative spine, in 5–8 dense lines:
1. **Format line.** Duration, size, frame grid and master fps, plus the frame range. "A 20.0 s 1080x1920 vertical film, 60 fps, frames f0–f1199."
2. **Beat grid.** "One beat = 29.03 frames (124 BPM); beat k at f = 6 + 29.03·k." Every important event is later placed on this grid.
3. **Feel.** A one-sentence mood plus 2–3 reference adjectives: "keynote glass: soft, white, frosted" or "social-first fintech pop: bright, loud accent, tactile 3D".
4. **Camera and motion rules.** How shots enter and exit, easing rates and blur policy. Give numbers: "exp ease-out, 12–19% of the remaining distance per frame; blur follows speed on every move; hand-offs through blur, never crossfades".
5. **Palette as roles.** page / ink / grey / accent / accent 2 / glow, each with a hex value, plus explicit bans ("no purple").
6. **Type.** Family, weights and tracking rules.
7. **Story.** The whole film as one arrow chain: "mark breathes → stretches into a pill → cursor taps → ticket flock → headline → …". This is the most important line in the brief.
8. **Banned list.** Crossfades, frozen frames (except named holds), stock UI kits, real third-party marks, Math.random, template-looking layouts.

## `<structure>`
One paragraph per shot: `S3 f297–459 · headline:`. Inside each one, state:
- **Layout.** Absolute px coordinates on the stage, sizes, radii and font sizes.
- **Timing.** Every event on a frame number or a beat: "words land on beats 11, 12, 13".
- **Motion values.** Keyframe tables for the hero moves: "phone top y1260 (f640) → 700 (f652) → 330 (f662) → 190 (f672) → 150 (f684)". Say which value is exact and which is approximate.
- **Blur values.** Peaks and frame ranges: "defocus 0 → 22 px over f430–459 with scale 1 → 1.06".
- **Entry and exit.** Every shot says how it enters (already moving) and how it leaves (accelerating move, whip, defocus, smear).
- **Hard cuts.** Exact frames, and whether they sit 2 frames before a beat.

Rules of thumb:
- **Shot length:** each shot runs 0.7–3.5 s, and nothing on screen should read as static for more than about 0.6 s.
- **Holds:** state the one allowed frozen hold explicitly, if there is one.
- **Keys over prose:** prefer keyframe tables to adjectives. "Rises fast then settles" is vague; "width 168 → 205 → 290 → 352 → 378 → 356 → 360 at f96/104/112/118/124/129/134" is buildable.

## `<build>`
Numbered technical rules. Copy these verbatim and adjust the numbers:
1. One HTML page at WxH, drawn by seek(f) as a pure function of the frame number. No CSS transitions, no timers, no Math.random (seeded hashes only). Shots register as {f0, f1, render(localFrame)}.
2. Every value is continuous in the frame number. Animate with keyframe tables kf() and monotone-cubic lookup tables L(). No Math.floor on motion.
3. **Blur:** CSS blur for round blur. SVG feGaussianBlur with separate x/y for directional smears. Zoom smear = 20–30 scaled, faded copies. Frosted glass = a blurred, lightened copy of what's behind, clipped to the shape.
4. **Reuse:** list the reused components (cursor, phone, cards) and say they are drawn once and reused.
5. **Sound:** exact duration, BPM, sections (intro / groove / dip / break / outro) and every SFX with its frame or second. Master to −14 LUFS, true peak −1 dBTP.
6. **Render:** Playwright (fonts loaded first), H.264 yuv420p at the master fps, with the audio muxed in.

## `<gotchas>`
Traps specific to this film, from `qa-checklist.md` plus anything the brief makes likely. For example:
- Long names don't fit where short ones did.
- White objects vanish on white without a 1 px edge.
- Heavy blur wipes out thin shapes.
- Text baked into images doubles up with overlaid text.
- A roller window must fit its widest word.

## `<start>`
What to do first. Normally: "Ask me for the inputs. Then show me 4 stills (f…, f…, f…, f…) before you render the full film." Pick 4 stills that prove the hardest shots.

---

## Writing checklist
- [ ] Every shot has a frame range, and the ranges tile the film with no gaps.
- [ ] Every cut and hit maps to a beat, or to a named off-beat for tension.
- [ ] Every moving element has an entry and an exit.
- [ ] Hero moves have keyframe tables and blur values.
- [ ] The copy is ≤ 6 words per card and ≥ 4% of frame height on mobile formats.
- [ ] The palette is given as roles with hex values, and the bans are explicit.
- [ ] All brand assets are the user's own or original. No third-party logos or characters, and no cloned shots (see `inspiration.md`).
