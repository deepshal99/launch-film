// Estimate tempo + strong onsets of any audio/video file:  node tempo.mjs <file>
// Prints BPM candidates (autocorrelation of an onset envelope) and the first strong onsets in seconds.
// Use it to lock a user-supplied licensed track to the film's beat grid (beat0 = first downbeat).
import { execFileSync } from 'node:child_process';
const file = process.argv[2];
const SR = 11025, H = 110;
const raw = execFileSync('ffmpeg', ['-v', 'error', '-i', file, '-ac', '1', '-ar', String(SR), '-f', 'f32le', '-'], { maxBuffer: 1 << 30 });
const x = new Float32Array(raw.buffer, raw.byteOffset, raw.length / 4);
const e = [];
for (let i = 0; i + H < x.length; i += H) { let s = 0; for (let j = 0; j < H; j++) s += x[i + j] * x[i + j]; e.push(Math.log(1e-9 + s)); }
const o = e.map((v, i) => (i ? Math.max(0, v - e[i - 1]) : 0)), fps = SR / H;
const scores = [];
for (let bpm = 70; bpm <= 180; bpm += 0.5) {
  const lag = fps * 60 / bpm; let s = 0;
  for (let i = 0; i < o.length - lag - 1; i++) { const k = i + lag, a = Math.floor(k), f = k - a; s += o[i] * (o[a] * (1 - f) + o[a + 1] * f); }
  scores.push([s, bpm]);
}
scores.sort((a, b) => b[0] - a[0]);
const mean = o.reduce((a, b) => a + b, 0) / o.length, sd = Math.sqrt(o.reduce((a, b) => a + (b - mean) ** 2, 0) / o.length);
const on = [];
for (let i = 3; i < o.length - 3 && on.length < 24; i++) if (o[i] > mean + 3 * sd && o[i] === Math.max(...o.slice(i - 8, i + 9))) on.push((i / fps).toFixed(3));
console.log(`bpm candidates: ${scores.slice(0, 5).map(s => s[1]).join(', ')}  (half/double-time are common — pick the one that matches the kick)`);
console.log(`strong onsets (s): ${on.join(' ') || 'none found'}`);
console.log(`duration: ${(x.length / SR).toFixed(3)} s`);
