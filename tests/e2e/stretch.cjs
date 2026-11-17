// End-to-end: the ⚡ stage (Build A; Build B1, 17 Nov 2026). A learner with chapter 4's flames lit (two from existing stamps,
// the dialogue from a passed play-through in state.dialogues) sees the "4 ⚡" chip, opens ⚡ 4 and plays a run through (new
// extension words, two decoy frames, three replies); «beri», known from Jambatan under its old ID, starts known (moved cards).
// Then the chapter 2 dialogue is played twice: at 40 % (4 of 10 right first time) its 🔥 stays out, at 60 % (6 of 10) it
// lights (Sam, 17 Nov 2026). A chapter with every 🔥 lit and no ⚡ pack shows a greyed "⚡ soon" that is not a button.
// Phone-width screenshots of every screen in kancil light and dark and rebel light and dark go to docs/stretch-stage/
// (or STRETCH_SHOT_DIR), and each ⚡ screen once in kancil light.
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
const kelas = Object.fromEntries(Array.from({ length: 18 }, (_, i) => i + 1).map((n) => [n, pack(`kelas/c${String(n).padStart(2, '0')}.json`)]));
const stretch = fs.readdirSync(path.join(ROOT, 'content', 'ms', 'stretch')).filter((f) => /^x\d\d\.json$/.test(f)).sort().map((f) => pack(`stretch/${f}`));
const x04 = pack('stretch/x04.json');
const allFrames = stretch.flatMap((x) => x.frames);
const allCards = new Map();
for (const dir of ['kelas', 'dunia', 'jambatan', 'stretch'])
  for (const f of fs.readdirSync(path.join(ROOT, 'content', 'ms', dir), { recursive: true }).filter((f) => f.endsWith('.json')))
    for (const c of pack(`${dir}/${f}`).cards) allCards.set(c.id, c);

const DAY = 86400000;
const NOW = Date.now();
const known = () => ({ ease: 2.5, interval: 10, reps: 3, due: NOW + 5 * DAY, lapses: 0, last: NOW - DAY });
const stamp = (kind, chapter) => ({ id: `st-${kind}-${chapter}`, kind, date: '2026-11-10', chapter });
const replyIds = (n) => kelas[n].scenario.lines.slice(1).map((l) => l.id);
const passed = (n) => ({ best: replyIds(n).length, total: replyIds(n).length, plays: 1, last: '2026-11-10T00:00:00Z' });
// The first chapter from 10 on with no ⚡ pack (Build B1 builds 1 to 9): "⚡ soon" once its flames are lit.
const SOON = Object.keys(kelas).map(Number).find((n) => n >= 10 && n < 18 && !stretch.some((x) => x.chapter === n));

/**
 * Chapter 1: some prep (0 flames). Chapter 2: the 'ready' stamp (1). Chapter 3: 'ready' + the dialogue played (2).
 * Chapter 4: 'ready' and 'chapter' stamps from before the update, no schedules, the dialogue passed (3, ⚡ open).
 * Chapter SOON (no ⚡ pack): every flame from stamps, so it shows "⚡ soon".
 * «beri» known under its old Jambatan ID ms-j-social-22. allStretch: every ⚡ 4 card already known.
 */
function seededState(settings = {}, allStretch = false) {
  const srs = {};
  for (const id of kelas[1].sedia_kelas.cards.slice(0, 9)) srs[id] = known();
  srs['ms-j-social-22'] = known();
  if (allStretch) for (const c of x04.cards) srs[c.id] = known();
  const lines = {};
  for (const id of [...replyIds(3), ...replyIds(4)]) lines[id] = { tries: 1, correct: 1 };
  const pad = (n) => String(n).padStart(2, '0');
  const dialogues = { [`c${pad(3)}`]: passed(3), [`c${pad(4)}`]: passed(4) };
  return {
    schemaVersion: 1,
    createdAt: new Date(NOW - 30 * DAY).toISOString(),
    profile: { name: 'Tanaka', onboarded: true, voice: 'none' },
    settings: { lang: 'ja', theme: 'light', kanaHints: true, backupReminder: false, speechRate: 0.9, palette: 'kancil', textSize: 'm', showPoints: true, ...settings },
    srs,
    kanaSeen: {},
    frames: {},
    lines,
    dialogues,
    myHooks: {},
    questions: [],
    reports: [],
    stamps: [stamp('ready', 2), stamp('ready', 3), stamp('ready', 4), stamp('chapter', 4), stamp('ready', SOON), stamp('dialogue', SOON), stamp('chapter', SOON)],
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

/**
 * Play the running session to its summary, answering right where the answer can be read off the screen. hooks.firstTry(k)
 * decides the k-th first try of a reply line (false: a wrong reply); retries (a line seen before) are answered right.
 * hooks.replied runs after a reply step is answered (for a screenshot with the score).
 */
async function play(page, hooks = {}) {
  const seen = { susun: 0, reply: 0, decoy: 0, firstTries: 0 };
  const replied = new Set();
  for (let i = 0; i < 150; i++) {
    if (await page.locator('.summary').count()) return seen;
    const howto = page.getByRole('button', { name: 'わかった' });
    if (await howto.count()) await howto.click();
    const body = page.locator('.step-body');
    await body.waitFor();
    if (await body.locator('.tiles-bank').count()) {
      seen.susun++;
      const bank = await body.locator('.tiles-bank .tile').allInnerTexts();
      const frame = allFrames.find((f) => [...f.example.split(/\s+/), ...(f.decoys ?? [])].sort().join('|') === bank.slice().sort().join('|'));
      if (frame) {
        seen.decoy++;
        if (seen.decoy === 1 && hooks.decoy) await hooks.decoy();
        for (const w of frame.example.split(/\s+/)) await body.locator('.tiles-bank .tile', { hasText: new RegExp(`^${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`) }).first().click();
        await body.getByRole('button', { name: '答え合わせ' }).click();
        assert(await body.locator('.feedback.ok').count(), `⚡ frame built with the decoy left out: «${frame.example}»`);
      } else {
        await body.getByRole('button', { name: 'わからない' }).click();
      }
    } else if (await body.locator('.cari-obj').count()) {
      seen.cari = (seen.cari ?? 0) + 1;
      if (seen.cari === 1 && hooks.cari) await hooks.cari();
      const term = (await body.locator('.cari-word').innerText()).trim();
      const card = [...allCards.values()].find((c) => c.term === term && c.image);
      await body.locator(card ? `.cari-obj[data-id="${card.id}"]` : '.cari-obj').first().click();
    } else if (await body.locator('.opt-reply').count()) {
      seen.reply++;
      if (seen.reply === 1 && hooks.reply) await hooks.reply();
      const key = (await body.locator('.opt-reply[data-right="1"]').innerText()).trim();
      const first = !replied.has(key);
      replied.add(key);
      const right = !first || !hooks.firstTry || hooks.firstTry(seen.firstTries);
      if (first) seen.firstTries++;
      await body.locator(`.opt-reply[data-right="${right ? 1 : 0}"]`).first().click();
      if (hooks.replied) await hooks.replied(seen.reply);
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
  assert((await page.locator('button.stretch-chip').count()) === 1, 'exactly one ⚡ chip button (chapter 4)');
  assert((await page.locator('button.stretch-chip').innerText()).trim() === '4 ⚡', 'the chip reads "4 ⚡" (no stage name)');
  const marks = await page.locator('.sedia-row').nth(3).locator('.cp-mark').count();
  assert(marks === 3, 'chapter 4 has three checkpoint marks');
  const status = await page.locator('.sedia-row').nth(0).locator('.cp-status').innerText();
  assert(/^🔥 0\/3 · /.test(status), `status line for 0 flames: ${status}`);

  // 2. ⚡ 4 from the chip.
  await page.locator('button.stretch-chip').click();
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

  // 3. The chapter 2 dialogue (10 reply steps, 6 needed): 40 % leaves its 🔥 out, 60 % lights it (1 -> 2 flames).
  const n2 = replyIds(2).length;
  const need2 = Math.ceil((n2 * 3) / 5);
  const playDialogue2 = async (right) => {
    await page.goto(BASE + '#/sedia/2');
    await page.reload();
    await page.getByRole('button', { name: '会話をする' }).click();
    const r = await play(page, { firstTry: (k) => k < right });
    assert(r.firstTries === n2, `chapter 2 dialogue: ${n2} first tries (got ${r.firstTries})`);
    const score = (await page.locator('.summary .dialogue-result .dialogue-score').innerText()).trim();
    assert(score === `${right}/${n2}・合格に${need2}問`, `the summary shows the score and how many were needed: «${score}»`);
    await page.goto(BASE + '#/sedia');
    await page.reload(); // leave the summary (hash changes are ignored until the session is closed)
    await page.waitForSelector('.sedia-row');
    return page.locator('.sedia-row').nth(1).locator('.cp').getAttribute('data-flames');
  };
  const low = Math.floor((n2 * 2) / 5);
  const f40 = await playDialogue2(low);
  assert(f40 === '1', `chapter 2 at ${low}/${n2} (40 %): the dialogue 🔥 stays out (flames ${f40})`);
  const st40 = await readState(page);
  assert(!st40.stamps.some((s) => s.kind === 'dialogue' && s.chapter === 2), 'no dialogue stamp at 40 %');
  assert(st40.dialogues.c02.best === low && st40.dialogues.c02.plays === 1, `best score recorded (${JSON.stringify(st40.dialogues.c02)})`);
  const f60 = await playDialogue2(need2);
  assert(f60 === '2', `chapter 2 at ${need2}/${n2} (60 %): the dialogue 🔥 lights (flames ${f60})`);
  const st2 = await readState(page);
  assert(st2.stamps.some((s) => s.kind === 'dialogue' && s.chapter === 2), 'the dialogue stamp for chapter 2');
  assert(st2.dialogues.c02.best === need2 && st2.dialogues.c02.plays === 2, 'the best score is kept');

  // 3b. "⚡ soon": a chapter with every 🔥 lit and no ⚡ pack; greyed, labelled, not a button, not tappable.
  const soon = page.locator('.sedia-row').nth(SOON - 1).locator('.stretch-soon');
  assert((await soon.count()) === 1, `chapter ${SOON} (no ⚡ pack, every 🔥 lit) shows "⚡ soon"`);
  assert((await soon.innerText()).trim() === '⚡ 準備中', 'it reads "⚡ 準備中" in Japanese');
  assert((await soon.evaluate((e) => e.tagName)) === 'SPAN' && (await soon.getAttribute('aria-disabled')) === 'true', 'it is not a button (aria-disabled)');
  assert(((await soon.getAttribute('aria-label')) || '').includes(`第${SOON}課`), 'it has an aria-label');
  await soon.click({ force: true });
  assert((await page.locator('.stretch-screen').count()) === 0, 'tapping it opens nothing');

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
    await p.locator('.sedia-row').nth(SOON - 1).scrollIntoViewIfNeeded();
    await shot(p, `09-sedia-soon-${tag}`);
    await p.locator('.sedia-row').nth(SOON - 1).screenshot({ path: path.join(OUT, `09-soon-row-${tag}.png`) });
    await p.evaluate(() => window.scrollTo(0, 0));
    await p.locator('button.stretch-chip').click();
    await p.waitForSelector('.stretch-screen');
    await shot(p, `03-stretch-screen-${tag}`);
    await p.locator('.btn-stretch').click();
    await play(p, { decoy: () => shot(p, `04-decoy-frame-${tag}`), reply: () => shot(p, `05-reply-step-${tag}`) });
    await shot(p, `06-summary-${tag}`);
    // The whole ⚡ dialogue: a reply step with its score, and the summary's score card.
    await p.goto(BASE + '#/sedia/4/x');
    await p.reload();
    await p.waitForSelector('.stretch-screen');
    await p.locator('.stretch-outline').first().click();
    await play(p, { firstTry: (k) => k !== 1, replied: (i) => (i === 2 ? shot(p, `10-reply-score-${tag}`) : null) });
    await shot(p, `11-dialogue-score-${tag}`);
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

  // 6. Each ⚡ screen once, in kancil light (every chapter with a ⚡ pack opened from stamps).
  {
    const p = await ctx.newPage();
    p.on('pageerror', (e) => errors.push(e.message));
    const st = seededState();
    for (const x of stretch) st.stamps.push(stamp('ready', x.chapter), stamp('dialogue', x.chapter), stamp('chapter', x.chapter));
    await seed(p, st);
    for (const x of stretch) {
      await p.goto(BASE + `#/sedia/${x.chapter}/x`);
      await p.reload();
      await p.waitForSelector('.stretch-screen');
      assert((await p.locator('.btn-stretch').count()) === 1, `⚡ ${x.chapter} opens from its flames`);
      await shot(p, `x${String(x.chapter).padStart(2, '0')}-screen-kancil-light`, true);
    }
    await p.close();
  }

  // 7. Cari Benda ⚡: a ⚡ run of a chapter with a picture board ends with three rounds on a board of six.
  for (const x of stretch.filter((p) => p.cari)) {
    const p = await ctx.newPage();
    p.on('pageerror', (e) => errors.push(e.message));
    const st = seededState();
    st.stamps.push(stamp('ready', x.chapter), stamp('dialogue', x.chapter), stamp('chapter', x.chapter));
    for (const c of x.cards) st.srs[c.id] = known();
    await seed(p, st);
    await p.goto(BASE + `#/sedia/${x.chapter}/x`);
    await p.reload();
    await p.waitForSelector('.stretch-screen');
    await p.locator('.btn-stretch').click();
    let board = 0;
    const r = await play(p, { cari: async () => { board = await p.locator('.cari-obj').count(); await shot(p, `x${String(x.chapter).padStart(2, '0')}-cari-kancil-light`); } });
    assert(r.cari === 3 && board === 6, `⚡ ${x.chapter}: three Cari Benda rounds on a board of six (${r.cari}, ${board})`);
    await p.close();
  }

  assert(errors.length === 0, 'no page errors' + (errors.length ? ': ' + errors.join(' | ') : ''));
  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
