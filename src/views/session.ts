// Session runner: one step at a time, progress bar, safe mistakes, summary at the end.
import { content, gloss, srsKey } from '../core/content';
import { getLang, t } from '../core/i18n';
import { addStudySeconds, awardStamps, isReady, nextChapter } from '../core/progress';
import { estimateMinutes, gameOf, requeue, type Session, type Step } from '../core/session';
import { foldRecords, Scorer } from '../core/score';
import { newSrs, Rating, review, weakness } from '../core/srs';
import { saveNow, state, update } from '../core/state';
import { stopSpeech } from '../core/tts';
import type { ItemContext } from '../core/types';
import { button, confirmDialog, h, mount, progressBar } from '../core/ui';
import { cariBenda } from '../games/cari-benda';
import type { Game, GameContext, StepResult } from '../games/game';
import { kadKata } from '../games/kad-kata';
import { susunAyat } from '../games/susun-ayat';
import { askTeacher, howTo, reportContent } from './widgets';
import { stampEl } from './stamps';
import { langButton } from './langswitch';
import { pointsBadge, scorePill, scoreStats } from './points';

const games: Record<'kad' | 'cari' | 'susun', Game> = {
  kad: kadKata as Game,
  cari: cariBenda as Game,
  susun: susunAyat as Game,
};

export function sessionMeta(steps: Step[]): string {
  return t('home.today_meta', { min: estimateMinutes(steps), n: steps.length });
}

function applyResult(step: Step, res: StepResult, learned: Set<string>, missed: Set<string>, reviewed: Set<string>): boolean {
  let wrong = false;
  update((s) => {
    if (step.kind === 'intro') {
      const key = srsKey(step.cardId);
      if (!s.srs[key]) s.srs[key] = newSrs();
      learned.add(key);
      return;
    }
    if (step.kind === 'susun') {
      const f = (s.frames[step.frameId] ??= { tries: 0, correct: 0 });
      f.tries++;
      if (res.outcome === 'correct') f.correct++;
      f.last = new Date().toISOString();
      wrong = res.outcome !== 'correct';
      return;
    }
    const key = srsKey(step.cardId);
    const grade = res.outcome === 'rated' ? res.grade! : res.outcome === 'correct' ? Rating.Good : Rating.Again;
    wrong = grade === Rating.Again;
    if (wrong) missed.add(key);
    if (!step.retry) {
      if (!learned.has(key)) reviewed.add(key);
      s.srs[key] = review(s.srs[key], grade);
    }
  });
  return wrong;
}

export async function runSession(root: HTMLElement, session: Session, onExit: () => void): Promise<void> {
  let steps = session.steps.slice();
  if (!steps.length) {
    mount(root, h('div', { class: 'screen center' }, h('p', { class: 'lead' }, t('sess.empty')), button(t('sum.home'), onExit, 'btn btn-primary btn-wide')));
    return;
  }
  const learned = new Set<string>();
  const missed = new Set<string>();
  const reviewed = new Set<string>();
  const started = Date.now();
  const scorer = new Scorer();
  const showPoints = state.settings.showPoints;
  const pill = scorePill();
  let lastTick = Date.now();
  let quit = false;
  const tick = () => {
    const now = Date.now();
    addStudySeconds(Math.min(120, Math.round((now - lastTick) / 1000)));
    lastTick = now;
  };

  for (let i = 0; i < steps.length && !quit; i++) {
    const step = steps[i];
    const gameId = gameOf(step);
    await howTo(gameId);
    const body = h('main', { class: 'step-body' });
    const header = h(
      'header',
      { class: 'session-bar' },
      h(
        'button',
        {
          class: 'icon-btn',
          type: 'button',
          'aria-label': t('sess.quit'),
          onclick: async () => {
            if (await confirmDialog(t('sess.quit_confirm'), t('sess.quit'), t('common.cancel'))) {
              quit = true;
              stopSpeech();
              tick();
              onExit();
            }
          },
        },
        '×',
      ),
      progressBar(i, steps.length, t('sess.progress', { i: i + 1, n: steps.length })),
      h('span', { class: 'count' }, t('sess.progress', { i: i + 1, n: steps.length })),
      showPoints ? pill.el : null,
      h('button', { class: 'icon-btn', type: 'button', 'aria-label': t('common.help'), onclick: () => void howTo(gameId, true) }, '?'),
      langButton(t('lang.next_question')),
    );
    mount(root, h('div', { class: 'screen session' }, header, body));
    const shownAt = performance.now();
    const ctx: GameContext = {
      answered: (correct, opts = {}) => {
        const hit = scorer.hit(gameId, correct, (opts.at ?? performance.now()) - shownAt, opts.base);
        if (!showPoints) return null;
        pill.update(scorer);
        return pointsBadge(hit);
      },
      body,
      dontKnow: (onClick) => button(t('sess.dont_know'), onClick, 'btn btn-ghost btn-dontknow'),
      footer: (context: ItemContext, onNext: () => void, nextLabel?: string) =>
        h(
          'div',
          { class: 'footer' },
          h(
            'div',
            { class: 'footer-aux' },
            button(t('sess.ask'), () => void askTeacher(context), 'btn btn-small btn-ghost'),
            button(t('sess.report'), () => void reportContent(context), 'btn btn-small btn-ghost'),
          ),
          nextLabel === '' ? null : button(nextLabel ?? t('sess.next'), onNext, 'btn btn-primary btn-wide btn-next'),
        ),
    };
    const res = await games[gameId].run(step, ctx);
    if (quit) return;
    stopSpeech();
    tick();
    const wrong = applyResult(step, res, learned, missed, reviewed);
    if (wrong) {
      // Missed recall comes back as an easier recognition question.
      const again: Step = step.kind === 'recall' ? { kind: 'mc', cardId: step.cardId, dir: 'ms2x' } : step;
      steps = requeue(steps, i, again);
    }
  }
  if (quit) return;
  const stamps = awardStamps(true);
  let beat = { score: false, combo: false, fastest: false };
  update((s) => (beat = foldRecords(s.scores, scorer, 'session')));
  void saveNow();
  const points = showPoints && scorer.right > 0 ? scoreStats(scorer, beat) : null;
  showSummary(root, session, { learned, missed, reviewed, seconds: Math.round((Date.now() - started) / 1000), stamps, points }, onExit);
}

function showSummary(
  root: HTMLElement,
  session: Session,
  r: { learned: Set<string>; missed: Set<string>; reviewed: Set<string>; seconds: number; stamps: ReturnType<typeof awardStamps>; points: HTMLElement | null },
  onExit: () => void,
): void {
  const lang = getLang();
  const hardest = [...r.missed]
    .filter((id) => state.srs[id] && content.cards.has(id))
    .sort((a, b) => weakness(state.srs[b]) - weakness(state.srs[a]))
    .slice(0, 3)
    .map((id) => content.cards.get(id)!);
  const ready = session.kind === 'sedia' && session.chapter && isReady(session.chapter);
  const tip = hardest.length ? t('sum.tip_hard') : session.kind !== 'sedia' && !isReady(nextChapter()) ? t('sum.tip_sedia') : t('sum.tip_daily');
  const mins = Math.max(1, Math.round(r.seconds / 60));
  mount(
    root,
    h(
      'div',
      { class: 'screen summary' },
      h('img', { class: 'mascot-sm', src: './kancil.svg', alt: '' }),
      h('h1', null, ready ? t('sedia.done', { n: session.chapter! }) : t('sum.title')),
      h(
        'div',
        { class: 'stats' },
        h('div', { class: 'stat' }, h('b', null, String(r.learned.size)), h('span', null, t('sum.learned'))),
        h('div', { class: 'stat' }, h('b', null, String(r.reviewed.size)), h('span', null, t('sum.reviewed'))),
        h('div', { class: 'stat' }, h('b', null, `${mins}`), h('span', null, `${t('sum.minutes')} (${t('misc.min')})`)),
      ),
      r.points,
      hardest.length
        ? h(
            'section',
            { class: 'card-box' },
            h('h2', null, t('sum.hardest')),
            h('ul', { class: 'word-list' }, hardest.map((c) => h('li', null, h('b', { lang: 'ms' }, c.term), ' — ', gloss(c, lang)))),
          )
        : null,
      h('p', { class: 'tip' }, tip),
      r.stamps.length
        ? h('section', { class: 'card-box stamps-new' }, h('h2', null, t('sum.stamp')), h('div', { class: 'stamp-row' }, r.stamps.map((s) => stampEl(s))))
        : null,
      button(t('sum.home'), onExit, 'btn btn-primary btn-wide'),
    ),
  );
}
