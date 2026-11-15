import { t } from '../core/i18n';
import type { Stamp } from '../core/types';
import { h } from '../core/ui';

/** Hanko-style stamp: red circle, date, and what it was for. */
export function stampEl(s: Stamp): HTMLElement {
  const [, m, d] = s.date.split('-');
  // An unknown kind (a savefile from a newer app) shows as a chapter stamp.
  const what = s.kind === 'ready' ? 'rekod.stamp.ready' : s.kind === 'dialogue' ? 'rekod.stamp.dialogue' : s.kind === 'stretch' ? 'rekod.stamp.stretch' : 'rekod.stamp.chapter';
  const label = s.kind === 'day' ? t('rekod.stamp.day') : `${t('common.chapter', { n: s.chapter ?? '' })}\n${t(what)}`;
  return h(
    'div',
    { class: `stamp stamp-${s.kind}`, title: s.date },
    h('span', { class: 'stamp-date' }, `${Number(m)}/${Number(d)}`),
    h('span', { class: 'stamp-label' }, label),
  );
}
