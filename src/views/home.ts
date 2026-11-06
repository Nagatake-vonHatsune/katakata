import { content } from '../core/content';
import { daysBetween, dayKey } from '../core/dates';
import { getLang, t } from '../core/i18n';
import { inIOSBrowserTab } from '../core/platform';
import { chapterProgress, knownCount, minutesThisWeek, nextChapter, streak } from '../core/progress';
import { buildToday } from '../core/session';
import { state } from '../core/state';
import { button, h, mount, progressBar, sheet } from '../core/ui';
import { langButton } from './langswitch';
import { iosSteps } from './onboarding';
import { sessionMeta } from './session';

export interface Nav {
  go(route: string): void;
  startToday(): void;
}

function banners(nav: Nav): HTMLElement[] {
  const out: HTMLElement[] = [];
  if (inIOSBrowserTab())
    out.push(
      h(
        'div',
        { class: 'banner' },
        h('p', null, t('home.ios_banner')),
        button(t('home.ios_how'), () => void sheet((close) => [h('h3', null, t('onb.ios_title')), h('p', null, t('onb.ios_body')), iosSteps(), button(t('common.close'), () => close(), 'btn btn-primary btn-wide')]), 'btn btn-small'),
      ),
    );
  const hasProgress = Object.keys(state.srs).length > 0;
  const last = state.lastBackupAt?.slice(0, 10) ?? dayKey(new Date(state.createdAt));
  if (state.settings.backupReminder && hasProgress && daysBetween(last, dayKey()) >= 7)
    out.push(h('div', { class: 'banner' }, h('p', null, t('home.backup_banner')), button(t('home.backup_now'), () => nav.go('rekod'), 'btn btn-small')));
  return out;
}

export function renderHome(root: HTMLElement, nav: Nav): void {
  const lang = getLang();
  const today = buildToday();
  const ch = nextChapter();
  const chPack = content.chapters.find((c) => c.chapter === ch);
  const p = chapterProgress(ch);
  const st = streak();
  const tile = (key: string, route: string | null, icon: string) =>
    h(
      'button',
      { class: 'mode' + (route ? '' : ' mode-soon'), type: 'button', disabled: !route, onclick: route ? () => nav.go(route) : undefined },
      h('span', { class: 'mode-icon', 'aria-hidden': 'true' }, icon),
      h('span', { class: 'mode-label' }, t(key)),
      route ? null : h('span', { class: 'mode-soon-tag' }, t('common.soon')),
    );
  mount(
    root,
    h(
      'div',
      { class: 'screen home' },
      h(
        'header',
        { class: 'home-head' },
        h('img', { class: 'logo', src: './kancil.svg', alt: '' }),
        h('div', null, h('div', { class: 'brand-sm' }, 'Kata-Kata'), h('div', { class: 'subtitle-sm' }, t('app.subtitle'))),
        h(
          'div',
          { class: 'head-actions' },
          langButton(),
          h('button', { class: 'icon-btn', type: 'button', 'aria-label': t('rekod.settings'), title: t('rekod.settings'), onclick: () => nav.go('settings') }, '⚙️'),
        ),
        h(
          'div',
          { class: 'head-stats' },
          st ? h('span', { class: 'pill', title: t('home.streak_rest') }, '🔥 ' + t('home.streak', { n: st })) : null,
          h('span', { class: 'pill' }, t('home.week', { n: minutesThisWeek() })),
        ),
      ),
      banners(nav),
      h(
        'button',
        { class: 'today', type: 'button', onclick: () => nav.startToday() },
        h('span', { class: 'today-title' }, t('home.today')),
        h('span', { class: 'today-meta' }, today.steps.length ? sessionMeta(today.steps) : t('home.today_empty')),
        h('span', { class: 'today-cta' }, t('home.start') + ' ›'),
      ),
      chPack
        ? h(
            'button',
            { class: 'next-class', type: 'button', onclick: () => nav.go(`sedia/${ch}`) },
            h('span', null, t('home.next_class', { title: `${t('common.chapter', { n: ch })} ${chPack.title.ms}` })),
            h('span', { class: 'muted small' }, lang === 'ja' ? chPack.title.ja ?? '' : chPack.title.en),
            progressBar(p.coreKnown, p.coreTotal),
            h('span', { class: 'small' }, t('sedia.progress', { a: p.coreKnown, b: p.coreTotal })),
          )
        : null,
      h(
        'nav',
        { class: 'modes', 'aria-label': 'modes' },
        tile('mode.sedia', 'sedia', '🎒'),
        tile('mode.ulang', 'ulang', '🔁'),
        tile('mode.main', 'main', '🎲'),
        tile('mode.laju', 'laju', '⚡'),
        tile('mode.tanya', 'tanya', '🙋'),
        tile('mode.jaring', 'jaring', '🕸️'),
        tile('mode.rekod', 'rekod', '📒'),
        tile('mode.jambatan', 'jambatan', '🌉'),
        tile('mode.settings', 'settings', '⚙️'),
        tile('mode.cerita', null, '📖'),
      ),
      h('p', { class: 'muted small center' }, t('rekod.known_total', { n: knownCount() })),
    ),
  );
}
