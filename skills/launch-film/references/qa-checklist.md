# QA checklist: run before showing stills, and again before the final render

## Look at the frames (Read the contact sheets; don't guess)
- [ ] **Checkpoint stills** from the brief's `<start>` are rendered, read and look intentional.
- [ ] **Around every cut** (cut−2, cut−1, cut, cut+1, cut+2): the cut frame is exact, the outgoing shot is moving or blurring, and the incoming shot is already moving.
- [ ] **Nothing frozen** except the named hold. Compare two frames 6 frames apart in every shot.
- [ ] **No empty frames.** Heavy blur can wipe a shape out; lower the blur until the shape still reads.
- [ ] **Text:** fits its container (measure after fonts load), and scales down for long names instead of overflowing. No glows on UI text; a glow is OK on a wordmark.
- [ ] **White on white:** white objects on a white page have a 1 px edge (#E3E8EF or similar) plus a faint shadow.
- [ ] **Near-camera objects** never cover the hero text or product. Keep them at the frame edges.
- [ ] **No template tells:** stock UI kits, default drop shadows, centred-everything with no depth, baked-in text inside images that also get overlaid text.
- [ ] **Safe area on 9:16:** nothing important in the top 12% or bottom 20%.
- [ ] **Palette:** only the roles in the brief, with the banned colours absent.
- [ ] **Originality:** no third-party logos, marks, characters or footage, and the shot sequence isn't a replica of a reference.

## Numbers
- [ ] `ffprobe`: the expected size, fps and frame count; duration = brief duration (±1 frame); yuv420p; audio present.
- [ ] The audio master reports I ≈ −14 LUFS, peak ≤ −1 dBTP, and exact length.
- [ ] A cut-frame sheet taken from the encoded MP4 (not the PNGs) confirms the cuts survived encoding:
  `ffmpeg -i film.mp4 -vf "select='eq(n\,143)+eq(n\,144)+…',scale=480:-2,tile=8x4" -frames:v 1 cuts.png`

## Common bugs and fixes
| symptom | cause | fix |
|---|---|---|
| element stretched or flying before its first key | `L()` extrapolates linearly | add a key at the shot start, e.g. `[f0, v]` |
| directional blur clips the element | SVG filter region = 200% of the element box | apply `DB()` to a full-stage layer or a real-sized wrapper |
| 3D object looks flat or grey | viewed from behind, unprinted back face | print the back face, limit rotateX to ±35°, spin on Y/Z |
| blur/filter kills the 3D | CSS filter flattens preserve-3d | put the filter on an outer 2D wrapper, perspective inside |
| measured width = 0 | measured while the shot was hidden | the engine shows shots during build; measure inside build, not render |
| typing jitters | text re-measured per frame | lay the line out at its final length, reveal by slicing |
| frame differs between renders | Math.random / Date / timers | use `hash(i)`, and derive everything from f |
| sheet shows red tiles | fewer frames than grid cells | ignore, or pass a multiple of 4 frames |
