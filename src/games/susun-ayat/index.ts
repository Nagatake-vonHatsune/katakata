// Susun Ayat: order word tiles into a frame sentence (L3, deliberate study).
import { content } from '../../core/content';
import { getLang, t } from '../../core/i18n';
import type { Step } from '../../core/session';
import { speak } from '../../core/tts';
import { add, button, h, shuffle } from '../../core/ui';
import { audioButtons } from '../../views/widgets';
import type { Game, GameContext, StepResult } from '../game';

type SusunStep = Extract<Step, { kind: 'susun' }>;

export function tiles(sentence: string): string[] {
  return sentence.split(/\s+/).filter(Boolean);
}

/** Shuffle, but never hand back the sentence already in order. */
export function scramble(words: string[]): string[] {
  if (words.length < 2) return words.slice();
  for (let i = 0; i < 10; i++) {
    const s = shuffle(words);
    if (s.join(' ') !== words.join(' ')) return s;
  }
  return words.slice().reverse();
}

function run(step: SusunStep, ctx: GameContext): Promise<StepResult> {
  const frame = content.frames.get(step.frameId)!;
  const lang = getLang();
  const words = tiles(frame.example);
  const bank = scramble(words).map((w, i) => ({ w, key: i }));
  const built: typeof bank = [];
  return new Promise((resolve) => {
    let done = false;
    const answerRow = h('div', { class: 'tiles tiles-answer', 'aria-label': 'answer' });
    const bankRow = h('div', { class: 'tiles tiles-bank' });
    const result = h('div', { class: 'answer', 'aria-live': 'polite' });
    const check = button(t('game.susun.check'), () => finish(built.map((b) => b.w).join(' ') === words.join(' ')), 'btn btn-primary btn-wide');
    const clear = button(t('game.susun.clear'), () => {
      bank.push(...built.splice(0));
      draw();
    }, 'btn btn-ghost');
    const draw = () => {
      answerRow.replaceChildren(
        ...built.map((b) => {
          const el = h('button', { class: 'tile tile-on', type: 'button', lang: 'ms' }, b.w);
          el.addEventListener('click', () => {
            if (done) return;
            built.splice(built.indexOf(b), 1);
            bank.push(b);
            draw();
          });
          return el;
        }),
      );
      bankRow.replaceChildren(
        ...bank.map((b) => {
          const el = h('button', { class: 'tile', type: 'button', lang: 'ms' }, b.w);
          el.addEventListener('click', () => {
            if (done) return;
            bank.splice(bank.indexOf(b), 1);
            built.push(b);
            draw();
          });
          return el;
        }),
      );
      check.disabled = bank.length > 0;
    };
    const finish = (correct: boolean) => {
      if (done) return;
      done = true;
      const badge = ctx.answered(correct);
      controls.remove();
      void speak(frame.example);
      add(result, 
        h('p', { class: correct ? 'feedback ok' : 'feedback neutral' }, correct ? t('sess.correct') : t('sess.again_later'), badge),
        h('p', { class: 'sentence', lang: 'ms' }, frame.example),
        audioButtons(frame.example),
        h('p', { class: 'frame-pattern' }, `${t('game.susun.frame')}: `, h('span', { lang: 'ms' }, frame.frame)),
        ctx.footer({ kind: 'frame', id: frame.id, text: frame.example, chapter: frame.chapter }, () => resolve({ outcome: correct ? 'correct' : 'wrong' })),
      );
    };
    const controls = h('div', { class: 'stack' }, h('div', { class: 'row' }, clear, check), ctx.dontKnow(() => finish(false)));
    const meaning = lang === 'ja' && frame.meaning_ja ? frame.meaning_ja : frame.meaning_en;
    add(ctx.body, 
      h('p', { class: 'instruction' }, t('game.susun.prompt')),
      h('div', { class: 'prompt-gloss' }, meaning),
      answerRow,
      bankRow,
      controls,
      result,
    );
    draw();
  });
}

export const susunAyat: Game<SusunStep> = { id: 'susun', run };
