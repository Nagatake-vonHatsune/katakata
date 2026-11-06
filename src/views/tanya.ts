// Tanya Cikgu list and 先生に送る (send to teacher).
import { content } from '../core/content';
import { t } from '../core/i18n';
import { chapterProgress, isReady, minutesThisWeek, weakestWords } from '../core/progress';
import { buildReport, reportFilename, type Section } from '../core/report';
import { safeName, shareOrDownload } from '../core/share';
import { state, update } from '../core/state';
import type { Question } from '../core/types';
import { button, confirmDialog, h, mount, sheet, toast } from '../core/ui';
import { askTeacher, topBar } from './widgets';

export function renderTanya(root: HTMLElement, go: (r: string) => void): void {
  const draw = () => {
    const open = state.questions.filter((q) => !q.answered);
    const done = state.questions.filter((q) => q.answered);
    const item = (q: Question) => {
      const cb = h('input', { type: 'checkbox', checked: q.answered, 'aria-label': t('tanya.answered') }) as HTMLInputElement;
      cb.addEventListener('change', () => {
        update((s) => {
          const x = s.questions.find((y) => y.id === q.id);
          if (x) x.answered = cb.checked;
        });
        draw();
      });
      return h(
        'li',
        { class: 'q-item' },
        h('label', { class: 'q-check' }, cb, h('span', { class: 'small' }, t('tanya.answered'))),
        h(
          'div',
          { class: 'q-body' },
          h('span', { class: 'q-type' }, t(`tanya.type.${q.type}`)),
          q.context.text ? h('b', { lang: 'ms' }, ' ', q.context.text) : null,
          q.context.chapter ? h('span', { class: 'muted small' }, ` (${t('common.chapter', { n: q.context.chapter })})`) : null,
          q.text ? h('p', null, q.text) : null,
        ),
        button(
          t('tanya.delete'),
          async () => {
            if (await confirmDialog(t('tanya.delete_confirm'), t('tanya.delete'), t('common.cancel'), true)) {
              update((s) => (s.questions = s.questions.filter((x) => x.id !== q.id)));
              draw();
            }
          },
          'btn btn-small btn-ghost',
        ),
      );
    };
    mount(
      root,
      h(
        'div',
        { class: 'screen' },
        topBar(t('tanya.title'), () => go('')),
        h('p', { class: 'lead' }, t('tanya.body')),
        h(
          'div',
          { class: 'row' },
          button(t('tanya.new'), async () => {
            if (await askTeacher({ kind: 'general' })) draw();
          }, 'btn'),
          button(t('tanya.send'), () => void sendToTeacher(), 'btn btn-primary'),
        ),
        !state.questions.length ? h('p', { class: 'muted' }, t('tanya.empty')) : null,
        open.length ? h('section', null, h('h3', null, `${t('tanya.open')} (${open.length})`), h('ul', { class: 'q-list' }, open.map(item))) : null,
        done.length ? h('section', null, h('h3', null, `${t('tanya.done')} (${done.length})`), h('ul', { class: 'q-list done' }, done.map(item))) : null,
      ),
    );
  };
  draw();
}

export function progressRows() {
  return content.chapters.map((ch) => ({ chapter: ch.chapter, ...chapterProgress(ch.chapter), ready: isReady(ch.chapter) }));
}

/** Preview with per-section opt-out; nothing leaves the device until the learner taps Send. */
export async function sendToTeacher(): Promise<void> {
  const openQs = state.questions.filter((q) => !q.answered);
  const minutes = minutesThisWeek();
  const weakest = weakestWords(10);
  // Minutes studied is opt-in (spec decision 13.4 pending: privacy-first default).
  const include: Record<Section, boolean> = { questions: openQs.length > 0, reports: state.reports.length > 0, progress: true, weakest: weakest.length > 0, minutes: false };
  const name = h('input', { class: 'input', type: 'text', maxlength: 40, 'aria-label': t('send.name') }) as HTMLInputElement;
  name.value = state.profile.name;
  const row = (key: Section, label: string, detail?: HTMLElement | null) => {
    const cb = h('input', { type: 'checkbox', checked: include[key] }) as HTMLInputElement;
    cb.addEventListener('change', () => (include[key] = cb.checked));
    return h('div', { class: 'send-row' }, h('label', { class: 'check' }, cb, h('span', null, label)), detail ?? null);
  };
  const ok = await sheet((close) => [
    h('h3', null, t('send.title')),
    h('p', { class: 'sheet-text' }, t('send.body')),
    h('label', { class: 'field' }, h('span', { class: 'small' }, t('send.name')), name),
    row('questions', t('send.questions', { n: openQs.length }), openQs.length ? h('ul', { class: 'preview' }, openQs.slice(0, 5).map((q) => h('li', null, `${t(`tanya.type.${q.type}`)}: ${q.context.text ?? ''} ${q.text}`.trim()))) : null),
    row('reports', t('send.reports', { n: state.reports.length })),
    row('progress', t('send.progress')),
    row('weakest', t('send.weakest'), weakest.length ? h('p', { class: 'preview small', lang: 'ms' }, weakest.map((w) => w.term).join(', ')) : null),
    row('minutes', t('send.minutes', { n: minutes })),
    h('p', { class: 'muted small' }, t('send.note')),
    h('div', { class: 'row' }, button(t('common.cancel'), () => close(false), 'btn btn-ghost'), button(t('send.go'), () => close(true), 'btn btn-primary')),
  ]);
  if (!ok) return;
  if (!Object.values(include).some(Boolean)) return toast(t('send.nothing'));
  const student = name.value.trim() || state.profile.name;
  if (student !== state.profile.name) update((s) => (s.profile.name = student));
  const report = buildReport(student || t('misc.student'), { questions: openQs, reports: state.reports, progress: progressRows(), weakest, minutes }, include);
  const res = await shareOrDownload(reportFilename(safeName(student)), JSON.stringify(report, null, 2));
  if (res === 'downloaded') toast(t('send.downloaded'));
}
