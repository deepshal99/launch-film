// Resolve Playwright from the user's project (cwd), so the skill works from ~/.claude/skills or .claude/skills.
import { createRequire } from 'node:module';
import path from 'node:path';

export function loadPlaywright() {
  const req = createRequire(path.join(process.cwd(), 'package.json'));
  try { return req('playwright'); } catch {
    console.error('Playwright not found in this project. Run: bash <skill>/scripts/setup.sh <film-dir>');
    process.exit(1);
  }
}
export async function launch() {
  const { chromium } = loadPlaywright();
  try { return await chromium.launch(); } catch (e1) {
    try { return await chromium.launch({ channel: 'chromium' }); } catch {
      console.error(String(e1.message).split('\n')[0]);
      console.error('No Chromium for this Playwright version. Run: npx playwright install chromium');
      process.exit(1);
    }
  }
}
export async function openFilm(browser, dir) {
  const probe = await browser.newPage();
  await probe.goto('file://' + path.resolve(dir, 'index.html'));
  await probe.evaluate(() => window.READY);
  const meta = await probe.evaluate(() => window.FILM_META);
  await probe.close();
  return meta;
}
export async function filmPage(browser, dir, meta) {
  const page = await browser.newPage({ viewport: { width: meta.w, height: meta.h }, deviceScaleFactor: 1 });
  page.on('pageerror', e => console.error('[page error]', e.message));
  page.on('console', m => { if (m.type() === 'error') console.error('[console]', m.text()); });
  await page.goto('file://' + path.resolve(dir, 'index.html'));
  await page.evaluate(() => window.READY);
  return page;
}
