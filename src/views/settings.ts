// 設定 (Settings): everything about how the app looks and sounds. Records (記録) keeps progress and the savefile.
import * as db from '../core/db';
import { t } from '../core/i18n';
import { defaultState, replaceState, saveNow, state, update } from '../core/state';
import { setRate } from '../core/tts';
import { button, confirmDialog, h, mount, sheet } from '../core/ui';
import { langPicker } from './langswitch';
import { voiceCheck } from './onboarding';
import { applyTheme } from './rekod';
import { topBar } from './widgets';

declare const __APP_VERSION__: string;

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
          toggle(t('rekod.kana'), state.settings.kanaHints, (v) => update((s) => (s.settings.kanaHints = v))),
          toggle(t('rekod.backup_rem'), state.settings.backupReminder, (v) => update((s) => (s.settings.backupReminder = v))),
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
