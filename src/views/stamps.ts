import { t } from '../core/i18n';
import type { Stamp } from '../core/types';
import { h } from '../core/ui';

/** Hanko-style stamp: red circle, date, and what it was for. */
export function stampEl(s: Stamp): HTMLElement {
  const [, m, d] = s.date.split('-');
  const label = s.kind === 'day' ? t('rekod.stamp.day') : s.kind === 'ready' ? `${t('common.chapter', { n: s.chapter ?? '' })}\n${t('rekod.stamp.ready')}` : `${t('common.chapter', { n: s.chapter ?? '' })}\n${t('rekod.stamp.chapter')}`;
  return h(
    'div',
    { class: `stamp stamp-${s.kind}`, title: s.date },
    h('span', { class: 'stamp-date' }, `${Number(m)}/${Number(d)}`),
    h('span', { class: 'stamp-label' }, label),
  );
}
