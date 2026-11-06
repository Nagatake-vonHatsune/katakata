// Change the interface language from anywhere: a 🌐 button on every screen (spec 7: Japanese-first with a toggle).
import { getLang, LANGS, setLang, t, type Lang } from '../core/i18n';
import { saveNow, update } from '../core/state';
import { button, h, sheet } from '../core/ui';

export const LANG_EVENT = 'katakata:lang';

export function changeLang(l: Lang): void {
  if (l === getLang()) return;
  update((s) => (s.settings.lang = l));
  void saveNow();
  setLang(l);
  window.dispatchEvent(new CustomEvent(LANG_EVENT));
}

/** Three big buttons, each labelled in its own language so anyone can find theirs. */
export function langPicker(onPick?: (l: Lang) => void): HTMLElement {
  const cur = getLang();
  return h(
    'div',
    { class: 'seg seg-lang', role: 'radiogroup', 'aria-label': t('rekod.lang') },
    LANGS.map((l) =>
      h(
        'button',
        {
          class: 'seg-btn' + (l.id === cur ? ' on' : ''),
          type: 'button',
          role: 'radio',
          'aria-checked': String(l.id === cur),
          lang: l.id,
          onclick: () => {
            changeLang(l.id);
            onPick?.(l.id);
          },
        },
        l.label,
      ),
    ),
  );
}

export function langButton(note?: string): HTMLButtonElement {
  return h(
    'button',
    {
      class: 'icon-btn',
      type: 'button',
      'aria-label': t('lang.change'),
      title: t('lang.change'),
      onclick: () =>
        void sheet(
          (close) => [
            h('h3', null, '🌐 ', t('lang.change')),
            h('p', { class: 'muted small' }, '言語 · Language · Bahasa'),
            langPicker(() => close()),
            note ? h('p', { class: 'muted small' }, note) : null,
            button(t('common.close'), () => close(), 'btn btn-ghost btn-wide'),
          ],
          { label: t('lang.change') },
        ),
    },
    '🌐',
  ) as HTMLButtonElement;
}
