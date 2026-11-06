// Cari Benda: a drawn scene; hear a word, tap the object (L1, input).
import { content } from '../../core/content';
import { t } from '../../core/i18n';
import { cariCards, type Step } from '../../core/session';
import { state } from '../../core/state';
import { speak } from '../../core/tts';
import { add, button, h } from '../../core/ui';
import { contextFor, glossLine } from '../../views/widgets';
import type { Game, GameContext, StepResult } from '../game';

type CariStep = Extract<Step, { kind: 'cari' }>;

// Stable layout per scene so objects stay put between rounds.
function layout(sceneId: string, n: number): Array<{ x: number; y: number }> {
  let seed = [...sceneId].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
  const rnd = () => ((seed = (seed * 1103515245 + 12345) >>> 0) % 1000) / 1000;
  const cols = n <= 6 ? 3 : 4;
  const rows = Math.ceil(n / cols);
  // Keep every object fully inside the picture (objects are 64px; the board is at least ~300px wide).
  const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
  return Array.from({ length: n }, (_, i) => ({
    x: clamp(((i % cols) + 0.5) / cols * 100 + (rnd() - 0.5) * (40 / cols), 12, 88),
    y: clamp(((Math.floor(i / cols) + 0.5) / rows) * 100 + (rnd() - 0.5) * (30 / rows), 14, 86),
  }));
}

function run(step: CariStep, ctx: GameContext): Promise<StepResult> {
  const scene = content.scenes.find((s) => s.id === step.sceneId)!;
  const target = content.cards.get(step.cardId)!;
  const objs = cariCards(scene.id);
  const pos = layout(scene.id, objs.length);
  const noVoice = state.profile.voice === 'none';
  return new Promise((resolve) => {
    let done = false;
    const answer = h('div', { class: 'answer', 'aria-live': 'polite' });
    const word = h('div', { class: 'cari-word' + (noVoice ? '' : ' hidden'), lang: 'ms' }, target.term);
    const board = h('div', { class: `cari-board world-${scene.world.id}`, role: 'group', 'aria-label': scene.title.ms });
    const finish = (correct: boolean, chosen?: HTMLElement) => {
      if (done) return;
      done = true;
      dk.remove();
      word.classList.remove('hidden');
      board.querySelectorAll<HTMLButtonElement>('.cari-obj').forEach((b) => {
        b.disabled = true;
        if (b.dataset.id === target.id) b.classList.add(correct ? 'obj-correct' : 'obj-answer');
      });
      if (chosen && !correct) chosen.classList.add('obj-chosen');
      add(answer, 
        h('p', { class: correct ? 'feedback ok' : 'feedback neutral' }, correct ? t('sess.correct') : t('sess.again_later')),
        glossLine(target),
        ctx.footer(contextFor(target), () => resolve({ outcome: correct ? 'correct' : 'wrong' })),
      );
    };
    objs.forEach((o, i) => {
      const b = h(
        'button',
        { class: 'cari-obj', type: 'button', 'data-id': o.id, style: `left:${pos[i].x}%;top:${pos[i].y}%`, 'aria-label': `${i + 1}` },
        h('span', { class: 'cari-emoji', 'aria-hidden': 'true' }, o.image ?? '❓'),
      );
      b.addEventListener('click', () => finish(o.id === target.id, b));
      board.appendChild(b);
    });
    const dk = ctx.dontKnow(() => finish(false));
    void speak(target.term, { cardId: target.id });
    add(ctx.body, 
      h('p', { class: 'eyebrow' }, `${scene.world.ms} · ${scene.title.ms}`),
      h(
        'div',
        { class: 'cari-prompt' },
        h('p', { class: 'instruction' }, t('game.cari.prompt')),
        h(
          'div',
          { class: 'audio-row' },
          button(t('sess.listen'), () => void speak(target.term, { cardId: target.id }), 'btn btn-audio'),
          noVoice ? null : button(t('game.cari.show_text'), () => word.classList.remove('hidden'), 'btn btn-ghost'),
        ),
        word,
      ),
      board,
      dk,
      answer,
    );
  });
}

export const cariBenda: Game<CariStep> = { id: 'cari', run };
