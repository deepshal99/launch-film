// Render film frames to PNG:  node stills.mjs <film-dir> f1 f2 ...   → <film-dir>/out/stills/fNNNN.png
import path from 'node:path';
import fs from 'node:fs';
import { launch, openFilm, filmPage } from './lib-browser.mjs';
const [dir, ...frames] = process.argv.slice(2);
if (!dir || !frames.length) { console.error('usage: stills.mjs <film-dir> f1 f2 ...'); process.exit(1); }
const out = path.resolve(dir, 'out/stills'); fs.rmSync(out, { recursive: true, force: true }); fs.mkdirSync(out, { recursive: true });
const browser = await launch();
const meta = await openFilm(browser, dir);
const page = await filmPage(browser, dir, meta);
for (const f of frames.map(Number)) {
  await page.evaluate(f => window.seek(f), f);
  const file = path.join(out, `f${String(f).padStart(5, '0')}.png`);
  await page.screenshot({ path: file, clip: { x: 0, y: 0, width: meta.w, height: meta.h } });
  console.log(file);
}
await browser.close();
