// Render the master and encode:  node render.mjs <film-dir> [audio.wav] [out.mp4]
// One screenshot per master frame (FILM_META.frames), parallel pages, then H.264 yuv420p (bt709) + AAC 320k.
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import { execFileSync } from 'node:child_process';
import { launch, openFilm, filmPage } from './lib-browser.mjs';
const [dir, audio, outArg] = process.argv.slice(2);
if (!dir) { console.error('usage: render.mjs <film-dir> [audio.wav] [out.mp4]'); process.exit(1); }
const tmp = path.resolve(dir, 'out/frames');
fs.rmSync(tmp, { recursive: true, force: true }); fs.mkdirSync(tmp, { recursive: true });
const browser = await launch();
const meta = await openFilm(browser, dir);
const workers = Math.min(8, Math.max(2, os.cpus().length - 2));
let done = 0; const t0 = Date.now();
console.log(`rendering ${meta.frames} frames at ${meta.w}x${meta.h} with ${workers} workers`);
await Promise.all(Array.from({ length: workers }, async (_, k) => {
  const page = await filmPage(browser, dir, meta);
  for (let i = k; i < meta.frames; i += workers) {
    await page.evaluate(f => window.seek(f), i * meta.step);
    await page.screenshot({ path: path.join(tmp, `${String(i).padStart(5, '0')}.png`), clip: { x: 0, y: 0, width: meta.w, height: meta.h } });
    if (++done % 100 === 0) console.log(`  ${done}/${meta.frames}  ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  }
  await page.close();
}));
await browser.close();
const out = outArg || path.join(dir, 'out', 'film.mp4');
const args = ['-v', 'error', '-y', '-framerate', meta.fps, '-i', `${tmp}/%05d.png`];
if (audio) args.push('-i', audio);
args.push('-vf', 'scale=out_color_matrix=bt709:out_range=tv,format=yuv420p', '-c:v', 'libx264', '-preset', 'slow', '-crf', '15', '-profile:v', 'high', '-g', '60',
  '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709');
if (audio) args.push('-c:a', 'aac', '-b:a', '320k');
args.push('-movflags', '+faststart', out);
execFileSync('ffmpeg', args, { stdio: 'inherit' });
console.log(`done in ${((Date.now() - t0) / 1000).toFixed(0)}s → ${out}`);
