// 💾 Memory cards and 📄 progress reports (Sam, 17 Nov 2026). A memory card is the existing savefile (buildSavefile /
// parseSavefile, same format and checksum), named katakata-card_<name>_<YYYY-MM-DD>.json, so a card works on the student's
// phone and on Sam's device alike. Loading always auto-saves the learner first, and a card with another student's name never
// silently overwrites the current learner.
import { content } from '../core/content';
import { getLang, t } from '../core/i18n';
import { buildReportHtml, reportHtmlFilename } from '../core/progressreport';
import { buildSavefile, cardFilename, parseSavefile, summarise, type Savefile } from '../core/savefile';
import { pickFile, safeName, shareOrDownload } from '../core/share';
import { activeSlot, addSlot, loadIntoCurrent, matchSlots, ME, sameStudent, slots, slotState, switchSlot, updateSlot, type SlotMeta } from '../core/slots';
import { state, update } from '../core/state';
import { teacher } from '../core/teacher';
import type { AppState } from '../core/types';
import { button, confirmDialog, h, sheet, toast } from '../core/ui';

export function fmtDate(iso?: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return getLang() === 'ja' ? `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日` : d.toLocaleDateString(getLang() === 'ms' ? 'ms-MY' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

/**
 * Save a memory card (share sheet or download). Without an argument: the current learner (in teacher mode the active slot,
 * with that student's own display settings); in learner mode this also counts as the weekly backup.
 */
export async function saveCard(s?: AppState): Promise<void> {
  const current = !s;
  const learner = s ?? (teacher.on ? (await slotState(slots().active)) ?? state : state);
  const backup = current && !teacher.on;
  if (backup) update((x) => (x.lastBackupAt = new Date().toISOString()));
  const file = await buildSavefile(backup ? state : learner);
  const res = await shareOrDownload(cardFilename(safeName(learner.profile.name)), JSON.stringify(file), 'application/json');
  if (res === 'cancelled' && backup) update((x) => (x.lastBackupAt = undefined));
  if (res === 'downloaded') toast(t('card.saved'));
}

/** The current learner for a report: in teacher mode the active slot with its own settings. */
export async function currentLearner(): Promise<AppState> {
  return teacher.on ? (await slotState(slots().active)) ?? state : state;
}

/** Make a learner's progress report (HTML) and share or download it. */
export async function saveReport(s: AppState = state): Promise<void> {
  const { html } = buildReportHtml(s, getLang());
  const res = await shareOrDownload(reportHtmlFilename(safeName(s.profile.name)), html, 'text/html');
  if (res === 'downloaded') toast(t('card.report_saved'));
}

/** Pick a memory card and check it. Returns null (with a toast) if it is not a valid card. */
export async function pickCard(): Promise<Savefile | null> {
  const [f] = await pickFile('.json,.katakata,application/json');
  if (!f) return null;
  const parsed = await parseSavefile(await f.text());
  if (!parsed.ok) {
    toast(t(parsed.reason === 'checksum' ? 'rekod.checksum_bad' : parsed.reason === 'too_new' ? 'card.too_new' : 'rekod.import_bad'));
    return null;
  }
  return parsed.file;
}

/** The preview: whose card, chapter, words known, date saved. */
export function cardPreview(file: Savefile): HTMLElement {
  const sum = summarise(file, (id) => content.cards.get(id)?.chapter);
  return h(
    'div',
    { class: 'preview-box card-preview' },
    h('p', null, '💾 ', h('b', null, file.state.profile.name || t('misc.student'))),
    h('p', { class: 'small' }, t('rekod.import_preview', { chapters: sum.maxChapter || '-', words: sum.words, date: fmtDate(sum.savedAt) })),
  );
}

/** Load memory card. Teacher mode: the card is plugged in as a student slot (plugIn). Otherwise into this learner. */
export async function loadCard(redraw: () => void): Promise<void> {
  const file = await pickCard();
  if (!file) return;
  if (teacher.on) return plugIn(file, redraw);
  const match = sameStudent(state.profile.name, file.state.profile.name);
  const choice = await sheet((close) => [
    h('h3', null, '💾 ', t('card.load')),
    cardPreview(file),
    match === 'different'
      ? h('p', { class: 'warn-box', role: 'alert' }, t('card.other_student', { card: file.state.profile.name, me: state.profile.name }))
      : h('p', null, t('rekod.import_how')),
    h('p', { class: 'muted small' }, t('card.autosave_note')),
    h(
      'div',
      { class: 'stack' },
      match === 'different' ? null : button(t('rekod.merge'), () => close('merge'), 'btn btn-primary btn-wide'),
      button(t('rekod.replace'), () => close('replace'), match === 'different' ? 'btn btn-danger-ghost btn-wide card-replace-other' : 'btn btn-danger-ghost btn-wide'),
      button(t('common.cancel'), () => close(null), 'btn btn-ghost btn-wide'),
    ),
  ]);
  if (choice !== 'merge' && choice !== 'replace') return;
  if (choice === 'replace') {
    const msg = match === 'different' ? t('card.replace_other_confirm', { card: file.state.profile.name, me: state.profile.name }) : t('rekod.replace_confirm');
    if (!(await confirmDialog(msg, t('rekod.replace'), t('common.cancel'), true))) return;
  }
  await loadIntoCurrent(file.state, choice);
  toast(t('rekod.import_ok'));
  redraw();
}

/** Teacher mode: plug a card in as a new slot, or update the slot with the same name (both dates shown). */
export async function plugIn(file: Savefile, redraw: () => void): Promise<void> {
  const same = matchSlots(slots().list, file.state.profile.name);
  const choice = await sheet((close) => [
    h('h3', null, '💾 ', t('slots.plug_in')),
    cardPreview(file),
    same.length
      ? h(
          'div',
          { class: 'stack name-match', role: 'alert' },
          h('p', null, t('slots.name_match', { name: file.state.profile.name })),
          same.map((x: SlotMeta) =>
            h(
              'div',
              { class: 'match-row' },
              h('p', { class: 'small' }, t('slots.dates', { slot: fmtDate(x.lastPlayed), card: fmtDate(file.savedAt) })),
              button(t('slots.update', { name: x.name }), () => close(`update:${x.id}`), 'btn btn-primary btn-wide slot-update'),
            ),
          ),
          button(t('slots.keep_both'), () => close('new'), 'btn btn-wide slot-keep-both'),
        )
      : button(t('slots.add_new'), () => close('new'), 'btn btn-primary btn-wide slot-add'),
    h('p', { class: 'muted small' }, t('card.autosave_note')),
    button(t('common.cancel'), () => close(null), 'btn btn-ghost btn-wide'),
  ]);
  if (typeof choice !== 'string') return;
  if (choice === 'new') {
    const meta = await addSlot(file.state);
    toast(t('slots.added', { name: meta.name }));
  } else {
    const id = choice.slice('update:'.length);
    await updateSlot(id, file.state, 'merge');
    toast(t('slots.updated', { name: slots().list.find((x) => x.id === id)?.name ?? '' }));
  }
  redraw();
}

/** The banner: whose slot is active (teacher mode). Sam's own slot is quiet; a student's is bright. */
export function slotBanner(go: (r: string) => void): HTMLElement {
  const a = activeSlot();
  const student = a.id !== ME;
  return h(
    'button',
    { class: 'slot-banner' + (student ? ' student' : ''), type: 'button', 'data-slot': a.id, title: t('slots.title'), onclick: () => go('students') },
    student ? `👤 ${t('slots.playing_as', { name: a.name })}` : `👤 ${a.name}`,
  );
}

export { switchSlot };
