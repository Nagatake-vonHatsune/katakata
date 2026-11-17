// End-to-end: teacher mode (Sam, 17 Nov 2026). A learner with some progress turns teacher mode on in Settings, runs the
// chapter 4 dialogue and a ⚡ 4 frame round from the class launcher with the keyboard only, turns teacher mode off from the
// badge, and the learner's saved state and 🔥 are exactly as before. At 844×390 (a phone held sideways) the launcher, a frame
// and a reply step fit without scrolling. Screenshots at 1280×720, 1920×1080, 844×390 and 1180×820 in kancil light and
// rebel dark go to docs/teacher-mode/ (or TEACHER_SHOT_DIR).
// Run against a preview server: npx vite build && npx vite preview --port 4173, then node tests/e2e/teacher.cjs
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE = process.env.BASE_URL || 'http://localhost:4173/';
const OUT = process.env.TEACHER_SHOT_DIR || path.join(__dirname, '..', '..', 'docs', 'teacher-mode');
fs.mkdirSync(OUT, { recursive: true });
const assert = (ok, msg) => {
  if (!ok) throw new Error('FAILED: ' + msg);
  console.log('ok:', msg);
};
const ROOT = path.join(__dirname, '..', '..');
const pack = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, 'content', 'ms', rel), 'utf8'));
const c04 = pack('kelas/c04.json');
const c02 = pack('kelas/c02.json');
const DAY = 86400000;
const NOW = Date.now();
const known = () => ({ ease: 2.5, interval: 10, reps: 3, due: NOW + 5 * DAY, lapses: 0, last: NOW - DAY });

function learner(settings = {}) {
  const srs = {};
  for (const id of c02.sedia_kelas.cards) srs[id] = known();
  for (const id of c04.sedia_kelas.cards.slice(0, 6)) srs[id] = known();
  return {
    schemaVersion: 1,
    createdAt: new Date(NOW - 30 * DAY).toISOString(),
    profile: { name: 'Test Learner', onboarded: true, voice: 'none' },
    settings: { lang: 'ja', theme: 'light', kanaHints: true, backupReminder: false, speechRate: 0.9, palette: 'kancil', textSize: 'm', showPoints: true, ...settings },
    srs,
    kanaSeen: {},
    frames: Object.fromEntries(c02.sedia_kelas.frames.map((f) => [f, { tries: 1, correct: 1 }])),
    lines: {},
    dialogues: { c02: { best: 9, total: c02.scenario.lines.length - 1, plays: 1, last: '2026-11-10T00:00:00Z' } },
    myHooks: {},
    questions: [],
    reports: [],
    stamps: [{ id: 'st-ready-2', kind: 'ready', date: '2026-11-10', chapter: 2 }, { id: 'st-day', kind: 'day', date: '2026-11-16' }],
    studySeconds: { '2026-11-16': 600 },
    howToSeen: { kad: true, cari: true, susun: true, reply: true },
    scores: { bestSession: 120, bestCombo: 6, fastestMs: 900, total: 480, lajuBest: 60, lajuPlays: 1 },
  };
}

const idb = (page, fn, arg) => page.evaluate(fn, arg);
async function seed(page, state, teacherPrefs) {
  await page.goto(BASE);
  await idb(
    page,
    ([s, tp]) =>
      new Promise((resolve, reject) => {
        const req = indexedDB.open('katakata', 1);
        req.onupgradeneeded = () => req.result.createObjectStore('kv');
        req.onsuccess = () => {
          const tx = req.result.transaction('kv', 'readwrite');
          tx.objectStore('kv').put(s, 'state');
          if (tp) tx.objectStore('kv').put(tp, 'teacher');
          else tx.objectStore('kv').delete('teacher');
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
        };
      }),
    [state, teacherPrefs],
  );
  await page.reload();
}
const readKey = (page, key) =>
  idb(
    page,
    (k) =>
      new Promise((resolve) => {
        const req = indexedDB.open('katakata', 1);
        req.onsuccess = () => {
          const g = req.result.transaction('kv').objectStore('kv').get(k);
          g.onsuccess = () => resolve(g.result);
        };
      }),
    key,
  );
const flames = async (page) => {
  await page.goto(BASE + '#/sedia');
  await page.waitForSelector('.cp');
  return page.$$eval('.cp', (els) => els.map((e) => e.getAttribute('data-flames')).join(','));
};
const fits = (page) => page.evaluate(() => {
  const s = document.querySelector('.cl-stage');
  return document.scrollingElement.scrollHeight <= innerHeight + 1 && (!s || s.scrollHeight <= s.clientHeight + 1);
});

(async () => {
  const browser = await chromium.launch();
  const errors = [];

  // ---- 1. Class runs never change the learner (keyboard only), and turning teacher mode off returns them as they were ----
  {
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    page.on('pageerror', (e) => errors.push(e.message));
    await seed(page, learner(), null);
    await page.waitForSelector('.home');
    assert(!(await page.$('.launcher')) && !(await page.$('#teacher-strip')), 'teacher mode is off by default: no launcher, no strip');
    const flamesBefore = await flames(page);
    const stateBefore = await readKey(page, 'state');
    await page.goto(BASE + '#/settings');
    await page.waitForSelector('#teacher-switch');
    await page.check('#teacher-switch');
    await page.waitForSelector('#teacher-strip .teacher-badge');
    assert(await page.evaluate(() => document.documentElement.hasAttribute('data-teacher')), 'the Settings switch turns teacher mode on (projector layout)');
    assert((await page.textContent('#teacher-strip .teacher-badge')).includes('先生モード'), 'the 先生モード badge is in the top bar');
    await page.goto(BASE + '#/');
    await page.waitForSelector('.launcher');
    // The chapter 4 dialogue, keyboard only: choose chapter 4 and the activity with the mouse? No: the launcher is the one
    // place that needs a tap; from Start on, everything is keys.
    await page.click('.launch-item >> nth=3');
    await page.click('[data-act=dialogue]');
    await page.click('.launch-start');
    await page.waitForSelector('.class-run');
    const lines = c04.scenario.lines.length;
    for (let i = 1; i < lines; i++) {
      await page.keyboard.press(i % 3 === 0 ? 'PageDown' : i % 3 === 1 ? 'ArrowRight' : ' ');
      assert((await page.$$('.cl-bubble')).length === i + 1, `dialogue: line ${i + 1} of ${lines} builds on screen`);
    }
    await page.keyboard.press('h');
    assert((await page.$$('.cl-en')).length === lines, 'H shows the translations of every line');
    await page.keyboard.press('ArrowLeft');
    assert((await page.$$('.cl-bubble')).length === lines - 1, '← goes back a line');
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');
    assert(!!(await page.$('.cl-done')), 'the end of the run says nothing was saved');
    await page.click('.cl-done .btn:not(.btn-primary)');
    // A ⚡ 4 frame round, keyboard only.
    await page.waitForSelector('.launcher');
    await page.click('[data-act=xframes]');
    await page.click('.launch-start');
    await page.waitForSelector('.class-run[data-kind=frame]');
    const n = Number((await page.textContent('.cl-pos')).split('/')[1]);
    for (let i = 0; i < n; i++) {
      await page.keyboard.press('1');
      await page.keyboard.press('2');
      assert((await page.$$('.cl-built .tile')).length === 2, `⚡ frame ${i + 1}: keys 1 and 2 place two tiles`);
      await page.keyboard.press('r');
      assert(!!(await page.$('.cl-sentence')), `⚡ frame ${i + 1}: R reveals the sentence`);
      await page.keyboard.press('PageDown');
    }
    assert(!!(await page.$('.cl-done')), 'the ⚡ frame round ends');
    // Turn teacher mode off from the badge (one tap).
    await page.click('.class-run .teacher-badge');
    await page.waitForSelector('.home');
    assert(!(await page.evaluate(() => document.documentElement.hasAttribute('data-teacher'))) && !(await page.$('#teacher-strip')), 'one tap on the badge turns teacher mode off');
    assert(!(await page.$('.launcher')), 'Home is the phone Home again');
    await page.waitForTimeout(400);
    const stateAfter = await readKey(page, 'state');
    if (JSON.stringify(stateAfter) !== JSON.stringify(stateBefore)) for (const k of Object.keys(stateAfter)) if (JSON.stringify(stateAfter[k]) !== JSON.stringify(stateBefore[k])) console.log('DIFF', k, String(JSON.stringify(stateBefore[k])).slice(0, 300), '→', JSON.stringify(stateAfter[k]).slice(0, 300));
    assert(JSON.stringify(stateAfter) === JSON.stringify(stateBefore), 'the learner\'s saved state is exactly as before');
    assert((await flames(page)) === flamesBefore, `the learner's 🔥 are unchanged (${flamesBefore})`);
    assert((await readKey(page, 'teacher')).on === false, 'teacher mode off is saved on the device');
    await page.close();
  }

  // ---- 2. The ⚡ stage is open in teacher mode only ----
  {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    page.on('pageerror', (e) => errors.push(e.message));
    await seed(page, learner(), null);
    await page.goto(BASE + '#/sedia/5/x');
    await page.waitForSelector('.stretch-screen');
    assert(!(await page.$('.btn-stretch')), 'learner mode: ⚡ 5 is locked (no 🔥 lit)');
    await seed(page, learner(), { on: true, translations: false, lajuTimer: false, autoplay: false });
    await page.goto(BASE + '#/sedia/5/x');
    await page.waitForSelector('.stretch-screen');
    assert(!!(await page.$('.btn-stretch')), 'teacher mode: ⚡ 5 is open');
    // The upright-phone hint.
    await page.goto(BASE + '#/');
    await page.waitForSelector('.launcher');
    assert(await page.isVisible('.rotate-hint'), 'a phone held upright in teacher mode shows the «turn sideways» hint');
    await page.close();
  }

  // ---- 3. Fit at 844×390, and the screenshots ----
  const sizes = [[1280, 720], [1920, 1080], [844, 390], [1180, 820]];
  const themes = [['kancil-light', { palette: 'kancil', theme: 'light' }], ['rebel-dark', { palette: 'rebel', theme: 'dark' }]];
  for (const [tname, th] of themes)
    for (const [w, hgt] of sizes) {
      const page = await browser.newPage({ viewport: { width: w, height: hgt } });
      page.on('pageerror', (e) => errors.push(e.message));
      const tag = `${w}x${hgt}-${tname}`;
      const shot = (name) => page.screenshot({ path: path.join(OUT, `${tag}-${name}.png`) });
      const phone = w === 844;
      await seed(page, learner(th), { on: true, translations: false, lajuTimer: false, autoplay: false });
      await page.waitForSelector('.launcher');
      await page.click('.launch-item >> nth=3');
      await page.click('[data-act=xframes]');
      if (phone) assert(await page.evaluate(() => document.querySelector('.launcher').getBoundingClientRect().bottom <= innerHeight + 1), `${tag}: the launcher fits without scrolling`);
      await shot('01-launcher');
      // word card, hidden then revealed
      await page.click('[data-act=words]');
      await page.click('.launch-start');
      await page.waitForSelector('.class-run[data-kind=word]');
      assert(!!(await page.$('.cl-hidden')), `${tag}: a word card hides its translation`);
      await shot('02-word-hidden');
      await page.keyboard.press('r');
      assert(!(await page.$('.cl-hidden')) && !!(await page.$('.cl-gloss')), `${tag}: R reveals the meaning`);
      await shot('03-word-revealed');
      await page.click('.cl-exit');
      // a ⚡ frame
      await page.click('[data-act=xframes]');
      await page.click('.launch-start');
      await page.waitForSelector('.class-run[data-kind=frame]');
      await page.keyboard.press('1');
      await page.keyboard.press('1');
      if (phone) assert(await fits(page), `${tag}: a frame fits without scrolling`);
      await shot('04-frame');
      await page.keyboard.press('r');
      if (phone) assert(await fits(page), `${tag}: a revealed frame fits without scrolling`);
      await shot('05-frame-revealed');
      await page.click('.cl-exit');
      // the ⚡ dialogue mid-scene, and a reply step
      await page.click('[data-act=xdialogue]');
      await page.click('.launch-start');
      await page.waitForSelector('.class-run');
      for (let i = 0; i < 6; i++) await page.keyboard.press('PageDown');
      await page.keyboard.press('h');
      await shot('06-dialogue');
      await page.keyboard.press('h');
      for (let i = 0; i < 20 && !(await page.$('.class-run[data-kind=reply][data-revealed="0"]')); i++) await page.keyboard.press('PageDown');
      await page.keyboard.press('2');
      if (phone) assert(await fits(page), `${tag}: a reply step fits without scrolling`);
      await shot('07-reply');
      await page.keyboard.press('r');
      await shot('08-reply-revealed');
      await page.click('.cl-exit');
      // Cari Benda (chapter 4's picture scene)
      await page.click('[data-act=cari]');
      await page.click('.launch-start');
      await page.waitForSelector('.class-run[data-kind=cari]');
      await page.keyboard.press('3');
      await shot('09-cari');
      await page.click('.cl-exit');
      // Nombor & Masa: Masa round
      await page.click('[data-tab=nombor]');
      await page.click('.launch-item >> nth=5');
      await page.click('[data-act=nombor]');
      await page.click('.launch-start');
      await page.waitForSelector('.class-run[data-kind=nm]');
      await page.waitForTimeout(1100);
      await shot('10-nombor');
      await page.keyboard.press('r');
      await shot('11-nombor-revealed');
      await page.click('.cl-exit');
      // Settings with the switch
      await page.goto(BASE + '#/settings');
      await page.waitForSelector('#teacher-switch');
      await page.$eval('.teacher-setting', (el) => el.scrollIntoView({ block: 'center' }));
      await shot('12-settings');
      await page.close();
    }
  // the upright-phone hint, once per theme
  for (const [tname, th] of themes) {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await seed(page, learner(th), { on: true, translations: false, lajuTimer: false, autoplay: false });
    await page.waitForSelector('.launcher');
    await page.screenshot({ path: path.join(OUT, `390x844-${tname}-13-upright-hint.png`) });
    await page.close();
  }

  assert(errors.length === 0, 'no page errors' + (errors.length ? ': ' + errors.join(' | ') : ''));
  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
