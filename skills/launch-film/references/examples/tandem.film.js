'use strict';
/*
  Tandem — 20 s launch film, 1920x1080 @ 60 fps (f0–f1199).
  Every pixel is a pure function of the frame number f. seek(f) shows the active shot and calls render(localFrame).
  Beat k lands on f = 8 + 26.97·k (133.5 BPM).
*/

// ─────────────────────────────── config ───────────────────────────────
const CFG = {
  product: 'Tandem',
  pill: ['You', 'Friends'],
  headline: ['Split the bill', 'before it even lands'],
  receipt: { title: 'Taco Tuesday', meta: 'Fri · 4 friends', rows: [['Tacos', 24], ['Drinks', 36], ['Tip', 12]] },
  friends: [
    { i: 'A', bg: 'linear-gradient(150deg,#7DB6FF,#3D8BFF 60%,#2F6FE0)', ink: '#fff' },
    { i: 'J', bg: 'linear-gradient(150deg,#FFE680,#FFD84D 60%,#F5C72E)', ink: '#17181C' },
    { i: 'M', bg: 'linear-gradient(150deg,#FFA36B,#FF7A2F 60%,#F0621A)', ink: '#fff' },
    { i: 'S', bg: 'linear-gradient(150deg,#4A4D57,#23252B 60%,#17181C)', ink: '#fff' },
  ],
  roller: ['dinner', 'rent', 'road trips', 'concerts', 'groceries', 'brunch', 'flights', 'gifts', 'gas money', 'everything'],
  square: "Everyone's square.",
  even: ['Always', 'even.'],
  end: ['Get', 'Tandem', 'today'],
  banner: ['Tandem', 'split anything'],
};
const C = { page: '#FBFBF9', ink: '#17181C', grey: '#8C8F96', tang: '#FF7A2F', peach: '#FFB27A', sky: '#3D8BFF', butter: '#FFD84D', white: '#FFFFFF', line: '#DAD8D3' };
const BEAT = k => 8 + 26.97 * k;
const SW = 1920, SH = 1080;

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
  o4: t => 1 - Math.pow(1 - t, 4),
  i2: t => t * t,
  i3: t => t * t * t,
  back: t => { const c = 1.9; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); },
};
const EX = (n, r = 0.16) => { const k = Math.pow(1 - r, n); return t => (1 - Math.pow(1 - r, clamp(t) * n)) / (1 - k); };
function kf(f, keys, ease = E.io) {
  if (f <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    const k = keys[i];
    if (f <= k[0]) { const p = keys[i - 1]; return lerp(p[1], k[1], (k[2] || ease)((f - p[0]) / (k[0] - p[0]))); }
  }
  return keys[keys.length - 1][1];
}
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
const vel = (fn, f) => (fn(f + 0.25) - fn(f - 0.25)) * 2;
const hash = i => { const s = Math.sin(i * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
// damped spring 0 → 1 (overshoots), t in frames since start
const spring = (t, w = 0.32, z = 0.42) => (t <= 0 ? 0 : 1 - Math.exp(-z * w * t) * Math.cos(w * Math.sqrt(1 - z * z) * t));

// ─────────────────────────────── DOM ───────────────────────────────
const NS = 'http://www.w3.org/2000/svg';
const FULL = { left: '0px', top: '0px', width: `${SW}px`, height: `${SH}px` };
const px = v => `${v}px`;
function div(parent, style = {}, html) {
  const e = document.createElement('div');
  Object.assign(e.style, { position: 'absolute' }, style);
  if (html != null) e.innerHTML = html;
  if (parent) parent.appendChild(e);
  return e;
}
const fxDefs = document.querySelector('#fx defs');
let fxN = 0;
function DB() {
  const id = `db${fxN++}`;
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
const CB = r => (r > 0.04 ? `blur(${r.toFixed(3)}px)` : '');
const setF = (e, ...parts) => { const s = parts.filter(Boolean).join(' '); e.style.filter = s || 'none'; };
const T = (e, s) => { e.style.transform = s; };
const uid = (() => { let n = 0; return p => `${p}${n++}`; })();

// ─────────────────────────────── shared art ───────────────────────────────
function markSVG(size, stroke = '#fff', bgStroke = C.tang) {
  const cp = uid('mk');
  return `<svg width="${size}" height="${size}" viewBox="0 0 100 100" style="display:block;overflow:visible">
    <defs><clipPath id="${cp}"><rect x="40" y="14" width="22" height="26"/></clipPath></defs>
    <g fill="none" stroke-linecap="round">
      <circle cx="37" cy="50" r="22" stroke="${stroke}" stroke-width="9.5"/>
      <circle cx="63" cy="50" r="22" stroke="${bgStroke}" stroke-width="17"/>
      <circle cx="63" cy="50" r="22" stroke="${stroke}" stroke-width="9.5"/>
      <g clip-path="url(#${cp})"><circle cx="37" cy="50" r="22" stroke="${bgStroke}" stroke-width="17"/><circle cx="37" cy="50" r="22" stroke="${stroke}" stroke-width="9.5"/></g>
    </g></svg>`;
}
const markTile = size => `<div style="width:${size}px;height:${size}px;border-radius:30%;background:linear-gradient(155deg,#FF9A55 0%,#FF7A2F 45%,#FF5E1F 100%);box-shadow:inset 0 2px 0 rgba(255,255,255,.35),0 ${size * 0.12}px ${size * 0.3}px rgba(255,94,31,.30);display:flex;align-items:center;justify-content:center">${markSVG(size * 0.72)}</div>`;

const HAND = (() => {
  const id = uid('hand');
  return `<svg width="44" height="52" viewBox="0 0 44 52" style="display:block;overflow:visible;filter:drop-shadow(0 3px 4px rgba(0,0,0,.25))">
  <defs><g id="${id}">
    <rect x="14.5" y="2" width="9.5" height="31" rx="4.75"/>
    <rect x="22.5" y="16" width="8.5" height="19" rx="4.25"/>
    <rect x="29.5" y="19" width="8.5" height="18" rx="4.25"/>
    <rect x="9.5" y="23" width="29" height="23" rx="10"/>
    <rect x="2.5" y="25" width="10" height="19" rx="5" transform="rotate(-38 7.5 34.5)"/>
    <rect x="12.5" y="37" width="24" height="13" rx="5.5"/></g></defs>
  <use href="#${id}" fill="#000" stroke="#000" stroke-width="4.4" stroke-linejoin="round"/>
  <use href="#${id}" fill="#fff"/>
  <path d="M23.2 25.5V33.5M30.2 27.5V35.5" stroke="#000" stroke-width="1.5" stroke-linecap="round"/></svg>`;
})();
function Hand(parent) {
  const c = div(parent, { left: '0px', top: '0px', width: '44px', height: '52px', transformOrigin: '19px 3px' }, HAND);
  return (x, y, sc = 1, op = 1, bl = 0) => {
    T(c, `translate(${(x - 19).toFixed(2)}px,${(y - 3).toFixed(2)}px) scale(${sc.toFixed(4)})`);
    c.style.opacity = op; setF(c, CB(bl));
  };
}

// receipt ticket (zig-zag bottom)
function ticketPath(w, h) {
  const teeth = 8, tw = w / teeth, td = tw * 0.42;
  let d = `M0 12Q0 0 12 0H${w - 12}Q${w} 0 ${w} 12V${h - td}`;
  for (let i = teeth; i > 0; i--) d += `L${(i - 0.5) * tw} ${h}L${(i - 1) * tw} ${h - td}`;
  return d + 'Z';
}
function ticketSVG(w, face = true) {
  const h = Math.round(w * 1.32), p = ticketPath(w, h);
  if (!face) return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" style="display:block"><path d="${p}" fill="#FFF3EA" stroke="#F3DCCB" stroke-width="1.2"/><rect x="${0.12 * w}" y="${0.12 * h}" width="${0.76 * w}" height="${0.12 * h}" rx="${0.03 * w}" fill="${C.tang}" fill-opacity=".9"/><circle cx="${0.5 * w}" cy="${0.55 * h}" r="${0.16 * w}" fill="none" stroke="${C.tang}" stroke-opacity=".55" stroke-width="${0.035 * w}"/></svg>`;
  const r = (x, y, ww, hh, fill, o = 1) => `<rect x="${(x * w).toFixed(1)}" y="${(y * h).toFixed(1)}" width="${(ww * w).toFixed(1)}" height="${(hh * h).toFixed(1)}" rx="${(hh * h / 2).toFixed(1)}" fill="${fill}" fill-opacity="${o}"/>`;
  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" style="display:block;overflow:visible">
    <path d="${p}" fill="#fff" stroke="#E6E6E3" stroke-width="1.2"/>
    <circle cx="${0.19 * w}" cy="${0.14 * h}" r="${0.055 * w}" fill="${C.tang}"/>
    ${r(0.3, 0.12, 0.36, 0.045, '#2B2D33', 0.85)}
    ${r(0.12, 0.26, 0.74, 0.034, C.line)}${r(0.12, 0.34, 0.52, 0.034, C.line)}${r(0.12, 0.42, 0.62, 0.034, C.line)}
    <path d="M${0.12 * w} ${0.53 * h}H${0.88 * w}" stroke="#D5D2CC" stroke-width="${Math.max(1.2, w * 0.012)}" stroke-dasharray="${w * 0.03} ${w * 0.025}"/>
    ${r(0.12, 0.63, 0.24, 0.045, C.line)}${r(0.5, 0.605, 0.38, 0.085, C.tang)}</svg>`;
}
// 3D ticket: wrapper (2D blur) > perspective box > preserve-3d body with 3 slices
function Ticket(parent, w) {
  const h = Math.round(w * 1.32);
  const wrap = div(parent, { left: '0px', top: '0px', width: px(w), height: px(h), transformOrigin: '50% 50%' });
  const persp = div(wrap, { left: '0px', top: '0px', width: px(w), height: px(h), perspective: '1400px' });
  const body = div(persp, { left: '0px', top: '0px', width: px(w), height: px(h), transformStyle: 'preserve-3d' });
  const th = Math.max(3, w * 0.035);
  div(body, { left: '0px', top: '0px', transform: `translateZ(${-th}px) rotateY(180deg)` }, ticketSVG(w, false));
  div(body, { left: '0px', top: '0px', transform: `translateZ(${-th / 2}px)` }, `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" style="display:block"><path d="${ticketPath(w, h)}" fill="#EDE6DC"/></svg>`);
  div(body, { left: '0px', top: '0px' }, ticketSVG(w, true));
  const b = DB();
  return (x, y, s, rx, ry, rz, blur = 0, mx = 0, my = 0, op = 1) => {
    T(wrap, `translate(${(x - w / 2).toFixed(2)}px,${(y - h / 2).toFixed(2)}px) scale(${s.toFixed(4)})`);
    T(body, `rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg) rotateZ(${rz.toFixed(2)}deg)`);
    wrap.style.opacity = op;
    setF(wrap, b(mx / s, my / s), CB(blur / s));
  };
}

// Halftone dot field (hex grid, 14 px pitch), drawn as expanding annuli.
function Dots(parent) {
  const c = document.createElement('canvas'); c.width = SW; c.height = SH;
  Object.assign(c.style, { position: 'absolute', left: '0px', top: '0px' }); parent.appendChild(c);
  const ctx = c.getContext('2d'), pts = [], P = 14;
  for (let row = 0, y = 0; y < SH + P; row++, y += P * 0.866) for (let x = (row % 2) * P / 2; x < SW + P; x += P) pts.push([x, y]);
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
// dot annulus that grows from r0 to r1 over [f0,f1]
const ring = (f, f0, f1, r0, r1, col, a = 0.2, cx = 960, cy = 470, w = 260) =>
  (f < f0 || f > f1 + 2 ? null : { cx, cy, r: lerp(r0, r1, E.o2(inv(f0, f1, f))), w, col, a: a * (1 - E.i2(inv(f0 + (f1 - f0) * 0.6, f1 + 2, f))) });

function Page(parent) { return div(parent, { ...FULL, background: C.page }); }
function Floor(parent) {
  const g = div(parent, { left: '-120px', top: '600px', width: '2160px', height: '520px', transformOrigin: '50% 100%', background: 'linear-gradient(180deg, rgba(255,178,122,0) 0%, rgba(255,178,122,.40) 36%, rgba(255,140,70,.80) 72%, #FF7A2F 100%)' });
  const r1 = div(parent, { left: '-200px', top: '780px', width: '1200px', height: '520px', borderRadius: '50%', background: 'radial-gradient(closest-side, rgba(255,122,47,.55), rgba(255,122,47,0))', transformOrigin: '50% 100%' });
  const r2 = div(parent, { left: '1000px', top: '800px', width: '1200px', height: '500px', borderRadius: '50%', background: 'radial-gradient(closest-side, rgba(255,110,40,.5), rgba(255,110,40,0))', transformOrigin: '50% 100%' });
  return (f, breath = 0) => {
    const w = 0.012 * Math.sin(f / 40);
    T(g, `scaleY(${(1 + breath).toFixed(4)})`);
    T(r1, `translateX(${(40 * Math.sin(f / 70)).toFixed(2)}px) scaleY(${(1 + breath + w).toFixed(4)})`);
    T(r2, `translateX(${(-40 * Math.sin(f / 80)).toFixed(2)}px) scaleY(${(1 + breath - w).toFixed(4)})`);
  };
}
// Kinetic words: one line of inline-block spans; show(i, startFrame, f)
function Words(parent, text, style, cx, cy, align = 'center') {
  const line = div(parent, { left: '0px', top: '0px', whiteSpace: 'pre', display: 'flex', alignItems: 'baseline', ...style });
  const spans = text.split(' ').map((w, i, a) => {
    const s = document.createElement('span');
    s.textContent = w; s.style.display = 'inline-block'; s.style.willChange = 'transform';
    if (i < a.length - 1) s.style.marginRight = '0.26em';
    line.appendChild(s); return s;
  });
  const r = line.getBoundingClientRect();
  const x = align === 'center' ? cx - r.width / 2 : align === 'right' ? cx - r.width : cx;
  line.style.left = px(x); line.style.top = px(cy - r.height / 2);
  const show = (i, s0, f, dur = 9) => {
    const p = E.o3(inv(s0, s0 + dur, f)), sp = spans[i];
    sp.style.opacity = p.toFixed(3);
    T(sp, `translateY(${(22 * (1 - p)).toFixed(2)}px)`);
    setF(sp, CB(14 * (1 - p)));
  };
  return { line, spans, show, width: r.width, left: x };
}
// phone body with a blurred home screen
function Phone(parent, w, h, screen = 'home') {
  const ph = div(parent, { left: '0px', top: '0px', width: px(w), height: px(h), borderRadius: px(w * 0.143), background: 'linear-gradient(160deg,#2C2E35,#17181C 40%,#0E0F12)', boxShadow: '0 40px 90px rgba(23,24,28,.28), inset 0 0 0 2px rgba(255,255,255,.08)' });
  const bez = w * 0.034;
  const scr = div(ph, { left: px(bez), top: px(bez), width: px(w - bez * 2), height: px(h - bez * 2), borderRadius: px(w * 0.143 - bez), overflow: 'hidden', background: 'linear-gradient(180deg,#F7F5F1,#EEEAE3)' });
  if (screen === 'home') {
    const grid = div(scr, { left: '0px', top: '0px', width: '100%', height: '100%' });
    const cols = ['#EDE8E0', '#F4D9C4', '#DCE6F6', '#F5E8B8', '#FFB27A', '#E4E0D8', '#D6E8F0', '#F2DCCF'];
    const sz = (w - bez * 2) * 0.17, gap = ((w - bez * 2) - sz * 4) / 5;
    for (let r = 0; r < 6; r++) for (let c = 0; c < 4; c++) {
      const k = r * 4 + c;
      div(grid, { left: px(gap + c * (sz + gap)), top: px(w * 0.2 + r * (sz + gap * 1.3)), width: px(sz), height: px(sz), borderRadius: px(sz * 0.26), background: k === 5 ? 'linear-gradient(155deg,#FF9A55,#FF5E1F)' : cols[(k * 5 + r) % cols.length] });
    }
    setF(grid, 'blur(7px)');
    div(scr, { left: px(w * 0.09), top: px(w * 0.05), fontSize: px(w * 0.045), fontWeight: 600, color: C.ink, opacity: 0.55 }, '9:41');
  }
  div(ph, { left: px(w / 2 - w * 0.14), top: px(bez + w * 0.03), width: px(w * 0.28), height: px(w * 0.075), borderRadius: px(w * 0.04), background: '#07080A' });
  return { el: ph, screen: scr };
}
function Avatar(parent, fr, size = 150) {
  const a = div(parent, { left: '0px', top: '0px', width: px(size), height: px(size), transformOrigin: '50% 50%' });
  div(a, { left: '0px', top: '0px', width: px(size), height: px(size), borderRadius: '50%', background: fr.bg, boxShadow: `inset 0 3px 0 rgba(255,255,255,.35), 0 ${size * 0.12}px ${size * 0.28}px rgba(23,24,28,.16)`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: fr.ink, fontSize: px(size * 0.42), fontWeight: 700, letterSpacing: '-0.02em' }, fr.i);
  return a;
}
const place = (e, x, y, s = 1, extra = '') => { const w = parseFloat(e.style.width), h = parseFloat(e.style.height); T(e, `translate(${(x - w / 2).toFixed(2)}px,${(y - h / 2).toFixed(2)}px) scale(${s.toFixed(4)}) ${extra}`); };

// ─────────────────────────────── shots ───────────────────────────────
const stage = document.getElementById('stage');
const shots = [];
function shot(f0, f1, build) {
  const root = div(stage, {}); root.className = 'shot'; root.style.display = 'block';
  shots.push({ f0, f1, root, render: build(root, f0) });
}
function seek(f) {
  for (const s of shots) {
    const on = f >= s.f0 && f < s.f1 + 1;
    s.root.style.display = on ? 'block' : 'none';
    if (on) s.render(f - s.f0);
  }
}

// giant ticket that whips across the lens between shot A and the headline
const whipX = f => lerp(2900, -1000, E.lin(inv(280, 305, f)));
function WhipTicket(parent) {
  const t = Ticket(parent, 300);
  return f => {
    if (f < 279 || f > 306) { t(-9999, 0, 1, 0, 0, 0, 0, 0, 0, 0); return; }
    const x = whipX(f), v = Math.abs(vel(whipX, f));
    t(x, 560, 7.5, 12, -18, -8 + (f - 280) * 0.6, 14, Math.min(40, v * 0.22), 2, 1);
  };
}

function build() {
  // ════════ A f0–296 · mark → pill → tap → ticket flock ════════
  shot(0, 296, (root, F0) => {
    Page(root); const floor = Floor(root);
    const dots = Dots(root);
    const cam = div(root, { ...FULL, transformOrigin: '960px 470px' }); const camB = DB();
    const back = div(cam, { ...FULL });
    // mark → capsule
    const cap = div(cam, { left: '0px', top: '0px', width: '168px', height: '168px' });
    const halfL = div(cap, { left: '0px', top: '0px', height: '100%', overflow: 'hidden', background: 'linear-gradient(155deg,#FF9A55 0%,#FF7A2F 45%,#FF5E1F 100%)', boxShadow: 'inset 0 2px 0 rgba(255,255,255,.35)' });
    const halfR = div(cap, { left: '0px', top: '0px', height: '100%', overflow: 'hidden', background: 'linear-gradient(155deg,#FF9A55 0%,#FF7A2F 45%,#FF5E1F 100%)', boxShadow: 'inset 0 2px 0 rgba(255,255,255,.35)' });
    const inkR = div(halfR, { left: '0px', top: '0px', width: '100%', height: '100%', background: 'linear-gradient(155deg,#34363E,#17181C 60%)', opacity: 0 });
    const shadow = div(cam, { left: '0px', top: '0px', width: '300px', height: '60px', borderRadius: '50%', background: 'radial-gradient(closest-side, rgba(255,94,31,.35), rgba(255,94,31,0))' });
    const mk = div(cam, { left: '0px', top: '0px', width: '121px', height: '121px' }, markSVG(121));
    const mkRings = mk.querySelectorAll('circle');
    const lblStyle = { fontSize: '34px', fontWeight: 600, color: '#fff', letterSpacing: '-0.02em', whiteSpace: 'nowrap' };
    const lY = div(cam, lblStyle, CFG.pill[0]), lF = div(cam, lblStyle, CFG.pill[1]);
    const wY = lY.getBoundingClientRect().width, wF = lF.getBoundingClientRect().width;
    const front = div(cam, { ...FULL });
    const handL = div(cam, { ...FULL }); const hand = Hand(handL);
    const whip = WhipTicket(root);
    const whipB = DB();

    // ticket flock
    const flock = [];
    const nearSet = new Set([3, 8, 13, 18]);
    const nearSet2 = new Set([6, 19]);
    for (let i = 0; i < 26; i++) {
      const near = nearSet2.has(i), w = Math.round(170 + 90 * hash(i + 1));
      flock.push({
        near, s: 176 + 2.6 * i, dur: near ? 40 + 8 * hash(i + 7) : 54 + 18 * hash(i + 2),
        sc: near ? 1.9 + 0.4 * hash(i + 3) : 0.55 + 0.75 * hash(i + 4),
        off: near ? (i === 6 ? -560 : 470) : (hash(i + 5) - 0.5) * 320,
        rx0: (hash(i + 9) - 0.5) * 70, rxa: 25 + 25 * hash(i + 10), ry0: 360 * hash(i + 11), ryv: (hash(i + 12) < 0.5 ? -1 : 1) * (240 + 260 * hash(i + 13)), rz0: -40 + 80 * hash(i + 14), rzv: 60 + 120 * hash(i + 15),
        draw: Ticket(near ? front : back, w),
      });
    }
    // quadratic Bezier stream: lower-left, over the pill, down to the right
    const B0 = [-360, 820], B1 = [880, -260], B2 = [2300, 760];
    const bez = (u, k) => (1 - u) * (1 - u) * B0[k] + 2 * (1 - u) * u * B1[k] + u * u * B2[k];
    flock.forEach(t => {
      const pos = (f, k) => { const u = inv(t.s, t.s + t.dur, f) * 0.999 + 0.0005; const dx = bez(u + 0.001, 0) - bez(u, 0), dy = bez(u + 0.001, 1) - bez(u, 1), n = Math.hypot(dx, dy); return bez(u, k) + t.off * (k === 0 ? -dy / n : dx / n); };
      t.x = f => pos(f, 0); t.y = f => pos(f, 1);
    });

    const hx = L([[135, 1560], [140, 1390], [146, 1270], [152, 1190], [158, 1140], [164, 1118], [168, 1108], [176, 1106], [200, 1140], [230, 1190]]);
    const hy = L([[135, 960], [140, 780], [146, 650], [152, 568], [158, 522], [164, 500], [168, 492], [176, 491], [200, 512], [230, 570]]);

    return lf => {
      const f = lf + F0;
      floor(f);
      // dot annuli: ink bloom from the mark, sky bloom from the tap
      dots([ring(f, 24, 110, 120, 1150, C.ink, 0.26), ring(f, 176, 250, 60, 1200, C.sky, 0.36)]);
      // camera: slow push, tiny recoil on the tap
      const push = 1.28 + 0.0003 * f + 0.016 * Math.sin(Math.PI * inv(176, 200, f)) * (f > 176 ? 1 : 0);
      T(cam, `scale(${push.toFixed(5)})`);
      // mark / capsule geometry
      const breath = f < 96 ? 1 + 0.02 * Math.sin((2 * Math.PI * f) / 54) : 1;
      const W = f < 96 ? 168 : L([[96, 168], [104, 205], [112, 290], [118, 352], [124, 378], [129, 356], [134, 360], [296, 360]])(f);
      const Hh = f < 96 ? 168 : L([[96, 168], [104, 150], [112, 118], [118, 102], [124, 98], [129, 106], [134, 104], [296, 104]])(f);
      const rad = f < 96 ? 50 : lerp(50, 52, E.o3(inv(96, 120, f)));
      const w = W * breath, h = Hh * breath, rr = f < 96 ? w * 0.3 : Math.min(h / 2, lerp(w * 0.3, h / 2, E.o3(inv(96, 118, f))));
      const sep = 90 * spring(f - 176, 0.34, 0.45);
      const inner = lerp(0, h / 2, E.o3(inv(176, 190, f)));
      const x0 = 960 - w / 2, y0 = 470 - h / 2;
      Object.assign(cap.style, { width: px(w), height: px(h) }); T(cap, `translate(${x0.toFixed(2)}px,${y0.toFixed(2)}px)`);
      Object.assign(halfL.style, { width: px(w / 2 + 0.5), height: px(h), borderRadius: `${rr}px ${inner}px ${inner}px ${rr}px` });
      Object.assign(halfR.style, { width: px(w / 2), height: px(h), borderRadius: `${inner}px ${rr}px ${rr}px ${inner}px` });
      T(halfL, `translateX(${-sep}px)`); T(halfR, `translateX(${w / 2 + sep}px)`);
      inkR.style.opacity = E.io(inv(104, 124, f));
      halfR.style.boxShadow = f < 104 ? 'inset 0 2px 0 rgba(255,255,255,.35)' : 'inset 0 2px 0 rgba(255,255,255,.12)';
      place(shadow, 960, 470 + h / 2 + 22, w / 300 * 1.2); shadow.style.opacity = 0.9;
      // interlocking rings slide apart and dissolve into the labels
      const ms = f < 96 ? breath : lerp(1, 0.55, E.io(inv(96, 116, f)));
      place(mk, 960, 470, ms);
      const split = E.io(inv(98, 118, f)) * 60;
      mkRings[0].setAttribute('cx', 37 - split); mkRings[1].setAttribute('cx', 63 + split); mkRings[2].setAttribute('cx', 63 + split);
      mkRings[3].setAttribute('cx', 37 - split); mkRings[4].setAttribute('cx', 37 - split);
      mk.style.opacity = 1 - E.i2(inv(104, 116, f));
      mkRings[1].setAttribute('stroke', f < 104 ? C.tang : 'none'); mkRings[3].setAttribute('stroke', f < 104 ? C.tang : 'none');
      const lp = E.o3(inv(112, 124, f));
      for (const [el, ww, cx] of [[lY, wY, 960 - w / 4 - sep], [lF, wF, 960 + w / 4 + sep]]) {
        el.style.opacity = lp; T(el, `translate(${(cx - ww / 2).toFixed(2)}px,${(470 - 21 + 14 * (1 - lp)).toFixed(2)}px)`); setF(el, CB(12 * (1 - lp)));
      }
      // hand cursor
      const toCam = (v, c) => c + (v - c) / 1.28;
      if (f < 134.5) hand(-99, -99, 1, 0);
      else hand(toCam(hx(f), 960), toCam(hy(f), 470), kf(f, [[169, 1], [172, 0.86, E.o2], [178, 1, E.io]]) / push, 1, Math.min(3, Math.hypot(vel(hx, f), vel(hy, f)) * 0.05));
      // ticket flock
      for (const t of flock) {
        if (f < t.s - 1 || f > t.s + t.dur + 1) { t.draw(-9999, 0, 1, 0, 0, 0, 0, 0, 0, 0); continue; }
        const u = inv(t.s, t.s + t.dur, f), x = t.x(f), y = t.y(f), vx = vel(t.x, f), vy = vel(t.y, f);
        const dof = t.near ? 10 + 4 * hash(t.s) : Math.max(0, (0.6 - t.sc) * 6);
        t.draw(x, y, t.sc, t.rx0 + t.rxa * Math.sin(u * 5), t.ry0 + t.ryv * u, t.rz0 + t.rzv * u, dof, Math.min(36, Math.abs(vx) * 0.12), Math.min(36, Math.abs(vy) * 0.12), 1);
      }
      whip(f);
      setF(cam, camB(kf(f, [[286, 0], [296, 26, E.i2]]), 0));
    };
  });

  // ════════ B f297–459 · headline ════════
  shot(297, 459, (root, F0) => {
    Page(root); const floor = Floor(root);
    const all = div(root, { ...FULL, transformOrigin: '960px 500px' }); const allB = DB();
    const back = div(all, { ...FULL });
    const txt = div(all, { ...FULL });
    const front = div(all, { ...FULL });
    const l1 = Words(txt, CFG.headline[0], { fontSize: '128px', fontWeight: 700, color: C.ink, letterSpacing: '-0.035em' }, 960, 470);
    const l2 = Words(txt, CFG.headline[1], { fontSize: '52px', fontWeight: 600, color: C.grey, letterSpacing: '-0.02em' }, 960, 572);
    const drift = [];
    for (let i = 0; i < 10; i++) {
      const near = i === 2 || i === 7;
      drift.push({ near, x0: near ? (i === 2 ? 60 : 1640) : 120 + 1700 * hash(i + 40), y0: near ? (i === 2 ? 620 : -120) : -80 + 900 * hash(i + 41), v: 1.2 + 1.8 * hash(i + 42), sc: near ? 2.4 + 0.6 * hash(i + 43) : 0.35 + 0.55 * hash(i + 44), r: [360 * hash(i + 45), 360 * hash(i + 46), 360 * hash(i + 47)], draw: Ticket(near ? front : back, Math.round(150 + 90 * hash(i + 48))) });
    }
    const whip = WhipTicket(root);
    const b1 = [BEAT(11), BEAT(12), BEAT(13)], b2 = [BEAT(13.5), BEAT(14), BEAT(14.5), BEAT(15)];
    return lf => {
      const f = lf + F0;
      floor(f);
      l1.spans.forEach((_, i) => l1.show(i, b1[i] - 4, f));
      l2.spans.forEach((_, i) => l2.show(i, b2[i] - 4, f));
      for (const [i, t] of drift.entries()) {
        const k = f - 297, x = t.x0 + t.v * k * (t.near ? 0.5 : 1), y = t.y0 + t.v * (t.near ? 1.4 : 0.55) * k;
        t.draw(x, y, t.sc, t.r[0] + k * 0.8, t.r[1] + k * (0.5 + hash(i)), t.r[2] + k * 0.2, t.near ? 11 : Math.max(0, (0.55 - t.sc) * 6), 0, 0, 1);
      }
      whip(f);
      const out = E.i2(inv(430, 459, f));
      T(all, `scale(${(1 + 0.0002 * (f - 297) + 0.06 * out).toFixed(5)})`);
      setF(all, allB(kf(f, [[297, 30], [306, 0, E.o3]]), 0), CB(22 * out));
    };
  });

  // ════════ C f460–689 · receipt prints, total splits, pull back into a phone ════════
  shot(460, 689, (root, F0) => {
    Page(root); const floor = Floor(root);
    const dots = Dots(root);
    const scene = div(root, { ...FULL }); const sceneB = DB();
    const cam = div(scene, { ...FULL, transformOrigin: '960px 430px' });
    const phone = Phone(cam, 660, 1400, 'blank');
    const cardW = div(cam, { left: '700px', top: '250px', width: '520px', height: '560px', filter: 'drop-shadow(0 30px 40px rgba(23,24,28,.12)) drop-shadow(0 4px 8px rgba(23,24,28,.05))' });
    const card = div(cardW, { left: '0px', top: '0px', width: '520px', height: '100px', overflow: 'hidden', background: '#fff', borderRadius: '36px 36px 0 0' });
    const zig = div(cardW, { left: '0px', top: '100px', width: '520px', height: '18px' }, `<svg width="520" height="18" viewBox="0 0 520 18" style="display:block"><path d="M0 0H520${Array.from({ length: 13 }, (_, i) => `L${520 - (i + 0.5) * 40} 16L${520 - (i + 1) * 40} 0`).join('')}Z" fill="#fff"/></svg>`);
    const hdr = div(card, { left: '36px', top: '30px', display: 'flex', alignItems: 'center', gap: '14px', whiteSpace: 'nowrap' }, `${markTile(44)}<span style="font-size:30px;font-weight:600;color:${C.ink};letter-spacing:-0.02em">${CFG.receipt.title}</span>`);
    div(card, { left: '0px', top: '41px', width: '484px', textAlign: 'right', fontSize: '22px', fontWeight: 500, color: C.grey, whiteSpace: 'nowrap' }, CFG.receipt.meta);
    const rowsEl = CFG.receipt.rows.map(([k, v], i) => {
      const r = div(card, { left: '36px', top: px(118 + i * 66), width: '448px', height: '50px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '36px', fontWeight: 500, color: C.ink, letterSpacing: '-0.015em' }, `<span>${k}</span><span style="font-weight:600">$${v}</span>`);
      return { el: r, b: DB() };
    });
    const dash = div(card, { left: '36px', top: '330px', width: '0px', height: '3px', background: `repeating-linear-gradient(90deg, #D5D2CC 0 12px, rgba(0,0,0,0) 12px 22px)` });
    const totL = div(card, { left: '36px', top: '380px', fontSize: '34px', fontWeight: 600, color: C.grey }, 'Total');
    const tot = div(card, { left: '0px', top: '350px', width: '484px', height: '110px', textAlign: 'right', fontSize: '96px', fontWeight: 700, color: C.ink, letterSpacing: '-0.04em', lineHeight: '110px', transformOrigin: '90% 50%' }, `$${CFG.receipt.rows.reduce((a, r) => a + r[1], 0)}`);
    const each = div(card, { left: '0px', top: '448px', width: '484px', textAlign: 'right', fontSize: '24px', fontWeight: 600, color: C.tang }, '$18 each');
    // avatars (screen space)
    const avL = div(root, { ...FULL });
    const avs = CFG.friends.map(fr => {
      const a = Avatar(avL, fr, 150);
      const amt = div(avL, { left: '0px', top: '0px', width: '120px', height: '52px', borderRadius: '26px', background: '#fff', boxShadow: '0 8px 20px rgba(23,24,28,.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', fontWeight: 700, color: C.ink, letterSpacing: '-0.02em' }, '$0');
      return { a, amt, b: DB() };
    });
    const rowAt = [BEAT(17), BEAT(17.5), BEAT(18)];
    const slam = BEAT(20);
    const cardH = L([[460, 100], [rowAt[0], 100], [rowAt[0] + 6, 176], [rowAt[1], 176], [rowAt[1] + 6, 242], [rowAt[2], 242], [rowAt[2] + 6, 308], [BEAT(18.5), 308], [BEAT(18.5) + 8, 348], [slam - 3, 348], [slam + 5, 486], [689, 486]]);
    const targets = [540, 820, 1100, 1380];
    const orbit = [[540, 400], [560, 700], [1380, 400], [1360, 700]];
    return lf => {
      const f = lf + F0;
      floor(f);
      dots([ring(f, slam, slam + 60, 80, 1250, C.tang, 0.28, 1150, 716)]);
      const ent = E.o3(inv(460, 472, f));
      // card print
      const hC = cardH(f);
      card.style.height = px(hC); zig.style.top = px(hC);
      rowsEl.forEach((r, i) => {
        const p = E.o3(inv(rowAt[i] - 2, rowAt[i] + 6, f));
        r.el.style.opacity = p; T(r.el, `translateY(${(-14 * (1 - p)).toFixed(2)}px)`); setF(r.el, r.b(0, 3 * (1 - p)));
      });
      dash.style.width = px(448 * E.io(inv(BEAT(18.5), BEAT(19), f)));
      const tp = inv(slam - 2, slam + 8, f);
      tot.style.opacity = E.o3(inv(slam - 2, slam + 1, f)); totL.style.opacity = E.o3(inv(slam - 4, slam + 2, f));
      T(tot, `scale(${lerp(1.25, 1, E.o3(tp)).toFixed(4)})`); setF(tot, CB(8 * (1 - E.o3(tp))));
      each.style.opacity = E.o3(inv(600, 612, f));
      const shake = f > slam && f < slam + 12 ? 3 * Math.sin((f - slam) * 2.4) * (1 - (f - slam) / 12) : 0;
      // camera pull back + phone rises around the receipt
      const pb = E.io(inv(640, 684, f));
      T(cam, `translate(${shake.toFixed(2)}px,${(8 * (1 - ent)).toFixed(2)}px) scale(${(lerp(1.3, 0.8, pb) + 0.0006 * (f - 460) * (1 - pb) + 0.04 * (1 - ent)).toFixed(4)})`);
      const phY = L([[640, 1260], [652, 700], [662, 330], [672, 190], [684, 150], [689, 146]])(f);
      T(phone.el, `translate(630px,${phY.toFixed(2)}px)`);
      phone.el.style.opacity = f < 640 ? 0 : 1;
      // avatars burst out of the total, then orbit the phone
      avs.forEach((v, i) => {
        const s0 = 590 + 3 * i, sp = spring(f - s0, 0.3, 0.5);
        const bx = lerp(1150, targets[i], clamp(sp, 0, 1.2)), by = lerp(716, 925, clamp(sp, 0, 1.2)) - 110 * Math.sin(Math.PI * clamp(inv(s0, s0 + 14, f)));
        const o = E.io(inv(640 + 2 * i, 678 + 2 * i, f));
        const x = lerp(bx, orbit[i][0], o), y = lerp(by, orbit[i][1], o);
        const s = f < s0 ? 0 : lerp(0.2 + 0.8 * clamp(sp, 0, 1.1), 0.72, o);
        v.a.style.opacity = f < s0 ? 0 : 1; place(v.a, x, y, s);
        const vv = Math.hypot(vel(g => lerp(1150, targets[i], clamp(spring(g - s0, 0.3, 0.5), 0, 1.2)), f), 0);
        setF(v.a, CB(Math.min(8, vv * 0.06)));
        const n = Math.round(18 * E.o2(inv(s0 + 8, s0 + 26, f)));
        v.amt.textContent = `$${n}`;
        v.amt.style.opacity = E.o3(inv(s0 + 6, s0 + 12, f)) * (1 - o);
        place(v.amt, x, y + 104 * s, Math.max(0.01, s));
      });
      // exit: whip up
      const ex = E.i3(inv(674, 689, f));
      T(scene, `translateY(${(-320 * ex).toFixed(2)}px)`);
      T(avL, `translateY(${(-320 * ex).toFixed(2)}px)`);
      setF(scene, sceneB(0, 24 * ex), CB(kf(f, [[460, 16], [470, 0, E.o3]])));
      setF(avL, sceneB(0, 24 * ex));
    };
  });

  // ════════ D f690–869 · word roller ════════
  shot(690, 869, (root, F0) => {
    Page(root); const floor = Floor(root);
    const dots = Dots(root);
    const all = div(root, { ...FULL, transformOrigin: '960px 470px' }); const allB = DB();
    const fs = 96, lineH = 124;
    const meas = div(all, { left: '0px', top: '0px', fontSize: px(fs), fontWeight: 700, letterSpacing: '-0.035em', whiteSpace: 'nowrap', opacity: 0 });
    let maxW = 0; for (const w of CFG.roller) { meas.textContent = w; maxW = Math.max(maxW, meas.getBoundingClientRect().width); }
    const forW = Words(all, 'for', { fontSize: px(fs), fontWeight: 600, color: C.ink, letterSpacing: '-0.035em' }, 0, 470, 'left');
    const gap = 34, total = forW.width + gap + maxW, x0 = 960 - total / 2;
    forW.line.style.left = px(x0);
    const win = div(all, { left: px(x0 + forW.width + gap - 10), top: px(470 - lineH * 0.55), width: px(maxW + 40), height: px(lineH * 1.1), overflow: 'hidden', WebkitMaskImage: 'linear-gradient(180deg, transparent 0%, #000 14%, #000 86%, transparent 100%)' });
    const hl = div(win, { left: '0px', top: px(lineH * 0.55 - 52), width: '0px', height: '112px', borderRadius: '18px', background: C.butter, transform: 'rotate(-1.2deg)' });
    const rollB = DB();
    const col = div(win, { left: '10px', top: '0px', width: px(maxW + 20), height: px(lineH * 1.1) });
    const words = CFG.roller.map(w => div(col, { left: '0px', top: '0px', height: px(lineH), lineHeight: px(lineH), fontSize: px(fs), fontWeight: 700, color: C.tang, letterSpacing: '-0.035em', whiteSpace: 'nowrap' }, w));
    const P = L([[690, -0.6], [700, 0], [718, 0], [724, 1], [742, 1], [748, 2], [766, 2], [772, 3], [790, 3], [796, 3.6], [805, 4.6], [814, 5.6], [823, 6.6], [832, 7.6], [840, 8.6], [846, 9.04], [852, 8.99], [858, 9], [869, 9]]);
    return lf => {
      const f = lf + F0;
      floor(f);
      dots([ring(f, 846, 910, 80, 1200, C.sky, 0.3, 960 + 200, 470)]);
      forW.show(0, 692, f);
      const p = P(f), vp = Math.abs(vel(P, f)) * lineH;
      words.forEach((w, i) => {
        const d = i - p;
        w.style.display = Math.abs(d) > 1.6 ? 'none' : 'block';
        T(w, `translateY(${(lineH * 0.05 + d * lineH).toFixed(2)}px)`);
        w.style.color = i === 9 ? (f > 849 ? C.ink : C.tang) : C.tang;
      });
      setF(col, rollB(0, Math.min(18, vp * 0.2)), CB(kf(f, [[690, 6], [700, 0, E.o3]])));
      hl.style.width = px((maxW + 20) * E.o3(inv(846, 856, f)));
      const ex = E.i2(inv(856, 869, f));
      T(all, `translateY(${(120 * (1 - EX(12, 0.19)(inv(690, 702, f)))).toFixed(2)}px) scale(${(1 + 0.05 * ex).toFixed(4)})`);
      setF(all, allB(0, kf(f, [[690, 22], [698, 0, E.o3]])), CB(16 * ex));
    };
  });

  // ════════ E f870–1199 · everyone paid → 3D equals → end card ════════
  shot(870, 1199, (root, F0) => {
    Page(root);
    const dots = Dots(root);
    const main = div(root, { ...FULL, transformOrigin: '960px 470px' }); const mainB = DB();
    // avatars row
    const xs = [465, 795, 1125, 1455];
    const pays = [BEAT(32.5), BEAT(33), BEAT(33.5), BEAT(34)];
    const av = CFG.friends.map((fr, i) => {
      const g = div(main, { left: '0px', top: '0px', width: '260px', height: '260px' });
      const ringSvg = div(g, { left: '0px', top: '0px' }, `<svg width="260" height="260" viewBox="0 0 260 260" style="display:block"><circle cx="130" cy="130" r="114" fill="none" stroke="#EFECE6" stroke-width="9"/><circle class="rf" cx="130" cy="130" r="114" fill="none" stroke="${C.tang}" stroke-width="9" stroke-linecap="round" stroke-dasharray="716.3" stroke-dashoffset="716.3" transform="rotate(-90 130 130)"/></svg>`);
      const a = Avatar(g, fr, 190); T(a, 'translate(35px,35px)');
      const chk = div(g, { left: '176px', top: '176px', width: '62px', height: '62px', borderRadius: '50%', background: C.sky, boxShadow: '0 0 0 5px #FBFBF9, 0 8px 16px rgba(61,139,255,.35)', transformOrigin: '50% 50%' }, `<svg width="62" height="62" viewBox="0 0 54 54"><path d="M16 28L24 35.5L39 19.5" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/></svg>`);
      return { g, rf: ringSvg.querySelector('.rf'), chk, b: DB() };
    });
    const sq = Words(main, CFG.square, { fontSize: '68px', fontWeight: 600, color: C.ink, letterSpacing: '-0.03em' }, 960, 720);
    // 3D rings flying through the camera
    const ringsL = div(main, { ...FULL });
    const tori = [0, 1, 2].map(k => {
      const D = [620, 980, 1340][k], B = D * 0.1;
      const wrap = div(ringsL, { ...FULL });
      const pv = div(wrap, { ...FULL, perspective: '1400px', perspectiveOrigin: '960px 470px' });
      const body = div(pv, { left: px(960 - D / 2), top: px(470 - D / 2), width: px(D), height: px(D), transformStyle: 'preserve-3d' });
      for (let s = 0; s < 10; s++) {
        const t = s / 9;
        div(body, { left: '0px', top: '0px', width: px(D), height: px(D), borderRadius: '50%', border: `${B}px solid ${t === 1 ? '#FF8A45' : lerp(0, 1, t) > 0.5 ? '#E8621E' : '#C9501A'}`, transform: `translateZ(${(t * D * 0.09).toFixed(1)}px)`, boxSizing: 'border-box' });
      }
      return { wrap, body, s0: 940 + k * 5, blur: DB() };
    });
    // 3D equals sign: two cuboids
    const eqL = div(main, { ...FULL }); const eqB = DB();
    const eqPv = div(eqL, { ...FULL, perspective: '1400px', perspectiveOrigin: '960px 470px' });
    const eq = div(eqPv, { left: '850px', top: '392px', width: '220px', height: '156px', transformStyle: 'preserve-3d' });
    const faces = [];
    const cuboid = (y) => {
      const w = 220, h = 56, d = 60;
      const box = div(eq, { left: '0px', top: px(y), width: px(w), height: px(h), transformStyle: 'preserve-3d' });
      const face = (fw, fh, tf, bg, isFront) => {
        const e = div(box, { left: px((w - fw) / 2), top: px((h - fh) / 2), width: px(fw), height: px(fh), transform: tf, background: bg, borderRadius: isFront ? '16px' : '4px', boxSizing: 'border-box', border: isFront ? '6px solid #FF7A2F' : 'none' });
        faces.push({ e, isFront, bg });
      };
      face(w, h, `translateZ(${d / 2}px)`, 'linear-gradient(180deg,#FF9A55,#FF7A2F)', true);
      face(w, h, `rotateY(180deg) translateZ(${d / 2}px)`, '#E8621E', false);
      face(w, d, `rotateX(90deg) translateZ(${h / 2}px)`, '#FFA468', false);
      face(w, d, `rotateX(-90deg) translateZ(${h / 2}px)`, '#C9501A', false);
      face(d, h, `rotateY(-90deg) translateZ(${w / 2}px)`, '#D9581C', false);
      face(d, h, `rotateY(90deg) translateZ(${w / 2}px)`, '#D9581C', false);
    };
    cuboid(0); cuboid(100);
    const alw = Words(main, CFG.even[0], { fontSize: '84px', fontWeight: 600, color: C.ink, letterSpacing: '-0.03em' }, 960 - 110 - 52, 470, 'right');
    const evn = Words(main, CFG.even[1], { fontSize: '84px', fontWeight: 600, color: C.ink, letterSpacing: '-0.03em' }, 960 + 110 + 52, 470, 'left');
    const alwB = DB(), evnB = DB();
    // end card
    const endL = div(root, { ...FULL });
    const phoneWrap = div(endL, { ...FULL });
    const phone = Phone(phoneWrap, 560, 1160, 'home');
    const floorTop = div(root, { ...FULL });
    const floor = Floor(floorTop);
    const txtL = div(root, { ...FULL });
    const endW = Words(txtL, CFG.end.join(' '), { fontSize: '88px', fontWeight: 600, color: C.ink, letterSpacing: '-0.035em' }, 960, 300);
    const banner = div(txtL, { left: '650px', top: '672px', width: '620px', height: '150px', borderRadius: '34px', background: 'linear-gradient(160deg,#26282F,#17181C 60%)', boxShadow: '0 30px 60px rgba(23,24,28,.35), inset 0 1px 0 rgba(255,255,255,.08)', display: 'flex', alignItems: 'center', padding: '0 26px', gap: '22px', transformOrigin: '50% 50%' },
      `${markTile(98)}<div style="flex:1;white-space:nowrap"><div style="font-size:34px;font-weight:600;color:#fff;letter-spacing:-0.02em">${CFG.banner[0]}</div><div style="font-size:24px;font-weight:500;color:#9A9DA5;margin-top:4px">${CFG.banner[1]}</div></div><div style="width:112px;height:56px;border-radius:28px;background:${C.sky};color:#fff;font-size:26px;font-weight:600;display:flex;align-items:center;justify-content:center">Get</div>`);
    const eqX = L([[955, 1760], [960, 1420], [966, 1180], [972, 1060], [980, 990], [990, 962], [1000, 960], [1199, 960]]);
    const eqZ = L([[955, -900], [962, -380], [970, -120], [980, -20], [990, 0], [1199, 0]]);
    const eqR = f => (1 - EX(35, 0.12)(inv(955, 990, f)));
    const phY = L([[1020, 1180], [1026, 1000], [1034, 830], [1044, 700], [1056, 632], [1070, 600], [1199, 600]]);
    return lf => {
      const f = lf + F0;
      const breath = f > 1110 ? 0.03 * Math.sin((2 * Math.PI * (f - 1110)) / 80) : 0;
      floor(f, breath);
      dots([ring(f, 986, 1060, 100, 1250, C.ink, 0.2), ring(f, 1090, 1160, 120, 1300, C.tang, 0.22, 960, 747)]);
      setF(main, CB(kf(f, [[870, 16], [880, 0, E.o3]])));
      // avatars: pop in, ring fill, check pop + shake, then blown out by the rings
      const blow = E.i2(inv(944, 962, f));
      av.forEach((v, i) => {
        const pin = spring(f - (870 + 2 * i), 0.36, 0.5);
        const pf = inv(pays[i], pays[i] + 10, f);
        v.rf.setAttribute('stroke-dashoffset', (716.3 * (1 - E.io(pf))).toFixed(2));
        const cp = f < pays[i] + 10 ? 0 : spring(f - pays[i] - 10, 0.5, 0.45);
        T(v.chk, `scale(${cp.toFixed(4)})`);
        const sh = f > pays[i] + 10 && f < pays[i] + 24 ? 4 * Math.sin((f - pays[i] - 10) * 1.9) * (1 - (f - pays[i] - 10) / 14) : 0;
        const dx = (xs[i] - 960) * 0.9 * blow;
        place(v.g, xs[i] + sh + dx, 470, (0.6 + 0.4 * clamp(pin, 0, 1.15)) * (1 + 0.8 * blow));
        v.g.style.opacity = clamp(pin * 3) * (1 - blow);
        setF(v.g, CB(Math.min(4, 12 * Math.max(0, 1 - pin)) + 22 * blow));
      });
      sq.spans.forEach((_, i) => sq.show(i, BEAT(34.5) - 4 + 7 * i, f));
      sq.line.style.opacity = 1 - blow; setF(sq.line, CB(20 * blow)); T(sq.line, `scale(${1 + 0.4 * blow})`);
      // tori fly through the camera
      tori.forEach((t, k) => {
        const u = inv(t.s0, t.s0 + 28, f);
        if (u <= 0 || u >= 1) { t.wrap.style.display = 'none'; return; }
        t.wrap.style.display = 'block';
        const z = lerp(-4200, 1320, E.i2(u)), s = 1400 / (1400 - z);
        T(t.body, `translateZ(${z.toFixed(1)}px) rotateX(${(12 + 8 * k).toFixed(1)}deg) rotateY(${(-26 + 18 * k).toFixed(1)}deg)`);
        setF(t.wrap, CB(clamp((s - 1.1) * 5, 0, 24)));
        t.wrap.style.opacity = clamp(u * 6);
      });
      // 3D equals tumbles in and settles
      const show = f >= 955;
      eqL.style.display = show ? 'block' : 'none';
      if (show) {
        const r = eqR(f), x = eqX(f), z = eqZ(f), v = Math.abs(vel(eqX, f));
        const drop = E.i3(inv(1020, 1040, f));
        T(eq, `translate3d(${(x - 960).toFixed(2)}px,${(260 * drop).toFixed(2)}px,${z.toFixed(1)}px) rotateY(${(540 * r).toFixed(2)}deg) rotateX(${(-360 * r * 0.6).toFixed(2)}deg) rotateZ(${(-40 * r).toFixed(2)}deg)`);
        const flat = E.io(inv(996, 1010, f));
        for (const fc of faces) {
          if (fc.isFront) fc.e.style.background = flat > 0 ? `linear-gradient(180deg,rgba(255,154,85,${1 - flat}),rgba(255,122,47,${1 - flat}))` : fc.bg;
          else fc.e.style.opacity = 1 - flat;
        }
        setF(eqL, eqB(Math.min(24, v * 0.08), 14 * drop), CB(12 * drop));
        eqL.style.opacity = 1 - E.i2(inv(1030, 1040, f));
      }
      alw.show(0, BEAT(36) - 4, f); evn.show(0, BEAT(36.5) - 4, f);
      const so = E.i2(inv(1020, 1040, f));
      T(alw.line, `translateX(${(-340 * so).toFixed(2)}px)`); T(evn.line, `translateX(${(340 * so).toFixed(2)}px)`);
      setF(alw.line, alwB(28 * so, 0)); setF(evn.line, evnB(28 * so, 0));
      alw.line.style.opacity = 1 - E.i2(inv(1030, 1042, f)); evn.line.style.opacity = alw.line.style.opacity;
      // end card
      endL.style.display = f < 1019 ? 'none' : 'block';
      const y = phY(f);
      T(phone.el, `translate(680px,${y.toFixed(2)}px)`);
      setF(phoneWrap, CB(Math.min(10, Math.abs(vel(phY, f)) * 0.05)));
      [BEAT(38), BEAT(38.5), BEAT(39)].forEach((b, i) => endW.show(i, b - 4, f));
      const bp = f < 1090 ? 0 : spring(f - 1090, 0.42, 0.5);
      banner.style.opacity = clamp((f - 1090) / 4);
      T(banner, `translateY(${(30 * (1 - clamp(bp))).toFixed(2)}px) scale(${lerp(0.9, 1, clamp(bp, 0, 1.3)).toFixed(4)})`);
      setF(banner, CB(8 * (1 - clamp((f - 1090) / 8))));
    };
  });
}

// ─────────────────────────────── boot ───────────────────────────────
window.seek = seek;
window.READY = (async () => {
  await Promise.all([400, 500, 600, 700].map(w => document.fonts.load(`${w} 40px Inter`)));
  await document.fonts.ready;
  build();
  const q = new URLSearchParams(location.search);
  if (q.has('play')) {
    const t0 = performance.now();
    const tick = () => { seek(((performance.now() - t0) / 1000 * 60) % 1200); requestAnimationFrame(tick); };
    tick();
  } else seek(parseFloat(q.get('f') || '0'));
  return true;
})();
