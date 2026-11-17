// Reply (the ⚡ stage's dialogue step, also used to play a chapter's dialogue once): hear a line, choose the best reply
// of three. Built from the Kad Kata multiple-choice pattern; no story player.
import { content } from '../../core/content';
import { getLang, t } from '../../core/i18n';
import { lineContext, replyOptions, type Step } from '../../core/session';
import type { ScenarioLine } from '../../core/types';
import { speak } from '../../core/tts';
import { add, h } from '../../core/ui';
import { audioButtons } from '../../views/widgets';
import type { Game, GameContext, StepResult } from '../game';
import { logMistake } from '../../core/mistakes';

type ReplyStep = Extract<Step, { kind: 'reply' }>;

/** "Puan Aini: …" inside a line (a phone call in chapter 4) is shown as the speaker. */
function split(speaker: string, ms: string): { who: string; text: string } {
  const m = /^\(.*\)$/.test(speaker) ? ms.match(/^([A-Z][\w ]{1,30}):\s+(.*)$/) : null;
  return m ? { who: m[1], text: m[2] } : { who: speaker, text: ms };
}

/** A line's usage note (⚡ dialogue), in the UI language, shown directly under its own line. */
function lineNote(l: ScenarioLine): HTMLElement | null {
  const note = getLang() === 'ja' && l.note_ja ? l.note_ja : l.note;
  if (!note) return null;
  return h('p', { class: 'line-note small', 'data-line': l.id }, note);
}

/** A dialogue line that is neither the prompt nor a reply (before the first reply step, or after an answer), with its note. */
function contextLine(l: ScenarioLine): HTMLElement {
  const s = split(l.speaker, l.ms);
  return h(
    'div',
    { class: 'context-line', 'data-line': l.id },
    h('p', { class: 'reply-line' }, h('span', { class: 'reply-who' }, s.who), ' ', h('span', { lang: 'ms' }, s.text)),
    audioButtons(s.text),
    h('p', { class: 'muted small' }, l.en),
    lineNote(l),
  );
}

function run(step: ReplyStep, ctx: GameContext): Promise<StepResult> {
  const ref = content.lines.get(step.lineId)!;
  const { prompt, answer, options, before } = replyOptions(step.lineId);
  const say = prompt ? split(prompt.speaker, prompt.ms) : null;
  const who = split(answer.speaker, answer.ms);
  // Every line is shown once, with its own note (Sam, 17 Nov 2026): lines before the first prompt here, lines after the answer below it.
  const { lead, after } = lineContext(step.lineId);
  return new Promise((resolve) => {
    let done = false;
    const result = h('div', { class: 'answer', 'aria-live': 'polite' });
    const list = h('div', { class: 'options replies' });
    const finish = (correct: boolean, chosen?: HTMLButtonElement, pick?: string) => {
      if (done) return;
      done = true;
      if (!correct) logMistake({ id: answer.id, game: 'reply', answer: pick ?? null, right: answer.ms });
      list.querySelectorAll<HTMLButtonElement>('button').forEach((b) => {
        b.disabled = true;
        if (b.dataset.right === '1') b.classList.add(correct ? 'opt-correct' : 'opt-answer');
      });
      if (chosen && !correct) chosen.classList.add('opt-chosen');
      const badge = ctx.answered(correct);
      dk.remove();
      void speak(who.text);
      add(
        result,
        h('p', { class: correct ? 'feedback ok' : 'feedback neutral' }, correct ? t('sess.correct') : t('sess.again_later'), badge),
        h('p', { class: 'reply-line' }, h('span', { class: 'reply-who' }, who.who), ' ', h('span', { lang: 'ms' }, who.text)),
        audioButtons(who.text),
        h('p', { class: 'muted small' }, answer.en),
        lineNote(answer),
        ...after.map(contextLine),
        ctx.footer({ kind: 'line', id: answer.id, text: answer.ms, chapter: ref.chapter }, () => resolve({ outcome: correct ? 'correct' : 'wrong' })),
      );
    };
    for (const o of options) {
      const b = h('button', { class: 'opt opt-reply', type: 'button', lang: 'ms', 'data-right': o.correct ? '1' : '0' }, split(answer.speaker, o.ms).text) as HTMLButtonElement;
      b.addEventListener('click', () => finish(o.correct, b, o.ms));
      list.appendChild(b);
    }
    const dk = ctx.dontKnow(() => finish(false));
    if (say) void speak(say.text);
    add(
      ctx.body,
      before.length ? h('p', { class: 'muted small reply-so-far' }, t('reply.so_far', { n: before.length + 1 })) : null,
      ctx.dialogueScore ?? null,
      ...lead.map(contextLine),
      say
        ? h(
            'div',
            { class: 'reply-prompt' },
            h('p', { class: 'reply-line' }, h('span', { class: 'reply-who' }, say.who), ' ', h('span', { lang: 'ms', class: 'reply-text' }, say.text)),
            audioButtons(say.text),
            prompt!.choices?.length ? null : lineNote(prompt!),
          )
        : null,
      h('p', { class: 'instruction' }, t('stretch.reply'), ' ', h('span', { class: 'muted small' }, `(${who.who})`)),
      list,
      dk,
      result,
    );
  });
}

export const reply: Game<ReplyStep> = { id: 'reply', run };
