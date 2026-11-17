import '../styles.css';
import './teacher.css';
import type { TeacherReport } from '../core/report';
import { button, confirmDialog, h, mount, toast } from '../core/ui';
import { addReports, allContentReports, groupQuestions, mistakesAcrossClass, weakAcrossClass } from './merge';
import { readStudentFile } from './files';
import { isLang, setLang, t } from '../core/i18n';

// New Teacher Desk text is translated (en, ja, ms): ?lang=ja or ?lang=ms; English by default, like the rest of the Desk.
const deskLang = new URLSearchParams(location.search).get('lang');
setLang(isLang(deskLang) ? deskLang : 'en');
let selected: string | null = null;

const KEY = 'katakata-teacher-desk';
const root = document.getElementById('desk')!;

let reports: TeacherReport[] = [];
try {
  reports = JSON.parse(localStorage.getItem(KEY) ?? '[]');
} catch {
  reports = [];
}

function persist(): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(reports));
  } catch {
    /* private mode: keep in memory only */
  }
}

async function load(files: File[]): Promise<void> {
  const parsed: unknown[] = [];
  let bad = 0;
  for (const f of files) {
    const r = await readStudentFile(await f.text());
    if (r.ok) parsed.push(r.report);
    else bad++;
  }
  const res = addReports(reports, parsed);
  reports = res.reports;
  persist();
  const rejected = bad + res.rejected;
  toast(`${files.length - rejected} file(s) added${rejected ? `, ${rejected} skipped (not a Kata-Kata student file)` : ''}.`);
  render();
}

const TYPE_LABEL: Record<string, string> = { meaning: 'meaning 意味', usage: 'usage 使い方', pronunciation: 'pronunciation 発音', grammar: 'grammar 文法', other: 'other その他' };

function chapterLabel(c: number | null): string {
  return c ? `Chapter ${c}` : 'General';
}

function render(): void {
  const groups = groupQuestions(reports);
  const weak = weakAcrossClass(reports).slice(0, 15);
  const contentReports = allContentReports(reports);
  const classMistakes = mistakesAcrossClass(reports).slice(0, 15);
  const chapters = [...new Set(reports.flatMap((r) => (r.progress ?? []).map((p) => p.chapter)))].sort((a, b) => a - b);
  const input = h('input', { type: 'file', accept: '.json,.html,.htm,.katakata,application/json,text/html', multiple: true, class: 'visually-hidden', id: 'files' }) as HTMLInputElement;
  input.addEventListener('change', () => void load(Array.from(input.files ?? [])));
  const drop = h(
    'label',
    { class: 'drop', for: 'files' },
    h('b', null, 'Drop student files here'),
    h('span', { class: 'muted small' }, 'or tap to choose: katakata_<name>_<date>.json (any number at once)'),
    h('span', { class: 'muted small' }, t('desk.accepts')),
    input,
  );
  drop.addEventListener('dragover', (e) => {
    e.preventDefault();
    drop.classList.add('over');
  });
  drop.addEventListener('dragleave', () => drop.classList.remove('over'));
  drop.addEventListener('drop', (e) => {
    e.preventDefault();
    drop.classList.remove('over');
    void load(Array.from(e.dataTransfer?.files ?? []));
  });
  const today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  let counter = 0;

  mount(
    root,
    h(
      'div',
      { class: 'screen desk-screen' },
      h(
        'header',
        { class: 'home-head no-print' },
        h('img', { class: 'logo', src: '../kancil.svg', alt: '' }),
        h('div', null, h('div', { class: 'brand-sm' }, 'Kata-Kata · Teacher Desk'), h('div', { class: 'subtitle-sm' }, 'Everything stays on this device. Nothing is uploaded.')),
      ),
      h('div', { class: 'no-print' }, drop),
      reports.length
        ? h(
            'div',
            { class: 'row no-print' },
            button('🖨 Print class agenda', () => window.print(), 'btn btn-primary'),
            button(
              'Clear all files',
              async () => {
                if (await confirmDialog(`Remove all ${reports.length} student file(s) from this Teacher Desk? The students keep their own data; you can drop the files in again.`, 'Remove all', 'Cancel', true)) {
                  reports = [];
                  persist();
                  render();
                }
              },
              'btn btn-danger-ghost',
            ),
          )
        : h('p', { class: 'muted no-print' }, 'No student files yet. Students create them with 先生に送る (Send to teacher) in the app.'),
      reports.length
        ? h(
            'section',
            { class: 'card-box no-print' },
            h('h2', null, `Students (${reports.length})`),
            h(
              'div',
              { class: 'table-wrap' },
              h(
                'table',
                { class: 'grid' },
                h('thead', null, h('tr', null, h('th', null, 'Student'), h('th', null, 'File date'), h('th', null, 'Min this week'), chapters.map((c) => h('th', null, `Ch${c} prep`)))),
                h(
                  'tbody',
                  null,
                  reports.map((r) =>
                    h(
                      'tr',
                      null,
                      h(
                        'td',
                        null,
                        h('button', { class: 'linklike desk-student' + (selected === r.student ? ' on' : ''), type: 'button', 'aria-pressed': String(selected === r.student), onclick: () => ((selected = selected === r.student ? null : r.student), render()) }, r.student),
                        r.source && r.source !== 'report' ? h('span', { class: 'muted small' }, ` (${t(`desk.source.${r.source}`)})`) : null,
                      ),
                      h('td', null, r.createdAt.slice(0, 10)),
                      h('td', null, r.minutesThisWeek ?? '—'),
                      chapters.map((c) => {
                        const p = r.progress?.find((x) => x.chapter === c);
                        const flames = p?.checkpoints ? ` · 🔥${p.flames ?? 0}/${p.checkpoints}` : '';
                        const stretch = p?.stretch === 'done' ? ' · ⚡ done' : p?.stretch === 'open' ? ' · ⚡' : '';
                        return h('td', { class: p?.ready ? 'ready' : '' }, p ? (p.ready ? '✅ ready' : `${p.coreKnown}/${p.coreTotal}`) + flames + stretch : '—');
                      }),
                    ),
                  ),
                ),
              ),
            ),
            h('p', { class: 'muted small' }, 'Prep = core words known for that chapter\'s Sedia Kelas (⚡ words are never counted); "ready" also means both frames were built. 🔥 = checkpoints lit (prep, the dialogue passed at 60 % first time, every word known); ⚡ = the optional harder stage is open or done. "—" = not shared.'),
          )
        : null,
      studentView(reports.find((r) => r.student === selected) ?? null),
      reports.length
        ? h(
            'section',
            { class: 'card-box agenda' },
            h('h2', null, `Class agenda · ${today}`),
            h('p', { class: 'muted small' }, `${groups.length} topic(s) from ${reports.length} student file(s), in chapter order.`),
            groups.length
              ? [...new Set(groups.map((g) => g.chapter))].map((ch) =>
                  h(
                    'div',
                    { class: 'agenda-ch' },
                    h('h3', null, chapterLabel(ch)),
                    groups
                      .filter((g) => g.chapter === ch)
                      .map((g) =>
                        h(
                          'div',
                          { class: 'agenda-item' },
                          h('span', { class: 'box', 'aria-hidden': 'true' }, '☐'),
                          h(
                            'div',
                            null,
                            h('b', { lang: 'ms' }, `${++counter}. ${g.about || '(general question)'}`),
                            g.students.length > 1 ? h('span', { class: 'dup' }, ` · ${g.students.length} students asked`) : null,
                            h(
                              'ul',
                              null,
                              g.items.map((q) => h('li', null, h('span', { class: 'q-type' }, TYPE_LABEL[q.type] ?? q.type), ' ', q.text || '—', h('span', { class: 'muted small' }, ` (${q.student})`))),
                            ),
                          ),
                        ),
                      ),
                  ),
                )
              : h('p', { class: 'muted' }, 'No open questions.'),
            weak.length
              ? h(
                  'div',
                  { class: 'agenda-ch' },
                  h('h3', null, 'Weakest words across the class'),
                  h('ol', { class: 'weak' }, weak.map((w) => h('li', null, h('b', { lang: 'ms' }, w.term), ` (${w.gloss}, Ch${w.chapter}) · ${w.students.length} student${w.students.length > 1 ? 's' : ''}`))),
                )
              : null,
            classMistakes.length
              ? h(
                  'div',
                  { class: 'agenda-ch desk-class-mistakes' },
                  h('h3', null, t('desk.class_mistakes')),
                  h(
                    'ol',
                    { class: 'weak' },
                    classMistakes.map((m) =>
                      h('li', null, h('b', { lang: 'ms' }, m.text), m.en ? ` (${m.en}${m.chapter ? `, Ch${m.chapter}` : ''})` : '', ` · ${t('desk.students_n', { n: m.students.length })} · ${t('desk.wrong_n', { n: m.count })}`, m.text !== m.right ? h('span', { class: 'muted small' }, ` · ${t('desk.right')}: `, h('span', { lang: 'ms' }, m.right)) : null),
                    ),
                  ),
                )
              : null,
            contentReports.length
              ? h(
                  'div',
                  { class: 'agenda-ch' },
                  h('h3', null, `Content reports (${contentReports.length})`),
                  h(
                    'ul',
                    null,
                    contentReports.map((r) =>
                      h('li', null, h('span', { class: 'q-type' }, r.kind === 'error' ? 'error' : 'better example'), ' ', h('b', { lang: 'ms' }, r.context?.text ?? ''), ` ${r.context?.id ? `[${r.context.id}]` : ''} — ${r.text}`, h('span', { class: 'muted small' }, ` (${r.student})`)),
                    ),
                  ),
                )
              : null,
          )
        : null,
      h('p', { class: 'muted small no-print' }, 'Answers pack (cikgu-answers.json) arrives in phase 3.'),
    ),
  );
}

/** One student's page: next steps, mistakes to review (what they answered, the right answer, the note), weakest words, questions. */
function studentView(r: TeacherReport | null): HTMLElement | null {
  if (!r) return null;
  const mistakes = r.mistakes ?? [];
  return h(
    'section',
    { class: 'card-box desk-student-view' },
    h('h2', null, t('desk.student_view', { name: r.student })),
    h('p', { class: 'muted small' }, `${r.createdAt.slice(0, 10)}${r.source ? ` · ${t(`desk.source.${r.source}`)}` : ''}${r.knownWords !== undefined ? ` · ${t('desk.known', { n: r.knownWords })}` : ''}${r.streak !== undefined ? ` · ${t('desk.streak', { n: r.streak })}` : ''}`),
    r.nextSteps?.length ? h('div', null, h('h3', null, t('rep.next')), h('ol', null, r.nextSteps.map((x) => h('li', null, x)))) : null,
    h('h3', null, `${t('rep.mistakes')} (${mistakes.length})`),
    mistakes.length
      ? h(
          'ol',
          { class: 'desk-mistakes' },
          mistakes.map((m) =>
            h(
              'li',
              null,
              h('b', { lang: 'ms' }, m.text),
              m.en ? ` — ${m.en}` : '',
              h('span', { class: 'muted small' }, ` (${t(`rep.game.${m.game}`)}${m.chapter ? `, Ch${m.chapter}` : ''}, ${m.count}×)`),
              h('br'),
              h('span', { class: 'small' }, `${t('rep.you_answered')}: `, m.answers.map((a) => (a === null ? t('rep.dont_know') : a)).join(' · ')),
              h('br'),
              h('span', { class: 'small' }, `${t('desk.right')}: `, h('span', { lang: 'ms' }, m.right)),
              m.note ? h('p', { class: 'muted small' }, m.note) : null,
            ),
          ),
        )
      : h('p', { class: 'muted' }, r.source === 'report' ? t('desk.no_mistakes_old') : t('rep.mistakes_none')),
    r.weakest?.length ? h('div', null, h('h3', null, t('rep.weakest')), h('p', { lang: 'ms' }, r.weakest.map((w) => w.term).join(', '))) : null,
    r.questions?.filter((q) => !q.answered).length ? h('div', null, h('h3', null, t('rep.questions')), h('ul', null, r.questions.filter((q) => !q.answered).map((q) => h('li', null, q.context?.text ? h('b', { lang: 'ms' }, q.context.text + ' ') : null, q.text)))) : null,
    button(t('common.close'), () => ((selected = null), render()), 'btn btn-ghost no-print'),
  );
}

render();
