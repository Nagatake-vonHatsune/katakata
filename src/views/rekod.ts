// Rekod (記録): stamp card, progress by chapter and scene, savefile tools. Settings live in views/settings.ts.
import { content } from '../core/content';
import { getLang, t } from '../core/i18n';
import { chapterProgress, knownCount, minutesThisWeek, sceneProgress, streak } from '../core/progress';
import { buildSavefile, mergeStates, parseSavefile, summarise } from '../core/savefile';
import { pickFile, safeName, shareOrDownload } from '../core/share';
import { seconds } from '../core/score';
import { replaceState, state, update } from '../core/state';
import { button, confirmDialog, h, mount, progressBar, sheet, toast } from '../core/ui';
import { stampEl } from './stamps';
import { topBar } from './widgets';

export function applyTheme(): void {
  const root = document.documentElement;
  const set = (attr: string, value: string, unless: string) => (value === unless ? root.removeAttribute(attr) : root.setAttribute(attr, value));
  set('data-theme', state.settings.theme, 'auto');
  set('data-palette', state.settings.palette, 'kancil');
  set('data-text', state.settings.textSize, 'm');
}

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return getLang() === 'ja' ? `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日` : d.toLocaleDateString(getLang() === 'ms' ? 'ms-MY' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

async function exportSave(): Promise<void> {
  update((s) => (s.lastBackupAt = new Date().toISOString()));
  const file = await buildSavefile(state);
  const d = new Date();
  const name = `katakata_${safeName(state.profile.name)}_${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}.katakata`;
  const res = await shareOrDownload(name, JSON.stringify(file), 'application/json');
  if (res === 'cancelled') update((s) => (s.lastBackupAt = undefined));
}

async function importSave(redraw: () => void): Promise<void> {
  const [f] = await pickFile('.katakata,application/json,.json');
  if (!f) return;
  const parsed = await parseSavefile(await f.text());
  if (!parsed.ok) return toast(t(parsed.reason === 'checksum' ? 'rekod.checksum_bad' : 'rekod.import_bad'));
  const sum = summarise(parsed.file, (id) => content.cards.get(id)?.chapter);
  const choice = await sheet((close) => [
    h('h3', null, t('rekod.import')),
    h('p', { class: 'preview-box' }, t('rekod.import_preview', { chapters: sum.maxChapter || '-', words: sum.words, date: fmtDate(sum.savedAt) })),
    h('p', null, t('rekod.import_how')),
    h(
      'div',
      { class: 'stack' },
      button(t('rekod.merge'), () => close('merge'), 'btn btn-primary btn-wide'),
      button(t('rekod.replace'), () => close('replace'), 'btn btn-danger-ghost btn-wide'),
      button(t('common.cancel'), () => close(null), 'btn btn-ghost btn-wide'),
    ),
  ]);
  if (choice === 'merge') await replaceState(mergeStates(state, parsed.file.state));
  else if (choice === 'replace') {
    if (!(await confirmDialog(t('rekod.replace_confirm'), t('rekod.replace'), t('common.cancel'), true))) return;
    await replaceState({ ...parsed.file.state, profile: { ...parsed.file.state.profile, onboarded: true } });
  } else return;
  toast(t('rekod.import_ok'));
  redraw();
}

function scoreRecords(): HTMLElement {
  const r = state.scores;
  const row = (label: string, value: string) => h('div', { class: 'rec-row' }, h('span', null, label), h('b', null, value));
  return h(
    'section',
    { class: 'card-box' },
    h('h2', null, '★ ', t('score.records')),
    r.total
      ? h(
          'div',
          null,
          row(t('score.best_session'), `★ ${r.bestSession}`),
          row(t('score.laju_best'), `⚡ ${r.lajuBest}`),
          row(t('score.combo'), `🔥 ${r.bestCombo}`),
          row(t('score.fastest'), r.fastestMs === null ? '–' : t('score.sec', { n: seconds(r.fastestMs) })),
          row(t('score.total'), `★ ${r.total}`),
        )
      : h('p', { class: 'muted' }, t('score.none')),
  );
}

export function renderRekod(root: HTMLElement, go: (r: string) => void): void {
  const draw = () => {
    const stamps = state.stamps.slice().sort((a, b) => b.date.localeCompare(a.date));
    mount(
      root,
      h(
        'div',
        { class: 'screen' },
        topBar('📒 ' + t('rekod.title'), () => go('')),
        h('p', { class: 'lead' }, t('rekod.body')),
        h(
          'div',
          { class: 'stats' },
          h('div', { class: 'stat' }, h('b', null, String(knownCount())), h('span', null, t('misc.words_known'))),
          h('div', { class: 'stat' }, h('b', null, String(streak())), h('span', null, t('misc.day_streak'))),
          h('div', { class: 'stat' }, h('b', null, String(minutesThisWeek())), h('span', null, t('misc.min_week'))),
        ),
        h('p', { class: 'muted small center' }, t('home.streak_rest')),
        scoreRecords(),
        h('section', { class: 'card-box' }, h('h2', null, t('rekod.stamps')), stamps.length ? h('div', { class: 'stamp-grid' }, stamps.map(stampEl)) : h('p', { class: 'muted' }, t('rekod.no_stamps'))),
        h(
          'section',
          { class: 'card-box' },
          h('h2', null, t('rekod.chapters')),
          content.chapters.map((ch) => {
            const p = chapterProgress(ch.chapter);
            return h('div', { class: 'prog-row' }, h('span', null, `${t('common.chapter', { n: ch.chapter })} `, h('span', { lang: 'ms' }, ch.title.ms)), progressBar(p.known, p.total), h('span', { class: 'small' }, t('rekod.words', { a: p.known, b: p.total })));
          }),
          h('h2', null, t('rekod.worlds')),
          content.scenes.map((s) => {
            const p = sceneProgress(s.id);
            return h('div', { class: 'prog-row' }, h('span', { lang: 'ms' }, `${s.world.ms} · ${s.title.ms}`), progressBar(p.known, p.total), h('span', { class: 'small' }, t('rekod.words', { a: p.known, b: p.total })));
          }),
        ),
        h(
          'section',
          { class: 'card-box' },
          h('h2', null, t('rekod.save')),
          h('p', { class: 'small' }, t('rekod.save_body')),
          h('div', { class: 'row' }, button(t('rekod.export'), () => void exportSave().then(draw), 'btn btn-primary'), button(t('rekod.import'), () => void importSave(draw), 'btn')),
          h('p', { class: 'muted small' }, t('rekod.last_backup', { date: state.lastBackupAt ? fmtDate(state.lastBackupAt) : t('rekod.never') })),
          h('p', { class: 'muted small' }, state.profile.persisted ? t('rekod.storage_ok') : t('rekod.storage_no')),
        ),
        h(
          'section',
          { class: 'card-box stack' },
          h('p', { class: 'small' }, t('rekod.settings_moved')),
          button('⚙️ ' + t('rekod.settings'), () => go('settings'), 'btn btn-ghost btn-wide'),
        ),
      ),
    );
  };
  draw();
}
