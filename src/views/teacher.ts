// Teacher mode around the app (Sam, 17 Nov 2026): the projector layout switch, the 先生モード strip, the class launcher and
// the teacher menu on Home, the upright-phone hint, the screen wake lock, and number keys on ordinary screens.
import { activities, boards, chapterBoard, jambatanScenes, buildSlides, type ClassActivity, type ClassSource } from '../core/classroom';
import { content } from '../core/content';
import { getLang, t } from '../core/i18n';
import { keyAction } from '../core/keys';
import { PARTS } from '../core/nombor';
import { isIOS } from '../core/platform';
import { fullscreenSupported, keepAwake, toggleFullscreen } from '../core/screen';
import { inClassRun } from '../core/state';
import { setTeacher, teacher } from '../core/teacher';
import { warmVoices } from '../core/tts';
import { button, h, toast } from '../core/ui';
import { cariCards } from '../core/session';
import { PART_ICON, PART_MS, numberLevel } from './nombor';

export interface TeacherNav {
  go(route: string): void;
  runClass(src: ClassSource, activity: ClassActivity): void;
}

/** Extra items for the strip and the menu (Part 3 adds the student slot banner and the Students link). */
export const teacherHooks: { banner?: () => HTMLElement | null; menu?: (nav: TeacherNav) => HTMLElement[] } = {};

/** Set the projector layout, the wake lock and the strip from the current preference. Call after every change. */
export function applyTeacher(): void {
  const on = teacher.on;
  const root = document.documentElement;
  if (on) root.setAttribute('data-teacher', '');
  else root.removeAttribute('data-teacher');
  keepAwake(on);
  if (on) warmVoices();
  renderStrip();
}

export async function setTeacherMode(on: boolean): Promise<void> {
  await setTeacher({ on });
  applyTeacher();
  toast(t(on ? 'teach.on' : 'teach.off'));
}

/** The strip at the top of every screen in teacher mode: the 先生モード badge (one tap turns it off) and the slot banner. */
export function renderStrip(): void {
  document.getElementById('teacher-strip')?.remove();
  if (!teacher.on) return;
  const strip = h(
    'div',
    { id: 'teacher-strip', class: 'teacher-strip', role: 'region', 'aria-label': t('teach.mode') },
    h(
      'button',
      { class: 'teacher-badge', type: 'button', title: t('teach.badge_off'), 'aria-label': t('teach.badge_off'), onclick: () => void setTeacherMode(false).then(() => window.dispatchEvent(new CustomEvent('katakata:teacher'))) },
      '🎓 ',
      t('teach.mode'),
      h('span', { class: 'badge-x', 'aria-hidden': 'true' }, ' ✕'),
    ),
    teacherHooks.banner?.() ?? null,
    h('span', { class: 'strip-gap' }),
    fullscreenSupported() ? h('button', { class: 'icon-btn strip-fs', type: 'button', 'aria-label': t('teach.fullscreen'), title: t('teach.fullscreen'), onclick: () => void toggleFullscreen() }, '⛶') : null,
  );
  const hint = h('p', { class: 'rotate-hint', role: 'note' }, '📱↻ ', t('teach.rotate'));
  strip.append(hint);
  document.body.prepend(strip);
}

// ---------------------------------------------------------------- the class launcher (Home, teacher mode)

type Tab = 'chapters' | 'jambatan' | 'cari' | 'nombor';
const pick: { tab: Tab; src: ClassSource | null; act: ClassActivity | null } = { tab: 'chapters', src: null, act: null };

function sameSrc(a: ClassSource | null, b: ClassSource): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

function srcTitle(src: ClassSource): string {
  const lang = getLang();
  if (src.kind === 'chapter') {
    const ch = content.chapters.find((c) => c.chapter === src.chapter);
    return `${t('common.chapter', { n: src.chapter })} · ${ch?.title.ms ?? ''}`;
  }
  if (src.kind === 'nombor') return `${PART_ICON[src.part]} ${PART_MS[src.part]}`;
  const sc = content.scenes.find((s) => s.id === src.sceneId);
  return sc ? `${sc.title.ms}${lang !== 'ms' && sc.title.en ? ' · ' + (lang === 'ja' ? sc.title.ja ?? sc.title.en : sc.title.en) : ''}` : src.sceneId;
}

function sourcesFor(tab: Tab): Array<{ src: ClassSource; label: HTMLElement | string; sub?: string }> {
  const lang = getLang();
  switch (tab) {
    case 'chapters':
      return content.chapters.map((ch) => ({ src: { kind: 'chapter', chapter: ch.chapter } as ClassSource, label: h('span', null, h('b', { class: 'ln-num' }, String(ch.chapter)), ' ', h('span', { lang: 'ms', class: 'ln-name' }, ch.title.ms)), sub: lang === 'ja' ? ch.title.ja ?? ch.title.en : ch.title.en }));
    case 'jambatan':
      return jambatanScenes().map((id) => {
        const sc = content.scenes.find((s) => s.id === id)!;
        return { src: { kind: 'scene', sceneId: id } as ClassSource, label: h('span', { lang: 'ms', class: 'ln-name' }, sc.title.ms), sub: `${sc.cards.length}` };
      });
    case 'cari':
      return boards().map((id) => {
        const sc = content.scenes.find((s) => s.id === id)!;
        return { src: { kind: 'board', sceneId: id } as ClassSource, label: h('span', null, h('span', { 'aria-hidden': 'true' }, cariCards(id).slice(0, 2).map((c) => c.image).join('')), ' ', h('span', { lang: 'ms', class: 'ln-name' }, sc.title.ms)) };
      });
    case 'nombor':
      return PARTS.map((p, i) => ({ src: { kind: 'nombor', part: p } as ClassSource, label: h('span', null, h('span', { 'aria-hidden': 'true' }, PART_ICON[p]), ` ${i + 1}. `, h('span', { lang: 'ms', class: 'ln-name' }, PART_MS[p])) }));
  }
}

/** The launcher: pick a source, then an activity, then Start. Fits a phone held sideways (844×390) without scrolling. */
export function launcher(nav: TeacherNav): HTMLElement {
  const box = h('section', { class: 'launcher', 'aria-label': t('teach.launcher') });
  const draw = () => {
    const acts = pick.src ? activities(pick.src) : [];
    if (pick.act && !acts.some((a) => a.id === pick.act)) pick.act = null;
    if (pick.src && !pick.act && acts.length === 1) pick.act = acts[0].id;
    const chosen = acts.find((a) => a.id === pick.act);
    const count = pick.src && pick.act ? (pick.act === 'nombor' ? 8 : chosen?.count ?? 0) : 0;
    box.replaceChildren(
      h(
        'div',
        { class: 'launch-head' },
        h('h2', null, '🎓 ', t('teach.launcher')),
        h(
          'div',
          { class: 'seg launch-tabs', role: 'tablist' },
          (['chapters', 'jambatan', 'cari', 'nombor'] as Tab[]).map((tab) =>
            h(
              'button',
              {
                class: 'seg-btn' + (pick.tab === tab ? ' on' : ''),
                type: 'button',
                role: 'tab',
                'aria-selected': String(pick.tab === tab),
                'data-tab': tab,
                onclick: () => {
                  pick.tab = tab;
                  draw();
                },
              },
              t(`teach.tab.${tab}`),
            ),
          ),
        ),
      ),
      h(
        'div',
        { class: 'launch-body' },
        h(
          'div',
          { class: `launch-items launch-${pick.tab}`, role: 'listbox', 'aria-label': t(`teach.tab.${pick.tab}`) },
          sourcesFor(pick.tab).map((x) =>
            h(
              'button',
              {
                class: 'launch-item' + (sameSrc(pick.src, x.src) ? ' on' : ''),
                type: 'button',
                role: 'option',
                'aria-selected': String(sameSrc(pick.src, x.src)),
                title: x.sub ?? '',
                onclick: () => {
                  pick.src = x.src;
                  pick.act = null;
                  draw();
                },
              },
              x.label,
            ),
          ),
        ),
        h(
          'div',
          { class: 'launch-acts' },
          pick.src ? h('p', { class: 'launch-src' }, srcTitle(pick.src)) : h('p', { class: 'muted small' }, t('teach.launcher_body')),
          pick.src
            ? h(
                'div',
                { class: 'launch-act-list', role: 'radiogroup', 'aria-label': t('teach.pick') },
                acts.map((a) =>
                  h(
                    'button',
                    {
                      class: 'seg-btn launch-act' + (pick.act === a.id ? ' on' : ''),
                      type: 'button',
                      role: 'radio',
                      'aria-checked': String(pick.act === a.id),
                      'data-act': a.id,
                      onclick: () => {
                        pick.act = a.id;
                        draw();
                      },
                    },
                    t(`teach.act.${a.id}`),
                    a.id === 'explore' ? null : h('span', { class: 'launch-n' }, ` ${a.id === 'nombor' ? 8 : a.count}`),
                  ),
                ),
              )
            : null,
          pick.act === 'laju'
            ? h(
                'label',
                { class: 'setting launch-timer' },
                h('span', null, t('teach.laju_timer')),
                (() => {
                  const cb = h('input', { type: 'checkbox', role: 'switch', checked: teacher.lajuTimer }) as HTMLInputElement;
                  cb.addEventListener('change', () => void setTeacher({ lajuTimer: cb.checked }));
                  return cb;
                })(),
              )
            : null,
          button(
            pick.act ? (pick.act === 'explore' ? `▶ ${t('teach.act.explore')}` : '▶ ' + t('teach.start', { n: count })) : t('teach.pick'),
            () => {
              if (!pick.src || !pick.act) return;
              if (pick.act !== 'explore' && !buildSlides(pick.src, pick.act, numberLevel()).length) return;
              nav.runClass(pick.src, pick.act);
            },
            'btn btn-primary btn-wide launch-start',
          ),
        ),
      ),
    );
    const start = box.querySelector<HTMLButtonElement>('.launch-start');
    if (start) start.disabled = !pick.act;
  };
  draw();
  return box;
}

/** The teacher menu (Home, teacher mode): keys, TV and full-screen help, preferences, links. */
export function teacherMenu(nav: TeacherNav): HTMLElement {
  const toggle = (label: string, on: boolean, set: (v: boolean) => void) => {
    const cb = h('input', { type: 'checkbox', checked: on, role: 'switch' }) as HTMLInputElement;
    cb.addEventListener('change', () => set(cb.checked));
    return h('label', { class: 'setting' }, h('span', null, label), cb);
  };
  const iphone = isIOS() && !fullscreenSupported();
  return h(
    'section',
    { class: 'card-box teacher-menu stack' },
    h('h2', null, '🎓 ', t('teach.menu')),
    h(
      'div',
      { class: 'row' },
      ...(teacherHooks.menu?.(nav) ?? []),
      h('a', { class: 'btn link-btn teacher-desk-link', href: './teacher/' }, '🗂️ ', t('teach.desk')),
      fullscreenSupported() ? button('⛶ ' + t('teach.fullscreen'), () => void toggleFullscreen(), 'btn') : null,
    ),
    iphone ? h('p', { class: 'small teacher-iphone' }, '📱 ', t('teach.iphone_fs')) : null,
    h('p', { class: 'small' }, '📺 ', t('teach.tv')),
    h('div', { class: 'keys-box' }, h('h3', null, '⌨️ ', t('teach.keys_title')), h('p', { class: 'small' }, t('teach.keys'))),
    toggle(t('teach.trans_default'), teacher.translations, (v) => void setTeacher({ translations: v })),
    toggle(t('teach.autoplay'), teacher.autoplay, (v) => void setTeacher({ autoplay: v })),
    h('p', { class: 'muted small' }, t('teach.class_note')),
    button('🎓 ' + t('teach.badge_off'), () => void setTeacherMode(false).then(() => nav.go('')), 'btn btn-ghost btn-wide'),
  );
}

// ---------------------------------------------------------------- number keys on ordinary screens (teacher mode)

function visible(el: Element | null): el is HTMLElement {
  return !!el && (el as HTMLElement).offsetParent !== null && !(el as HTMLButtonElement).disabled;
}

/** In teacher mode, the keys also drive ordinary practice: 1 to 4 choose, → / Space / PageDown press Next, P plays. */
export function ordinaryKeys(e: KeyboardEvent): void {
  if (!teacher.on || inClassRun() || document.querySelector('.sheet-backdrop')) return;
  const a = keyAction(e);
  if (!a) return;
  const app = document.getElementById('app');
  if (!app) return;
  let target: HTMLElement | null = null;
  if (a.kind === 'choose') {
    const opts = [...app.querySelectorAll('.opt, .cari-obj')].filter(visible);
    target = opts[a.n - 1] ?? null;
  } else if (a.kind === 'next') {
    target = [...app.querySelectorAll('.btn-next, .nm-next')].find(visible) ?? null;
  } else if (a.kind === 'audio') {
    target = [...app.querySelectorAll('.btn-audio, .nm-listen')].find(visible) ?? null;
  }
  if (!target) return;
  e.preventDefault();
  target.click();
}

export { chapterBoard };
