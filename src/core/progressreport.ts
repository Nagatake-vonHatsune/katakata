// The progress report (Sam, 17 Nov 2026): one self-contained HTML file for the student to read and keep
// (katakata-report_<name>_<YYYY-MM-DD>.html): no external fonts or scripts, readable on a phone, printable on A4. Its
// language is en or ja (the app's; Malay UI → en), the Malay always shown. The TeacherReport JSON is embedded
// (<script type="application/json" id="katakata-report">) so the Teacher Desk reads the HTML file too.
// Every function takes the learner state as an argument, so a student slot's report is made without switching to it.
import { content } from './content';
import { tIn, type Lang } from './i18n';
import { groupMistakes, type MistakeItem } from './mistakes';
import { PARTS } from './nombor';
import {
  chapterProgress, checkpoints, currentChapter, dialogueKey, dialogueReplyIds, dialogueScore, isReady, knownCount, minutesThisWeek, streak, stretchOpen, stretchPack, stretchProgress, weakestWords,
} from './progress';
import { REPORT_KIND, type ChapterProgressRow, type TeacherReport } from './report';
import { dueIds } from './session';
import type { AppState } from './types';

export const REPORT_SCRIPT_ID = 'katakata-report';

/** Per chapter: prep counts (Sedia Kelas words only, never ⚡ cards), 🔥 checkpoints and the ⚡ stage. */
export function progressRowsFor(s: AppState): ChapterProgressRow[] {
  return content.chapters.map((ch) => {
    const cps = checkpoints(ch.chapter, s);
    const stretch = stretchProgress(ch.chapter, s).done || s.stamps.some((x) => x.kind === 'stretch' && x.chapter === ch.chapter) ? 'done' : stretchOpen(ch.chapter, s) ? 'open' : undefined;
    return { chapter: ch.chapter, ...chapterProgress(ch.chapter, s), ready: isReady(ch.chapter, s), flames: cps.filter((c) => c.lit).length, checkpoints: cps.length, ...(stretch ? { stretch } : {}) };
  });
}

export interface NextStep {
  key: string;
  params: Record<string, number>;
}

/** A short "next steps" list drawn from the data (at most five). */
export function nextSteps(s: AppState, now = new Date()): NextStep[] {
  const out: NextStep[] = [];
  const next = currentChapter(s);
  const nch = content.chapters.find((c) => c.chapter === next);
  if (nch && !isReady(next, s)) {
    const p = chapterProgress(next, s);
    const frames = nch.sedia_kelas.frames.filter((f) => (s.frames[f]?.correct ?? 0) > 0).length;
    out.push({ key: 'rep.next.sedia', params: { n: next, a: p.coreKnown + frames, b: p.coreTotal + nch.sedia_kelas.frames.length } });
  }
  const replay = content.chapters.find((ch) => ch.chapter <= next && isReady(ch.chapter, s) && dialogueReplyIds(ch.chapter).length && !checkpoints(ch.chapter, s).find((c) => c.kind === 'dialogue')?.lit);
  if (replay) {
    const d = dialogueScore(dialogueKey(replay.chapter), dialogueReplyIds(replay.chapter).length, s);
    out.push({ key: 'rep.next.dialogue', params: { n: replay.chapter, k: d.needed, b: d.total } });
  }
  // An earlier chapter the learner has started but not finished.
  const rest = content.chapters.find((ch) => ch.chapter < next && ch.cards.some((c) => s.srs[c.id]) && chapterProgress(ch.chapter, s).known < ch.cards.length);
  if (rest) {
    const p = chapterProgress(rest.chapter, s);
    out.push({ key: 'rep.next.chapter', params: { n: rest.chapter, k: p.total - p.known } });
  }
  const x = content.stretch.find((p) => stretchPack(p.chapter) && stretchOpen(p.chapter, s) && !stretchProgress(p.chapter, s).done);
  if (x) out.push({ key: 'rep.next.stretch', params: { n: x.chapter } });
  const mistakes = groupMistakes(s).length;
  if (mistakes) out.push({ key: 'rep.next.mistakes', params: { n: mistakes } });
  const due = dueIds(s, now).length;
  if (due >= 5) out.push({ key: 'rep.next.due', params: { n: due } });
  if (!streak(s)) out.push({ key: 'rep.next.daily', params: {} });
  return out.slice(0, 5);
}

/** The full TeacherReport of a learner (every section), as the progress report embeds it. */
export function reportFromState(s: AppState, now = new Date(), source: TeacherReport['source'] = 'html'): TeacherReport {
  return {
    app: 'katakata',
    kind: REPORT_KIND,
    version: 1,
    student: s.profile.name || 'student',
    createdAt: now.toISOString(),
    questions: s.questions,
    reports: s.reports,
    progress: progressRowsFor(s),
    weakest: weakestWords(10, s),
    minutesThisWeek: minutesThisWeek(s),
    streak: streak(s),
    knownWords: knownCount(s),
    mistakes: groupMistakes(s),
    nombor: s.nombor ?? {},
    nextSteps: nextSteps(s, now).map((x) => tIn('en', x.key, x.params)),
    source,
  };
}

export function reportHtmlFilename(safeStudent: string, now = new Date()): string {
  const d = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  return `katakata-report_${safeStudent}_${d}.html`;
}

const esc = (x: unknown) => String(x ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
const ms = (x: string) => `<span lang="ms" class="ms">${esc(x)}</span>`;

/** JSON safe inside a <script> element: no "</script>", no HTML comment openers. */
export function scriptJson(x: unknown): string {
  return JSON.stringify(x).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
}

const CSS = `
*{box-sizing:border-box}
body{margin:0;background:#f7f3ea;color:#1f2a24;font:16px/1.55 system-ui,-apple-system,'Hiragino Sans','Hiragino Kaku Gothic ProN','Noto Sans JP','Yu Gothic UI',Meiryo,sans-serif}
main{max-width:46rem;margin:0 auto;padding:16px}
header{border-bottom:3px solid #2f6b4f;padding-bottom:8px;margin-bottom:12px}
.brand{color:#2f6b4f;font-weight:700;letter-spacing:.04em;margin:0}
h1{font-size:1.5rem;margin:.2rem 0}
h2{font-size:1.15rem;margin:1.4rem 0 .5rem;color:#2f6b4f}
p{margin:.3rem 0}
.muted{color:#5d6a62}
.small{font-size:.85rem}
.ms{font-weight:600}
.stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(9rem,1fr));gap:8px}
.stat{background:#fff;border:1px solid #ddd3bf;border-radius:12px;padding:8px 12px}
.stat b{display:block;font-size:1.5rem;color:#2f6b4f}
table{width:100%;border-collapse:collapse;background:#fff;font-size:.92rem}
th,td{border:1px solid #ddd3bf;padding:5px 8px;text-align:left;vertical-align:top}
th{background:#efe8d8}
.item{background:#fff;border:1px solid #ddd3bf;border-left:4px solid #975c30;border-radius:10px;padding:8px 12px;margin:8px 0;break-inside:avoid}
.item .ms{font-size:1.05rem}
.note{background:#efe8d8;border-radius:8px;padding:4px 8px;margin-top:4px;font-size:.9rem}
ol,ul{padding-left:1.4rem}
li{margin:.2rem 0}
footer{margin-top:2rem;border-top:1px solid #ddd3bf;padding-top:8px}
@media (max-width:30rem){th,td{padding:4px 5px;font-size:.85rem}}
@page{size:A4;margin:14mm}
@media print{body{background:#fff;font-size:11pt}main{max-width:none;padding:0}.stat,.item,table{background:#fff}h2{break-after:avoid}tr,.item{break-inside:avoid}}
`;

function fmtDate(iso: string, lang: Lang): string {
  const d = new Date(iso);
  return lang === 'ja' ? `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日` : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

function mistakeHtml(m: MistakeItem, l: Lang): string {
  const T = (k: string, p: Record<string, string | number> = {}) => tIn(l, k, p);
  const meaning = l === 'ja' ? m.ja ?? m.en : m.en;
  const note = l === 'ja' && m.note_ja ? m.note_ja : m.note;
  const answers = m.answers.map((a) => (a === null ? T('rep.dont_know') : ms(a))).join(' · ');
  return `<div class="item"><p>${ms(m.text)}${meaning ? ` <span class="muted">— ${esc(meaning)}</span>` : ''} <span class="muted small">(${esc(T(`rep.game.${m.game}`))}${m.chapter ? ` · ${esc(T('rep.chapter', { n: m.chapter }))}` : ''} · ${esc(T('rep.times', { n: m.count }))})</span></p>
<p class="small">${esc(T('rep.you_answered'))}: ${answers}</p>
<p class="small">${esc(T('rep.right_answer'))}: ${ms(m.right)}</p>${m.decoys?.length ? `<p class="small">${esc(T('rep.decoys'))}: ${m.decoys.map(ms).join(', ')}</p>` : ''}${note ? `<p class="note">${esc(note)}</p>` : ''}</div>`;
}

/** The progress report as one HTML file. `lang`: 'ja' gives Japanese, anything else English. */
export function buildReportHtml(s: AppState, uiLang: Lang, now = new Date()): { html: string; report: TeacherReport } {
  const l: Lang = uiLang === 'ja' ? 'ja' : 'en';
  const T = (k: string, p: Record<string, string | number> = {}) => tIn(l, k, p);
  const report = reportFromState(s, now);
  const name = report.student;
  const rows = report.progress!.filter((r) => r.known > 0 || r.flames || r.coreKnown > 0);
  const chapterTitle = (n: number) => {
    const ch = content.chapters.find((c) => c.chapter === n);
    return ch ? `${ms(ch.title.ms)}<br><span class="muted small">${esc(l === 'ja' ? ch.title.ja ?? ch.title.en : ch.title.en)}</span>` : '';
  };
  const nm = PARTS.filter((p) => s.nombor?.[p]?.plays);
  const steps = nextSteps(s, now);
  const qs = s.questions;
  const html = `<!doctype html>
<html lang="${l}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(T('rep.title'))} · ${esc(name)} · ${esc(fmtDate(report.createdAt, l))}</title>
<style>${CSS}</style>
</head>
<body>
<main>
<header>
<p class="brand">Kata-Kata · ${esc(T('rep.title'))}</p>
<h1>${esc(name)}</h1>
<p class="muted">${esc(fmtDate(report.createdAt, l))}</p>
</header>
<section class="stats">
<div class="stat"><b>${report.knownWords}</b>${esc(T('rep.words_known'))}</div>
<div class="stat"><b>${report.minutesThisWeek}</b>${esc(T('rep.minutes'))}</div>
<div class="stat"><b>${report.streak}</b>${esc(T('rep.streak'))}</div>
</section>
<h2>${esc(T('rep.next'))}</h2>
${steps.length ? `<ol>${steps.map((x) => `<li>${esc(T(x.key, x.params))}</li>`).join('')}</ol>` : `<p class="muted">${esc(T('rep.next_none'))}</p>`}
<h2>${esc(T('rep.chapters'))}</h2>
${rows.length ? `<table><thead><tr><th>${esc(T('rep.th.chapter'))}</th><th>${esc(T('rep.th.words'))}</th><th>🔥</th><th>⚡</th></tr></thead><tbody>
${rows.map((r) => `<tr><td>${r.chapter}. ${chapterTitle(r.chapter)}</td><td>${r.known} / ${r.total}${r.ready ? ` <span class="small">(${esc(T('rep.ready'))})</span>` : ''}</td><td>${'🔥'.repeat(r.flames ?? 0)} ${r.flames ?? 0}/${r.checkpoints ?? 0}</td><td>${r.stretch === 'done' ? esc(T('rep.x_done')) : r.stretch === 'open' ? esc(T('rep.x_open')) : '—'}</td></tr>`).join('\n')}
</tbody></table>` : `<p class="muted">${esc(T('rep.no_chapters'))}</p>`}
<h2>Nombor &amp; Masa</h2>
${nm.length ? `<ul>${nm.map((p) => `<li>${ms(p)}: ${esc(T('rep.nm_line', { n: s.nombor[p].plays, a: s.nombor[p].best, b: s.nombor[p].total }))}</li>`).join('')}</ul>` : `<p class="muted">${esc(T('rep.nm_none'))}</p>`}
<h2>${esc(T('rep.weakest'))}</h2>
${report.weakest!.length ? `<table><thead><tr><th>${esc(T('rep.th.malay'))}</th><th>${esc(T('rep.th.meaning'))}</th><th>${esc(T('rep.th.chapter'))}</th></tr></thead><tbody>
${report.weakest!.map((w) => { const c = content.cards.get(w.id); return `<tr><td>${ms(w.term)}</td><td>${esc(l === 'ja' && c ? c.gloss_ja : w.gloss_en)}</td><td>${w.chapter}</td></tr>`; }).join('\n')}
</tbody></table>` : `<p class="muted">${esc(T('rep.weakest_none'))}</p>`}
<h2>${esc(T('rep.mistakes'))}</h2>
${report.mistakes!.length ? `<p class="small muted">${esc(T('rep.mistakes_body'))}</p>${report.mistakes!.map((m) => mistakeHtml(m, l)).join('\n')}` : `<p class="muted">${esc(T('rep.mistakes_none'))}</p>`}
<h2>${esc(T('rep.questions'))}</h2>
${qs.length ? `<ul>${qs.map((q) => `<li>${q.context.text ? `${ms(q.context.text)} · ` : ''}${esc(q.text)}${q.answered ? ` <span class="small muted">(${esc(T('rep.answered'))})</span>` : ''}</li>`).join('')}</ul>` : `<p class="muted">${esc(T('rep.questions_none'))}</p>`}
<footer class="small muted"><p>${esc(T('rep.footer'))}</p></footer>
</main>
<script type="application/json" id="${REPORT_SCRIPT_ID}">${scriptJson(report)}</script>
</body>
</html>
`;
  return { html, report };
}

/** Read the TeacherReport embedded in a progress report HTML file (the Teacher Desk). */
export function extractReport(html: string): TeacherReport | null {
  const m = html.match(new RegExp(`<script[^>]*id=["']${REPORT_SCRIPT_ID}["'][^>]*>([\\s\\S]*?)</script>`));
  if (!m) return null;
  try {
    const r = JSON.parse(m[1]) as TeacherReport;
    return r && r.app === 'katakata' && r.kind === REPORT_KIND ? { ...r, source: 'html' } : null;
  } catch {
    return null;
  }
}
