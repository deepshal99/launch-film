# Sound design: `cues.json` → an original, picture-locked track

`scripts/soundtrack.mjs` synthesizes everything: kick, clap/snare, hats, sub-bass, supersaw pads, plucks and the SFX. It uses no samples and no third-party music. Write `<film-dir>/cues.json` from the brief's `<build>` sound line, then run:
```bash
node <skill>/scripts/soundtrack.mjs <film-dir>/cues.json <film-dir>/out/raw.wav
bash <skill>/scripts/master.sh <film-dir>/out/raw.wav <film-dir>/out/audio.wav <duration> -14 60
```
`master.sh` does a two-pass linear loudnorm to −14 LUFS with true peak ≤ −1 dBTP, sets the exact length and adds a tail fade in ms. It prints the measured I and peak; report those numbers.

## Schema
```jsonc
{
  "duration": 15.0,            // seconds, exactly the film length
  "fps": 60,                   // film frame grid used by "f123" times
  "bpm": 124, "beat0": 6,      // same beat grid as film.js (beat0 = film frame of beat 0)
  "feel": "house",             // house (4-on-floor) | halftime (kick 1 & 3.5, snare 3) | ambient (no drums)
  "chords": ["Am7", "Fmaj7", "C", "G"],   // one per bar, loops. Qualities: '' m 7 maj7 m7 m9 maj9 add9 sus2 sus4 6 69 dim
  "seed": 7,                   // optional: changes hat/noise textures
  "hook": [0, 3, 6, 8, 10, 12, 14],       // optional: 16th positions of the pluck hook
  "sections": [                // times: seconds | "f123" (frame) | "b12.5" (beat) | "end"
    { "type": "intro",  "from": "b0",  "to": "b6" },    // filtered pad swell + sparse plucks + riser into the drop
    { "type": "groove", "from": "b6",  "to": "b30" },   // drums + bass + pad + hook; the first groove downbeat = chord 1 + impact
    { "type": "dip",    "from": "f600","to": "f720" },  // low-pass the music bus, drop claps/hats (tension under a scene)
    { "type": "break",  "from": "b22", "to": "b26" },   // drums out, pad opens + riser (use for a frozen hold)
    { "type": "outro",  "from": "b30", "to": "end" }    // warm tonic pad + sparkle plucks + sub, no drums
  ],
  "sfx": [
    { "type": "click",   "t": "f170", "amp": 0.6 },                        // cursor press / tap
    { "type": "whoosh",  "t": "f296", "pre": 0.4, "post": 0.15, "dir": 1 }, // peaks AT t: whips, cuts, smears
    { "type": "impact",  "t": "b20",  "amp": 0.45, "low": 58 },             // slams, landings, ring fly-through
    { "type": "pop",     "t": "f590", "amp": 0.25, "freq": 820 },           // spring pops, checkmarks, bubbles
    { "type": "tick",    "t": 4.2 },                                          // single UI tick
    { "type": "ticks",   "from": "f121", "to": "f150", "every": 0.032 },     // typing / printing
    { "type": "zip",     "from": "b18.5", "to": "b19" },                     // line draws, swipes
    { "type": "riser",   "from": "f900", "to": "f950", "amp": 0.28 },        // build into a hit
    { "type": "shimmer", "t": "f1092", "amp": 0.12 }                          // sparkle on a reveal / end card
  ]
}
```

## Scoring rules
- **Tempo:** 120–134 BPM for energetic launches, 90–100 halftime for cinematic ones.
- **The drop:** the first groove downbeat is the reveal or wow moment. The hard cut into it sits 2 frames earlier.
- **Chords:** the default loops are a minor-to-major lift (`Am7 Fmaj7 C G`, `F#m7 Dmaj7 A E`). For dark premium, use `Dm9 Bbmaj7 Fmaj7 C`.
- **SFX:** every visual event gets a sound. Whooshes peak on the cut. Impacts land on slams. Pops go on spring pops. Ticks go on typing.
- **Level:** SFX sit under the music (amp 0.05 for ticks, up to 0.8 for the biggest hit).
- **Holds:** put a `break` or `dip` under a frozen hold, then land the next scene on a big impact.
- **Timing:** keep the soundtrack exactly the film length and let `master.sh` handle the tail fade.

## Using the user's own licensed track
Run `node <skill>/scripts/tempo.mjs <track>` to get BPM candidates and strong onsets. Set the film's `bpm` to the matching candidate and `beat0` to the first downbeat × fps, then place every cut and hit on that grid. Trim and master the track with `master.sh` (it trims to the film duration), or mix SFX over it with ffmpeg `amix`. Never use a track the user doesn't have rights to.
