// Onboarding (spec phase 1): welcome, name, voice check, iOS Home Screen step, how it works.
import { t } from '../core/i18n';
import { inIOSBrowserTab, isIOS, requestPersistence } from '../core/platform';
import { saveNow, state, update } from '../core/state';
import { speak, voiceKind } from '../core/tts';
import { button, h, mount } from '../core/ui';

type Panel = (next: () => void) => HTMLElement;

export function iosSteps(): HTMLElement {
  return h('ol', { class: 'ios-steps' }, h('li', null, t('onb.ios_step1')), h('li', null, t('onb.ios_step2')), h('li', null, t('onb.ios_step3')));
}

export function voiceCheck(onDone: () => void): HTMLElement {
  const status = h('p', { class: 'muted', 'aria-live': 'polite' });
  const result = h('div', { class: 'stack' });
  const decide = async (heard: boolean) => {
    const kind = heard ? await voiceKind() : 'none';
    update((s) => (s.profile.voice = heard && kind === 'none' ? 'ms' : kind));
    result.replaceChildren(
      h('p', { class: 'note' }, t(state.profile.voice === 'id' ? 'onb.voice_id' : state.profile.voice === 'none' ? 'onb.voice_none' : 'onb.voice_ms')),
      button(t('common.next'), onDone, 'btn btn-primary btn-wide'),
    );
  };
  void voiceKind().then((k) => {
    status.textContent = k === 'ms' ? t('onb.voice_ms') : k === 'id' ? t('onb.voice_id') : '';
  });
  return h(
    'div',
    { class: 'stack' },
    h('h1', null, t('onb.voice_title')),
    h('p', null, t('onb.voice_body')),
    button(t('onb.play'), () => void speak('Selamat pagi. Apa khabar?'), 'btn btn-audio btn-wide'),
    h('p', { class: 'sentence', lang: 'ms' }, 'Selamat pagi. Apa khabar?'),
    status,
    h('p', { class: 'muted small' }, t('onb.voice_volume')),
    h('div', { class: 'row' }, button(t('onb.voice_ng'), () => void decide(false), 'btn btn-ghost'), button(t('onb.voice_ok'), () => void decide(true), 'btn btn-primary')),
    result,
  );
}

export function renderOnboarding(root: HTMLElement, onDone: () => void): void {
  const name = h('input', { class: 'input', type: 'text', placeholder: t('onb.name_ph'), maxlength: 40, autocomplete: 'name', 'aria-label': t('onb.name_title') }) as HTMLInputElement;
  name.value = state.profile.name;
  const panels: Panel[] = [
    (next) =>
      h(
        'div',
        { class: 'stack center' },
        h('img', { class: 'mascot', src: './kancil.svg', alt: 'Sang Kancil' }),
        h('h1', { class: 'brand' }, 'Kata-Kata'),
        h('p', { class: 'subtitle' }, t('app.subtitle')),
        h('p', { class: 'tagline', lang: 'ms' }, 'Satu kata, satu langkah.'),
        h('p', { class: 'tagline-sub' }, t('app.tagline')),
        h('p', null, t('onb.welcome_body')),
        h('p', { class: 'muted' }, t('onb.kancil')),
        button(t('common.next'), next, 'btn btn-primary btn-wide'),
      ),
    (next) =>
      h(
        'div',
        { class: 'stack' },
        h('h1', null, t('onb.name_title')),
        h('p', null, t('onb.name_body')),
        name,
        button(t('common.next'), () => {
          update((s) => (s.profile.name = name.value.trim()));
          next();
        }, 'btn btn-primary btn-wide'),
      ),
    (next) => voiceCheck(next),
  ];
  if (inIOSBrowserTab() || (isIOS() && !state.profile.onboarded))
    panels.push((next) =>
      h('div', { class: 'stack' }, h('h1', null, t('onb.ios_title')), h('p', null, t('onb.ios_body')), iosSteps(), button(t('common.next'), next, 'btn btn-primary btn-wide')),
    );
  panels.push((next) =>
    h(
      'div',
      { class: 'stack' },
      h('h1', null, t('onb.how_title')),
      h('ul', { class: 'how-list' }, h('li', null, t('onb.how_1')), h('li', null, t('onb.how_2')), h('li', null, t('onb.how_3')), h('li', null, t('onb.how_4'))),
      button(t('onb.finish'), next, 'btn btn-primary btn-wide'),
    ),
  );

  let i = 0;
  const show = () => {
    if (i >= panels.length) {
      void requestPersistence().then((ok) => update((s) => (s.profile.persisted = ok)));
      update((s) => (s.profile.onboarded = true));
      void saveNow();
      onDone();
      return;
    }
    mount(
      root,
      h(
        'div',
        { class: 'screen onboarding' },
        h('div', { class: 'dots', 'aria-hidden': 'true' }, panels.map((_, j) => h('span', { class: j === i ? 'dot on' : 'dot' }))),
        panels[i](() => {
          i++;
          show();
        }),
      ),
    );
  };
  show();
}
