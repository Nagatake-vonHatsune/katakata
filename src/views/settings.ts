// 設定 (Settings): everything about how the app looks and sounds. Records (記録) keeps progress and the savefile.
import * as db from '../core/db';
import { t } from '../core/i18n';
import { defaultState, replaceState, saveNow, state, update } from '../core/state';
import { setRate } from '../core/tts';
import type { AppState } from '../core/types';
import { button, confirmDialog, h, mount, sheet } from '../core/ui';
import { langPicker } from './langswitch';
import { voiceCheck } from './onboarding';
import { applyTheme } from './rekod';
import { topBar } from './widgets';

declare const __APP_VERSION__: string;

type Palette = AppState['settings']['palette'];
type TextSize = AppState['settings']['textSize'];

/** Names nod to the family (Sam's request); the app itself never names a franchise. Dots: brand, accent, background. */
export const PALETTES: Array<{ id: Palette; name: string; dots: [string, string, string] }> = [
  { id: 'kancil', name: 'Kancil Green', dots: ['#2f6b4f', '#975c30', '#f7f3ea'] },
  { id: 'cyan', name: 'First Sound Cyan', dots: ['#39c5bb', '#c2185b', '#eef8f7'] },
  { id: 'royal', name: 'Royal Red Gold', dots: ['#9e1b22', '#d4a017', '#fbf5ec'] },
  { id: 'rebel', name: 'Rebel Blue', dots: ['#1f56c9', '#e0218a', '#f2f4fb'] },
];
const SIZES: TextSize[] = ['s', 'm', 'l', 'xl'];

function palettePicker(redraw: () => void): HTMLElement {
  return h(
    'div',
    { class: 'swatches', role: 'radiogroup', 'aria-label': t('settings.palette') },
    PALETTES.map((p) =>
      h(
        'button',
        {
          class: 'swatch' + (state.settings.palette === p.id ? ' on' : ''),
          type: 'button',
          role: 'radio',
          'aria-checked': String(state.settings.palette === p.id),
          onclick: () => {
            update((s) => (s.settings.palette = p.id));
            applyTheme();
            void saveNow();
            redraw();
          },
        },
        h('span', { class: 'swatch-dots', 'aria-hidden': 'true' }, p.dots.map((c) => h('i', { style: `background:${c}` }))),
        h('span', null, p.name),
      ),
    ),
  );
}

function sizePicker(redraw: () => void): HTMLElement {
  return h(
    'div',
    { class: 'seg size-seg', role: 'radiogroup', 'aria-label': t('settings.text_size') },
    SIZES.map((z) =>
      h(
        'button',
        {
          class: 'seg-btn' + (state.settings.textSize === z ? ' on' : ''),
          type: 'button',
          role: 'radio',
          'aria-checked': String(state.settings.textSize === z),
          onclick: () => {
            update((s) => (s.settings.textSize = z));
            applyTheme();
            void saveNow();
            redraw();
          },
        },
        t(`settings.size.${z}`),
      ),
    ),
  );
}

export function renderSettings(root: HTMLElement, go: (r: string) => void): void {
  const draw = () => {
    const toggle = (label: string, on: boolean, set: (v: boolean) => void) => {
      const cb = h('input', { type: 'checkbox', checked: on, role: 'switch' }) as HTMLInputElement;
      cb.addEventListener('change', () => {
        set(cb.checked);
        void saveNow();
        draw();
      });
      return h('label', { class: 'setting' }, h('span', null, label), cb);
    };
    const select = <T extends string>(label: string, value: T, options: Array<[T, string]>, set: (v: T) => void) => {
      const sel = h('select', { class: 'input select' }, options.map(([v, l]) => h('option', { value: v, selected: v === value }, l))) as HTMLSelectElement;
      sel.addEventListener('change', () => {
        set(sel.value as T);
        void saveNow();
        draw();
      });
      return h('label', { class: 'setting' }, h('span', null, label), sel);
    };
    const nameInput = h('input', { class: 'input', type: 'text', maxlength: 40 }) as HTMLInputElement;
    nameInput.value = state.profile.name;
    nameInput.addEventListener('change', () => {
      update((s) => (s.profile.name = nameInput.value.trim()));
      void saveNow();
    });
    mount(
      root,
      h(
        'div',
        { class: 'screen' },
        topBar('⚙️ ' + t('rekod.settings'), () => go('')),
        h('p', { class: 'lead' }, t('settings.body')),
        h('section', { class: 'card-box stack' }, h('h2', null, '🌐 ', t('rekod.lang')), langPicker(() => draw()), h('p', { class: 'muted small' }, t('lang.anytime'))),
        h(
          'section',
          { class: 'card-box settings' },
          h('h2', null, t('settings.display')),
          h('label', { class: 'setting' }, h('span', null, t('rekod.name')), nameInput),
          select(t('rekod.theme'), state.settings.theme, [['auto', t('rekod.theme.auto')], ['light', t('rekod.theme.light')], ['dark', t('rekod.theme.dark')]], (v) => {
            update((s) => (s.settings.theme = v));
            applyTheme();
          }),
          h('div', { class: 'setting-block' }, h('span', null, t('settings.palette')), palettePicker(draw)),
          h('div', { class: 'setting-block' }, h('span', null, t('settings.text_size')), sizePicker(draw), h('p', { class: 'muted small' }, t('settings.size_sample'))),
          toggle(t('rekod.kana'), state.settings.kanaHints, (v) => update((s) => (s.settings.kanaHints = v))),
          toggle(t('rekod.backup_rem'), state.settings.backupReminder, (v) => update((s) => (s.settings.backupReminder = v))),
          toggle(t('settings.points'), state.settings.showPoints, (v) => update((s) => (s.settings.showPoints = v))),
          h('p', { class: 'muted small' }, t('settings.points_note')),
        ),
        h(
          'section',
          { class: 'card-box settings' },
          h('h2', null, t('settings.sound')),
          select(t('rekod.speed'), String(state.settings.speechRate) as string, [['0.7', '0.7×'], ['0.9', '0.9×'], ['1', '1.0×']], (v) => {
            update((s) => (s.settings.speechRate = Number(v)));
            setRate(Number(v));
          }),
          button(t('rekod.voice_check'), () => void sheet((close) => voiceCheck(() => close())), 'btn btn-ghost'),
        ),
        h(
          'section',
          { class: 'card-box stack' },
          h('h2', null, t('settings.data')),
          h('p', { class: 'small' }, t('settings.data_body')),
          button('📒 ' + t('mode.rekod'), () => go('rekod'), 'btn btn-ghost btn-wide'),
          button(
            t('rekod.reset'),
            async () => {
              if (!(await confirmDialog(t('rekod.reset_confirm'), t('rekod.reset'), t('common.cancel'), true))) return;
              await db.del('state');
              await replaceState(defaultState());
              await saveNow();
              location.hash = '';
              location.reload();
            },
            'btn btn-danger-ghost btn-wide',
          ),
        ),
        h('section', { class: 'card-box' }, h('h2', null, t('rekod.about')), h('p', { class: 'small' }, t('rekod.privacy')), h('p', { class: 'muted small' }, `Kata-Kata v${__APP_VERSION__}`)),
      ),
    );
  };
  draw();
}
