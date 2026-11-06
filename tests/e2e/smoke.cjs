// End-to-end smoke test: onboarding -> today's practice -> ask teacher -> send file -> teacher desk -> offline.
// Run against a preview server: npx vite build && npx vite preview --port 4173, then node tests/e2e/smoke.cjs
const { chromium, devices } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE = process.env.BASE_URL || 'http://localhost:4173/';
const OUT = process.env.SHOT_DIR || path.join(__dirname, '..', '..', 'test-results');
fs.mkdirSync(OUT, { recursive: true });

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ ...devices['Pixel 7'], acceptDownloads: true });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  const shot = (n) => page.screenshot({ path: path.join(OUT, n + '.png'), fullPage: false });

  await page.goto(BASE);
  await page.getByRole('button', { name: '日本語' }).click();
  await page.getByRole('button', { name: '次へ' }).click();
  await page.getByRole('textbox').fill('Tanaka');
  await page.getByRole('button', { name: '次へ' }).click();
  await page.getByRole('button', { name: '聞こえない' }).click();
  await page.getByRole('button', { name: '次へ' }).click();
  await page.getByRole('button', { name: 'はじめる' }).click();
  await page.waitForSelector('.today');
  await shot('01-home');

  await page.click('.today');
  let steps = 0;
  for (; steps < 80; steps++) {
    if (await page.locator('.summary').count()) break;
    const howto = page.getByRole('button', { name: 'わかった' });
    if (await howto.count()) await howto.click();
    if (steps === 1) await shot('02-step');
    const body = page.locator('.step-body');
    await body.waitFor();
    if (await body.locator('.opt').count()) {
      // Answer wrong once on purpose to check the neutral retry path.
      await (steps === 3 ? page.getByRole('button', { name: 'わからない' }) : body.locator('.opt').first()).click();
      if (steps === 3) await shot('03-dontknow');
    } else if (await body.locator('.tiles-bank').count()) {
      await shot('04-susun');
      while (await body.locator('.tiles-bank .tile').count()) await body.locator('.tiles-bank .tile').first().click();
      await page.getByRole('button', { name: '答え合わせ' }).click();
    } else if (await body.locator('.cari-board').count()) {
      if (!fs.existsSync(path.join(OUT, '05-cari.png'))) await shot('05-cari');
      await body.locator('.cari-obj').first().click();
    } else if (await page.getByRole('button', { name: '答えを見る' }).count()) {
      await page.getByRole('button', { name: '答えを見る' }).click();
      await page.getByRole('button', { name: 'できた' }).click();
      continue;
    }
    const next = page.locator('.btn-next');
    await next.waitFor();
    await next.click();
  }
  await page.waitForSelector('.summary');
  await shot('06-summary');
  console.log('session steps completed:', steps);
  await page.getByRole('button', { name: 'ホームへ' }).click();

  // Ask teacher from the Tanya screen, then send.
  await page.getByRole('button', { name: /先生に質問/ }).click();
  await page.getByRole('button', { name: /質問を書く/ }).click();
  await page.getByRole('radio', { name: '文法' }).click();
  await page.locator('.sheet textarea').fill('kami と kita の違いは？');
  await page.locator('.sheet').getByRole('button', { name: '保存' }).click();
  await page.waitForSelector('.q-item');
  await shot('07-tanya');
  await page.getByRole('button', { name: /先生に送る/ }).click();
  await shot('08-send');
  const [download] = await Promise.all([page.waitForEvent('download'), page.locator('.sheet').getByRole('button', { name: '送る' }).click()]);
  const reportPath = path.join(OUT, download.suggestedFilename());
  await download.saveAs(reportPath);
  const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
  console.log('report file:', download.suggestedFilename(), 'questions:', report.questions?.length, 'minutes included:', 'minutesThisWeek' in report);

  // Savefile export
  await page.goto(BASE + '#/rekod');
  await page.waitForSelector('.stamp');
  await shot('09-rekod');
  const [save] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'セーブデータを書き出す' }).click()]);
  console.log('savefile:', save.suggestedFilename());

  // Teacher desk
  const tpage = await ctx.newPage();
  await tpage.goto(BASE + 'teacher/');
  await tpage.setInputFiles('#files', [reportPath, reportPath]);
  await tpage.waitForSelector('.agenda-item');
  await tpage.screenshot({ path: path.join(OUT, '10-teacher.png') });
  console.log('teacher agenda items:', await tpage.locator('.agenda-item').count());

  // Offline: service worker serves the app.
  await page.goto(BASE);
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  await ctx.setOffline(true);
  await page.reload();
  await page.waitForSelector('.today', { timeout: 5000 });
  console.log('offline reload ok');
  await ctx.setOffline(false);

  // English toggle
  await page.goto(BASE + '#/rekod');
  await page.locator('select').first().selectOption('en');
  await page.waitForTimeout(100);
  await page.goto(BASE);
  await page.waitForSelector('.today');
  await shot('11-home-en');

  // Malay interface from a shareable link, fresh device.
  const ctx2 = await browser.newContext({ ...devices['Pixel 7'] });
  const mpage = await ctx2.newPage();
  mpage.on('pageerror', (e) => errors.push(e.message));
  await mpage.goto(BASE + '?lang=ms');
  await mpage.getByRole('button', { name: 'Bahasa Melayu' }).click();
  await mpage.getByRole('button', { name: 'Seterusnya' }).click();
  await mpage.getByRole('textbox').fill('Aiko');
  await mpage.getByRole('button', { name: 'Seterusnya' }).click();
  await mpage.getByRole('button', { name: 'Saya tidak dengar' }).click();
  await mpage.getByRole('button', { name: 'Seterusnya' }).click();
  await mpage.getByRole('button', { name: 'Jom mula' }).click();
  await mpage.waitForSelector('.today');
  await mpage.screenshot({ path: path.join(OUT, '12-home-ms.png') });
  await mpage.click('.today');
  const ok = mpage.getByRole('button', { name: 'Faham' });
  if (await ok.count()) await ok.first().click();
  await mpage.waitForSelector('.step-body');
  await mpage.screenshot({ path: path.join(OUT, '13-step-ms.png') });
  console.log('malay ui ok:', await mpage.locator('.today, .step-body').first().count() > 0);

  console.log(errors.length ? 'PAGE ERRORS:\n' + errors.join('\n') : 'no page errors');
  await browser.close();
  if (errors.length) process.exit(1);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
