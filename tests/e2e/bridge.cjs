// Cross-app test: Kata-Kata exports a word file, Hanashishou imports it.
// Needs both apps built and previewed: Kata-Kata on 4173, Hanashishou on 4179.
const { chromium, devices } = require('playwright');
const fs = require('fs');
const path = require('path');
const KK = process.env.KK_URL || 'http://localhost:4173/';
const HS = process.env.HS_URL || 'http://localhost:4179/';
const OUT = process.env.SHOT_DIR || path.join(__dirname, '..', '..', 'test-results');
fs.mkdirSync(OUT, { recursive: true });

(async () => {
  const browser = await browser_launch();
  async function browser_launch() { return chromium.launch(); }
  const errors = [];
  // 1. Kata-Kata learner who knows some words (seeded save).
  const kk = await browser.newContext({ ...devices['Pixel 7'], acceptDownloads: true });
  const p = await kk.newPage();
  p.on('pageerror', (e) => errors.push('kk: ' + e.message));
  await p.goto(KK);
  const ids = ['ms-c01-002', 'ms-d-bank-pos-08', 'ms-d-bank-pos-13', 'ms-j-daily-life-01', 'ms-j-office-02', 'ms-d-badan-klinik-04'];
  await p.evaluate(async (ids) => {
    const now = Date.now();
    const state = {
      schemaVersion: 1, createdAt: new Date().toISOString(),
      profile: { name: 'Aiko', onboarded: true }, settings: { lang: 'ja', theme: 'auto', kanaHints: true, backupReminder: false, speechRate: 0.9 },
      srs: Object.fromEntries(ids.map((id, i) => [id, { ease: 2.5, interval: 6, reps: 2, due: now + 86400000 * (i + 1), lapses: 0, last: now }])),
      kanaSeen: {}, frames: {}, myHooks: {}, questions: [], reports: [], stamps: [], studySeconds: {}, howToSeen: {},
    };
    await new Promise((res, rej) => {
      const r = indexedDB.open('katakata', 1);
      r.onupgradeneeded = () => r.result.createObjectStore('kv');
      r.onsuccess = () => { const tx = r.result.transaction('kv', 'readwrite'); tx.objectStore('kv').put(state, 'state'); tx.oncomplete = res; tx.onerror = rej; };
    });
  }, ids);
  await p.goto(KK + '#/jambatan');
  await p.reload();
  await p.waitForSelector('.bridge-hero');
  await p.screenshot({ path: path.join(OUT, 'b1-katakata-jambatan.png') });
  const [dl] = await Promise.all([p.waitForEvent('download'), p.getByRole('button', { name: /単語ファイルを書き出す/ }).click()]);
  const file = path.join(OUT, dl.suggestedFilename());
  await dl.saveAs(file);
  const lib = JSON.parse(fs.readFileSync(file, 'utf8'));
  console.log('kata-kata export:', dl.suggestedFilename(), 'words', lib.words.length, 'in hanashishou', lib.words.filter((w) => w.inHanashishou).length);

  // 2. New Hanashishou student arrives from Kata-Kata.
  const hs = await browser.newContext({ ...devices['Pixel 7'] });
  const h = await hs.newPage();
  h.on('pageerror', (e) => errors.push('hs: ' + e.message));
  await h.goto(HS + '#/katakata?ui=ja');
  await h.waitForSelector('[data-testid=katakata-pick]');
  await h.setInputFiles('[data-testid=katakata-file]', file);
  await h.waitForSelector('[data-testid=katakata-preview]');
  console.log('preview:', (await h.locator('[data-testid=katakata-add]').textContent()).trim());
  await h.screenshot({ path: path.join(OUT, 'b2-hanashishou-preview.png') });
  await h.click('[data-testid=katakata-confirm]');
  await h.waitForSelector('[data-testid=katakata-done]');
  await h.screenshot({ path: path.join(OUT, 'b3-hanashishou-done.png') });
  const saved = await h.evaluate(async () => {
    const db = await new Promise((res) => { const r = indexedDB.open('hanashishou'); r.onsuccess = () => res(r.result); });
    const get = (k) => new Promise((res) => { const q = db.transaction('profile').objectStore('profile').get(k); q.onsuccess = () => res(q.result); });
    return { settings: await get('settings'), vocab: await get('vocab'), levels: await get('levels') };
  });
  const keys = Object.keys(saved.vocab || {});
  console.log('hanashishou: target', saved.settings.targetLang, 'ui', saved.settings.uiLang, 'support', saved.settings.supportLang, 'ms band', saved.levels?.ms?.band, 'deck', keys);
  const pos = saved.vocab['ms:pejabat pos'];
  console.log('pejabat pos interval carried over:', pos?.srs?.interval === 6 && pos?.srs?.reps === 2);
  await h.click('[data-testid=katakata-setup]');
  await h.waitForTimeout(800);
  await h.screenshot({ path: path.join(OUT, 'b4-hanashishou-onboarding.png') });
  console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'no page errors');
  await browser.close();
  if (errors.length || saved.settings.targetLang !== 'ms' || !keys.length) process.exit(1);
})().catch((e) => { console.error(e); process.exit(1); });
