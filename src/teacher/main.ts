import '../styles.css';
import './teacher.css';
import type { TeacherReport } from '../core/report';
import { button, confirmDialog, h, mount, toast } from '../core/ui';
import { addReports, allContentReports, groupQuestions, weakAcrossClass } from './merge';

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
    try {
      parsed.push(JSON.parse(await f.text()));
    } catch {
      bad++;
    }
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
  const chapters = [...new Set(reports.flatMap((r) => (r.progress ?? []).map((p) => p.chapter)))].sort((a, b) => a - b);
  const input = h('input', { type: 'file', accept: '.json,application/json', multiple: true, class: 'visually-hidden', id: 'files' }) as HTMLInputElement;
  input.addEventListener('change', () => void load(Array.from(input.files ?? [])));
  const drop = h(
    'label',
    { class: 'drop', for: 'files' },
    h('b', null, 'Drop student files here'),
    h('span', { class: 'muted small' }, 'or tap to choose: katakata_<name>_<date>.json (any number at once)'),
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
                      h('td', null, r.student),
                      h('td', null, r.createdAt.slice(0, 10)),
                      h('td', null, r.minutesThisWeek ?? '—'),
                      chapters.map((c) => {
                        const p = r.progress?.find((x) => x.chapter === c);
                        return h('td', { class: p?.ready ? 'ready' : '' }, p ? (p.ready ? '✅ ready' : `${p.coreKnown}/${p.coreTotal}`) : '—');
                      }),
                    ),
                  ),
                ),
              ),
            ),
            h('p', { class: 'muted small' }, 'Prep = core words known for that chapter\'s Sedia Kelas; "ready" also means both frames were built. "—" = not shared.'),
          )
        : null,
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

render();
