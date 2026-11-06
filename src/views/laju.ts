// Laju! (fast): a 60-second round on words the learner already knows. Pick the meaning as fast as you can.
// Practice only: answers here never change the review schedule (timed guessing would distort it), and a
// miss costs nothing (spec P6). Points, speed bonus and combo come from core/score.ts.
import { content, gloss, srsKey } from '../core/content';
import { getLang, t } from '../core/i18n';
import { addStudySeconds } from '../core/progress';
import { foldRecords, Scorer } from '../core/score';
import { distractors } from '../core/session';
import { isKnown } from '../core/srs';
import { saveNow, state, update } from '../core/state';
import { speak, stopSpeech } from '../core/tts';
import type { Card } from '../core/types';
import { button, h, mount, shuffle } from '../core/ui';
import { pointsBadge, scorePill, scoreStats } from './points';
import { topBar } from './widgets';

export const LAJU_SECONDS = 60;
export const LAJU_MIN_WORDS = 8;

/** Known words, one card per schedule key, with a meaning in the interface language. */
export function lajuPool(): Card[] {
  const seen = new Set<string>();
  const out: Card[] = [];
  for (const c of content.cards.values()) {
    const k = srsKey(c.id);
    if (seen.has(k) || !isKnown(state.srs[k]) || c.recognise_only) continue;
    seen.add(k);
    out.push(c);
  }
  return out;
}

export function renderLaju(root: HTMLElement, go: (r: string) => void): void {
  const pool = lajuPool();
  const best = state.scores.lajuBest;
  mount(
    root,
    h(
      'div',
      { class: 'screen laju-start' },
      topBar('⚡ ' + t('mode.laju'), () => go('')),
      h('h1', { class: 'laju-title' }, t('laju.title')),
      h('p', { class: 'lead' }, t('laju.body')),
      pool.length < LAJU_MIN_WORDS
        ? h(
            'section',
            { class: 'card-box stack' },
            h('p', null, t('laju.need', { n: LAJU_MIN_WORDS - pool.length })),
            button(t('home.today'), () => go(''), 'btn btn-primary btn-wide'),
          )
        : h(
            'section',
            { class: 'card-box stack center' },
            h('p', { class: 'muted small' }, t('laju.pool', { n: pool.length })),
            best ? h('p', null, t('laju.best', { n: best })) : null,
            button(t('laju.start') + ' ⚡', () => play(root, pool, go), 'btn btn-primary btn-wide btn-big'),
          ),
    ),
  );
}

function play(root: HTMLElement, pool: Card[], go: (r: string) => void): void {
  const lang = getLang();
  const scorer = new Scorer();
  const pill = scorePill();
  const timeLeft = h('span', { class: 'laju-time', 'aria-live': 'off' });
  const bar = h('div', { class: 'laju-bar' }, h('div', { class: 'laju-bar-fill' }));
  const fill = bar.firstChild as HTMLElement;
  const stage = h('main', { class: 'laju-stage' });
  let remaining = LAJU_SECONDS * 1000;
  let last = performance.now();
  let over = false;
  let queue: Card[] = [];
  let prev: string | null = null;

  const stop = (finished: boolean) => {
    if (over) return;
    over = true;
    clearInterval(timer);
    document.removeEventListener('visibilitychange', onVis);
    stopSpeech();
    addStudySeconds(Math.round((LAJU_SECONDS * 1000 - remaining) / 1000));
    if (!finished) {
      void saveNow();
      return go('');
    }
    let beat = { score: false, combo: false, fastest: false };
    update((s) => (beat = foldRecords(s.scores, scorer, 'laju')));
    void saveNow();
    mount(
      root,
      h(
        'div',
        { class: 'screen summary laju-end' },
        h('h1', null, '⏱️ ' + t('laju.done')),
        scoreStats(scorer, beat),
        h('p', { class: 'center' }, `${t('laju.right')}: ${scorer.right}`),
        h('p', { class: 'muted small center' }, t('laju.best', { n: state.scores.lajuBest })),
        h(
          'div',
          { class: 'stack' },
          button(t('laju.again') + ' ⚡', () => play(root, lajuPool(), go), 'btn btn-primary btn-wide'),
          button(t('sum.home'), () => go(''), 'btn btn-ghost btn-wide'),
        ),
      ),
    );
  };

  // The clock only runs while the page is visible.
  const onVis = () => (last = performance.now());
  document.addEventListener('visibilitychange', onVis);
  const timer = setInterval(() => {
    const now = performance.now();
    if (document.visibilityState === 'visible') remaining -= now - last;
    last = now;
    const secs = Math.max(0, Math.ceil(remaining / 1000));
    timeLeft.textContent = t('laju.time', { n: secs });
    fill.style.width = `${Math.max(0, (remaining / (LAJU_SECONDS * 1000)) * 100)}%`;
    bar.classList.toggle('low', secs <= 10);
    if (remaining <= 0) stop(true);
  }, 100);

  const next = () => {
    if (over) return;
    if (!queue.length) queue = shuffle(pool);
    let card = queue.pop()!;
    if (card.id === prev && queue.length) {
      queue.unshift(card);
      card = queue.pop()!;
    }
    prev = card.id;
    const options = shuffle([card, ...distractors(card)]);
    const shownAt = performance.now();
    const list = h('div', { class: 'options laju-options' });
    const feedback = h('div', { class: 'laju-feedback', 'aria-live': 'polite' });
    let done = false;
    for (const o of options) {
      const b = h('button', { class: 'opt', type: 'button', lang, 'data-id': o.id }, gloss(o, lang)) as HTMLButtonElement;
      b.addEventListener('click', () => {
        if (done || over) return;
        done = true;
        const correct = o.id === card.id;
        const hit = scorer.hit('laju', correct, performance.now() - shownAt);
        pill.update(scorer);
        list.querySelectorAll('button').forEach((x) => ((x as HTMLButtonElement).disabled = true));
        if (correct) b.classList.add('opt-correct');
        else {
          b.classList.add('opt-chosen');
          list.querySelectorAll('button')[options.indexOf(card)].classList.add('opt-answer');
        }
        const badge = pointsBadge(hit);
        if (badge) feedback.appendChild(badge);
        setTimeout(next, correct ? 350 : 1100);
      });
      list.appendChild(b);
    }
    mount(
      stage,
      h('button', { class: 'laju-word', type: 'button', lang: 'ms', 'data-id': card.id, onclick: () => void speak(card.term, { cardId: card.id }) }, card.term),
      list,
      feedback,
    );
  };

  mount(
    root,
    h(
      'div',
      { class: 'screen session laju' },
      h(
        'header',
        { class: 'session-bar' },
        h('button', { class: 'icon-btn', type: 'button', 'aria-label': t('laju.quit'), onclick: () => stop(false) }, '×'),
        bar,
        timeLeft,
        pill.el,
      ),
      stage,
    ),
  );
  timeLeft.textContent = t('laju.time', { n: LAJU_SECONDS });
  next();
}
