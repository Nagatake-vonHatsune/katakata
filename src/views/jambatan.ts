// Jambatan: the bridge to Hanashishou (spec 2 stage 3).
import { buildWordLibrary, hanashishouImportUrl, HANASHISHOU_URL } from '../core/bridge';
import { content, srsKey } from '../core/content';
import { dayKey } from '../core/dates';
import { t } from '../core/i18n';
import { knownCount } from '../core/progress';
import { safeName, shareOrDownload } from '../core/share';
import { isKnown } from '../core/srs';
import { state } from '../core/state';
import { button, h, mount, toast } from '../core/ui';
import { topBar } from './widgets';

export function renderJambatan(root: HTMLElement, go: (r: string) => void): void {
  const lib = buildWordLibrary(state);
  const carry = lib.words.filter((w) => w.inHanashishou).length;
  const bridgeScenes = content.scenes.filter((s) => s.world.id === 'jambatan');
  const bridgeTotal = bridgeScenes.reduce((n, s) => n + s.cards.length, 0);
  const bridgeKnown = bridgeScenes.reduce((n, s) => n + s.cards.filter((c) => isKnown(state.srs[srsKey(c.id)])).length, 0);
  const exportFile = async () => {
    if (!lib.words.length) return toast(t('jambatan.nothing'));
    const name = `katakata-words_${safeName(state.profile.name)}_${dayKey()}.json`;
    const res = await shareOrDownload(name, JSON.stringify(lib, null, 1));
    if (res === 'downloaded') toast(t('jambatan.saved'));
  };
  mount(
    root,
    h(
      'div',
      { class: 'screen' },
      topBar(t('jambatan.title'), () => go('')),
      h('div', { class: 'bridge-hero' }, h('img', { class: 'mascot-sm', src: './kancil.svg', alt: '' }), h('span', { class: 'bridge-arrow', 'aria-hidden': 'true' }, '→'), h('span', { class: 'bridge-lion', 'aria-hidden': 'true' }, '🦁')),
      h('p', { class: 'lead' }, t('jambatan.body')),
      h(
        'div',
        { class: 'stats' },
        h('div', { class: 'stat' }, h('b', null, String(knownCount())), h('span', null, t('misc.words_known'))),
        h('div', { class: 'stat' }, h('b', null, String(carry)), h('span', null, t('jambatan.carry'))),
        h('div', { class: 'stat' }, h('b', null, String(lib.suggestedBand)), h('span', null, t('jambatan.band'))),
      ),
      h('p', { class: 'muted small' }, t('jambatan.band_note')),
      h(
        'section',
        { class: 'card-box' },
        h('h2', null, t('jambatan.prep_title')),
        h('p', { class: 'small' }, t('jambatan.prep_body', { a: bridgeKnown, b: bridgeTotal })),
        button(t('jambatan.prep_go'), () => go('jaring'), 'btn btn-ghost btn-wide'),
      ),
      h(
        'section',
        { class: 'card-box stack' },
        h('h2', null, t('jambatan.steps')),
        h('ol', { class: 'how-list' }, h('li', null, t('jambatan.step1')), h('li', null, t('jambatan.step2')), h('li', null, t('jambatan.step3'))),
        button(t('jambatan.export'), () => void exportFile(), 'btn btn-primary btn-wide'),
        h('a', { class: 'btn btn-wide link-btn', href: hanashishouImportUrl(state.settings.lang), target: '_blank', rel: 'noopener' }, t('jambatan.open')),
        h('p', { class: 'muted small' }, t('jambatan.private')),
      ),
      h('p', { class: 'muted small center' }, t('jambatan.keep'), ' ', h('a', { href: HANASHISHOU_URL, target: '_blank', rel: 'noopener' }, 'Hanashishou 話匠')),
    ),
  );
}
