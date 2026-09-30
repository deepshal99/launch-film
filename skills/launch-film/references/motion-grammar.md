# Motion grammar: what makes these films feel premium and shareable

## Viral structure
- **Hook in under 1 s.** Frame 0 is already moving: a rise, a ripple or a burst. Never open on a static logo or a fade from black.
- **One idea per beat.** Each 0.7–3 s shot says one thing, with ≤ 6 words on screen.
- **Pattern interrupt every 2–3 s:** a cut, whip, 3D burst, colour flip or scale jump. Keep the eye resetting.
- **Signature "wow" at 25–35% runtime:** a 3D object burst, a glass box springing out, rings flying through the lens, a whip-tilt. This is the moment people rewatch.
- **Satisfying payoff at about 70%:** a count-up, pieces locking into a cross, checkmarks popping, a 3D stat settling into an outline.
- **CTA with brand, loopable.** End on the wordmark / CTA mid-motion (collapse, breathe), or on a held end card whose colours match frame 0, so autoplay loops feel seamless.
- **Sound carries half the retention.** Cuts land 2 frames *before* the beat (the eye leads the ear). The drop hits on the first hero moment, and every visual event has a sound: tap, whoosh, pop, tick, hit, shimmer.
- **Mobile legibility.** Text height ≥ 4% of frame height, contrast ≥ 4.5:1, and inside the safe area on 9:16.

## Looks (pick one per film, mix sparingly)
| look | canvas | accent use | signature moves |
|---|---|---|---|
| Keynote glass | #FDFDFB white, haze → page | bright blue + cyan/mint dots | frosted glass boxes, blur-follows-speed, cursor choreography, whip-tilts, glowing wordmark on black |
| Bold pop | #FBFBF9 white + saturated floor glow (bottom 30–35%) | one loud colour, near-black ink | halftone dot blooms, 3D flocks with DOF, beat-slammed words, UI assembling into a phone, 3D stat |
| Dark premium | #050507 → #1B1B1D radial | one metallic/luminous accent | slow push-ins, light sweeps across type, particles, bloom, long holds with breathing |
| Kinetic type | solid colour fields | 1 accent + ink | giant words, hard cuts on every beat, word rollers, masks, split-screen type |

## Core rules (apply everywhere)
1. **Never still.** Every shot enters already moving and leaves on an accelerating move, a whip or a blur ramp. Allow at most one named frozen hold per film.
2. **Exponential ease-out for arrivals.** Cover 12–19% of the remaining distance per frame (`EX(n, 0.16)`) and enter at speed. Use `E.i2`/`E.i3` for exits (accelerate away) and `E.io` for camera moves.
3. **Blur follows speed.** `blur = |velocity px/frame| × k`, with k ≈ 0.12–0.2 for directional smears, capped at 14–40 px. Use `vel(fn, f)` from the engine, and blur along the motion axis with `DB()`.
4. **Hand-offs through blur, never crossfades:** defocus (round blur 0 → 16–22 px with scale 1 → 1.05), directional smear (20–40 px along the move), a whip (an object crosses the lens and fills the frame), or a zoom smear.
5. **Hard cuts sit 2 frames before a beat**, and a cut never lands on a still frame.
6. **Depth of field.** Objects scaled > 1.4× (near camera) get 6–14 px blur; far objects (< 0.6×) get 1–3 px.
7. **Deterministic.** Seeded `hash(i)` for any variation. The same frame always renders the same pixels.

## Technique library (with proven values)
**Word-by-word reveal.** Each word: opacity 0 → 1, blur 14 → 0 px, rise 22 px, over 9 frames at 60 fps with `E.o3`. Start 4 frames before its beat so it peaks on the beat. Build lines from their final layout so they never reflow. Use a second line at about 40% of the size in grey. (`Words()`)

**Word roller (slot).** A window as wide as the widest word, masked at top and bottom (14% fade). Each word holds 18 frames then flicks up in 6 frames with vertical blur `vel × 0.2`. Accelerate through 4–6 filler words at 9 frames each, land on the hero word with a slight overshoot, then swipe a highlight behind it over 10 frames.

**Halftone dot bloom.** Hex grid, 14 px pitch, 2–4 px dots at 18–30% opacity, as an annulus 260 px wide growing r 100 → 1150 over 60–90 frames (`E.o2`). Fade in over the inner 40 px and out over the outer 80 px. Fire one on each accent (tap, slam, settle). (`Dots()` + `ring()`)

**Floor glow.** The brand colour pooled across the bottom 30–35%, as a gradient band plus two drifting radial blobs. It breathes ±3% on the end card and stays on every shot so the film feels like one space. (`Glow()`)

**Morph (icon → pill → UI).** Animate width, height and radius through a monotone table with overshoot (+5%, then settle within 10 frames). Swap content while it is mid-blur.

**Cursor choreography.** It glides in decelerating, turns to face its direction (±10–60°), grows ×1.3–1.55 on hover, presses (scale 0.85 for 2–3 frames, then release) with a click SFX, and the target responds with a highlight or ring. Use `Cursor()` (arrow) or `Hand()` (pointer).

**Spring pop.** `spring(t, 0.3–0.5, 0.42–0.5)` for chips, avatars, banners and checkmarks. Scale 0 → 1.18 → 1, plus a 4 px shake decaying over 14 frames for "success".

**3D object flock.** 20–30 slabs (tickets, coins, cards) along one Bézier stream arcing over the hero, staggered 2.5–3 frames, with each object's duration 45–70 frames. Spin mostly on Y/Z, and keep X wobble to ±35° so faces read. Put two near-camera objects at the frame edges, never over the hero. Print both faces. (`Slab()`)

**Whip transition.** One object at about 7× scale crosses the frame in 16–25 frames, with horizontal smear up to 40 px. The next shot starts with smear 30 → 0 over 8 frames.

**Rings through the lens.** Three extruded tori with z −4200 → +1320 under an `E.i2` ramp, staggered 5 frames. Blur follows the perspective scale; slight rotateX/Y shows the thickness. Pair with an impact SFX. (`Torus()`)

**3D stat / glyph.** Extruded cuboids (`Cuboid()`) tumble in (1–1.5 turns, `EX` settle over about 35 frames), then the front face fades to a 6 px outline while the sides fade out. This works for "=", "+", "0%" strokes or blocks.

**Frosted glass.** A blurred (24–30 px), brightened (×1.2) copy of whatever is behind, clipped to the shape. Add a white gradient overlay (34% → 10%), a bright 2 px top rim and a 1.2 px inner edge. Spring the box open with separate X/Y overshoot. (`Glass()`)

**Scroll-in page.** Enter smeared, offset about 420 px, with the offset decaying about 18% per frame. Vertical blur goes 24 → 1.5 px in 6 frames, and the background flash colour fades to the page colour.

**UI assembly into a device.** UI atoms spring in first, then the device body rises around them from below while the camera pulls back (scale ×0.62–0.8 with `E.io` over 40–50 frames).

**End card.** Either (a) a black radial stage with the wordmark slamming from 1.5× width down to 1.0× with 20–30 zoom-smear copies, a tight glow plus a wide soft halo, then a slow shrink and a final ease-in collapse with blur, or (b) a white page with the CTA landing word by word over a phone rising out of the glow and an app banner spring-popping onto it.

## Copy rules
- The hook line uses a verb or tension: "Split the bill before it lands", not "Introducing Tandem".
- Proof beats are concrete: numbers, named actions, before → after.
- No more than 6 words on screen at once, except a single lesson or answer page, which is shown as texture and not meant to be read.
- The CTA names the brand plus an action plus now/today.
