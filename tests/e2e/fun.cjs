// End-to-end: points in practice, the Laju! round, palettes and text size.
// Run against a preview server: npx vite build && npx vite preview --port 4173, then node tests/e2e/fun.cjs
const { chromium, devices } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE = process.env.BASE_URL || 'http://localhost:4173/';
const OUT = process.env.SHOT_DIR || path.join(__dirname, '..', '..', 'test-results');
fs.mkdirSync(OUT, { recursive: true });
const assert = (ok, msg) => {
  if (!ok) throw new Error('FAILED: ' + msg);
  console.log('ok:', msg);
};

// A learner who already knows the 38 Chapter 1 words.
function seededState(settings = {}) {
  const day = 86400000;
  const now = Date.now();
  const srs = {};
  for (let i = 1; i <= 38; i++) srs[`ms-c01-${String(i).padStart(3, '0')}`] = { ease: 2.5, interval: 10, reps: 3, due: now + 5 * day, lapses: 0, last: now - day };
  return {
    schemaVersion: 1,
    createdAt: new Date(now - 30 * day).toISOString(),
    profile: { name: 'Tanaka', onboarded: true, voice: 'none' },
    settings: { lang: 'ja', theme: 'light', kanaHints: true, backupReminder: false, speechRate: 0.9, palette: 'kancil', textSize: 'm', showPoints: true, ...settings },
    srs,
    kanaSeen: {},
    frames: {},
    myHooks: {},
    questions: [],
    reports: [],
    stamps: [],
    studySeconds: {},
    howToSeen: { kad: true, cari: true, susun: true },
  };
}

async function seed(page, state) {
  await page.goto(BASE);
  await page.evaluate(
    (s) =>
      new Promise((resolve, reject) => {
        const req = indexedDB.open('katakata', 1);
        req.onupgradeneeded = () => req.result.createObjectStore('kv');
        req.onsuccess = () => {
          const tx = req.result.transaction('kv', 'readwrite');
          tx.objectStore('kv').put(s, 'state');
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
        };
      }),
    state,
  );
  await page.reload();
}

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ ...devices['Pixel 7'] });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  const shot = (n) => page.screenshot({ path: path.join(OUT, n + '.png') });

  // 1. Practice shows a score pill and, after a right answer, a points badge.
  // Seeded Math.random (mulberry32) so the option order, and with it the step where the first option happens to be
  // the right one, is the same on every run: the test used to need one lucky click in 25 steps and could flake.
  await ctx.addInitScript(() => {
    let a = 0x6d2b79f5;
    Math.random = () => {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  });
  await page.clock.install();
  await seed(page, seededState());
  await page.waitForSelector('.today');
  await page.click('.today');
  await page.waitForSelector('.score-pill');
  let badge = false;
  for (let i = 0; i < 25 && !badge; i++) {
    if (await page.locator('.summary').count()) break;
    const body = page.locator('.step-body');
    await body.waitFor();
    if (await body.locator('.opt').count()) {
      // Try options until the right one (answers are never penalised, so this only resets the combo).
      await body.locator('.opt').first().click();
      badge = (await page.locator('.points-pop').count()) > 0;
      if (badge) await shot('20-points-badge');
    } else if (await body.getByRole('button', { name: '答えを見る' }).count()) {
      await body.getByRole('button', { name: '答えを見る' }).click();
      await body.locator('.rate-good').click();
      continue;
    }
    const next = page.locator('.btn-next');
    if (await next.count()) await next.click();
    else if (await page.locator('.tiles-bank').count()) {
      await page.getByRole('button', { name: 'わからない' }).click();
      await page.locator('.btn-next').click();
    }
  }
  assert(badge, 'a right answer shows a points badge');
  assert(/★/.test(await page.locator('.score-pill').innerText()), 'score pill is visible in the session bar');

  // 2. Laju! — start, answer a few, run the clock out, see the end screen and the record.
  await page.goto(BASE + '#/laju');
  await page.reload(); // leave the running session (hash changes are ignored mid-session)
  await page.getByRole('button', { name: /スタート/ }).click();
  await page.waitForSelector('.laju-word');
  for (let i = 0; i < 6; i++) {
    // Five right (fast, to build a combo), one wrong: a miss must not take points away.
    const id = await page.locator('.laju-word').getAttribute('data-id');
    const before = await page.locator('.score-pill b').innerText();
    if (i === 4) await page.locator(`.laju-options .opt:not([data-id="${id}"])`).first().click();
    else await page.locator(`.laju-options .opt[data-id="${id}"]`).click();
    if (i === 4) assert((await page.locator('.score-pill b').innerText()) === before, 'a miss in Laju! keeps the score');
    await page.clock.runFor(1200);
  }
  await shot('21-laju-play');
  await page.clock.runFor(61000);
  await page.waitForSelector('.laju-end');
  await shot('22-laju-end');
  const best = await page.evaluate(
    () =>
      new Promise((resolve) => {
        const req = indexedDB.open('katakata', 1);
        req.onsuccess = () => {
          const g = req.result.transaction('kv').objectStore('kv').get('state');
          g.onsuccess = () => resolve(g.result.scores);
        };
      }),
  );
  assert(best && best.lajuPlays === 1 && best.lajuBest > 0 && best.bestCombo === 4, 'Laju! round is recorded (' + JSON.stringify(best) + ')');
  const srsAfter = await page.evaluate(() => document.querySelectorAll('.laju-end').length);
  assert(srsAfter === 1, 'end screen shown');

  // 3. Records shows the points section.
  await page.goto(BASE + '#/rekod');
  await page.waitForSelector('.rec-row');
  assert((await page.locator('.rec-row').count()) === 5, 'Records lists five points records');

  // 4. Settings: palette and text size apply at once and persist.
  await page.goto(BASE + '#/settings');
  await page.getByRole('radio', { name: 'Rebel Blue' }).click();
  await page.getByRole('radio', { name: '特大' }).click();
  assert((await page.evaluate(() => document.documentElement.dataset.palette)) === 'rebel', 'palette applied');
  assert((await page.evaluate(() => document.documentElement.dataset.text)) === 'xl', 'text size applied');
  const rootPx = await page.evaluate(() => getComputedStyle(document.documentElement).fontSize);
  assert(rootPx === '20px', 'XL text sets the root to 20px (got ' + rootPx + ')');
  await shot('23-settings-rebel-xl');
  await page.clock.runFor(1000);
  await page.goto(BASE);
  await page.reload();
  await page.waitForSelector('.today');
  assert((await page.evaluate(() => document.documentElement.dataset.palette)) === 'rebel', 'palette survives a reload');
  await shot('24-home-rebel-xl');

  // 5. Each palette in light and dark, at normal size (screenshots for review).
  for (const [palette, theme] of [['cyan', 'light'], ['cyan', 'dark'], ['royal', 'light'], ['royal', 'dark'], ['rebel', 'dark'], ['kancil', 'light']]) {
    const p2 = await ctx.newPage();
    p2.on('pageerror', (e) => errors.push(e.message));
    await seed(p2, seededState({ palette, theme }));
    await p2.waitForSelector('.today');
    await p2.screenshot({ path: path.join(OUT, `25-home-${palette}-${theme}.png`) });
    await p2.close();
  }

  assert(errors.length === 0, 'no page errors' + (errors.length ? ': ' + errors.join(' | ') : ''));
  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
