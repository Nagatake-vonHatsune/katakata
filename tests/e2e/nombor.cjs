// End-to-end: Nombor & Masa. Opens the mode from the home screen of a brand-new learner (no chapter done), plays each
// of the six parts once (explorer, 8 questions, the chart from feedback), and saves phone-size screenshots of each part
// and each chart to docs/nombor-masa/ for review.
// Run against a preview server: npx vite build && npx vite preview --port 4173, then node tests/e2e/nombor.cjs
const { chromium, devices } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE = process.env.BASE_URL || 'http://localhost:4173/';
const OUT = process.env.NM_SHOT_DIR || path.join(__dirname, '..', '..', 'docs', 'nombor-masa');
fs.mkdirSync(OUT, { recursive: true });
const assert = (ok, msg) => {
  if (!ok) throw new Error('FAILED: ' + msg);
  console.log('ok:', msg);
};

// A learner who has just finished onboarding: no words known, chapter 1 not started.
function freshState(lang) {
  return {
    schemaVersion: 1,
    createdAt: new Date().toISOString(),
    profile: { name: 'Tanaka', onboarded: true, voice: 'none' },
    settings: { lang, theme: 'light', kanaHints: true, backupReminder: false, speechRate: 0.9, palette: 'kancil', textSize: 'm', showPoints: true },
    srs: {}, kanaSeen: {}, frames: {}, myHooks: {}, questions: [], reports: [], stamps: [], studySeconds: {}, howToSeen: {},
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

const PARTS = ['nombor', 'hari', 'bulan', 'pecahan', 'wang', 'masa'];
const BANNED = /\b(nol|maret|juni|juli|agustus|desember|persen)\b|hari minggu|\bjam (satu|dua|tiga|empat|lima|enam|tujuh|lapan|sembilan|sepuluh|sebelas)\b/i;

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ ...devices['Pixel 7'], reducedMotion: 'no-preference' });
  // Seeded Math.random so every run plays the same questions.
  await ctx.addInitScript(() => {
    let a = 0x2545f491;
    Math.random = () => {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  const shot = (n) => page.screenshot({ path: path.join(OUT, n + '.png') });
  const seenMalay = new Set();
  const collect = async () => {
    for (const t of await page.locator('[lang="ms"]').allInnerTexts()) seenMalay.add(t);
  };

  await seed(page, freshState('ja'));
  await page.waitForSelector('.today');
  // Open from day one: the tile is on the home screen of a learner who has not started chapter 1.
  await page.getByRole('button', { name: /数と時間/ }).click();
  await page.waitForSelector('.nm-part-item');
  assert((await page.locator('.nm-part-item').count()) === 6, 'six parts on the Nombor & Masa screen');
  await shot('00-hub');
  const html = await page.content();
  assert(!/⚡|🔥/.test(await page.locator('.screen').innerText()), 'no ⚡ or 🔥 in the mode');
  void html;

  let chartsShot = new Set();
  for (const [idx, part] of PARTS.entries()) {
    await page.goto(BASE + '#/nombor');
    await page.locator(`.nm-part-item[data-part="${part}"]`).click();
    await page.waitForSelector(`.screen[data-part="${part}"] .nm-explore`);
    const n = String(idx + 1).padStart(2, '0');
    // Explorer: roll, turn, tap, spin, drag.
    if (part === 'nombor') {
      await page.getByRole('radio', { name: '100〜999' }).click();
      await page.locator('.nm-roll').click();
      await page.waitForTimeout(800);
    } else if (part === 'hari') {
      await page.locator('.nm-week-day').nth(3).click();
      await page.locator('.nm-rel-cell').nth(3).click();
    } else if (part === 'bulan') {
      await page.locator('.nm-turn').click();
      await page.waitForTimeout(500);
    } else if (part === 'pecahan') {
      await page.locator('.nm-chip', { hasText: '¾' }).click();
    } else if (part === 'wang') {
      await page.locator('.nm-roll').click();
    } else if (part === 'masa') {
      // Drag the minute hand from 12 to 6 o'clock position, then spin.
      const box = await page.locator('.nm-clock-wrap svg').boundingBox();
      const cx = box.x + box.width / 2;
      const cy = box.y + box.height / 2;
      await page.mouse.move(cx, cy - box.height * 0.42);
      await page.mouse.down();
      await page.mouse.move(cx + box.width * 0.42, cy, { steps: 6 });
      await page.mouse.move(cx, cy + box.height * 0.42, { steps: 6 });
      await page.mouse.move(cx - box.width * 0.42, cy, { steps: 6 });
      await page.mouse.up();
      // 3:30 at the start; the minute hand dragged round to the 9 = 3:45.
      const afterDrag = await page.locator('.nm-reading-main b').innerText();
      assert(afterDrag === 'pukul tiga empat puluh lima minit petang', `drag the minute hand: ${afterDrag}`);
      await page.locator('.nm-spin').click();
      await page.waitForTimeout(1100);
    }
    const reading = await page.locator('.nm-explore .nm-reading-main b').innerText();
    assert(reading.length > 0, `${part} explorer reading: ${reading}`);
    await collect();
    await shot(`${n}-${part}`);

    // Play one round of 8.
    await page.locator('.nm-play').click();
    let right = 0;
    for (let q = 0; q < 8; q++) {
      await page.waitForSelector('.nm-round');
      if (q === 0) {
        await page.waitForTimeout(part === 'masa' ? 1000 : 600);
        await shot(`${n}-${part}-q`);
      }
      const dir = await page.locator('.nm-round').getAttribute('data-dir');
      if (dir === 'build') {
        const answer = await page.locator('.nm-builder').getAttribute('data-answer');
        for (const w of answer.split(' ')) await page.locator('.nm-bank .tile', { hasText: new RegExp(`^${w}$`) }).first().click();
        if (!fs.existsSync(path.join(OUT, `${n}-${part}-build.png`))) await shot(`${n}-${part}-build`);
        await page.locator('.nm-check').click();
      } else {
        // Answer wrong on the second question (the calm "here is the answer" path), right otherwise.
        const opt = page.locator(`.nm-opt[data-right="${q === 1 ? 'false' : 'true'}"]`).first();
        await opt.click();
      }
      await page.waitForSelector('.nm-feedback .feedback');
      if ((await page.locator('.nm-feedback .feedback.ok').count()) > 0) right++;
      await collect();
      if (q === 1) {
        await page.waitForTimeout(500);
        await shot(`${n}-${part}-feedback`);
      }
      // The chart from the question's feedback, once per chart.
      const chartBtn = page.locator('.nm-fb-chart');
      const chartName = (await chartBtn.innerText()).trim();
      if (!chartsShot.has(chartName)) {
        chartsShot.add(chartName);
        await chartBtn.click();
        await page.waitForSelector('.sheet .nm-chart');
        await page.waitForTimeout(200);
        const id = await page.locator('.sheet .nm-chart').getAttribute('data-chart');
        await collect();
        await shot(`chart-${id}`);
        await page.locator('.sheet').evaluate((el) => (el.scrollTop = el.scrollHeight));
        await shot(`chart-${id}-2`);
        await page.locator('.sheet').getByRole('button', { name: '閉じる' }).click();
      }
      await page.locator('.nm-next').click();
    }
    await page.waitForSelector('.nm-score');
    const score = await page.locator('.nm-score').innerText();
    assert(score.includes(`${right}問正解`) && right === 7, `${part}: round of 8 played, ${score}`);
    if (part === 'masa') await shot('07-summary');
  }

  // The Malay interface: hub and the clock part.
  const ctx2 = await browser.newContext({ ...devices['Pixel 7'] });
  const p2 = await ctx2.newPage();
  p2.on('pageerror', (e) => errors.push(e.message));
  await seed(p2, freshState('en'));
  await p2.goto(BASE + '#/nombor/masa');
  await p2.waitForSelector('.nm-explore');
  await p2.screenshot({ path: path.join(OUT, '08-masa-en.png') });
  for (const t of await p2.locator('[lang="ms"]').allInnerTexts()) seenMalay.add(t);

  const bad = [...seenMalay].filter((t) => BANNED.test(t));
  assert(bad.length === 0, `no Indonesian forms in ${seenMalay.size} Malay strings on screen${bad.length ? ': ' + bad.join(' | ') : ''}`);
  console.log(errors.length ? 'PAGE ERRORS:\n' + errors.join('\n') : 'no page errors');
  await browser.close();
  if (errors.length) process.exit(1);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
