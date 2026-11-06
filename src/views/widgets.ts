// Shared pieces: word header, association chips, Ask Teacher and Report sheets, How-to cards.
import { content, gloss } from '../core/content';
import { uid } from '../core/dates';
import { getLang, t } from '../core/i18n';
import { pronTips, toKana } from '../core/kana';
import { state, update } from '../core/state';
import { speak } from '../core/tts';
import type { Card, ItemContext, LinkType, QuestionType } from '../core/types';
import { button, h, sheet, toast } from '../core/ui';

const KANA_SHOWS = 3;

export function audioButtons(text: string, cardId?: string): HTMLElement {
  return h(
    'div',
    { class: 'audio-row' },
    button(t('sess.listen'), () => void speak(text, { cardId }), 'btn btn-audio'),
    button(t('sess.slow'), () => void speak(text, { slow: true, cardId }), 'btn btn-audio btn-ghost'),
  );
}

/** Katakana hint, fading over the first few appearances (then gone). */
export function kanaHint(card: Card): HTMLElement | null {
  if (!state.settings.kanaHints || getLang() !== 'ja') return null;
  const seen = state.kanaSeen[card.id] ?? 0;
  if (seen >= KANA_SHOWS) return null;
  update((s) => (s.kanaSeen[card.id] = seen + 1));
  const opacity = [1, 0.7, 0.45][seen] ?? 0.4;
  return h('div', { class: 'kana', style: `opacity:${opacity}`, 'aria-label': 'katakana' }, toKana(card.term));
}

export function wordHeader(card: Card, opts: { autoplay?: boolean; kana?: boolean } = {}): HTMLElement {
  if (opts.autoplay) void speak(card.term, { cardId: card.id });
  return h(
    'div',
    { class: 'word-head' },
    h('div', { class: 'term', lang: 'ms' }, card.term),
    opts.kana !== false ? kanaHint(card) : null,
    audioButtons(card.term, card.id),
  );
}

const LINK_ORDER: LinkType[] = ['kanji', 'bunyi', 'pinjam', 'keluarga', 'amaran', 'pasangan', 'babak'];

/** Small labelled association chips (Jaring Kata). Tap to open the hook text. */
export function chips(card: Card): HTMLElement {
  const lang = getLang();
  const box = h('div', { class: 'chips' });
  const detail = h('div', { class: 'chip-detail', 'aria-live': 'polite' });
  const add = (label: string, text: string | null, cls = '') => {
    const chip = h('button', { class: `chip ${cls}`, type: 'button' }, label);
    chip.addEventListener('click', () => {
      const open = chip.classList.toggle('open');
      box.querySelectorAll('.chip.open').forEach((c) => c !== chip && c.classList.remove('open'));
      detail.textContent = open && text ? text : '';
    });
    box.appendChild(chip);
  };
  const links = card.links.slice().sort((a, b) => LINK_ORDER.indexOf(a.type) - LINK_ORDER.indexOf(b.type));
  for (const l of links) {
    if (l.type === 'babak') add(`${t('link.babak')}: ${content.sceneName(l.target ?? card.scene, lang)}`, null, 'chip-scene');
    else add(t(`link.${l.type}`), l.text ?? (l.target ? content.cards.get(l.target)?.term ?? '' : ''), `chip-${l.type}`);
  }
  if (card.seen_in_class) add(t('sess.seen_in_class', { n: card.seen_in_class }), null, 'chip-class');
  const mine = state.myHooks[card.id];
  if (mine) add(t('link.hook_saya'), mine, 'chip-mine');
  if (card.note) add(lang === 'ja' ? 'メモ' : 'Note', card.note, 'chip-note');
  const plus = h('button', { class: 'chip chip-add', type: 'button', 'aria-label': t('link.hook_saya') }, '＋ ' + t('link.hook_saya'));
  plus.addEventListener('click', async () => {
    await editHook(card);
    box.replaceWith(chips(card));
  });
  box.appendChild(plus);
  return h('div', { class: 'chips-wrap' }, box, detail);
}

export function pronunciationTips(card: Card): HTMLElement | null {
  const tips = pronTips(card.term);
  if (!tips.length) return null;
  return h('ul', { class: 'tips' }, tips.map((k) => h('li', null, t(`tip.${k}`))));
}

export function glossLine(card: Card): HTMLElement {
  const lang = getLang();
  return h('div', { class: 'gloss' }, gloss(card, lang), lang === 'ja' ? h('span', { class: 'gloss-sub' }, card.gloss_en) : null);
}

export async function editHook(card: Card): Promise<void> {
  const ta = h('textarea', { class: 'input', rows: 3, placeholder: t('jaring.hook_ph'), maxlength: 300 }) as HTMLTextAreaElement;
  ta.value = state.myHooks[card.id] ?? '';
  await sheet(
    (close) => [
      h('h3', null, `${t('link.hook_saya')}: `, h('span', { lang: 'ms' }, card.term)),
      ta,
      h(
        'div',
        { class: 'row' },
        button(t('common.cancel'), () => close(), 'btn btn-ghost'),
        button(
          t('common.save'),
          () => {
            const v = ta.value.trim();
            update((s) => {
              if (v) s.myHooks[card.id] = v;
              else delete s.myHooks[card.id];
            });
            close();
          },
          'btn btn-primary',
        ),
      ),
    ],
    { label: t('link.hook_saya') },
  );
}

export function contextFor(card: Card): ItemContext {
  return { kind: 'card', id: card.id, text: card.term, chapter: card.chapter };
}

const QTYPES: QuestionType[] = ['meaning', 'usage', 'pronunciation', 'grammar', 'other'];

/** Tanya Cikgu: save a question for the teacher. */
export async function askTeacher(ctx: ItemContext): Promise<boolean> {
  let type: QuestionType = 'meaning';
  const ta = h('textarea', { class: 'input', rows: 3, placeholder: t('tanya.text_ph'), maxlength: 1000 }) as HTMLTextAreaElement;
  const typeRow = h(
    'div',
    { class: 'seg', role: 'radiogroup', 'aria-label': t('tanya.type') },
    QTYPES.map((q) => {
      const b = h('button', { class: 'seg-btn' + (q === type ? ' on' : ''), type: 'button', role: 'radio', 'aria-checked': String(q === type) }, t(`tanya.type.${q}`));
      b.addEventListener('click', () => {
        type = q;
        typeRow.querySelectorAll('.seg-btn').forEach((x) => {
          x.classList.toggle('on', x === b);
          x.setAttribute('aria-checked', String(x === b));
        });
      });
      return b;
    }),
  );
  const saved = await sheet(
    (close) => [
      h('h3', null, t('tanya.title')),
      ctx.text ? h('p', { class: 'about' }, `${t('tanya.about')}: `, h('b', { lang: 'ms' }, ctx.text)) : null,
      typeRow,
      ta,
      h(
        'div',
        { class: 'row' },
        button(t('common.cancel'), () => close(false), 'btn btn-ghost'),
        button(
          t('common.save'),
          () => {
            const text = ta.value.trim();
            if (!text && !ctx.text) return ta.focus();
            update((s) => s.questions.push({ id: uid('q'), createdAt: new Date().toISOString(), type, text, context: ctx, answered: false }));
            close(true);
          },
          'btn btn-primary',
        ),
      ),
    ],
    { label: t('tanya.title') },
  );
  if (saved) toast(t('tanya.saved'));
  return saved === true;
}

/** ⚑ content feedback: report an error or suggest a better example. */
export async function reportContent(ctx: ItemContext): Promise<void> {
  let kind: 'error' | 'better_example' = 'error';
  const ta = h('textarea', { class: 'input', rows: 3, placeholder: t('report.text_ph'), maxlength: 1000 }) as HTMLTextAreaElement;
  const seg = h(
    'div',
    { class: 'seg' },
    (['error', 'better_example'] as const).map((k) => {
      const b = h('button', { class: 'seg-btn' + (k === kind ? ' on' : ''), type: 'button' }, t(k === 'error' ? 'report.error' : 'report.example'));
      b.addEventListener('click', () => {
        kind = k;
        seg.querySelectorAll('.seg-btn').forEach((x) => x.classList.toggle('on', x === b));
      });
      return b;
    }),
  );
  const ok = await sheet((close) => [
    h('h3', null, t('report.title')),
    ctx.text ? h('p', { class: 'about' }, h('b', { lang: 'ms' }, ctx.text)) : null,
    seg,
    ta,
    h(
      'div',
      { class: 'row' },
      button(t('common.cancel'), () => close(false), 'btn btn-ghost'),
      button(
        t('common.save'),
        () => {
          const text = ta.value.trim();
          if (!text) return ta.focus();
          update((s) => s.reports.push({ id: uid('r'), createdAt: new Date().toISOString(), kind, text, context: ctx }));
          close(true);
        },
        'btn btn-primary',
      ),
    ),
  ]);
  if (ok) toast(t('report.saved'));
}

/** やり方 card: one sentence plus a worked example. */
export async function howTo(game: 'kad' | 'cari' | 'susun', force = false): Promise<void> {
  if (!force && state.howToSeen[game]) return;
  await sheet(
    (close) => [
      h('p', { class: 'eyebrow' }, t('howto.title')),
      h('h3', null, t(`game.${game}.name`)),
      h('p', { class: 'sheet-text' }, t(`game.${game}.howto`)),
      h('p', { class: 'example' }, t(`game.${game}.example`)),
      h('div', { class: 'row' }, button(t('howto.ok'), () => close(), 'btn btn-primary btn-wide')),
    ],
    { label: t('howto.title') },
  );
  update((s) => (s.howToSeen[game] = true));
}

export function topBar(title: string, onBack: () => void, extra?: HTMLElement | null): HTMLElement {
  return h(
    'header',
    { class: 'topbar' },
    h('button', { class: 'icon-btn', type: 'button', 'aria-label': t('common.back'), onclick: onBack }, '‹'),
    h('h1', { class: 'topbar-title' }, title),
    extra ?? h('span', { class: 'icon-btn-spacer' }),
  );
}
