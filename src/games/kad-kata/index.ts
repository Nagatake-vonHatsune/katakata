// Kad Kata: spaced-repetition word cards, both directions, with hooks (L1, L2).
import { content, gloss } from '../../core/content';
import { getLang, t } from '../../core/i18n';
import { distractors, type Step } from '../../core/session';
import { Rating, type Grade } from '../../core/srs';
import { speak } from '../../core/tts';
import { add, button, h, shuffle } from '../../core/ui';
import { chips, contextFor, glossLine, pronunciationTips, wordHeader } from '../../views/widgets';
import type { Game, GameContext, StepResult } from '../game';

type KadStep = Extract<Step, { kind: 'intro' | 'mc' | 'recall' }>;

function intro(step: KadStep, ctx: GameContext): Promise<StepResult> {
  const card = content.cards.get(step.cardId)!;
  return new Promise((resolve) => {
    add(ctx.body, 
      h('p', { class: 'eyebrow' }, t('sess.new_word')),
      wordHeader(card, { autoplay: true }),
      glossLine(card),
      chips(card),
      pronunciationTips(card),
      ctx.footer(contextFor(card), () => resolve({ outcome: 'seen' }), t('sess.got_it')),
    );
  });
}

function mc(step: Extract<Step, { kind: 'mc' }>, ctx: GameContext): Promise<StepResult> {
  const card = content.cards.get(step.cardId)!;
  const lang = getLang();
  const toMalay = step.dir === 'x2ms';
  const options = shuffle([card, ...distractors(card)]);
  return new Promise((resolve) => {
    const answer = h('div', { class: 'answer', 'aria-live': 'polite' });
    const list = h('div', { class: 'options' });
    let done = false;
    const finish = (correct: boolean, chosen?: HTMLButtonElement) => {
      if (done) return;
      done = true;
      list.querySelectorAll('button').forEach((b) => {
        (b as HTMLButtonElement).disabled = true;
        if (b.dataset.id === card.id) b.classList.add(correct ? 'opt-correct' : 'opt-answer');
      });
      if (chosen && !correct) chosen.classList.add('opt-chosen');
      const badge = ctx.answered(correct);
      dk.remove();
      if (toMalay) void speak(card.term, { cardId: card.id });
      add(answer, 
        h('p', { class: correct ? 'feedback ok' : 'feedback neutral' }, correct ? t('sess.correct') : t('sess.again_later'), badge),
        toMalay ? wordHeader(card, { kana: false }) : null,
        !toMalay || !correct ? glossLine(card) : null,
        chips(card),
        ctx.footer(contextFor(card), () => resolve({ outcome: correct ? 'correct' : 'wrong' })),
      );
    };
    for (const o of options) {
      const b = h(
        'button',
        { class: 'opt', type: 'button', 'data-id': o.id, lang: toMalay ? 'ms' : lang },
        toMalay ? o.term : gloss(o, lang),
      ) as HTMLButtonElement;
      b.addEventListener('click', () => finish(o.id === card.id, b));
      list.appendChild(b);
    }
    const dk = ctx.dontKnow(() => finish(false));
    add(ctx.body, 
      toMalay ? h('div', { class: 'prompt-gloss' }, gloss(card, lang)) : wordHeader(card, { autoplay: true }),
      h('p', { class: 'instruction' }, toMalay ? t('sess.choose_malay') : t('sess.choose_meaning')),
      list,
      dk,
      answer,
    );
  });
}

function recall(step: Extract<Step, { kind: 'recall' }>, ctx: GameContext): Promise<StepResult> {
  const card = content.cards.get(step.cardId)!;
  return new Promise((resolve) => {
    const answer = h('div', { class: 'answer', 'aria-live': 'polite' });
    const reveal = (gaveUp: boolean) => {
      const at = performance.now();
      actions.remove();
      const rate = (g: Grade) => {
        // Speed counts up to "Show"; a Hard self-rating still keeps the combo but earns fewer points.
        ctx.answered(!gaveUp && g !== Rating.Again, { at, base: g === Rating.Hard ? 6 : undefined });
        resolve({ outcome: 'rated', grade: g });
      };
      add(answer, 
        wordHeader(card, { autoplay: true, kana: false }),
        chips(card),
        gaveUp
          ? ctx.footer(contextFor(card), () => rate(Rating.Again))
          : h(
              'div',
              null,
              h('p', { class: 'instruction' }, t('sess.rate_q')),
              h(
                'div',
                { class: 'rate-row' },
                button(t('sess.rate_again'), () => rate(Rating.Again), 'btn rate rate-again'),
                button(t('sess.rate_hard'), () => rate(Rating.Hard), 'btn rate'),
                button(t('sess.rate_good'), () => rate(Rating.Good), 'btn rate rate-good'),
                button(t('sess.rate_easy'), () => rate(Rating.Easy), 'btn rate'),
              ),
              ctx.footer(contextFor(card), () => undefined, ''),
            ),
      );
    };
    const actions = h('div', { class: 'stack' }, button(t('sess.show'), () => reveal(false), 'btn btn-primary btn-wide'), ctx.dontKnow(() => reveal(true)));
    add(ctx.body, h('div', { class: 'prompt-gloss' }, glossLine(card)), h('p', { class: 'instruction' }, t('sess.recall')), actions, answer);
  });
}

export const kadKata: Game<KadStep> = {
  id: 'kad',
  run(step, ctx) {
    if (step.kind === 'intro') return intro(step, ctx);
    if (step.kind === 'mc') return mc(step, ctx);
    return recall(step, ctx);
  },
};
