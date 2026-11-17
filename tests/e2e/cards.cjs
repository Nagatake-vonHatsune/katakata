// End-to-end: memory cards, student slots, progress reports and the Teacher Desk (Sam, 17 Nov 2026). In teacher mode two
// student slots are made from memory cards; a round is played in one; after switching, the other is unchanged. A card with a
// matching name asks: update or keep both. Both cards are saved, a progress report is made and loaded into the Teacher Desk.
// Screenshots (phone 390×844 and 1280×720) go to docs/teacher-mode/cards/ (or CARDS_SHOT_DIR).
// Run against a preview server: npx vite build && npx vite preview --port 4173, then node tests/e2e/cards.cjs
const { chromium } = require('playwright');
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');

const BASE = process.env.BASE_URL || 'http://localhost:4173/';
const OUT = process.env.CARDS_SHOT_DIR || path.join(__dirname, '..', '..', 'docs', 'teacher-mode', 'cards');
fs.mkdirSync(OUT, { recursive: true });
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'kk-cards-'));
const assert = (ok, msg) => {
  if (!ok) throw new Error('FAILED: ' + msg);
  console.log('ok:', msg);
};
const ROOT = path.join(__dirname, '..', '..');
const pack = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, 'content', 'ms', rel), 'utf8'));
const c03 = pack('kelas/c03.json');
const c04 = pack('kelas/c04.json');
const DAY = 86400000;
const NOW = Date.now();

// The savefile format, as src/core/savefile.ts writes it (stable JSON, SHA-256 checksum).
function stable(v) {
  if (Array.isArray(v)) return '[' + v.map(stable).join(',') + ']';
  if (v && typeof v === 'object')
    return '{' + Object.keys(v).filter((k) => v[k] !== undefined).sort().map((k) => JSON.stringify(k) + ':' + stable(v[k])).join(',') + '}';
  return JSON.stringify(v);
}
function card(state, savedAt) {
  return { app: 'katakata', kind: 'katakata-savefile', schemaVersion: 1, savedAt, checksum: crypto.createHash('sha256').update(stable(state)).digest('hex'), state };
}
function learner(name, chapterPack, n, lang = 'ja') {
  const srs = {};
  // Known, and due now, so a Review round has something to ask.
  for (const id of chapterPack.sedia_kelas.cards.slice(0, n)) srs[id] = { ease: 2.5, interval: 6, reps: 2, due: NOW - DAY, lapses: 0, last: NOW - 7 * DAY };
  return {
    schemaVersion: 1,
    createdAt: new Date(NOW - 20 * DAY).toISOString(),
    profile: { name, onboarded: true, voice: 'none' },
    settings: { lang, theme: 'light', kanaHints: false, backupReminder: false, speechRate: 0.9, palette: 'kancil', textSize: 'm', showPoints: true },
    srs,
    kanaSeen: {},
    frames: {},
    lines: {},
    dialogues: {},
    myHooks: {},
    questions: [{ id: 'q-1', createdAt: new Date(NOW - DAY).toISOString(), type: 'usage', text: 'When is «sudah» used?', context: { kind: 'general' }, answered: false }],
    reports: [],
    stamps: [{ id: 'st-d', kind: 'day', date: new Date(NOW - DAY).toISOString().slice(0, 10) }],
    studySeconds: {},
    howToSeen: { kad: true, cari: true, susun: true, reply: true },
    scores: { bestSession: 0, bestCombo: 0, fastestMs: null, total: 0, lajuBest: 0, lajuPlays: 0 },
    mistakes: { log: [{ id: chapterPack.sedia_kelas.cards[0], game: 'kad-mc', answer: 'something else', right: 'the right one', date: new Date(NOW - 2 * DAY).toISOString() }], counts: { [chapterPack.sedia_kelas.cards[0]]: 1 } },
    nombor: { masa: { plays: 1, best: 6, total: 8, last: new Date(NOW - DAY).toISOString() } },
  };
}
const write = (name, data) => {
  const p = path.join(TMP, name);
  fs.writeFileSync(p, typeof data === 'string' ? data : JSON.stringify(data));
  return p;
};
const sam = learner('Sam', c03, 6, 'en');
const aikoCard = write('katakata-card_Aiko-Test_2026-11-15.json', card(learner('Aiko Test', c04, 10), new Date(NOW - 2 * DAY).toISOString()));
const benCard = write('katakata-card_Ben-Test_2026-11-15.json', card(learner('Ben Test', c03, 8), new Date(NOW - 2 * DAY).toISOString()));
const aikoNewer = write('katakata-card_Aiko-Test_2026-11-17.json', card(learner('Aiko Test', c04, 12), new Date(NOW).toISOString()));

async function seed(page, state, teacherOn) {
  await page.goto(BASE);
  await page.evaluate(
    ([s, on]) =>
      new Promise((resolve) => {
        const req = indexedDB.open('katakata', 1);
        req.onupgradeneeded = () => req.result.createObjectStore('kv');
        req.onsuccess = () => {
          const tx = req.result.transaction('kv', 'readwrite');
          const kv = tx.objectStore('kv');
          kv.clear();
          kv.put(s, 'state');
          kv.put({ on, translations: false, lajuTimer: false, autoplay: false }, 'teacher');
          tx.oncomplete = () => resolve();
        };
      }),
    [state, teacherOn],
  );
  await page.reload();
}
const readKey = (page, key) =>
  page.evaluate(
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
async function choose(page, trigger, file) {
  const [chooser] = await Promise.all([page.waitForEvent('filechooser'), trigger()]);
  await chooser.setFiles(file);
}
async function download(page, trigger) {
  const [d] = await Promise.all([page.waitForEvent('download'), trigger()]);
  const p = path.join(TMP, d.suggestedFilename());
  await d.saveAs(p);
  return p;
}
/** Play the running session to its summary, answering with the first option (some right, some wrong). */
async function playRound(page) {
  for (let i = 0; i < 80; i++) {
    if (await page.$('.summary')) return;
    const opt = await page.$('.options .opt:not([disabled])');
    if (opt) {
      await opt.click();
      continue;
    }
    for (const sel of ['.rate-good', '.btn-next', '.stack .btn-primary']) {
      const b = await page.$(sel);
      if (b && (await b.isVisible())) {
        await b.click();
        break;
      }
    }
  }
  throw new Error('round did not finish');
}

(async () => {
  const browser = await chromium.launch();
  const errors = [];
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, acceptDownloads: true });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(e.message));
  await seed(page, sam, true);
  await page.waitForSelector('.launcher');
  assert((await page.textContent('#teacher-strip .slot-banner')).includes('Sam'), "Sam's own learner is the default slot");
  await page.click('.teacher-students');
  await page.waitForSelector('.students');

  // ---- two slots from cards ----
  for (const f of [aikoCard, benCard]) {
    await choose(page, () => page.click('.slot-plug'), f);
    await page.waitForSelector('.card-preview');
    await page.click('.slot-add');
    await page.waitForSelector('.toast');
    await page.evaluate(() => document.querySelector('.toast')?.remove());
  }
  await page.waitForFunction(() => document.querySelectorAll('.slot-row').length === 3);
  assert((await page.$$eval('.slot-name', (els) => els.map((e) => e.textContent))).join('|').includes('Aiko Test'), 'Aiko and Ben are plugged in as slots');
  await page.screenshot({ path: path.join(OUT, '1280x720-students.png') });

  // ---- the name-match prompt ----
  await choose(page, () => page.click('.slot-plug'), aikoNewer);
  await page.waitForSelector('.name-match');
  const prompt = await page.textContent('.sheet');
  assert(prompt.includes('Aiko Test') && (prompt.match(/2026|Nov|11月/g) ?? []).length >= 2, 'a card with a matching name shows both dates and asks: update or keep both');
  assert(!!(await page.$('.slot-update')) && !!(await page.$('.slot-keep-both')), 'the prompt offers Update and Keep both');
  await page.screenshot({ path: path.join(OUT, '1280x720-load-card-preview.png') });
  await page.click('.slot-update');
  await page.waitForSelector('.toast');
  await page.waitForFunction(() => document.querySelectorAll('.slot-row').length === 3);
  const autos = await readKey(page, 'autosaves');
  assert(autos?.length && autos[autos.length - 1].reason === 'update' && autos[autos.length - 1].name === 'Aiko Test', "Aiko's slot was auto-saved before the update");
  const ids = await page.$$eval('.slot-row', (els) => Object.fromEntries(els.map((e) => [e.querySelector('.slot-name').firstChild.textContent, e.getAttribute('data-slot')])));
  const benBefore = await readKey(page, `slot:${ids['Ben Test']}`);
  assert(Object.keys((await readKey(page, `slot:${ids['Aiko Test']}`)).srs).length === 12, "Update merged the newer card into Aiko's slot (12 words)");

  // ---- play in Aiko's slot ----
  await page.click(`.slot-row[data-slot="${ids['Aiko Test']}"] .slot-switch`);
  await page.waitForSelector(`#teacher-strip .slot-banner.student`);
  assert((await page.textContent('#teacher-strip .slot-banner')).includes('Aiko Test'), 'the banner shows whose slot is active');
  await page.goto(BASE + '#/');
  await page.waitForSelector('.slot-counts.student');
  await page.$eval('.ordinary-head', (el) => el.scrollIntoView());
  await page.screenshot({ path: path.join(OUT, '1280x720-slot-banner.png') });
  await page.goto(BASE + '#/ulang');
  await playRound(page);
  await page.click('.summary .btn-primary');
  await page.waitForSelector('.home');
  const aikoLive = await readKey(page, 'state');
  assert(aikoLive.profile.name === 'Aiko Test' && aikoLive.mistakes.log.length > 2, `the round counted for Aiko (${aikoLive.mistakes.log.length} mistakes logged)`);
  const aikoReviewed = Object.values(aikoLive.srs).filter((x) => x.last > NOW - 60000).length;
  assert(aikoReviewed > 0, `Aiko's reviews were saved (${aikoReviewed})`);

  // ---- switch to Ben: Ben is unchanged ----
  await page.goto(BASE + '#/students');
  await page.waitForSelector('.students');
  await page.click(`.slot-row[data-slot="${ids['Ben Test']}"] .slot-switch`);
  await page.waitForSelector(`.slot-row.active[data-slot="${ids['Ben Test']}"]`);
  const benLive = await readKey(page, 'state');
  assert(JSON.stringify(benLive.srs) === JSON.stringify(benBefore.srs) && JSON.stringify(benLive.mistakes) === JSON.stringify(benBefore.mistakes), "Ben's slot is unchanged by Aiko's round");
  const aikoSaved = await readKey(page, `slot:${ids['Aiko Test']}`);
  assert(JSON.stringify(aikoSaved.srs) === JSON.stringify(aikoLive.srs), "Aiko's slot was saved when switching away");
  assert(benLive.settings.lang === 'en', "the device keeps its own language (Sam's English) in Ben's slot");

  // ---- save both cards, make a report ----
  const aikoFile = await download(page, () => page.click(`.slot-row[data-slot="${ids['Aiko Test']}"] .slot-card`));
  const benFile = await download(page, () => page.click(`.slot-row[data-slot="${ids['Ben Test']}"] .slot-card`));
  assert(/^katakata-card_Aiko-Test_\d{4}-\d\d-\d\d\.json$/.test(path.basename(aikoFile)), `card filename ${path.basename(aikoFile)}`);
  const aikoJson = JSON.parse(fs.readFileSync(aikoFile, 'utf8'));
  assert(aikoJson.kind === 'katakata-savefile' && aikoJson.state.profile.name === 'Aiko Test' && aikoJson.state.settings.lang === 'ja', "Aiko's card has her progress and her own settings");
  assert(aikoJson.checksum === crypto.createHash('sha256').update(stable(aikoJson.state)).digest('hex'), "Aiko's card checksum is right");
  assert(JSON.parse(fs.readFileSync(benFile, 'utf8')).state.profile.name === 'Ben Test', "Ben's card is saved");
  const reportFile = await download(page, () => page.click(`.slot-row[data-slot="${ids['Aiko Test']}"] .slot-report`));
  assert(/^katakata-report_Aiko-Test_\d{4}-\d\d-\d\d\.html$/.test(path.basename(reportFile)), `report filename ${path.basename(reportFile)}`);
  const reportHtml = fs.readFileSync(reportFile, 'utf8');
  assert(!/<link|src=|https?:\/\//.test(reportHtml) && reportHtml.includes('id="katakata-report"'), 'the report is self-contained and embeds its JSON');

  // ---- Students screen and preview on a phone ----
  const phone = await ctx.newPage();
  await phone.setViewportSize({ width: 390, height: 844 });
  await phone.goto(BASE + '#/students');
  await phone.waitForSelector('.students');
  await phone.screenshot({ path: path.join(OUT, '390x844-students.png') });
  await choose(phone, () => phone.click('.slot-plug'), aikoNewer);
  await phone.waitForSelector('.name-match');
  await phone.screenshot({ path: path.join(OUT, '390x844-load-card-preview.png') });
  await phone.click('.sheet .btn-ghost');
  await phone.goto(BASE + '#/');
  await phone.waitForSelector('.slot-banner.student');
  await phone.screenshot({ path: path.join(OUT, '390x844-slot-banner.png') });
  await phone.close();

  // ---- the report on a phone and as print preview, en and ja ----
  for (const lang of ['en', 'ja']) {
    const p = await ctx.newPage();
    await p.setViewportSize({ width: 1280, height: 720 });
    await p.goto(BASE + '#/settings');
    await p.waitForSelector('.seg-lang');
    await p.evaluate((l) => document.querySelector(`.seg-lang [lang="${l}"]`).click(), lang);
    await p.goto(BASE + '#/students');
    await p.waitForSelector('.students');
    const f = await download(p, () => p.click(`.slot-row[data-slot="${ids['Aiko Test']}"] .slot-report`));
    const html = fs.readFileSync(f, 'utf8');
    assert(html.includes(`<html lang="${lang}">`) && html.includes(lang === 'ja' ? '見直す間違い' : 'Mistakes to review'), `the report follows the app language (${lang})`);
    const local = write(`report-${lang}.html`, html);
    await p.setViewportSize({ width: 390, height: 844 });
    await p.goto('file://' + local);
    await p.screenshot({ path: path.join(OUT, `390x844-report-${lang}.png`), fullPage: true });
    await p.setViewportSize({ width: 794, height: 1123 });
    await p.emulateMedia({ media: 'print' });
    await p.screenshot({ path: path.join(OUT, `a4-print-report-${lang}.png`), fullPage: true });
    await p.close();
  }

  // ---- the Teacher Desk reads the report and the cards ----
  const desk = await ctx.newPage();
  desk.on('pageerror', (e) => errors.push(e.message));
  await desk.goto(BASE + 'teacher/');
  await desk.setInputFiles('#files', [reportFile, benFile]);
  await desk.waitForSelector('.desk-student');
  const names = await desk.$$eval('.desk-student', (els) => els.map((e) => e.textContent));
  assert(names.includes('Aiko Test') && names.includes('Ben Test'), 'the Teacher Desk reads a progress report (HTML) and a memory card');
  assert(!!(await desk.$('.desk-class-mistakes')), 'the class view lists mistakes across the class');
  await desk.click('.desk-student >> text=Aiko Test');
  await desk.waitForSelector('.desk-student-view');
  assert((await desk.$$('.desk-mistakes li')).length > 1, "the student view lists Aiko's mistakes to review");
  await desk.$eval('.desk-student-view', (el) => el.scrollIntoView());
  await desk.screenshot({ path: path.join(OUT, '1280x720-desk-student.png') });
  await desk.setViewportSize({ width: 390, height: 844 });
  await desk.$eval('.desk-student-view', (el) => el.scrollIntoView());
  await desk.screenshot({ path: path.join(OUT, '390x844-desk-student.png') });

  // ---- turning teacher mode off returns to Sam's own slot ----
  await page.goto(BASE + '#/');
  await page.waitForSelector('#teacher-strip .teacher-badge');
  await page.click('#teacher-strip .teacher-badge');
  await page.waitForFunction(() => !document.getElementById('teacher-strip'));
  await page.waitForTimeout(300);
  const back = await readKey(page, 'state');
  assert(back.profile.name === 'Sam' && JSON.stringify(back.srs) === JSON.stringify(sam.srs), "teacher mode off: Sam's own learner is back, unchanged");

  // ---- learner mode: Rekod's memory card, and a different student's card is never merged silently ----
  await page.goto(BASE + '#/rekod');
  await page.waitForSelector('.memory-card');
  await choose(page, () => page.click('.card-load'), aikoFile);
  await page.waitForSelector('.warn-box');
  assert(!(await page.$('.sheet .btn-primary')), "a card from a different student cannot be merged (only Replace, after a confirmation)");
  await page.screenshot({ path: path.join(OUT, '1280x720-rekod-other-student.png') });
  await page.click('.sheet .btn-ghost');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.$eval('.memory-card', (el) => el.scrollIntoView());
  await page.screenshot({ path: path.join(OUT, '390x844-rekod-memory-card.png') });

  assert(errors.length === 0, 'no page errors' + (errors.length ? ': ' + errors.join(' | ') : ''));
  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
