// Rekod (記録): stamp card, progress by chapter and scene, savefile tools. Settings live in views/settings.ts.
import { content } from '../core/content';
import { getLang, t } from '../core/i18n';
import { chapterProgress, knownCount, minutesThisWeek, sceneProgress, streak, stretchProgress } from '../core/progress';
import { seconds } from '../core/score';
import { state } from '../core/state';
import { autosaves, undoLastLoad, slots } from '../core/slots';
import { currentLearner, loadCard, saveCard, saveReport } from './memorycard';
import { button, confirmDialog, h, mount, progressBar, toast } from '../core/ui';
import { stampEl } from './stamps';
import { topBar } from './widgets';
import { flamesLine, flamesText } from './stretch';

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
          row(t('score.laju_best'), `⏱️ ${r.lajuBest}`),
          row(t('score.combo'), `🔥 ${r.bestCombo}`),
          row(t('score.fastest'), r.fastestMs === null ? '–' : t('score.sec', { n: seconds(r.fastestMs) })),
          row(t('score.total'), `★ ${r.total}`),
        )
      : h('p', { class: 'muted' }, t('score.none')),
  );
}

export function renderRekod(root: HTMLElement, go: (r: string) => void): void {
  // "Undo the last load": the learner from before the last memory card load, if one was auto-saved.
  const undo = h('div');
  void autosaves().then((list) => {
    const mine = list.filter((a) => a.slot === slots().active);
    if (!mine.length) return;
    const a = mine[mine.length - 1];
    undo.replaceChildren(
      h('p', { class: 'muted small' }, t('card.autosaved', { date: fmtDate(a.at), name: a.name || t('misc.student') })),
      button(t('card.undo'), async () => {
        if (!(await confirmDialog(t('card.undo_confirm'), t('card.undo'), t('common.cancel'), true))) return;
        if (await undoLastLoad()) toast(t('card.undone'));
        renderRekod(root, go);
      }, 'btn btn-small btn-ghost card-undo'),
    );
  });
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
            const done = stretchProgress(ch.chapter).done || state.stamps.some((s) => s.kind === 'stretch' && s.chapter === ch.chapter);
            return h(
              'div',
              { class: 'prog-row' },
              h('span', null, `${t('common.chapter', { n: ch.chapter })} `, h('span', { lang: 'ms' }, ch.title.ms)),
              progressBar(p.known, p.total),
              h(
                'span',
                { class: 'small' },
                t('rekod.words', { a: p.known, b: p.total }),
                flamesText(ch.chapter) ? h('span', { class: 'rekod-flames', role: 'img', 'aria-label': flamesLine(ch.chapter) }, ' ', flamesText(ch.chapter)) : null,
                done ? h('span', { class: 'stretch-mark', role: 'img', 'aria-label': t('stretch.done') }, ' ⚡') : null,
              ),
            );
          }),
          h('h2', null, t('rekod.worlds')),
          content.scenes.map((s) => {
            const p = sceneProgress(s.id);
            return h('div', { class: 'prog-row' }, h('span', { lang: 'ms' }, `${s.world.ms} · ${s.title.ms}`), progressBar(p.known, p.total), h('span', { class: 'small' }, t('rekod.words', { a: p.known, b: p.total })));
          }),
        ),
        h(
          'section',
          { class: 'card-box memory-card' },
          h('h2', null, '💾 ', t('card.title')),
          h('p', { class: 'small' }, t('card.body')),
          h('div', { class: 'row' }, button(t('card.save'), () => void saveCard().then(draw), 'btn btn-primary card-save'), button(t('card.load'), () => void loadCard(draw), 'btn card-load')),
          h('p', { class: 'muted small' }, t('rekod.last_backup', { date: state.lastBackupAt ? fmtDate(state.lastBackupAt) : t('rekod.never') })),
          h('p', { class: 'muted small' }, state.profile.persisted ? t('rekod.storage_ok') : t('rekod.storage_no')),
          undo,
        ),
        h(
          'section',
          { class: 'card-box stack' },
          h('h2', null, '📄 ', t('card.report')),
          h('p', { class: 'small' }, t('card.report_body')),
          button('📄 ' + t('card.report'), () => void currentLearner().then(saveReport), 'btn btn-wide card-report'),
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
