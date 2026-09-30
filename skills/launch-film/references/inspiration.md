# Using inspiration (videos, links, screenshots)

Inspiration tells you what the user means by "like this": the pacing, the energy, the transition vocabulary, the type behaviour and how dense the frame gets. You learn those qualities and apply them to the user's own product. The output is always an original film.

## Originality rules (non-negotiable)
- **Learn the grammar, not the film.** Extract techniques, pacing, rhythm and structure patterns: "words land one per beat with blur-rise", "a 3D object burst at ~25% runtime", "UI assembles, then the device arrives". Do not reproduce a specific video shot-for-shot. Swapping in a new name, logo and colour while keeping the same sequence of shots, compositions and copy is still a copy, so don't offer it.
- **No third-party assets.** Never reuse, trace or recreate another company's logos, token or coin marks, mascots, well-known characters, app screens, footage or music. When a reference relies on one of these, design an original equivalent that plays the same role: an original mark, an original 3D object, an invented mascot, fictional token names.
- **Music.** Never recreate a reference track's melody or arrangement. Match only the tempo range, energy curve and where the drop sits, using `soundtrack.mjs`. If the user supplies a track they have rights to, sync to it (see `sound-design.md`).
- **Say it plainly.** If a user asks for an exact replica of someone else's ad, explain briefly that you'll build an original film in that style, and offer it. Don't lecture.
- **The user's own material is fair game.** The user's logo, product screenshots, brand guide and earlier films can be used directly, and recreating the user's own previous video is fine.

## Video or URL
```bash
bash <skill>/scripts/analyze_reference.sh "<url-or-file>" <film-dir>/inspiration/<name>
```
Then **Read** the generated `overview-*.png` sheets (4 fps, 5 s each) and, for the first 20 s, the `detail-*.png` sheets (10 fps). Also read `cuts.txt` and `tempo.txt`.

Write `<film-dir>/inspiration/<name>/breakdown.md` with:
1. **Format.** Aspect, fps, duration, BPM candidates and the loudness feel.
2. **Timing map.** A table of `t (s) | what happens` at roughly 0.25–0.5 s resolution. Timing and pacing only, described in your own words.
3. **Motion grammar.** Bullet list of techniques, each with an estimated parameter: blur amount, easing character, stagger in frames, hold lengths.
4. **What makes it work.** Three to five insights, such as where the hook lands, the pattern-interrupt cadence, the payoff moment and how the CTA is staged.
5. **What we'll do differently.** How the user's film will use that grammar with its own story, assets and compositions.

`examples/breakdown-example.md` shows the expected depth.

Tempo: `tempo.mjs` prints candidates. Pick the one that matches the kick; half- and double-time errors are common. Use the reference BPM only as a starting range for an original track.

## Screenshots and images
**Read** them directly and note:
- **Palette:** 5–7 hex values assigned to roles (page, ink, grey, accent, accent 2, glow). Estimate by eye, or sample a colour: `ffmpeg -v error -i shot.png -vf "crop=4:4:X:Y,scale=1:1" -f rawvideo -pix_fmt rgb24 - | xxd -p`.
- **Type:** the family class (grotesk / geometric / serif / mono), weights, tracking and case.
- **Density:** how much of the frame is empty, and the corner radius language.
- **Surface treatments:** glass, grain, gradients, glows, shadows, outlines.
- **UI patterns worth abstracting:** chips, cards, toggles, sheets.

For the user's own product screenshots you may rebuild the actual UI in HTML/SVG (simplified and cleaner), or place the screenshot image directly inside a device frame.

## Turning analysis into the brief
- **Palette:** map the reference palette onto roles, then move it toward the user's brand colours. Their brand wins.
- **Direction:** keep the reference's rhythm (shot lengths, beat density) and write it into the `<direction>` beat grid.
- **Story:** keep the energy curve (hook → reveal → proof → payoff → CTA) but write your own story line for the user's product.
- **Credit:** cite the inspiration in the brief's direction line: "Feel: inspired by the pacing of <ref> — original story and assets."
