// The class run (teacher mode, Sam 17 Nov 2026): slides on a projector or TV, paced by the teacher. Nothing is timed and
// nothing moves on by itself (Laju! has an optional clock). Keys: → Space PageDown next, ← PageUp back, 1 to 4 choose,
// R reveal, H translations, P play. The run plays on a copy of the learner (beginClassRun), so no learner data changes.
import { ClassRun, optionCount, rightOption, type ClassActivity, type ClassSource, type Slide, buildSlides } from '../core/classroom';
import { content, gloss } from '../core/content';
import { getLang, t } from '../core/i18n';
import { keyAction, type KeyAction } from '../core/keys';
import { buildMatches } from '../core/nombor';
import { fullscreenSupported, toggleFullscreen } from '../core/screen';
import { beginClassRun, endClassRun } from '../core/state';
import { setTeacher, teacher } from '../core/teacher';
import { speak, stopSpeech } from '../core/tts';
import type { Card, ScenarioLine } from '../core/types';
import { button, h, mount } from '../core/ui';
import { layout } from '../games/cari-benda';
import { explorer, numberLevel, PART_ICON, PART_MS, promptFor, readingBox, shownEl, showQuestion } from './nombor';

export const LAJU_CLASS_SECONDS = 60;

/** The run's title: "Chapter 4 · ⚡ Frames", "Jambatan · Health · Words", "🕒 Masa · Round". */
export function runTitle(src: ClassSource, activity: ClassActivity): string {
  const act = t(`teach.act.${activity}`);
  if (src.kind === 'chapter') return `${t('common.chapter', { n: src.chapter })} · ${act}`;
  if (src.kind === 'nombor') return `${PART_ICON[src.part]} ${PART_MS[src.part]} · ${act}`;
  const sc = content.scenes.find((s) => s.id === src.sceneId);
  return `${sc ? sc.title.ms : src.sceneId} · ${act}`;
}

function cardGloss(c: Card): HTMLElement {
  const lang = getLang();
  return h('div', { class: 'cl-gloss' }, h('span', null, gloss(c, lang)), lang === 'ja' ? h('span', { class: 'cl-gloss-sub' }, c.gloss_en) : null);
}

function cardNote(c: Card): HTMLElement | null {
  const note = getLang() === 'ja' && c.note_ja ? c.note_ja : c.note;
  return note ? h('p', { class: 'cl-note' }, note) : null;
}

function lineNote(l: ScenarioLine): HTMLElement | null {
  const note = getLang() === 'ja' && l.note_ja ? l.note_ja : l.note;
  return note ? h('p', { class: 'cl-note', 'data-line': l.id }, note) : null;
}

/** "Puan Aini: …" inside a line (a phone call in chapter 4) is shown as the speaker. */
function split(speaker: string, ms: string): { who: string; text: string } {
  const m = /^\(.*\)$/.test(speaker) ? ms.match(/^([A-Z][\w ]{1,30}):\s+(.*)$/) : null;
  return m ? { who: m[1], text: m[2] } : { who: speaker, text: ms };
}

function audio(text: string, cardId?: string): HTMLElement {
  return h(
    'span',
    { class: 'cl-audio' },
    button('▶', () => void speak(text, { cardId }), 'btn btn-audio cl-play'),
    button('🐢', () => void speak(text, { slow: true, cardId }), 'btn btn-audio btn-ghost cl-slow'),
  );
}

function numbered(n: number, body: HTMLElement | string, cls: string, onclick: () => void, attrs: Record<string, string> = {}): HTMLButtonElement {
  return h('button', { class: `opt cl-opt ${cls}`, type: 'button', onclick, ...attrs }, h('span', { class: 'cl-num', 'aria-hidden': 'true' }, String(n)), h('span', { class: 'cl-opt-body' }, body)) as HTMLButtonElement;
}

/** The Malay text P plays on a slide, if any (frames and Nombor answers only after the reveal). */
export function slideAudio(s: Slide, revealed: boolean): { text: string; cardId?: string } | null {
  switch (s.kind) {
    case 'word':
    case 'cari':
    case 'laju': {
      const c = content.cards.get(s.cardId)!;
      return { text: c.term, cardId: c.id };
    }
    case 'frame':
      return revealed ? { text: content.frames.get(s.frameId)!.example } : null;
    case 'line':
      return { text: split(content.lines.get(s.lineId)!.line.speaker, content.lines.get(s.lineId)!.line.ms).text };
    case 'reply': {
      const ref = content.lines.get(s.lineId)!;
      const l = revealed ? ref.line : ref.lines[s.index - 1];
      return { text: split(l.speaker, l.ms).text };
    }
    case 'nm':
      return s.q.shown.kind === 'ms' ? { text: s.q.shown.text } : revealed ? { text: s.q.reading.text } : null;
    default:
      return null;
  }
}

export interface ClassHandlers {
  /** Back to the launcher (the run has ended). */
  exit(): void;
  /** The 先生モード badge: end the run and turn teacher mode off. */
  turnOff(): void;
}

/** Run one class activity. Resolves when the run ends; the learner is back as it was before the run started. */
export async function runClass(root: HTMLElement, src: ClassSource, activity: ClassActivity, handlers: ClassHandlers): Promise<void> {
  beginClassRun();
  document.body.dataset.classRun = '1';
  let run = new ClassRun(buildSlides(src, activity, numberLevel()));
  let showTrans = teacher.translations;
  let clock: ReturnType<typeof setInterval> | null = null;
  let remaining = LAJU_CLASS_SECONDS;
  let timeUp = false;
  const title = runTitle(src, activity);
  const timerEl = h('span', { class: 'cl-timer', 'aria-live': 'off' });
  const keep = new Map<Slide, HTMLElement>();

  const startClock = () => {
    if (activity !== 'laju' || !teacher.lajuTimer || clock) return;
    remaining = LAJU_CLASS_SECONDS;
    timeUp = false;
    clock = setInterval(() => {
      remaining = Math.max(0, remaining - 1);
      if (remaining === 0) {
        timeUp = true;
        if (clock) clearInterval(clock);
        clock = null;
        draw();
        return;
      }
      timerEl.textContent = `⏱️ ${remaining}`;
    }, 1000);
  };

  const finish = (then: () => void) => {
    document.removeEventListener('keydown', onKey, true);
    if (clock) clearInterval(clock);
    stopSpeech();
    delete document.body.dataset.classRun;
    endClassRun();
    then();
  };

  const play = (slow = false) => {
    const s = run.slide;
    const a = s && slideAudio(s, run.revealed);
    if (a) void speak(a.text, { cardId: a.cardId, slow });
  };

  const act = (a: KeyAction) => {
    if (timeUp && a.kind !== 'back') return;
    switch (a.kind) {
      case 'next': {
        const was = run.index;
        const r = run.next();
        draw();
        if (r === 'moved' && run.index !== was && teacher.autoplay && run.slide?.kind !== 'reply' && run.slide?.kind !== 'frame' && run.slide?.kind !== 'nm') play();
        if (r === 'revealed' && (run.slide?.kind === 'reply' || run.slide?.kind === 'frame')) play();
        return;
      }
      case 'back':
        if (run.back()) draw();
        return;
      case 'reveal':
        if (!run.revealed) {
          run.reveal();
          draw();
          if (run.slide?.kind === 'reply' || run.slide?.kind === 'frame') play();
        }
        return;
      case 'choose':
        if (run.choose(a.n)) draw();
        return;
      case 'translations':
        showTrans = !showTrans;
        draw();
        return;
      case 'audio':
        play();
        return;
    }
  };

  function onKey(e: KeyboardEvent): void {
    if (document.querySelector('.sheet-backdrop')) return;
    const a = keyAction(e);
    if (!a) return;
    e.preventDefault();
    e.stopPropagation();
    act(a);
  }
  document.addEventListener('keydown', onKey, true);

  // ---- slide bodies ----
  const transShown = (current = false) => showTrans || (current && run.revealed);

  const wordSlide = (s: Extract<Slide, { kind: 'word' }>) => {
    const c = content.cards.get(s.cardId)!;
    const open = showTrans || run.revealed;
    return h(
      'div',
      { class: 'cl-two cl-word' },
      h('div', { class: 'cl-main' }, h('div', { class: 'cl-term', lang: 'ms' }, c.term), audio(c.term, c.id), c.register === 'formal' ? h('span', { class: 'chip chip-register' }, t('reg.formal')) : null),
      h(
        'div',
        { class: 'cl-side' },
        open ? cardGloss(c) : h('div', { class: 'cl-hidden', 'aria-label': t('teach.trans_off') }, t('teach.hidden')),
        run.revealed ? cardNote(c) : null,
      ),
    );
  };

  const frameSlide = (s: Extract<Slide, { kind: 'frame' }>) => {
    const f = content.frames.get(s.frameId)!;
    const lang = getLang();
    const meaning = lang === 'ja' && f.meaning_ja ? f.meaning_ja : f.meaning_en;
    const left = s.bank.map((w, i) => ({ w, i })).filter((x) => !run.built.includes(x.i));
    const decoys = f.decoys ?? [];
    return h(
      'div',
      { class: 'cl-frame' },
      h('p', { class: 'cl-instr' }, t('game.susun.prompt'), decoys.length ? h('span', { class: 'cl-x' }, '  ⚡ ', t('stretch.decoy')) : null),
      transShown(true) ? h('div', { class: 'cl-meaning' }, meaning) : h('div', { class: 'cl-hidden cl-meaning' }, t('teach.hidden')),
      run.revealed
        ? h(
            'div',
            { class: 'cl-answer' },
            h('p', { class: 'cl-sentence', lang: 'ms' }, f.example),
            audio(f.example),
            h('p', { class: 'cl-pattern' }, `${t('game.susun.frame')}: `, h('span', { lang: 'ms' }, f.frame)),
            decoys.length ? h('p', { class: 'cl-note' }, t('stretch.decoy_was'), ' ', h('b', { lang: 'ms' }, decoys.join(', '))) : null,
          )
        : h(
            'div',
            { class: 'cl-build' },
            h(
              'div',
              { class: 'tiles tiles-answer cl-built', 'aria-label': 'answer' },
              run.built.map((i, pos) => h('button', { class: 'tile tile-on', type: 'button', lang: 'ms', onclick: () => (run.unplace(pos), draw()) }, s.bank[i])),
            ),
            h(
              'div',
              { class: 'tiles tiles-bank cl-bank' },
              left.map((x, k) => h('button', { class: 'tile cl-tile', type: 'button', lang: 'ms', onclick: () => act({ kind: 'choose', n: k + 1 }) }, h('span', { class: 'cl-num', 'aria-hidden': 'true' }, String(k + 1)), x.w)),
            ),
          ),
    );
  };

  const bubble = (l: ScenarioLine, current: boolean) => {
    const sp = split(l.speaker, l.ms);
    return h(
      'div',
      { class: 'cl-bubble' + (current ? ' current' : ''), 'data-line': l.id },
      h('div', { class: 'cl-line' }, h('span', { class: 'cl-who' }, sp.who), ' ', h('span', { lang: 'ms', class: 'cl-ms' }, sp.text), audio(sp.text)),
      transShown(current) ? h('p', { class: 'cl-en' }, l.en) : null,
      lineNote(l),
    );
  };

  const dialogueSlide = (s: Extract<Slide, { kind: 'line' | 'reply' }>) => {
    const ref = content.lines.get(s.lineId)!;
    const lines = ref.lines;
    const shown = lines.slice(0, s.index);
    const convo = h(
      'div',
      { class: 'cl-convo' },
      h('p', { class: 'cl-count small' }, t('teach.line_of', { i: s.index + 1, n: lines.length })),
      shown.map((l) => bubble(l, false)),
      s.kind === 'line' || run.revealed ? bubble(ref.line, true) : null,
    );
    if (s.kind === 'line') return h('div', { class: 'cl-dialogue' }, convo);
    const right = rightOption(s);
    const who = split(ref.line.speaker, ref.line.ms).who;
    const opts = h(
      'div',
      { class: 'cl-replies' },
      h('p', { class: 'cl-instr' }, t('teach.who_says', { who })),
      h(
        'div',
        { class: 'options cl-options' },
        s.options.map((o, i) =>
          numbered(
            i + 1,
            h('span', null, h('span', { lang: 'ms' }, split(ref.line.speaker, o.ms).text), run.revealed && transShown(true) && o.en ? h('span', { class: 'cl-opt-en' }, o.en) : null),
            optClass(i, right),
            () => act({ kind: 'choose', n: i + 1 }),
          ),
        ),
      ),
      run.revealed ? null : h('p', { class: 'cl-hint small' }, t('teach.call_out')),
    );
    return h('div', { class: 'cl-dialogue cl-reply' }, convo, opts);
  };

  const optClass = (i: number, right: number | null) => {
    if (!run.revealed) return run.chosen === i ? 'cl-chosen' : '';
    if (i === right) return run.chosen === null || run.chosen === i ? 'opt-correct' : 'opt-answer';
    return run.chosen === i ? 'opt-chosen' : '';
  };

  const cariSlide = (s: Extract<Slide, { kind: 'cari' }>) => {
    const scene = content.scenes.find((x) => x.id === s.sceneId)!;
    const target = content.cards.get(s.cardId)!;
    const objs = s.board.map((id) => content.cards.get(id)!).filter(Boolean);
    const pos = layout(`${scene.id}-${s.board.length}`, objs.length);
    const right = rightOption(s);
    return h(
      'div',
      { class: 'cl-two cl-cari' },
      h(
        'div',
        { class: 'cl-main' },
        h('p', { class: 'cl-instr' }, t('game.cari.prompt')),
        h('div', { class: 'cl-term', lang: 'ms' }, target.term),
        audio(target.term, target.id),
        transShown(true) ? cardGloss(target) : null,
      ),
      h(
        'div',
        { class: `cari-board cl-board world-${scene.world.id}`, role: 'group', 'aria-label': scene.title.ms },
        objs.map((o, i) =>
          h(
            'button',
            {
              class: 'cari-obj ' + (run.revealed ? (i === right ? 'obj-correct' : run.chosen === i ? 'obj-chosen' : '') : run.chosen === i ? 'cl-chosen' : ''),
              type: 'button',
              'data-id': o.id,
              style: `left:${pos[i].x}%;top:${pos[i].y}%`,
              'aria-label': `${i + 1}`,
              onclick: () => act({ kind: 'choose', n: i + 1 }),
            },
            h('span', { class: 'cari-emoji', 'aria-hidden': 'true' }, o.image ?? '❓'),
            h('span', { class: 'cl-obj-num', 'aria-hidden': 'true' }, String(i + 1)),
          ),
        ),
      ),
    );
  };

  const lajuSlide = (s: Extract<Slide, { kind: 'laju' }>) => {
    const c = content.cards.get(s.cardId)!;
    const right = rightOption(s);
    const lang = getLang();
    return h(
      'div',
      { class: 'cl-two cl-laju' },
      h(
        'div',
        { class: 'cl-main' },
        h('button', { class: 'cl-term cl-term-btn', type: 'button', lang: 'ms', onclick: () => void speak(c.term, { cardId: c.id }) }, c.term),
        h('p', { class: 'small muted' }, t('teach.tap_word')),
        h('p', { class: 'cl-score' }, t('teach.laju_right', { n: run.right })),
      ),
      h(
        'div',
        { class: 'options cl-options' },
        s.options.map((id, i) => numbered(i + 1, gloss(content.cards.get(id)!, lang), optClass(i, right), () => act({ kind: 'choose', n: i + 1 }), { lang })),
      ),
    );
  };

  const nmSlide = (s: Extract<Slide, { kind: 'nm' }>) => {
    const q = s.q;
    // The question's gadget (rolling numbers, the spinning clock) is drawn once per slide, not again on every key press.
    const cached = keep.get(s);
    const stage = cached ?? h('div', { class: 'nm-q-stage cl-nm-stage' });
    if (!cached) {
      keep.set(s, stage);
      queueMicrotask(() => showQuestion(stage, q));
    }
    const right = rightOption(s);
    let body: HTMLElement;
    if (q.dir === 'build') {
      const blocks = q.blocks ?? [];
      const left = blocks.map((w, i) => ({ w, i })).filter((x) => !run.built.includes(x.i));
      const ok = run.revealed && run.built.length ? buildMatches(q, run.built.map((i) => blocks[i])) : null;
      body = h(
        'div',
        { class: 'stack' },
        h('div', { class: 'tiles tiles-answer cl-built' + (ok === true ? ' nm-built-ok' : ok === false ? ' nm-built-no' : '') }, run.built.map((i, pos) => h('button', { class: 'tile tile-on', type: 'button', lang: 'ms', onclick: () => (run.unplace(pos), draw()) }, blocks[i]))),
        run.revealed ? null : h('div', { class: 'tiles tiles-bank cl-bank' }, left.map((x, k) => h('button', { class: 'tile cl-tile', type: 'button', lang: 'ms', onclick: () => act({ kind: 'choose', n: k + 1 }) }, h('span', { class: 'cl-num', 'aria-hidden': 'true' }, String(k + 1)), x.w))),
      );
    } else {
      body = h(
        'div',
        { class: 'options nm-options cl-options' + (q.options[0].kind === 'time' ? ' nm-options-grid' : '') },
        q.options.map((o, i) => numbered(i + 1, shownEl(o, false), 'nm-opt ' + optClass(i, right), () => act({ kind: 'choose', n: i + 1 }))),
      );
    }
    const el = h(
      'div',
      { class: 'cl-two cl-nm nm', 'data-part': s.part },
      h('div', { class: 'cl-main' }, h('p', { class: 'cl-instr' }, promptFor(q)), stage),
      h('div', { class: 'cl-side' }, body, run.revealed ? readingBox(q.reading) : h('p', { class: 'cl-hint small' }, t('teach.call_out'))),
    );
    return el;
  };

  const exploreSlide = (s: Extract<Slide, { kind: 'explore' }>) => {
    const el = keep.get(s) ?? h('div', { class: 'cl-explore nm', 'data-part': s.part }, explorer(s.part));
    keep.set(s, el);
    return el;
  };

  const doneSlide = () =>
    h(
      'div',
      { class: 'cl-done center stack' },
      h('h2', null, '🎉 ', t('teach.done')),
      activity === 'laju' ? h('p', { class: 'cl-score' }, t('teach.laju_right', { n: run.right })) : null,
      h('p', null, t('teach.done_body', { n: run.slides.length })),
      h(
        'div',
        { class: 'row' },
        button(t('teach.again'), () => {
          run = new ClassRun(buildSlides(src, activity, numberLevel()));
          if (clock) clearInterval(clock);
          clock = null;
          timeUp = false;
          startClock();
          draw();
        }, 'btn btn-primary'),
        button(t('teach.to_launcher'), () => finish(handlers.exit), 'btn'),
      ),
    );

  const slideBody = (s: Slide | undefined): HTMLElement => {
    if (!s) return doneSlide();
    switch (s.kind) {
      case 'word': return wordSlide(s);
      case 'frame': return frameSlide(s);
      case 'line':
      case 'reply': return dialogueSlide(s);
      case 'cari': return cariSlide(s);
      case 'laju': return lajuSlide(s);
      case 'nm': return nmSlide(s);
      case 'explore': return exploreSlide(s);
    }
  };

  function draw(): void {
    const s = run.slide;
    const hasAnswer = run.hasAnswer();
    timerEl.textContent = activity === 'laju' && teacher.lajuTimer ? `⏱️ ${remaining}` : '';
    const stage = h('main', { class: 'cl-stage', 'data-kind': s?.kind ?? 'done' }, h('p', { class: 'rotate-hint', role: 'note' }, '📱↻ ', t('teach.rotate')), slideBody(s));
    if (timeUp) stage.append(h('div', { class: 'cl-timeup', role: 'status' }, h('b', null, '⏱️ ', t('teach.time_up')), h('span', null, t('teach.laju_right', { n: run.right })), button(t('teach.to_launcher'), () => finish(handlers.exit), 'btn btn-primary')));
    const n = run.slides.length;
    mount(
      root,
      h(
        'div',
        { class: 'class-run', 'data-kind': s?.kind ?? 'done', 'data-revealed': run.revealed ? '1' : '0' },
        h(
          'header',
          { class: 'class-top' },
          h('button', { class: 'teacher-badge', type: 'button', title: t('teach.badge_off'), 'aria-label': t('teach.badge_off'), onclick: () => finish(handlers.turnOff) }, '🎓 ', t('teach.mode'), h('span', { class: 'badge-x', 'aria-hidden': 'true' }, ' ✕')),
          h('h1', { class: 'cl-title' }, title),
          h('span', { class: 'cl-pos' }, s ? `${run.index + 1} / ${n}` : `${n} / ${n}`),
          timerEl,
          h('button', { class: 'btn btn-small cl-trans' + (showTrans ? ' on' : ''), type: 'button', 'aria-pressed': String(showTrans), title: 'H', onclick: () => act({ kind: 'translations' }) }, showTrans ? t('teach.trans_on') : t('teach.trans_off'), h('kbd', null, 'H')),
          fullscreenSupported() ? h('button', { class: 'icon-btn cl-fs', type: 'button', 'aria-label': t('teach.fullscreen'), title: t('teach.fullscreen'), onclick: () => void toggleFullscreen() }, '⛶') : null,
          h('button', { class: 'icon-btn cl-exit', type: 'button', 'aria-label': t('teach.exit'), title: t('teach.exit'), onclick: () => finish(handlers.exit) }, '✕'),
        ),
        stage,
        h(
          'footer',
          { class: 'class-controls' },
          button(['‹ ', t('common.back'), h('kbd', null, '←')], () => act({ kind: 'back' }), 'btn cl-back'),
          s && slideAudio(s, run.revealed) ? button(['🔊 ', t('teach.play'), h('kbd', null, 'P')], () => act({ kind: 'audio' }), 'btn cl-audio-btn') : null,
          s && hasAnswer ? button([t('teach.reveal'), h('kbd', null, 'R')], () => act({ kind: 'reveal' }), 'btn cl-reveal' + (run.revealed ? ' done' : '')) : null,
          s ? button([t('common.next'), ' ›', h('kbd', null, '→')], () => act({ kind: 'next' }), 'btn btn-primary cl-next') : null,
        ),
      ),
    );
    if (run.revealed) root.querySelector<HTMLButtonElement>('.cl-reveal')?.setAttribute('disabled', '');
    const convo = root.querySelector('.cl-convo');
    if (convo) convo.scrollTop = convo.scrollHeight;
  }

  startClock();
  draw();
  if (teacher.autoplay && run.slide && run.slide.kind !== 'reply' && run.slide.kind !== 'frame' && run.slide.kind !== 'nm') play();
}

/** Turn teacher mode off from the badge (also used by the strip on other screens). */
export async function turnTeacherOff(): Promise<void> {
  await setTeacher({ on: false });
}

/** For tests and the key card: how many options the number keys reach on the current slide. */
export { optionCount };
