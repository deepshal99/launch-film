# Intake: the questions

Ask in **two short rounds**. Use the AskUserQuestion tool when it's available (at most 4 questions per call, each with 2–4 concrete options). An "Other" free-text option is added automatically, so don't add your own. If the user already answered something in their message, don't ask it again. If they say "just go" or "surprise me", use the defaults below and state them in one line.

## Round 1: what and where
1. **Product.** What is it, and what's the one thing it does? Ask for the name plus a one-line description.
   *Options:* "I'll type it (Other)" / "Use a placeholder product so I can test the pipeline".
2. **Format and length.**
   - 9:16 vertical 1080x1920 (Reels/TikTok/Shorts). Default for "viral".
   - 1:1 square 1080x1080 (feed / X).
   - 16:9 landscape 1920x1080 (X / YouTube / site hero).
   - Length: 10 s sting / 15 s / 20 s / 30 s. Default 15–20 s.
3. **Look.** Pick a lane (see `motion-grammar.md` → Looks):
   - **Keynote glass:** soft white, bright blue, frosted glass, calm precision.
   - **Bold pop:** white canvas, one loud accent pooled as a floor glow, tactile 3D objects, beat-slammed type.
   - **Dark premium:** black stage, glowing wordmark, light leaks, slow luxurious moves.
   - **Kinetic type:** type-only, huge words, hard rhythmic cuts, one accent colour.
4. **Inspiration (optional).** Any videos, links or screenshots you love, and what you love about each? Offer: "Paste links / drop files", "No inspiration — you decide".

## Round 2: story and brand
5. **Brand assets.** A logo (SVG/PNG path, or "draw a simple mark"), brand colours (hex values, or "pull them from the logo") and a font (default Inter).
6. **The message.** The hook line (≤ 6 words), 2–4 proof moments (features, numbers, UI moments) and the CTA ("Get X today", "Join the waitlist", "Live now on …").
7. **UI.** Should we show the product? Options: "Rebuild key screens from my screenshots", "Stylised abstract UI", "No UI — type and objects only".
8. **Sound.**
   - Original synthesized track (default; royalty-free, picture-locked).
   - My own licensed track (give a file path; we sync to its beat).
   - SFX only.
   - Silent.

## Defaults (use when skipped)
| input | default |
|---|---|
| format | 1080x1920 vertical, 60 fps, 15 s (900 frames) |
| look | Bold pop |
| palette | page #FBFBF9, ink #17181C, grey #8C8F96, accent #2F6BFF, accent 2 #3CC8F0, glow = accent |
| type | Inter 500/600/700, −0.03em tracking above 60 px |
| mark | an original geometric mark drawn in SVG from the product's initial or concept |
| music | original, 124–134 BPM house-pop, drop on the first hero moment |
| CTA | "Get <Product> today" |

## After intake: write the script, then the brief
**Script** (`<film-dir>/script.md`): the plain-language beat sheet the user approves before any frame numbers exist.
```
HOOK   0.0–1.5 s  <what moves in the first second, and the tension>
REVEAL 1.5–4 s    <product / mark / hero object appears — first "wow">
PROOF  4–11 s     <2–4 beats: each = one visual idea + ≤ 6 words on screen>
PAYOFF 11–13 s    <the satisfying moment: count-up, lock-in, checkmarks, 3D stat>
CTA    13–15 s    <brand + CTA, on a loopable or held frame>
Sound: <tempo, where the drop hits, the SFX signatures>
```
Show the script in chat, as a short table. Ask one yes/no question ("Build it like this?"), then write `brief.md` following `brief-format.md`.

For a 9:16 film, keep text and key action inside the safe area: top 12% and bottom 20% are covered by platform UI.
