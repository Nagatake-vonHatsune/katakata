// End-to-end: the ⚡ stage (Build A). A learner with chapter 4's flames lit (two from existing stamps, the dialogue from
// state.lines) sees the "4 ⚡" chip, opens ⚡ 4 and plays a run through (new extension words, two decoy frames, three
// replies); «beri», known from Jambatan under its old ID, starts known (moved cards). Then a chapter dialogue is played
// once and its 🔥 lights. Phone-width screenshots of every screen in kancil light and dark and rebel light and dark go to
// docs/stretch-stage/ (or STRETCH_SHOT_DIR).
// Run against a preview server: npx vite build && npx vite preview --port 4173, then node tests/e2e/stretch.cjs
const { chromium, devices } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE = process.env.BASE_URL || 'http://localhost:4173/';
const OUT = process.env.STRETCH_SHOT_DIR || path.join(__dirname, '..', '..', 'docs', 'stretch-stage');
fs.mkdirSync(OUT, { recursive: true });
const assert = (ok, msg) => {
  if (!ok) throw new Error('FAILED: ' + msg);
  console.log('ok:', msg);
};

const ROOT = path.join(__dirname, '..', '..');
const pack = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, 'content', 'ms', rel), 'utf8'));
const kelas = Object.fromEntries([1, 2, 3, 4, 5].map((n) => [n, pack(`kelas/c${String(n).padStart(2, '0')}.json`)]));
const x04 = pack('stretch/x04.json');
const allCards = new Map();
for (const dir of ['kelas', 'dunia', 'jambatan', 'stretch'])
  for (const f of fs.readdirSync(path.join(ROOT, 'content', 'ms', dir), { recursive: true }).filter((f) => f.endsWith('.json')))
    for (const c of pack(`${dir}/${f}`).cards) allCards.set(c.id, c);

const DAY = 86400000;
const NOW = Date.now();
const known = () => ({ ease: 2.5, interval: 10, reps: 3, due: NOW + 5 * DAY, lapses: 0, last: NOW - DAY });
const stamp = (kind, chapter) => ({ id: `st-${kind}-${chapter}`, kind, date: '2026-11-10', chapter });
const replyIds = (n) => kelas[n].scenario.lines.slice(1).map((l) => l.id);

/**
 * Chapter 1: some prep (0 flames). Chapter 2: the 'ready' stamp (1). Chapter 3: 'ready' + the dialogue played (2).
 * Chapter 4: 'ready' and 'chapter' stamps from before the update, no schedules, the dialogue played (3, ⚡ open).
 * «beri» known under its old Jambatan ID ms-j-social-22. allStretch: every ⚡ 4 card already known.
 */
function seededState(settings = {}, allStretch = false) {
  const srs = {};
  for (const id of kelas[1].sedia_kelas.cards.slice(0, 9)) srs[id] = known();
  srs['ms-j-social-22'] = known();
  if (allStretch) for (const c of x04.cards) srs[c.id] = known();
  const lines = {};
  for (const id of [...replyIds(3), ...replyIds(4)]) lines[id] = { tries: 1, correct: 1 };
  return {
    schemaVersion: 1,
    createdAt: new Date(NOW - 30 * DAY).toISOString(),
    profile: { name: 'Tanaka', onboarded: true, voice: 'none' },
    settings: { lang: 'ja', theme: 'light', kanaHints: true, backupReminder: false, speechRate: 0.9, palette: 'kancil', textSize: 'm', showPoints: true, ...settings },
    srs,
    kanaSeen: {},
    frames: {},
    lines,
    myHooks: {},
    questions: [],
    reports: [],
    stamps: [stamp('ready', 2), stamp('ready', 3), stamp('ready', 4), stamp('chapter', 4)],
    studySeconds: {},
    howToSeen: { kad: true, cari: true, susun: true, reply: true },
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

const readState = (page) =>
  page.evaluate(
    () =>
      new Promise((resolve) => {
        const req = indexedDB.open('katakata', 1);
        req.onsuccess = () => {
          const g = req.result.transaction('kv').objectStore('kv').get('state');
          g.onsuccess = () => resolve(g.result);
        };
      }),
  );

/** Play the running session to its summary, answering right where the answer can be read off the screen. */
async function play(page, hooks = {}) {
  const seen = { susun: 0, reply: 0, decoy: 0 };
  for (let i = 0; i < 150; i++) {
    if (await page.locator('.summary').count()) return seen;
    const howto = page.getByRole('button', { name: 'わかった' });
    if (await howto.count()) await howto.click();
    const body = page.locator('.step-body');
    await body.waitFor();
    if (await body.locator('.tiles-bank').count()) {
      seen.susun++;
      const bank = await body.locator('.tiles-bank .tile').allInnerTexts();
      const frame = x04.frames.find((f) => [...f.example.split(/\s+/), ...(f.decoys ?? [])].sort().join('|') === bank.slice().sort().join('|'));
      if (frame) {
        seen.decoy++;
        if (seen.decoy === 1 && hooks.decoy) await hooks.decoy();
        for (const w of frame.example.split(/\s+/)) await body.locator('.tiles-bank .tile', { hasText: new RegExp(`^${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`) }).first().click();
        await body.getByRole('button', { name: '答え合わせ' }).click();
        assert(await body.locator('.feedback.ok').count(), `⚡ frame built with the decoy left out: «${frame.example}»`);
      } else {
        await body.getByRole('button', { name: 'わからない' }).click();
      }
    } else if (await body.locator('.opt-reply').count()) {
      seen.reply++;
      if (seen.reply === 1 && hooks.reply) await hooks.reply();
      await body.locator('.opt-reply[data-right="1"]').click();
    } else if (await body.locator('.opt').count()) {
      const term = (await body.locator('.term').count()) ? (await body.locator('.term').first().innerText()).trim() : null;
      const gl = (await body.locator('.prompt-gloss').count()) ? (await body.locator('.prompt-gloss').first().innerText()).trim() : null;
      const card = [...allCards.values()].find((c) => (term && c.term === term) || (gl && c.gloss_ja === gl));
      const right = card ? body.locator(`.opt[data-id="${card.id}"]`) : null;
      if (right && (await right.count())) await right.click();
      else await body.locator('.opt').first().click();
    } else if (await body.getByRole('button', { name: '答えを見る' }).count()) {
      await body.getByRole('button', { name: '答えを見る' }).click();
      await body.locator('.rate-good').click();
      continue;
    }
    await page.locator('.btn-next').click();
  }
  throw new Error('FAILED: the session did not reach its summary');
}

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ ...devices['Pixel 7'] });
  await ctx.addInitScript(() => {
    let a = 0x2f6b4f;
    Math.random = () => {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  });
  const errors = [];
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  const shot = (p, n, full = false) => p.screenshot({ path: path.join(OUT, n + '.png'), fullPage: full });

  // 1. The Sedia list: 0, 1, 2 and 3 flames, and the chip on chapter 4 only.
  await seed(page, seededState());
  await page.goto(BASE + '#/sedia');
  await page.waitForSelector('.sedia-row');
  const flames = await page.locator('.sedia-row .cp').evaluateAll((els) => els.slice(0, 5).map((e) => Number(e.dataset.flames)));
  assert(JSON.stringify(flames) === '[0,1,2,3,0]', `chapters 1 to 5 show 0, 1, 2, 3 and 0 flames (got ${flames})`);
  assert((await page.locator('.stretch-chip').count()) === 1, 'exactly one ⚡ chip (chapter 4)');
  assert((await page.locator('.stretch-chip').innerText()).trim() === '4 ⚡', 'the chip reads "4 ⚡" (no stage name)');
  const marks = await page.locator('.sedia-row').nth(3).locator('.cp-mark').count();
  assert(marks === 3, 'chapter 4 has three checkpoint marks');
  const status = await page.locator('.sedia-row').nth(0).locator('.cp-status').innerText();
  assert(/^🔥 0\/3 · /.test(status), `status line for 0 flames: ${status}`);

  // 2. ⚡ 4 from the chip.
  await page.locator('.stretch-chip').click();
  await page.waitForSelector('.stretch-screen');
  assert((await page.locator('.topbar-title').innerText()).trim() === '4 ⚡', 'the ⚡ screen top bar is "4 ⚡"');
  assert(await page.locator('.word-list li.known', { hasText: 'beri' }).count(), '«beri» starts known (schedule moved from its Jambatan ID)');
  await page.locator('.btn-stretch').click();
  const seen = await play(page);
  assert(seen.decoy === 2 && seen.reply === 3, `the run had two decoy frames and three replies (${JSON.stringify(seen)})`);
  assert(await page.locator('.stretch-open', { hasText: '第4課の ⚡ が開きました' }).count(), 'the one-time "⚡ is open" notice in the summary');
  const st = await readState(page);
  const metX = Object.keys(st.srs).filter((k) => k.startsWith('ms-x04-')).length;
  assert(metX >= 9, `⚡ cards met (${metX}: 8 new and the moved «beri»)`);
  assert(Object.keys(st.lines).filter((k) => k.startsWith('ms-x04-d')).length === 3, 'three ⚡ replies recorded in state.lines');
  assert(Object.keys(st.frames).filter((k) => k.startsWith('ms-x04-f') && st.frames[k].correct > 0).length === 2, 'two ⚡ frames built');
  assert(st.howToSeen['stretch-4'] === true, 'the notice is marked seen');

  // 3. A chapter dialogue played once lights its 🔥 (chapter 2: 1 -> 2 flames).
  await page.goto(BASE + '#/sedia/2');
  await page.reload();
  await page.getByRole('button', { name: '会話をする' }).click();
  await play(page);
  await page.goto(BASE + '#/sedia');
  await page.reload(); // leave the summary (hash changes are ignored until the session is closed)
  await page.waitForSelector('.sedia-row');
  const f2 = await page.locator('.sedia-row').nth(1).locator('.cp').getAttribute('data-flames');
  assert(f2 === '2', `chapter 2 has 2 flames after its dialogue (got ${f2})`);
  const st2 = await readState(page);
  assert(st2.stamps.some((s) => s.kind === 'dialogue' && s.chapter === 2), 'the dialogue stamp for chapter 2');

  // 4. Laju! is ⏱️ on Home, and Rekod shows the flames.
  await page.goto(BASE);
  await page.reload();
  await page.waitForSelector('.today');
  const tile = await page.locator('.mode', { hasText: 'スピード' }).innerText();
  assert(tile.includes('⏱️') && !tile.includes('⚡'), 'the Laju! tile is ⏱️');
  await page.goto(BASE + '#/rekod');
  await page.waitForSelector('.prog-row');
  const rekod4 = await page.locator('.prog-row').nth(3).locator('.rekod-flames').innerText();
  assert(rekod4.trim() === '🔥🔥🔥', `Rekod chapter 4 shows three flames (got ${rekod4})`);

  // 5. Screenshots in four themes (a state with every ⚡ card known, so the run reaches the frames and replies quickly).
  for (const [palette, theme] of [['kancil', 'light'], ['kancil', 'dark'], ['rebel', 'light'], ['rebel', 'dark']]) {
    const p = await ctx.newPage();
    p.on('pageerror', (e) => errors.push(e.message));
    const tag = `${palette}-${theme}`;
    await seed(p, seededState({ palette, theme }, true));
    await p.goto(BASE + '#/sedia');
    await p.waitForSelector('.sedia-row');
    await shot(p, `01-sedia-list-${tag}`);
    await p.locator('.sedia-row').nth(3).screenshot({ path: path.join(OUT, `02-chip-${tag}.png`) });
    await p.locator('.stretch-chip').click();
    await p.waitForSelector('.stretch-screen');
    await shot(p, `03-stretch-screen-${tag}`);
    await p.locator('.btn-stretch').click();
    await play(p, { decoy: () => shot(p, `04-decoy-frame-${tag}`), reply: () => shot(p, `05-reply-step-${tag}`) });
    await shot(p, `06-summary-${tag}`);
    await p.goto(BASE);
    await p.reload();
    await p.waitForSelector('.today');
    await p.locator('.modes').scrollIntoViewIfNeeded();
    await shot(p, `07-home-laju-${tag}`);
    await p.goto(BASE + '#/rekod');
    await p.waitForSelector('.prog-row');
    await p.locator('.prog-row').nth(3).scrollIntoViewIfNeeded();
    await shot(p, `08-rekod-${tag}`);
    await p.close();
  }

  assert(errors.length === 0, 'no page errors' + (errors.length ? ': ' + errors.join(' | ') : ''));
  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
