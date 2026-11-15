// 🔥 checkpoint bar, the "N ⚡" chip and the ⚡ screen (docs/STRETCH-STAGE-design.md sections 2 and 4; Sam's decisions of
// 15 Nov 2026: three checkpoints, the stage has no name in the UI, only "{n} ⚡").
import { content, gloss, srsKey } from '../core/content';
import { getLang, t } from '../core/i18n';
import { checkpoints, stretchOpen, stretchPack, stretchProgress, type Checkpoint } from '../core/progress';
import { buildStretch, buildStretchDialogue, stretchReplyIds, type Session } from '../core/session';
import { isKnown } from '../core/srs';
import { state } from '../core/state';
import { button, h, mount } from '../core/ui';
import { sessionMeta } from './session';
import { topBar } from './widgets';

export interface StretchNav {
  go(route: string): void;
  run(session: Session): void;
}

/** Minimum share of the bar per segment, so two 🔥 never touch (design note section 2). */
export const MIN_SEGMENT = 0.15;

/** Segment widths (fractions summing to 1), proportional to item counts, none under MIN_SEGMENT. */
export function segmentWidths(totals: number[], min = MIN_SEGMENT): number[] {
  const n = totals.length;
  if (!n) return [];
  if (n * min >= 1) return totals.map(() => 1 / n);
  const sum = totals.reduce((a, b) => a + b, 0) || n;
  let w = totals.map((x) => (sum === n && totals.every((v) => !v) ? 1 / n : x / sum));
  // Raise small segments to the minimum and share what is left among the others, until none is under it.
  for (let pass = 0; pass < n; pass++) {
    const small = w.map((x) => x < min - 1e-9);
    if (!small.some(Boolean)) break;
    const fixed = small.filter(Boolean).length * min;
    const restSum = w.reduce((a, x, i) => a + (small[i] ? 0 : x), 0);
    w = w.map((x, i) => (small[i] ? min : restSum ? (x / restSum) * (1 - fixed) : (1 - fixed) / (n - small.filter(Boolean).length)));
  }
  return w;
}

function cpLabel(c: Checkpoint, i: number, n: number): string {
  const key = c.kind === 'ready' ? 'stretch.cp_ready' : c.kind === 'dialogue' ? 'stretch.cp_dialogue' : 'stretch.cp_chapter';
  return t(key, { i: i + 1, b: n, state: t(c.lit ? 'stretch.reached' : 'stretch.not_yet') });
}

/** One track in one segment per checkpoint; a 🔥 (lit) or an outlined circle at each segment's end. */
export function checkpointBar(chapter: number): HTMLElement | null {
  const cps = checkpoints(chapter);
  if (!cps.length) return null;
  const widths = segmentWidths(cps.map((c) => c.total));
  const done = cps.reduce((a, c) => a + Math.min(c.done, c.total), 0);
  const total = cps.reduce((a, c) => a + c.total, 0);
  let at = 0;
  const marks = cps.map((c, i) => {
    at += widths[i];
    return h(
      'span',
      { class: 'cp-mark' + (c.lit ? ' lit' : ''), role: 'img', 'aria-label': cpLabel(c, i, cps.length), style: `left:${(at * 100).toFixed(2)}%` },
      c.lit ? '🔥' : '',
    );
  });
  return h(
    'div',
    { class: 'cp', 'data-flames': String(cps.filter((c) => c.lit).length) },
    h(
      'div',
      { class: 'cp-bar', role: 'progressbar', 'aria-valuemin': '0', 'aria-valuemax': String(total), 'aria-valuenow': String(done), 'aria-label': flamesLine(chapter) },
      cps.map((c, i) => {
        const pct = c.total ? Math.round((Math.min(c.done, c.total) / c.total) * 100) : c.lit ? 100 : 0;
        return h('div', { class: 'cp-seg', style: `flex:0 0 ${(widths[i] * 100).toFixed(2)}%` }, h('div', { class: 'cp-fill', style: `width:${pct}%` }));
      }),
    ),
    h('div', { class: 'cp-marks' }, marks),
  );
}

/** "🔥 1/3 · Prep 12/28", "🔥 1/3 · 9 lines to go", "🔥 2/3 · 18 words to go", "🔥 3/3". */
export function flamesLine(chapter: number): string {
  const cps = checkpoints(chapter);
  const lit = cps.filter((c) => c.lit).length;
  const head = t('stretch.flames', { a: lit, b: cps.length });
  const next = cps.find((c) => !c.lit);
  if (!next) return head;
  if (next.kind === 'ready') return `${head} · ${t('sedia.progress', { a: next.done, b: next.total })}`;
  if (next.kind === 'dialogue') return `${head} · ${t('stretch.lines_to_go', { n: next.total - next.done })}`;
  return `${head} · ${t('stretch.to_go', { n: next.total - next.done })}`;
}

/** 🔥 for each lit checkpoint (Rekod). */
export function flamesText(chapter: number): string {
  return '🔥'.repeat(checkpoints(chapter).filter((c) => c.lit).length);
}

/** The "{n} ⚡" chip: a separate button beside the chapter button, only when ⚡ is open. */
export function stretchChip(chapter: number, nav: StretchNav): HTMLElement | null {
  if (!stretchOpen(chapter)) return null;
  return h(
    'button',
    { class: 'stretch-chip', type: 'button', 'aria-label': t('stretch.chip_aria', { n: chapter }), title: t('stretch.tip'), onclick: () => nav.go(`sedia/${chapter}/x`) },
    t('stretch.chip', { n: chapter }),
  );
}

/** The ⚡ screen (route #/sedia/N/x; the route name is internal). */
export function renderStretch(root: HTMLElement, chapter: number, nav: StretchNav): void {
  const x = stretchPack(chapter);
  const ch = content.chapters.find((c) => c.chapter === chapter);
  if (!x || !ch) return nav.go(`sedia/${chapter}`);
  const lang = getLang();
  const open = stretchOpen(chapter);
  const p = stretchProgress(chapter);
  const session = buildStretch(chapter);
  const started = x.cards.some((c) => state.srs[srsKey(c.id)]);
  const pct = p.total + p.framesTotal ? Math.round(((p.known + p.framesBuilt) / (p.total + p.framesTotal)) * 100) : 0;
  const replies = stretchReplyIds(chapter);
  mount(
    root,
    h(
      'div',
      { class: 'screen stretch-screen' },
      topBar(t('stretch.chip', { n: chapter }), () => nav.go(`sedia/${chapter}`)),
      h(
        'div',
        { class: 'stretch-band' },
        h('h2', { lang: 'ms' }, ch.title.ms),
        h('p', { class: 'small' }, t('stretch.tip')),
        h(
          'div',
          { class: 'stretch-progress' },
          h(
            'div',
            { class: 'stretch-bar', role: 'progressbar', 'aria-valuemin': '0', 'aria-valuemax': String(p.total + p.framesTotal), 'aria-valuenow': String(p.known + p.framesBuilt), 'aria-label': t('stretch.bar', { a: p.known, b: p.total, c: p.framesBuilt, d: p.framesTotal }) },
            h('div', { class: 'stretch-bar-fill', style: `width:${pct}%` }),
          ),
          h('span', { class: 'small stretch-count' }, `${p.known}/${p.total} · ${p.framesBuilt}/${p.framesTotal}`, p.done ? ` · ${t('stretch.done')}` : ''),
        ),
      ),
      open
        ? button(`${started ? t('stretch.continue') : t('stretch.start')} · ${sessionMeta(session.steps)}`, () => nav.run(session), 'btn btn-stretch btn-wide')
        : h('section', { class: 'card-box stack' }, h('p', null, t('stretch.locked')), checkpointBar(chapter), h('p', { class: 'small' }, flamesLine(chapter))),
      open && replies.length
        ? h(
            'section',
            { class: 'card-box' },
            h('h3', null, t('stretch.dialogue', { n: replies.length })),
            h('p', { class: 'muted small', lang: 'ms' }, x.scenario.lines.map((l) => l.speaker).filter((v, i, a) => a.indexOf(v) === i).join(', ')),
            button(t('stretch.play_dialogue'), () => nav.run(buildStretchDialogue(chapter)), 'btn btn-ghost btn-wide stretch-outline'),
          )
        : null,
      h(
        'section',
        { class: 'card-box' },
        h('h3', null, t('stretch.words', { n: x.cards.length })),
        h(
          'ul',
          { class: 'word-list compact' },
          x.cards.map((c) => {
            const known = isKnown(state.srs[srsKey(c.id)]);
            return h('li', { class: known ? 'known' : '' }, known ? '✓ ' : '・', h('b', { lang: 'ms' }, c.term), ' — ', known ? gloss(c, lang) : '？');
          }),
        ),
      ),
      h(
        'section',
        { class: 'card-box' },
        h('h3', null, t('stretch.frames', { n: x.frames.length })),
        h(
          'ul',
          { class: 'word-list' },
          x.frames.map((f) =>
            h('li', null, (state.frames[f.id]?.correct ?? 0) > 0 ? '✓ ' : '', h('b', { lang: 'ms' }, f.frame), h('br'), h('span', { class: 'muted small' }, lang === 'ja' && f.meaning_ja ? f.meaning_ja : f.meaning_en)),
          ),
        ),
      ),
    ),
  );
}
