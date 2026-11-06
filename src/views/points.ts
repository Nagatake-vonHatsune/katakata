// Points UI shared by practice sessions and Laju!: the live score pill, the "+12 ⚡ 🔥3" badge and the
// summary block with personal bests.
import { t } from '../core/i18n';
import { seconds, type Hit, type Scorer } from '../core/score';
import { h } from '../core/ui';

export function pointsBadge(hit: Hit): HTMLElement | null {
  if (!hit.points) return null;
  return h(
    'span',
    { class: 'points-pop' + (hit.speed === 2 ? ' fast' : '') },
    `+${hit.points}`,
    hit.speed ? h('span', { class: 'pp-speed', 'aria-hidden': 'true' }, ' ' + '⚡'.repeat(hit.speed)) : null,
    hit.combo >= 3 ? h('span', { class: 'pp-combo' }, ` 🔥${hit.combo}`) : null,
  );
}

/** A pill that shows the running score; call update() after each answer. */
export function scorePill(): { el: HTMLElement; update(s: Scorer): void } {
  const num = h('b', null, '0');
  const combo = h('span', { class: 'sp-combo' });
  const el = h('span', { class: 'score-pill', role: 'status', 'aria-label': t('score.pill', { n: 0 }) }, '★ ', num, combo);
  return {
    el,
    update(s) {
      num.textContent = String(s.score);
      combo.textContent = s.combo >= 2 ? ` 🔥${s.combo}` : '';
      el.setAttribute('aria-label', t('score.pill', { n: s.score }) + (s.combo >= 2 ? `, ${t('score.combo_now', { n: s.combo })}` : ''));
      el.classList.remove('bump');
      void el.offsetWidth; // restart the animation
      el.classList.add('bump');
    },
  };
}

/** Score, best combo and fastest answer, with "New best!" tags. */
export function scoreStats(s: Scorer, beat: { score: boolean; combo: boolean; fastest: boolean }): HTMLElement {
  const best = (on: boolean) => (on ? h('span', { class: 'new-best' }, t('score.new_best')) : null);
  return h(
    'div',
    { class: 'stats score-stats' },
    h('div', { class: 'stat' }, h('b', null, `★ ${s.score}`), h('span', null, t('score.points')), best(beat.score)),
    h('div', { class: 'stat' }, h('b', null, `🔥 ${s.bestCombo}`), h('span', null, t('score.combo')), best(beat.combo)),
    h(
      'div',
      { class: 'stat' },
      h('b', null, s.fastestMs === null ? '–' : `⚡ ${t('score.sec', { n: seconds(s.fastestMs) })}`),
      h('span', null, t('score.fastest')),
      best(beat.fastest),
    ),
  );
}
