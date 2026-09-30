# Engine API (`assets/template/engine.js`)

Plain globals, loaded before `film.js`. Don't edit the engine per film. Wrap or extend it in `film.js` instead. The full film in `examples/` predates the engine and inlines its own copies of these helpers; read them for shot-building patterns (camera layers, glass, 3D flocks, end cards).

## Boot
```js
Film({ w: 1080, h: 1920, fps: 60, frames: 900, bpm: 124, beat0: 6, bg: '#FBFBF9',
       render: { fps: '60', step: 1 },   // optional. 29.97 grid rendered at 59.94: { fps: '60000/1001', step: 0.5 }
       font: 'Inter', fonts: [400, 500, 600, 700] }, () => { /* shots */ });
```
- `beat(k)` returns the film frame of beat k: `beat0 + fps·60/bpm·k`.
- `window.FILM_META` is read by the scripts: `{ w, h, fps, step, frames }`, where frames = master frames.
- `index.html?f=240` shows one frame. `index.html?play` previews live (not frame-exact).

## Shots
```js
shot(f0, f1, (root, F0) => {          // build once: create DOM, measure text (fonts are loaded)
  const cam = div(root, { ...full(), transformOrigin: '540px 960px' });
  return lf => { const f = lf + F0;    // render(localFrame): set styles only — no DOM creation here
    T(cam, `scale(${kf(f, [[f0, 1], [f1, 1.08, E.io]])})`);
  };
});
```
- A shot is visible for `f0 ≤ f < f1 + 1`, so half frames work.
- Overlapping ranges both render, and later shots stack on top. Prefer one shot per range. For a transition that needs both scenes, draw it in one shot.
- Always compute absolute `f` inside a shot and use the brief's frame numbers directly.

## Math
| fn | use |
|---|---|
| `kf(f, [[f, v, ease?], …], defaultEase)` | keyframes; the ease applies to the segment arriving at that key |
| `L([[f, v], …])` → `fn(f)` | monotone-cubic lookup table for hero moves from brief tables. **Extrapolates linearly past the ends**, so add a first key at the shot start and a repeated last key for holds |
| `EX(n, r)` | exponential ease-out covering r of the remaining distance per frame over n frames (normalised) |
| `E.lin/sm/io/io2/o2/o3/o5/i2/i3/back` | easings |
| `vel(fn, f)` | px/frame of a function, for motion blur |
| `spring(t, w, z)` | damped spring 0 → 1 with overshoot (t = frames since start) |
| `rampLin(f, a, b, v)` | smooth drift: velocity ramps 0 → v over [a, b] |
| `hash(i)` | seeded random in [0, 1) |
| `clamp, lerp, inv(a, b, x), mix(hexA, hexB, t)` | basics |

## DOM and filters
- `div(parent, style, html)` creates an absolute-positioned div. `full()` gives a full-stage box. `px(v)` formats a length.
- `T(el, transform)`, `place(el, cx, cy, scale, extra)` (centres an element with explicit width and height), `measure(el)`.
- `setF(el, ...parts)` sets the filter list, for example `setF(el, db(sx, sy), CB(r))`.
- `CB(r)` is a CSS round blur fragment. `const db = DB()` creates a directional SVG blur; call `db(sx, sy)` each frame. Apply it to elements with a real box (full-stage layers are safest), because the filter region is 200% of the element box.

## Primitives
| primitive | call | notes |
|---|---|---|
| `Cursor(parent)` → `set(x, y, rot, scale, op, blur)` | macOS arrow, hotspot = tip | rot −60…+45 to "face" the direction |
| `Hand(parent)` → `set(x, y, scale, op, blur)` | pointing hand, hotspot = fingertip | press = scale 0.86 |
| `Words(parent, text, style, cx, cy, align)` → `{ spans, show(i, start, f, dur, {blur, rise}), width, line }` | kinetic line | call show for every word every frame |
| `Dots(parent, pitch)` → `draw([ring(...), …])` | halftone canvas | `ring(f, f0, f1, r0, r1, colour, alpha, cx, cy, width)` |
| `Glow(parent, colour, light, top)` → `set(f, breath)` | floor glow | top = fraction of height where it starts |
| `Phone(parent, w, h, 'home' or 'blank', tones, accent)` → `{ el, screen }` | device | put UI inside `.screen` |
| `Glass(parent, {x, y, w, h, r, blur, bright, tint}, host => drawBg(host))` → `{ box, track(dx, dy) }` | frosted glass | redraw the same background inside, then `track()` it to stay aligned |
| `Slab(parent, w, h, frontHTML, backHTML, depth, edge, radius)` → `set(x, y, s, rx, ry, rz, dofBlur, mx, my, op)` | 3D card / ticket / coin | blur is divided by scale internally |
| `Torus(parent, D, cx, cy, [face, mid, back])` → `{ set(z, rx, ry, op) }` | fly-through rings | z −4200 (far) → 1320 (past the lens) |
| `Cuboid(parent, w, h, d, colours)` → `{ box, faces }` | extruded bars/blocks | nest inside a `perspective` + `preserve-3d` parent |
| `ZoomSmear(parent, text, style, n)` → `set(scale, relSpeed)` | end-card zoom streaks | relSpeed = abs(dWidth/df) / width |

## Recipes
**Camera layer with speed-following blur**
```js
const cam = div(root, { ...full(), transformOrigin: '540px 960px' }); const camB = DB();
const panX = L([[120, 0], [126, 40], [132, 110], [140, 125], [200, 125]]);
// render:
T(cam, `translateX(${panX(f)}px)`);
setF(cam, camB(Math.abs(vel(panX, f)) * 0.2, 0));
```
**Word on beats**: `[beat(11), beat(12), beat(13)].forEach((b, i) => line.show(i, b - 4, f));`

**Exit by defocus**: `const o = E.i2(inv(f1 - 25, f1, f)); T(all, `scale(${1 + 0.06 * o})`); setF(all, CB(22 * o));`

**Enter already moving**: `const e = EX(12, 0.19)(inv(f0, f0 + 12, f)); T(el, `translateY(${120 * (1 - e)}px)`);`

**Typing**: precompute the time each character appears (1 char/frame with a 1-frame hold every 2–3 chars, from `hash`). Each frame, set `textContent = text.slice(0, count(f))`. The caret is always visible.

**Brand mark**: when the user has no logo, draw an original SVG mark from the product's idea: geometric, 2–3 primitives, works in white on the accent and in ink on white. Build a `markSVG(size, colour)` in `film.js` and reuse it everywhere.
