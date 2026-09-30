'use strict';
/*
  launch-film engine — deterministic, frame-driven motion for HTML launch films.

  Every pixel is a pure function of the frame number f. No CSS transitions, no timers, no Math.random.
  film.js calls Film(meta, build). build() registers shots with shot(f0, f1, (root, f0) => lf => { ... }).
  The renderer calls window.seek(f) for every master frame and screenshots #stage.

  Copy this file into the film folder unchanged. Put all film-specific code in film.js.
*/

// ─────────────────────────────── math ───────────────────────────────
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, t) => a + (b - a) * t;
const inv = (a, b, x) => clamp((x - a) / (b - a));
const E = {
  lin: t => t,
  sm: t => t * t * (3 - 2 * t),
  io: t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  io2: t => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
  o2: t => 1 - (1 - t) * (1 - t),
  o3: t => 1 - Math.pow(1 - t, 3),
  o5: t => 1 - Math.pow(1 - t, 5),
  i2: t => t * t,
  i3: t => t * t * t,
  back: t => { const c = 1.9; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); },
};
// Exponential ease-out: covers fraction r of the remaining distance per frame, normalised over n frames.
const EX = (n, r = 0.16) => { const k = Math.pow(1 - r, n); return t => (1 - Math.pow(1 - r, clamp(t) * n)) / (1 - k); };
// Keyframes: [[f, v, easeIntoThisKey?], ...]
function kf(f, keys, ease = E.io) {
  if (f <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    const k = keys[i];
    if (f <= k[0]) { const p = keys[i - 1]; return lerp(p[1], k[1], (k[2] || ease)((f - p[0]) / (k[0] - p[0]))); }
  }
  return keys[keys.length - 1][1];
}
// Monotone cubic (Fritsch–Carlson) lookup table through [[f, v], ...]; linear extrapolation at the ends.
// Add a repeated value at the end ([269,456],[287,456]) to get a clean hold with zero velocity.
function L(pts) {
  const n = pts.length, xs = pts.map(p => p[0]), ys = pts.map(p => p[1]), d = [], m = [];
  for (let i = 0; i < n - 1; i++) d.push((ys[i + 1] - ys[i]) / (xs[i + 1] - xs[i]));
  m[0] = d[0]; m[n - 1] = d[n - 2];
  for (let i = 1; i < n - 1; i++) {
    if (d[i - 1] * d[i] <= 0) { m[i] = 0; continue; }
    const h0 = xs[i] - xs[i - 1], h1 = xs[i + 1] - xs[i], w1 = 2 * h1 + h0, w2 = h1 + 2 * h0;
    m[i] = (w1 + w2) / (w1 / d[i - 1] + w2 / d[i]);
  }
  return f => {
    if (f <= xs[0]) return ys[0] + m[0] * (f - xs[0]);
    if (f >= xs[n - 1]) return ys[n - 1] + m[n - 1] * (f - xs[n - 1]);
    let i = 0; while (f > xs[i + 1]) i++;
    const h = xs[i + 1] - xs[i], t = (f - xs[i]) / h, t2 = t * t, t3 = t2 * t;
    return (2 * t3 - 3 * t2 + 1) * ys[i] + (t3 - 2 * t2 + t) * h * m[i] + (-2 * t3 + 3 * t2) * ys[i + 1] + (t3 - t2) * h * m[i + 1];
  };
}
const vel = (fn, f) => (fn(f + 0.25) - fn(f - 0.25)) * 2; // units per frame — feed this into motion blur
// Displacement for a velocity ramping linearly 0 → v over [a, b] and holding after (smooth drifts).
const rampLin = (f, a, b, v) => (f <= a ? 0 : f <= b ? (v * (f - a) * (f - a)) / (2 * (b - a)) : (v * (b - a)) / 2 + v * (f - b));
// Damped spring 0 → 1 with overshoot; t = frames since start.
const spring = (t, w = 0.32, z = 0.42) => (t <= 0 ? 0 : 1 - Math.exp(-z * w * t) * Math.cos(w * Math.sqrt(1 - z * z) * t));
// Seeded pseudo-random in [0,1). Use instead of Math.random.
const hash = i => { const s = Math.sin(i * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
const hexRGB = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const mix = (a, b, t) => { const A = hexRGB(a), B = hexRGB(b); return `rgb(${A.map((v, i) => lerp(v, B[i], t).toFixed(1)).join(',')})`; };

// ─────────────────────────────── DOM ───────────────────────────────
const NS = 'http://www.w3.org/2000/svg';
const px = v => `${v}px`;
let SW = 1080, SH = 1080;
const full = () => ({ left: '0px', top: '0px', width: px(SW), height: px(SH) });
function div(parent, style = {}, html) {
  const e = document.createElement('div');
  Object.assign(e.style, { position: 'absolute' }, style);
  if (html != null) e.innerHTML = html;
  if (parent) parent.appendChild(e);
  return e;
}
const T = (e, s) => { e.style.transform = s; };
const CB = r => (r > 0.04 ? `blur(${r.toFixed(3)}px)` : '');
const setF = (e, ...parts) => { const s = parts.filter(Boolean).join(' '); e.style.filter = s || 'none'; };
const uid = (() => { let n = 0; return p => `${p}${n++}`; })();
// Centre an element (with explicit width/height styles) at (x, y) with scale s.
const place = (e, x, y, s = 1, extra = '') => { const w = parseFloat(e.style.width), h = parseFloat(e.style.height); T(e, `translate(${(x - w / 2).toFixed(2)}px,${(y - h / 2).toFixed(2)}px) scale(${s.toFixed(4)}) ${extra}`); };
const measure = e => e.getBoundingClientRect();

// Directional Gaussian blur. const b = DB(); setF(el, b(sx, sy), CB(r));
// Apply to full-stage layers (or elements with a real box) — the SVG filter region is relative to the element box.
let fxDefs = null;
function DB() {
  const id = uid('db');
  const f = document.createElementNS(NS, 'filter');
  f.setAttribute('id', id);
  for (const [k, v] of [['x', '-50%'], ['y', '-50%'], ['width', '200%'], ['height', '200%'], ['color-interpolation-filters', 'sRGB']]) f.setAttribute(k, v);
  const g = document.createElementNS(NS, 'feGaussianBlur');
  g.setAttribute('stdDeviation', '0 0');
  f.appendChild(g); fxDefs.appendChild(f);
  return (sx, sy) => {
    sx = Math.max(0, sx); sy = Math.max(0, sy);
    if (sx < 0.04 && sy < 0.04) return '';
    g.setAttribute('stdDeviation', `${sx.toFixed(3)} ${sy.toFixed(3)}`);
    return `url(#${id})`;
  };
}

// ─────────────────────────────── shots ───────────────────────────────
let stage = null;
const shots = [];
let META = null;
const beat = k => META.beat0 + (META.fps * 60 / META.bpm) * k;
function shot(f0, f1, build) {
  const root = div(stage, { ...full(), overflow: 'hidden' });
  root.className = 'shot'; root.style.display = 'block'; // visible while building so text can be measured
  shots.push({ f0, f1, root, render: build(root, f0) });
}
function seek(f) {
  for (const s of shots) {
    const on = f >= s.f0 && f < s.f1 + 1;
    s.root.style.display = on ? 'block' : 'none';
    if (on) s.render(f - s.f0);
  }
}

// ─────────────────────────────── primitives ───────────────────────────────
// macOS arrow cursor. Hotspot = tip. set(x, y, rotDeg, scale, opacity, blur)
const ARROW_SVG = `<svg width="32" height="39" viewBox="0 0 32 39" style="display:block;overflow:visible;filter:drop-shadow(0 2px 2.5px rgba(0,0,0,.30))"><path d="M3.5 2.5V32.2L10.5 25.5L15.3 36.3L20.3 34.1L15.7 23.5H25.3Z" fill="#000" stroke="#fff" stroke-width="3.4" stroke-linejoin="round" paint-order="stroke"/></svg>`;
function Cursor(parent) {
  const c = div(parent, { left: '0px', top: '0px', width: '32px', height: '39px', transformOrigin: '3.5px 2.5px' }, ARROW_SVG);
  return (x, y, rot = 0, sc = 1, op = 1, bl = 0) => {
    T(c, `translate(${(x - 3.5).toFixed(2)}px,${(y - 2.5).toFixed(2)}px) rotate(${rot.toFixed(2)}deg) scale(${sc.toFixed(4)})`);
    c.style.opacity = op; setF(c, CB(bl));
  };
}
// Pointing-hand cursor. Hotspot = fingertip. set(x, y, scale, opacity, blur)
function Hand(parent) {
  const id = uid('hand');
  const svg = `<svg width="44" height="52" viewBox="0 0 44 52" style="display:block;overflow:visible;filter:drop-shadow(0 3px 4px rgba(0,0,0,.25))"><defs><g id="${id}">
    <rect x="14.5" y="2" width="9.5" height="31" rx="4.75"/><rect x="22.5" y="16" width="8.5" height="19" rx="4.25"/>
    <rect x="29.5" y="19" width="8.5" height="18" rx="4.25"/><rect x="9.5" y="23" width="29" height="23" rx="10"/>
    <rect x="2.5" y="25" width="10" height="19" rx="5" transform="rotate(-38 7.5 34.5)"/><rect x="12.5" y="37" width="24" height="13" rx="5.5"/></g></defs>
    <use href="#${id}" fill="#000" stroke="#000" stroke-width="4.4" stroke-linejoin="round"/><use href="#${id}" fill="#fff"/>
    <path d="M23.2 25.5V33.5M30.2 27.5V35.5" stroke="#000" stroke-width="1.5" stroke-linecap="round"/></svg>`;
  const c = div(parent, { left: '0px', top: '0px', width: '44px', height: '52px', transformOrigin: '19px 3px' }, svg);
  return (x, y, sc = 1, op = 1, bl = 0) => {
    T(c, `translate(${(x - 19).toFixed(2)}px,${(y - 3).toFixed(2)}px) scale(${sc.toFixed(4)})`);
    c.style.opacity = op; setF(c, CB(bl));
  };
}
// Kinetic words: one line of inline-block spans laid out at their final positions.
// const w = Words(root, 'Split the bill', {fontSize:'120px', fontWeight:700, color:'#111'}, cx, cy);
// w.show(i, startFrame, f, dur=9, {blur:14, rise:22})  — call every frame for every word.
function Words(parent, text, style, cx, cy, align = 'center') {
  const line = div(parent, { left: '0px', top: '0px', whiteSpace: 'pre', display: 'flex', alignItems: 'baseline', ...style });
  const spans = text.split(' ').map((w, i, a) => {
    const s = document.createElement('span');
    s.textContent = w; s.style.display = 'inline-block';
    if (i < a.length - 1) s.style.marginRight = '0.26em';
    line.appendChild(s); return s;
  });
  const r = measure(line);
  const x = align === 'center' ? cx - r.width / 2 : align === 'right' ? cx - r.width : cx;
  line.style.left = px(x); line.style.top = px(cy - r.height / 2);
  const show = (i, s0, f, dur = 9, o = {}) => {
    const p = E.o3(inv(s0, s0 + dur, f)), sp = spans[i];
    sp.style.opacity = p.toFixed(3);
    T(sp, `translateY(${((o.rise ?? 22) * (1 - p)).toFixed(2)}px)`);
    setF(sp, CB((o.blur ?? 14) * (1 - p)));
  };
  return { line, spans, show, width: r.width, height: r.height, left: x };
}
// Halftone dot field on a canvas. const dots = Dots(root); dots([ring(...), ring(...)]) every frame.
function Dots(parent, pitch = 14) {
  const c = document.createElement('canvas'); c.width = SW; c.height = SH;
  Object.assign(c.style, { position: 'absolute', left: '0px', top: '0px' }); parent.appendChild(c);
  const ctx = c.getContext('2d'), pts = [];
  for (let row = 0, y = 0; y < SH + pitch; row++, y += pitch * 0.866) for (let x = (row % 2) * pitch / 2; x < SW + pitch; x += pitch) pts.push([x, y]);
  return rings => {
    ctx.clearRect(0, 0, SW, SH);
    for (const R of rings) {
      if (!R || R.a <= 0.005) continue;
      ctx.fillStyle = R.col; const inner = R.r - R.w;
      for (const [x, y] of pts) {
        const d = Math.hypot(x - R.cx, y - R.cy);
        if (d < inner || d > R.r) continue;
        const a = Math.min(1, (d - inner) / 40) * Math.min(1, (R.r - d) / 80);
        if (a <= 0.02) continue;
        ctx.globalAlpha = R.a * a; ctx.beginPath(); ctx.arc(x, y, 0.9 + 1.1 * a, 0, 6.2832); ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  };
}
// A dot annulus growing r0 → r1 over [f0, f1]; returns null when inactive.
const ring = (f, f0, f1, r0, r1, col, a = 0.2, cx = SW / 2, cy = SH / 2, w = 260) =>
  (f < f0 || f > f1 + 2 ? null : { cx, cy, r: lerp(r0, r1, E.o2(inv(f0, f1, f))), w, col, a: a * (1 - E.i2(inv(f0 + (f1 - f0) * 0.6, f1 + 2, f))) });
// Floor glow: a brand colour pooled across the bottom of the frame. set(f, breath)
function Glow(parent, color = '#FF7A2F', light = '#FFB27A', top = 0.56) {
  const [r, g, b] = hexRGB(color), [lr, lg, lb] = hexRGB(light);
  const y = SH * top, h = SH - y + 60;
  const band = div(parent, { left: px(-SW * 0.06), top: px(y), width: px(SW * 1.12), height: px(h), transformOrigin: '50% 100%', background: `linear-gradient(180deg, rgba(${lr},${lg},${lb},0) 0%, rgba(${lr},${lg},${lb},.40) 36%, rgba(${r},${g},${b},.78) 74%, ${color} 100%)` });
  const blobs = [[-0.1, 0.62], [0.5, 0.64]].map(([x, w]) => div(parent, { left: px(SW * x), top: px(SH * 0.72), width: px(SW * w), height: px(SH * 0.5), borderRadius: '50%', transformOrigin: '50% 100%', background: `radial-gradient(closest-side, rgba(${r},${g},${b},.5), rgba(${r},${g},${b},0))` }));
  return (f, breath = 0) => {
    T(band, `scaleY(${(1 + breath).toFixed(4)})`);
    blobs.forEach((e, i) => T(e, `translateX(${((i ? -1 : 1) * SW * 0.02 * Math.sin(f / (70 + 10 * i))).toFixed(2)}px) scaleY(${(1 + breath + 0.012 * Math.sin(f / 40 + i)).toFixed(4)})`));
  };
}
// Phone body. screen: 'home' (blurred icon grid) | 'blank'. Returns { el, screen }.
function Phone(parent, w, h, screen = 'home', tones = ['#EDE8E0', '#F4D9C4', '#DCE6F6', '#F5E8B8', '#E4E0D8', '#D6E8F0'], accent = '#FF7A2F') {
  const ph = div(parent, { left: '0px', top: '0px', width: px(w), height: px(h), borderRadius: px(w * 0.143), background: 'linear-gradient(160deg,#2C2E35,#17181C 40%,#0E0F12)', boxShadow: '0 40px 90px rgba(23,24,28,.28), inset 0 0 0 2px rgba(255,255,255,.08)' });
  const bez = w * 0.034;
  const scr = div(ph, { left: px(bez), top: px(bez), width: px(w - bez * 2), height: px(h - bez * 2), borderRadius: px(w * 0.143 - bez), overflow: 'hidden', background: 'linear-gradient(180deg,#F7F5F1,#EEEAE3)' });
  if (screen === 'home') {
    const grid = div(scr, { left: '0px', top: '0px', width: '100%', height: '100%' });
    const sz = (w - bez * 2) * 0.17, gap = ((w - bez * 2) - sz * 4) / 5;
    for (let r = 0; r < 6; r++) for (let c = 0; c < 4; c++) {
      const k = r * 4 + c;
      div(grid, { left: px(gap + c * (sz + gap)), top: px(w * 0.2 + r * (sz + gap * 1.3)), width: px(sz), height: px(sz), borderRadius: px(sz * 0.26), background: k === 5 ? accent : tones[(k * 5 + r) % tones.length] });
    }
    setF(grid, 'blur(7px)');
  }
  div(ph, { left: px(w / 2 - w * 0.14), top: px(bez + w * 0.03), width: px(w * 0.28), height: px(w * 0.075), borderRadius: px(w * 0.04), background: '#07080A' });
  return { el: ph, screen: scr };
}
// Frosted glass: a blurred, lightened copy of the background clipped to a rounded box.
// const g = Glass(root, {x,y,w,h,r}, host => wallpaper(host, 0, 0)); g.track(bgX - x, bgY - y) each frame.
function Glass(parent, { x, y, w, h, r = 40, blur = 26, bright = 1.2, tint = 'rgba(255,255,255,.34)' }, drawBackground) {
  const box = div(parent, { left: px(x), top: px(y), width: px(w), height: px(h), borderRadius: px(r), overflow: 'hidden', boxShadow: '0 30px 70px rgba(8,18,45,.28)' });
  const host = div(box, { left: '0px', top: '0px', width: '0px', height: '0px' });
  const copy = drawBackground(host);
  setF(host, `blur(${blur}px) brightness(${bright}) saturate(1.08)`);
  div(box, { left: '0px', top: '0px', width: px(w), height: px(h), borderRadius: px(r), background: `linear-gradient(180deg, ${tint} 0%, rgba(255,255,255,.14) 60%, rgba(255,255,255,.10) 100%)`, boxShadow: 'inset 0 2px 0 rgba(255,255,255,.95), inset 0 0 0 1.2px rgba(255,255,255,.4)' });
  return { box, track: (dx, dy) => T(copy, `translate(${dx.toFixed(2)}px,${dy.toFixed(2)}px)`) };
}
// 3D slab (card / ticket / coin): front + back + mid slices for thickness, blur on a 2D wrapper.
// const s = Slab(root, w, h, frontHTML, backHTML, depth); s(x, y, scale, rx, ry, rz, dofBlur, motionX, motionY, opacity)
function Slab(parent, w, h, frontHTML, backHTML, depth = 6, edge = '#E6E1D8', radius = 0) {
  const wrap = div(parent, { left: '0px', top: '0px', width: px(w), height: px(h) });
  const persp = div(wrap, { left: '0px', top: '0px', width: px(w), height: px(h), perspective: '1400px' });
  const body = div(persp, { left: '0px', top: '0px', width: px(w), height: px(h), transformStyle: 'preserve-3d' });
  div(body, { left: '0px', top: '0px', width: px(w), height: px(h), transform: `translateZ(${-depth}px) rotateY(180deg)`, borderRadius: px(radius), overflow: 'hidden' }, backHTML ?? frontHTML);
  for (let i = 1; i < 3; i++) div(body, { left: '0px', top: '0px', width: px(w), height: px(h), transform: `translateZ(${(-depth * i) / 3}px)`, background: edge, borderRadius: px(radius) });
  div(body, { left: '0px', top: '0px', width: px(w), height: px(h), borderRadius: px(radius), overflow: 'hidden' }, frontHTML);
  const b = DB();
  return (x, y, s, rx, ry, rz, blur = 0, mx = 0, my = 0, op = 1) => {
    T(wrap, `translate(${(x - w / 2).toFixed(2)}px,${(y - h / 2).toFixed(2)}px) scale(${s.toFixed(4)})`);
    T(body, `rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg) rotateZ(${rz.toFixed(2)}deg)`);
    wrap.style.opacity = op; setF(wrap, b(mx / s, my / s), CB(blur / s));
  };
}
// Extruded torus that can fly through the camera. const t = Torus(root, 900, cx, cy, ['#FF8A45','#E8621E','#C9501A']);
// t.set(z, rxDeg, ryDeg)  z from -4000 (far) to ~1300 (past the lens). Auto DOF blur.
function Torus(parent, D, cx, cy, colors, slices = 10) {
  const wrap = div(parent, full());
  const pv = div(wrap, { ...full(), perspective: '1400px', perspectiveOrigin: `${cx}px ${cy}px` });
  const body = div(pv, { left: px(cx - D / 2), top: px(cy - D / 2), width: px(D), height: px(D), transformStyle: 'preserve-3d' });
  const B = D * 0.1;
  for (let s = 0; s < slices; s++) {
    const t = s / (slices - 1);
    div(body, { left: '0px', top: '0px', width: px(D), height: px(D), borderRadius: '50%', boxSizing: 'border-box', border: `${B}px solid ${t === 1 ? colors[0] : t > 0.5 ? colors[1] : colors[2]}`, transform: `translateZ(${(t * D * 0.09).toFixed(1)}px)` });
  }
  return {
    wrap,
    set(z, rx = 12, ry = -20, op = 1) {
      if (z > 1360) { wrap.style.display = 'none'; return; }
      wrap.style.display = 'block';
      const s = 1400 / (1400 - z);
      T(body, `translateZ(${z.toFixed(1)}px) rotateX(${rx.toFixed(1)}deg) rotateY(${ry.toFixed(1)}deg)`);
      setF(wrap, CB(clamp((s - 1.1) * 5, 0, 24))); wrap.style.opacity = op;
    },
  };
}
// Extruded box (bars of "=", "+", blocks, stat glyph strokes). faces[0] is the front.
function Cuboid(parent, w, h, d, { front = '#FF7A2F', back = '#E8621E', top = '#FFA468', bottom = '#C9501A', side = '#D9581C', radius = 14 } = {}) {
  const box = div(parent, { left: '0px', top: '0px', width: px(w), height: px(h), transformStyle: 'preserve-3d' });
  const faces = [];
  const face = (fw, fh, tf, bg, r) => { const e = div(box, { left: px((w - fw) / 2), top: px((h - fh) / 2), width: px(fw), height: px(fh), transform: tf, background: bg, borderRadius: px(r) }); faces.push(e); };
  face(w, h, `translateZ(${d / 2}px)`, front, radius);
  face(w, h, `rotateY(180deg) translateZ(${d / 2}px)`, back, radius);
  face(w, d, `rotateX(90deg) translateZ(${h / 2}px)`, top, 4);
  face(w, d, `rotateX(-90deg) translateZ(${h / 2}px)`, bottom, 4);
  face(d, h, `rotateY(-90deg) translateZ(${w / 2}px)`, side, 4);
  face(d, h, `rotateY(90deg) translateZ(${w / 2}px)`, side, 4);
  return { box, faces };
}
// Zoom smear for a hero word: n scaled, faded copies trailing along a fast scale change.
// const z = ZoomSmear(root, 'Brand', style); z(scale, relativeSpeed)
function ZoomSmear(parent, text, style, n = 24) {
  const copies = Array.from({ length: n }, () => div(parent, { left: px(SW / 2), top: px(SH / 2), whiteSpace: 'nowrap', lineHeight: '1', ...style, opacity: 0 }, text));
  return (s, rel) => {
    const amt = clamp(rel * 5), spread = Math.min(0.55, rel * 1.5);
    copies.forEach((e, i) => {
      if (amt < 0.02) { e.style.display = 'none'; return; }
      const u = (i + 1) / n;
      e.style.display = 'block';
      T(e, `translate(-50%,-50%) scale(${(s * (1 + spread * u)).toFixed(5)})`);
      e.style.opacity = (0.2 * amt * Math.pow(1 - u, 1.4)).toFixed(4);
    });
  };
}

// ─────────────────────────────── boot ───────────────────────────────
// meta: {
//   w, h            stage size in px (1080x1920 vertical, 1080x1080 square, 1920x1080 landscape)
//   fps             film frame grid used for all frame numbers in the brief (e.g. 60, 30, 29.97)
//   frames          film length in film frames (f0 … frames-1)
//   bpm, beat0      music tempo and the film frame of beat 0 → beat(k) returns the frame of beat k
//   render          { fps: '60' | '60000/1001', step: 1 | 0.5 }  master fps + film frames per master frame
//   font, fonts     family name (default Inter) and weights to preload
//   bg              stage background colour
// }
function Film(meta, buildFn) {
  META = { fonts: [400, 500, 600, 700], font: 'Inter', bg: '#FFFFFF', ...meta };
  META.render = { fps: String(META.fps), step: 1, ...(meta.render || {}) };
  SW = META.w; SH = META.h;
  stage = document.getElementById('stage');
  Object.assign(stage.style, { width: px(SW), height: px(SH), background: META.bg, fontFamily: `${META.font}, sans-serif` });
  fxDefs = document.querySelector('#fx defs');
  window.FILM_META = { w: SW, h: SH, fps: META.render.fps, step: META.render.step, frames: Math.round(META.frames / META.render.step) };
  window.seek = seek;
  window.READY = (async () => {
    await Promise.all(META.fonts.map(w => document.fonts.load(`${w} 40px ${META.font}`)));
    await document.fonts.ready;
    buildFn();
    const q = new URLSearchParams(location.search);
    if (q.has('play')) {
      const t0 = performance.now();
      const tick = () => { seek(((performance.now() - t0) / 1000 * META.fps) % META.frames); requestAnimationFrame(tick); };
      tick();
    } else seek(parseFloat(q.get('f') || '0'));
    return true;
  })();
}
