// Original, picture-locked soundtrack from a cue sheet.
//   node soundtrack.mjs <cues.json> <out_raw.wav>      then: bash master.sh out_raw.wav out.wav <duration>
// Everything is synthesized (no samples, no third-party music). See references/sound-design.md for the schema.
import fs from 'node:fs';

const cues = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const OUTFILE = process.argv[3] || 'soundtrack_raw.wav';
const SR = 48000, DUR = cues.duration, N = Math.round(DUR * SR);
const FPS = cues.fps || 60, BPM = cues.bpm || 124, B = 60 / BPM, T0 = (cues.beat0 ?? 0) / FPS;
const beat = k => T0 + B * k;
const parseT = v => {
  if (typeof v === 'number') return v;
  if (v === 'end') return DUR;
  if (v[0] === 'f') return parseFloat(v.slice(1)) / FPS;
  if (v[0] === 'b') return beat(parseFloat(v.slice(1)));
  return parseFloat(v);
};
const toBeat = t => (t - T0) / B;

const dry = [new Float64Array(N), new Float64Array(N)];
const bus = [new Float64Array(N), new Float64Array(N)];   // music bus: sidechained + dip filter
const send = [new Float64Array(N), new Float64Array(N)];  // reverb send
let seed = (cues.seed || 0x9e3779b9) >>> 0 || 1;
const rnd = () => { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return ((seed >>> 0) / 4294967296) * 2 - 1; };
const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
const idx = t => Math.round(t * SR);
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
function write(target, i, l, r) { if (i >= 0 && i < N) { target[0][i] += l; target[1][i] += r; } }
const panLR = p => [Math.cos((p + 1) * Math.PI / 4), Math.sin((p + 1) * Math.PI / 4)];

class Biquad {
  constructor(type, f, q = 0.707) { this.type = type; this.x1 = this.x2 = this.y1 = this.y2 = 0; this.set(f, q); }
  set(f, q = this.q) {
    this.q = q; f = Math.min(f, SR * 0.45);
    const w = 2 * Math.PI * f / SR, c = Math.cos(w), s = Math.sin(w), a = s / (2 * q);
    let b0, b1, b2;
    if (this.type === 'lp') { b0 = (1 - c) / 2; b1 = 1 - c; b2 = (1 - c) / 2; }
    else if (this.type === 'hp') { b0 = (1 + c) / 2; b1 = -(1 + c); b2 = (1 + c) / 2; }
    else { b0 = a; b1 = 0; b2 = -a; }
    const a0 = 1 + a;
    this.b0 = b0 / a0; this.b1 = b1 / a0; this.b2 = b2 / a0; this.a1 = (-2 * c) / a0; this.a2 = (1 - a) / a0;
  }
  p(x) { const y = this.b0 * x + this.b1 * this.x1 + this.b2 * this.x2 - this.a1 * this.y1 - this.a2 * this.y2; this.x2 = this.x1; this.x1 = x; this.y2 = this.y1; this.y1 = y; return y; }
}

// ───────────── instruments ─────────────
const kicks = [];
function kick(t0, amp = 1) {
  kicks.push(t0); let ph = 0;
  for (let n = 0; n < 0.5 * SR; n++) {
    const t = n / SR, f = 44 + 100 * Math.exp(-t / 0.032); ph += 2 * Math.PI * f / SR;
    const env = Math.exp(-t / 0.3) * (1 - Math.exp(-t / 0.0015));
    const v = Math.tanh(1.6 * Math.sin(ph) * env) * 0.9 + rnd() * Math.exp(-t / 0.0035) * 0.18;
    write(dry, idx(t0) + n, v * amp, v * amp);
  }
}
function clap(t0, amp = 1) {
  const bp = new Biquad('bp', 1500, 0.9), hp = new Biquad('hp', 600);
  for (let n = 0; n < 0.4 * SR; n++) {
    const t = n / SR; let env = 0;
    for (const o of [0, 0.011, 0.022]) if (t >= o) env += Math.exp(-(t - o) / 0.006);
    if (t > 0.028) env += 0.9 * Math.exp(-(t - 0.028) / 0.1);
    const v = hp.p(bp.p(rnd())) * env * amp * 1.6;
    write(dry, idx(t0) + n, v * 0.95, v); write(send, idx(t0) + n, v * 0.5, v * 0.5);
  }
}
function snare(t0, amp = 1) {
  const bp = new Biquad('bp', 2200, 0.7); let ph = 0;
  for (let n = 0; n < 0.35 * SR; n++) {
    const t = n / SR; ph += 2 * Math.PI * (190 + 60 * Math.exp(-t / 0.02)) / SR;
    const v = (bp.p(rnd()) * Math.exp(-t / 0.09) * 1.2 + Math.sin(ph) * Math.exp(-t / 0.05) * 0.6) * amp;
    write(dry, idx(t0) + n, v, v); write(send, idx(t0) + n, v * 0.4, v * 0.4);
  }
}
function hat(t0, amp = 1, open = false, pan = 0) {
  const hp = new Biquad('hp', 7500, 0.8), [gl, gr] = panLR(pan), d = open ? 0.11 : 0.026;
  for (let n = 0; n < (open ? 0.35 : 0.1) * SR; n++) { const t = n / SR, v = hp.p(rnd()) * Math.exp(-t / d) * amp; write(dry, idx(t0) + n, v * gl, v * gr); }
}
function bass(t0, m, len, amp = 1) {
  const f = mtof(m), lp = new Biquad('lp', 600, 1.1); let ph = 0;
  for (let n = 0; n < (len + 0.03) * SR; n++) {
    const t = n / SR; ph += f / SR;
    const saw = 2 * (ph - Math.floor(ph)) - 1, sub = Math.sin(2 * Math.PI * ph);
    if ((n & 31) === 0) lp.set(300 + 900 * Math.exp(-t / 0.05), 1.1);
    const env = Math.min(1, t / 0.004) * (t < len ? 1 : Math.exp(-(t - len) / 0.008));
    const v = (lp.p(saw) * 0.55 + sub * 0.75) * env * amp;
    write(bus, idx(t0) + n, v, v);
  }
}
function pad(t0, t1, notes, cutoff, amp = 1, rel = 0.3) {
  const voices = [];
  notes.forEach((m, j) => [-9, 0, 9].forEach((c, k) => voices.push({ f: mtof(m) * Math.pow(2, c / 1200), ph: (j * 0.37 + k * 0.21) % 1, side: k - 1 })));
  const lpL = new Biquad('lp', 800, 0.8), lpR = new Biquad('lp', 800, 0.8), len = t1 - t0 + rel;
  for (let n = 0; n < len * SR; n++) {
    const t = n / SR, abs = t0 + t;
    if ((n & 63) === 0) { const c = cutoff(abs); lpL.set(c, 0.8); lpR.set(c, 0.8); }
    let l = 0, r = 0;
    for (const v of voices) { v.ph += v.f / SR; const s = 2 * (v.ph - Math.floor(v.ph)) - 1; l += s * (v.side <= 0 ? 1 : 0.35); r += s * (v.side >= 0 ? 1 : 0.35); }
    const env = Math.min(1, t / 0.03) * (abs < t1 ? 1 : Math.exp(-(abs - t1) / (rel / 3)));
    const g = env * amp / voices.length, L = lpL.p(l) * g, R = lpR.p(r) * g;
    write(bus, idx(t0) + n, L, R); write(send, idx(t0) + n, L * 0.6, R * 0.6);
  }
}
function pluck(t0, m, amp = 1, pan = 0) {
  const f = mtof(m), lp = new Biquad('lp', 5000, 1.4), [gl, gr] = panLR(pan); let p1 = 0, p2 = 0.3;
  for (let n = 0; n < 0.45 * SR; n++) {
    const t = n / SR; p1 += f / SR; p2 += (f * 1.003) / SR;
    const s = (2 * (p1 - Math.floor(p1)) - 1) + ((p2 % 1) < 0.5 ? 0.5 : -0.5);
    if ((n & 31) === 0) lp.set(700 + 5200 * Math.exp(-t / 0.05), 1.4);
    const v = lp.p(s) * Math.exp(-t / 0.16) * Math.min(1, t / 0.002) * amp;
    write(bus, idx(t0) + n, v * gl, v * gr); write(send, idx(t0) + n, v * 0.4, v * 0.4);
  }
}
// ───────────── SFX ─────────────
const SFX = {
  whoosh(c) {
    const peak = parseT(c.t), pre = c.pre ?? 0.4, post = c.post ?? 0.15, amp = c.amp ?? 0.5, dir = c.dir ?? 1;
    const bp = new Biquad('bp', 400, 1.3), bp2 = new Biquad('bp', 800, 2.5), t0 = peak - pre;
    for (let n = 0; n < (pre + post + 0.25) * SR; n++) {
      const t = n / SR - pre, env = t < 0 ? Math.pow(1 + t / pre, 3.2) : Math.exp(-t / post);
      const f = t < 0 ? 300 + 3600 * Math.pow(1 + t / pre, 2.2) : 3900 * Math.exp(-t / 0.18) + 250;
      if ((n & 31) === 0) { bp.set(f, 1.1); bp2.set(f * 1.6, 3); }
      const x = rnd(), v = (bp.p(x) * 1.2 + bp2.p(x) * 0.6) * env * amp, [gl, gr] = panLR(clamp(dir * (t / pre) * 0.8, -0.8, 0.8));
      write(dry, idx(t0) + n, v * gl, v * gr); write(send, idx(t0) + n, v * 0.25, v * 0.25);
    }
  },
  impact(c) {
    const t0 = parseT(c.t), amp = c.amp ?? 0.5, low = c.low ?? 50, lp = new Biquad('lp', 900, 0.7); let ph = 0;
    for (let n = 0; n < 1.4 * SR; n++) {
      const t = n / SR, f = low * (0.75 + 0.6 * Math.exp(-t / 0.06)); ph += 2 * Math.PI * f / SR;
      const v = (Math.sin(ph) * Math.exp(-t / 0.45) * 0.9 + lp.p(rnd()) * Math.exp(-t / 0.12) * 0.7) * Math.min(1, t / 0.002) * amp;
      write(dry, idx(t0) + n, v, v); write(send, idx(t0) + n, v * 0.45, v * 0.45);
    }
  },
  click(c) {
    const t0 = parseT(c.t), amp = c.amp ?? 0.6, hp = new Biquad('hp', 2500, 0.8);
    for (let n = 0; n < 0.05 * SR; n++) {
      const t = n / SR, v = (hp.p(rnd()) * Math.exp(-t / 0.0018) * 0.9 + Math.sin(2 * Math.PI * 2300 * t) * Math.exp(-t / 0.01) * 0.4 + Math.sin(2 * Math.PI * 620 * t) * Math.exp(-t / 0.014) * 0.35) * amp;
      write(dry, idx(t0) + n, v, v); write(send, idx(t0) + n, v * 0.15, v * 0.15);
    }
  },
  tick(c) {
    const t0 = parseT(c.t), amp = c.amp ?? 0.05, bp = new Biquad('bp', 3200 + rnd() * 600, 1.5), [gl, gr] = panLR(rnd() * 0.3);
    for (let n = 0; n < 0.02 * SR; n++) { const t = n / SR, v = bp.p(rnd()) * Math.exp(-t / 0.0022) * amp; write(dry, idx(t0) + n, v * gl, v * gr); }
  },
  ticks(c) { // typing / printing: a tick every `every` seconds with jitter
    const a = parseT(c.from), b = parseT(c.to), every = c.every ?? 0.032;
    for (let t = a; t <= b; t += every) SFX.tick({ t: t + rnd() * every * 0.12, amp: (c.amp ?? 0.05) * (0.7 + 0.3 * Math.abs(rnd())) });
  },
  pop(c) {
    const t0 = parseT(c.t), amp = c.amp ?? 0.25, f0 = c.freq ?? 900; let ph = 0;
    for (let n = 0; n < 0.12 * SR; n++) {
      const t = n / SR; ph += 2 * Math.PI * f0 * (1 + 1.4 * Math.exp(-t / 0.012)) / SR;
      const v = Math.sin(ph) * Math.exp(-t / 0.035) * Math.min(1, t / 0.001) * amp;
      write(dry, idx(t0) + n, v, v); write(send, idx(t0) + n, v * 0.3, v * 0.3);
    }
  },
  zip(c) {
    const t0 = parseT(c.from), t1 = parseT(c.to), amp = c.amp ?? 0.1, bp = new Biquad('bp', 2000, 3);
    for (let n = 0; n < (t1 - t0) * SR; n++) {
      const t = n / SR, u = t / (t1 - t0); if ((n & 31) === 0) bp.set(1800 + 3000 * u, 3);
      const v = bp.p(rnd()) * (0.5 + 0.5 * Math.sin(2 * Math.PI * 60 * t)) * Math.sin(Math.PI * u) * amp;
      write(dry, idx(t0) + n, v, v);
    }
  },
  riser(c) {
    const t0 = parseT(c.from), t1 = parseT(c.to), amp = c.amp ?? 0.25, bp = new Biquad('bp', 300, 2); let ph = 0;
    for (let n = 0; n < (t1 - t0) * SR; n++) {
      const t = n / SR, u = t / (t1 - t0); if ((n & 31) === 0) bp.set(250 + 5000 * u * u, 2);
      ph += (200 + 700 * u * u) / SR;
      const v = (bp.p(rnd()) * 1.1 + Math.sin(2 * Math.PI * ph) * 0.12) * Math.pow(u, 2.4) * amp;
      write(dry, idx(t0) + n, v, v); write(send, idx(t0) + n, v * 0.4, v * 0.4);
    }
  },
  shimmer(c) {
    const t0 = parseT(c.t), amp = c.amp ?? 0.12, notes = c.notes || [86, 90, 93, 97, 100, 102], hp = new Biquad('hp', 9000, 0.7);
    for (let n = 0; n < 1.9 * SR; n++) {
      const t = n / SR, env = Math.min(1, t / 0.015) * Math.exp(-t / 0.75); let s = 0;
      notes.forEach((m, j) => { s += Math.sin(2 * Math.PI * mtof(m) * t * (1 + 0.002 * Math.sin(t * 7 + j)) + j) * (1 + 0.5 * Math.sin(t * 22 + j * 2)) / notes.length; });
      const sp = hp.p(rnd()) * Math.exp(-t / 0.3) * 0.25;
      const l = (s * (1 + 0.3 * Math.sin(t * 9)) + sp) * env * amp, r = (s * (1 - 0.3 * Math.sin(t * 9)) + sp) * env * amp;
      write(dry, idx(t0) + n, l, r); write(send, idx(t0) + n, l * 0.9, r * 0.9);
    }
  },
};

// ───────────── harmony ─────────────
const NOTE = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const QUAL = { '': [0, 4, 7], maj: [0, 4, 7], m: [0, 3, 7], '7': [0, 4, 7, 10], maj7: [0, 4, 7, 11], m7: [0, 3, 7, 10], m9: [0, 3, 7, 10, 14], maj9: [0, 4, 7, 11, 14], add9: [0, 4, 7, 14], sus2: [0, 2, 7], sus4: [0, 5, 7], '6': [0, 4, 7, 9], '69': [0, 4, 7, 9, 14], dim: [0, 3, 6] };
function chord(name) {
  const m = /^([A-G])([#b]?)(.*)$/.exec(name); if (!m) throw new Error(`bad chord ${name}`);
  const pc = (NOTE[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0) + 12) % 12, iv = QUAL[m[3]];
  if (!iv) throw new Error(`unknown chord quality "${m[3]}" in ${name} (use one of: ${Object.keys(QUAL).join(', ')})`);
  const root3 = 48 + pc - (pc > 6 ? 12 : 0);                 // pad root near C3
  const padN = [root3 - 12, ...iv.map(i => root3 + i)].filter((v, i, a) => a.indexOf(v) === i);
  const plN = iv.map(i => 72 + ((pc + i) % 12)).sort((a, b) => a - b); plN.push(plN[0] + 12, plN[1] + 12);
  return { pad: padN, pl: plN, root: 36 + pc - (pc > 7 ? 12 : 0) };
}
const prog = (cues.chords || ['Am7', 'Fmaj7', 'C', 'G']).map(chord);

// ───────────── sections ─────────────
const secs = (cues.sections || []).map(s => ({ ...s, a: parseT(s.from), b: parseT(s.to) }));
const inSec = (type, t) => secs.some(s => s.type === type && t >= s.a && t < s.b);
const firstGroove = secs.find(s => s.type === 'groove');
const barStart = firstGroove ? toBeat(firstGroove.a) : 0;  // chord 1 lands on the first groove downbeat
const feel = cues.feel || 'house';
const lastBeat = Math.ceil(toBeat(DUR));
const chordAt = k => prog[((Math.floor((k - barStart) / 4) % prog.length) + prog.length) % prog.length];
const drumsAt = t => inSec('groove', t) && !inSec('break', t) && !inSec('outro', t) && !inSec('intro', t);

// drums + bass per beat
for (let k = Math.floor(toBeat(0)); k <= lastBeat; k++) {
  const t = beat(k); if (t < 0 || t >= DUR) continue;
  if (!drumsAt(t)) continue;
  const dip = inSec('dip', t), pos = ((k - barStart) % 4 + 4) % 4, c = chordAt(k);
  const accent = secs.some(s => s.type === 'groove' && Math.abs(s.a - t) < 0.01);
  if (feel === 'house') {
    kick(t, accent ? 1.05 : 0.92);
    if (pos % 2 === 1 && !dip) clap(t, 0.34);
    if (!dip) { hat(beat(k + 0.5), 0.2, pos === 3, 0.15); hat(beat(k + 0.25), 0.06, false, -0.3); hat(beat(k + 0.75), 0.08, false, -0.2); }
    bass(beat(k + 0.5), c.root + (pos === 3 ? 12 : 0), B * 0.32, 0.42);
  } else if (feel === 'halftime') {
    if (pos === 0) kick(t, accent ? 1.05 : 0.95);
    if (pos === 2 && !dip) snare(t, 0.42);
    if (!dip) { hat(t, 0.12, false, 0.1); hat(beat(k + 0.5), 0.09, false, -0.15); }
    if (pos === 2) kick(beat(k + 0.5), 0.75);
    if (pos === 0) bass(t, c.root, B * 1.8, 0.4);
    if (pos === 2) bass(beat(k + 0.5), c.root, B * 1.3, 0.34);
  }
}
if (feel === 'ambient' || !kicks.length) { /* no sidechain */ }

// pads, plucks per bar
const hook = cues.hook || [0, 3, 6, 8, 10, 12, 14], hookPick = [2, 1, 3, 2, 4, 2, 1];
for (let k = Math.floor(barStart - 4 * Math.ceil(barStart / 4)); k <= lastBeat; k += 4) {
  const t0 = Math.max(0, beat(k)), t1 = Math.min(DUR, beat(k + 4)); if (t1 <= t0) continue;
  const c = chordAt(k), mid = (t0 + t1) / 2;
  if (inSec('outro', mid)) continue;
  if (inSec('intro', mid)) {
    const s = secs.find(x => x.type === 'intro' && mid >= x.a && mid < x.b);
    pad(t0, t1, c.pad, t => 320 + 3000 * Math.pow(clamp((t - s.a) / (s.b - s.a), 0, 1), 1.6), 0.6, 0.15);
    for (let q = 0; q < 16; q += 3) { const tt = beat(k + q / 4); if (tt >= s.a && tt < s.b) pluck(tt, c.pl[q % c.pl.length], 0.04 + 0.08 * ((tt - s.a) / (s.b - s.a)), q % 2 ? -0.4 : 0.4); }
    continue;
  }
  if (inSec('break', mid)) {
    const s = secs.find(x => x.type === 'break' && mid >= x.a && mid < x.b);
    pad(t0, t1, c.pad, t => 700 + 2600 * Math.pow(clamp((t - s.a) / (s.b - s.a), 0, 1), 2), 0.8, 0.2);
    continue;
  }
  pad(t0, t1, c.pad, () => 2900, 0.72, 0.25);
  for (let s = 0; s < 16; s++) {
    const hi = hook.indexOf(s); if (hi < 0) continue;
    const tt = beat(k + s / 4); if (tt < 0 || tt >= DUR || !drumsAt(tt)) continue;
    pluck(tt, c.pl[hookPick[hi % hookPick.length] % c.pl.length], 0.13, s % 2 ? -0.4 : 0.4);
  }
}
// intro / break risers, outro pad + sparkle
for (const s of secs) {
  if (s.type === 'intro' || s.type === 'break') SFX.riser({ from: s.a + (s.b - s.a) * 0.35, to: s.b, amp: 0.2 });
  if (s.type === 'outro') {
    const c = prog[0];
    pad(s.a, Math.min(DUR, s.b), [...c.pad, c.pad[c.pad.length - 1] + 7], t => 1400 + 900 * Math.sin((t - s.a) * 1.3), 0.9, 0.2);
    bass(s.a, c.root, Math.min(DUR, s.b) - s.a, 0.3);
    const sparkle = [0, 0.5, 1.5, 2, 3, 3.5, 4.5, 5, 6, 7, 8, 9.5];
    sparkle.forEach((q, i) => { const tt = s.a + q * B; if (tt < DUR - 0.3) pluck(tt, c.pl[(i * 2) % c.pl.length] + (i % 3 === 2 ? 12 : 0), 0.07 * Math.pow(0.9, i), i % 2 ? -0.5 : 0.5); });
    SFX.impact({ t: s.a, amp: 0.5, low: 45 });
  }
  if (s.type === 'groove' && s.a > 0.05) SFX.impact({ t: s.a, amp: 0.35, low: 46 });
}
// picture-locked SFX
for (const c of cues.sfx || []) {
  const fn = SFX[c.type]; if (!fn) throw new Error(`unknown sfx type "${c.type}" (use: ${Object.keys(SFX).join(', ')})`);
  fn(c);
}

// ───────────── mix ─────────────
const scGain = new Float64Array(N).fill(1);
for (const tk of kicks) {
  const i0 = idx(tk);
  for (let n = 0; n < 0.4 * SR && i0 + n < N; n++) { const t = n / SR, g = 1 - 0.62 * Math.exp(-t / 0.11) * Math.min(1, t / 0.003 + 0.4); scGain[i0 + n] = Math.min(scGain[i0 + n], g); }
}
// dip: low-pass the music bus inside "dip" sections (smooth in/out)
const dips = secs.filter(s => s.type === 'dip');
if (dips.length) {
  const cut = t => { let c = 20000; for (const s of dips) { const u = t < s.a ? (s.a - t) / 0.35 : t > s.b ? (t - s.b) / 0.5 : 0; const depth = clamp(1 - u, 0, 1); c = Math.min(c, 20000 * Math.pow(600 / 20000, depth)); } return c; };
  for (let ch = 0; ch < 2; ch++) { const lp = new Biquad('lp', 20000, 0.9); for (let i = 0; i < N; i++) { if ((i & 63) === 0) lp.set(cut(i / SR), 0.9); bus[ch][i] = lp.p(bus[ch][i]); } }
}
const dly = Math.round(B * 0.75 * SR), dl = [new Float64Array(N), new Float64Array(N)];
for (let i = 0; i < N; i++) {
  const fbL = i >= dly ? dl[1][i - dly] * 0.38 : 0, fbR = i >= dly ? dl[0][i - dly] * 0.38 : 0;
  dl[0][i] = bus[1][i] * 0.25 + fbL; dl[1][i] = bus[0][i] * 0.25 + fbR;
}
function reverb(input, spread) {
  const combs = [1557, 1617, 1491, 1422, 1277, 1356].map(d => ({ b: new Float64Array(d + spread), i: 0, s: 0 }));
  const aps = [556, 441, 341].map(d => ({ b: new Float64Array(d + spread), i: 0 }));
  const out = new Float64Array(N);
  for (let n = 0; n < N; n++) {
    const x = input[n] * 0.015; let y = 0;
    for (const c of combs) { const o = c.b[c.i]; c.s = o * 0.7 + c.s * 0.3; c.b[c.i] = x + c.s * 0.86; c.i = (c.i + 1) % c.b.length; y += o; }
    for (const a of aps) { const o = a.b[a.i]; a.b[a.i] = y + o * 0.5; a.i = (a.i + 1) % a.b.length; y = o - y; }
    out[n] = y;
  }
  return out;
}
const wet = [reverb(send[0], 0), reverb(send[1], 23)];
const out = [new Float32Array(N), new Float32Array(N)];
for (let c = 0; c < 2; c++) for (let i = 0; i < N; i++) out[c][i] = Math.tanh((dry[c][i] + (bus[c][i] + dl[c][i] * 0.6) * scGain[i] + wet[c][i] * 1.2) * 0.9) / 0.9;

const data = Buffer.alloc(N * 8);
for (let i = 0; i < N; i++) { data.writeFloatLE(out[0][i], i * 8); data.writeFloatLE(out[1][i], i * 8 + 4); }
const h = Buffer.alloc(44);
h.write('RIFF', 0); h.writeUInt32LE(36 + data.length, 4); h.write('WAVE', 8); h.write('fmt ', 12);
h.writeUInt32LE(16, 16); h.writeUInt16LE(3, 20); h.writeUInt16LE(2, 22); h.writeUInt32LE(SR, 24);
h.writeUInt32LE(SR * 8, 28); h.writeUInt16LE(8, 32); h.writeUInt16LE(32, 34); h.write('data', 36); h.writeUInt32LE(data.length, 40);
fs.writeFileSync(OUTFILE, Buffer.concat([h, data]));
console.log(`${OUTFILE}  ${DUR}s  ${BPM} BPM  feel=${feel}  kicks=${kicks.length}  sfx=${(cues.sfx || []).length}`);
