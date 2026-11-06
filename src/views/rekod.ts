// Rekod: stamp card, progress, savefile tools, settings.
import { content } from '../core/content';
import * as db from '../core/db';
import { getLang, LANGS, setLang, t, type Lang } from '../core/i18n';
import { chapterProgress, knownCount, minutesThisWeek, sceneProgress, streak } from '../core/progress';
import { buildSavefile, mergeStates, parseSavefile, summarise } from '../core/savefile';
import { pickFile, safeName, shareOrDownload } from '../core/share';
import { defaultState, replaceState, saveNow, state, update } from '../core/state';
import { setRate } from '../core/tts';
import { button, confirmDialog, h, mount, progressBar, sheet, toast } from '../core/ui';
import { voiceCheck } from './onboarding';
import { stampEl } from './stamps';
import { topBar } from './widgets';

declare const __APP_VERSION__: string;

export function applyTheme(): void {
  const th = state.settings.theme;
  if (th === 'auto') document.documentElement.removeAttribute('data-theme');
  else document.documentElement.setAttribute('data-theme', th);
}

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return getLang() === 'ja' ? `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日` : d.toLocaleDateString(getLang() === 'ms' ? 'ms-MY' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

async function exportSave(): Promise<void> {
  update((s) => (s.lastBackupAt = new Date().toISOString()));
  const file = await buildSavefile(state);
  const d = new Date();
  const name = `katakata_${safeName(state.profile.name)}_${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}.katakata`;
  const res = await shareOrDownload(name, JSON.stringify(file), 'application/json');
  if (res === 'cancelled') update((s) => (s.lastBackupAt = undefined));
}

async function importSave(redraw: () => void): Promise<void> {
  const [f] = await pickFile('.katakata,application/json,.json');
  if (!f) return;
  const parsed = await parseSavefile(await f.text());
  if (!parsed.ok) return toast(t(parsed.reason === 'checksum' ? 'rekod.checksum_bad' : 'rekod.import_bad'));
  const sum = summarise(parsed.file, (id) => content.cards.get(id)?.chapter);
  const choice = await sheet((close) => [
    h('h3', null, t('rekod.import')),
    h('p', { class: 'preview-box' }, t('rekod.import_preview', { chapters: sum.maxChapter || '-', words: sum.words, date: fmtDate(sum.savedAt) })),
    h('p', null, t('rekod.import_how')),
    h(
      'div',
      { class: 'stack' },
      button(t('rekod.merge'), () => close('merge'), 'btn btn-primary btn-wide'),
      button(t('rekod.replace'), () => close('replace'), 'btn btn-danger-ghost btn-wide'),
      button(t('common.cancel'), () => close(null), 'btn btn-ghost btn-wide'),
    ),
  ]);
  if (choice === 'merge') await replaceState(mergeStates(state, parsed.file.state));
  else if (choice === 'replace') {
    if (!(await confirmDialog(t('rekod.replace_confirm'), t('rekod.replace'), t('common.cancel'), true))) return;
    await replaceState({ ...parsed.file.state, profile: { ...parsed.file.state.profile, onboarded: true } });
  } else return;
  toast(t('rekod.import_ok'));
  redraw();
}

export function renderRekod(root: HTMLElement, go: (r: string) => void): void {
  const draw = () => {
    const stamps = state.stamps.slice().sort((a, b) => b.date.localeCompare(a.date));
    const toggle = (label: string, on: boolean, set: (v: boolean) => void) => {
      const cb = h('input', { type: 'checkbox', checked: on, role: 'switch' }) as HTMLInputElement;
      cb.addEventListener('change', () => {
        set(cb.checked);
        void saveNow();
        draw();
      });
      return h('label', { class: 'setting' }, h('span', null, label), cb);
    };
    const select = <T extends string>(label: string, value: T, options: Array<[T, string]>, set: (v: T) => void) => {
      const sel = h('select', { class: 'input select' }, options.map(([v, l]) => h('option', { value: v, selected: v === value }, l))) as HTMLSelectElement;
      sel.addEventListener('change', () => {
        set(sel.value as T);
        void saveNow();
        draw();
      });
      return h('label', { class: 'setting' }, h('span', null, label), sel);
    };
    const nameInput = h('input', { class: 'input', type: 'text', maxlength: 40 }) as HTMLInputElement;
    nameInput.value = state.profile.name;
    nameInput.addEventListener('change', () => {
      update((s) => (s.profile.name = nameInput.value.trim()));
      void saveNow();
    });
    mount(
      root,
      h(
        'div',
        { class: 'screen' },
        topBar(t('rekod.title'), () => go('')),
        h(
          'div',
          { class: 'stats' },
          h('div', { class: 'stat' }, h('b', null, String(knownCount())), h('span', null, t('misc.words_known'))),
          h('div', { class: 'stat' }, h('b', null, String(streak())), h('span', null, t('misc.day_streak'))),
          h('div', { class: 'stat' }, h('b', null, String(minutesThisWeek())), h('span', null, t('misc.min_week'))),
        ),
        h('p', { class: 'muted small center' }, t('home.streak_rest')),
        h('section', { class: 'card-box' }, h('h2', null, t('rekod.stamps')), stamps.length ? h('div', { class: 'stamp-grid' }, stamps.map(stampEl)) : h('p', { class: 'muted' }, t('rekod.no_stamps'))),
        h(
          'section',
          { class: 'card-box' },
          h('h2', null, t('rekod.chapters')),
          content.chapters.map((ch) => {
            const p = chapterProgress(ch.chapter);
            return h('div', { class: 'prog-row' }, h('span', null, `${t('common.chapter', { n: ch.chapter })} `, h('span', { lang: 'ms' }, ch.title.ms)), progressBar(p.known, p.total), h('span', { class: 'small' }, t('rekod.words', { a: p.known, b: p.total })));
          }),
          h('h2', null, t('rekod.worlds')),
          content.scenes.map((s) => {
            const p = sceneProgress(s.id);
            return h('div', { class: 'prog-row' }, h('span', { lang: 'ms' }, `${s.world.ms} · ${s.title.ms}`), progressBar(p.known, p.total), h('span', { class: 'small' }, t('rekod.words', { a: p.known, b: p.total })));
          }),
        ),
        h(
          'section',
          { class: 'card-box' },
          h('h2', null, t('rekod.save')),
          h('p', { class: 'small' }, t('rekod.save_body')),
          h('div', { class: 'row' }, button(t('rekod.export'), () => void exportSave().then(draw), 'btn btn-primary'), button(t('rekod.import'), () => void importSave(draw), 'btn')),
          h('p', { class: 'muted small' }, t('rekod.last_backup', { date: state.lastBackupAt ? fmtDate(state.lastBackupAt) : t('rekod.never') })),
          h('p', { class: 'muted small' }, state.profile.persisted ? t('rekod.storage_ok') : t('rekod.storage_no')),
        ),
        h(
          'section',
          { class: 'card-box settings' },
          h('h2', null, t('rekod.settings')),
          h('label', { class: 'setting' }, h('span', null, t('rekod.name')), nameInput),
          select(t('rekod.lang'), state.settings.lang, LANGS.map((l) => [l.id, l.label] as [Lang, string]), (v) => {
            update((s) => (s.settings.lang = v));
            setLang(v);
          }),
          select(t('rekod.theme'), state.settings.theme, [['auto', t('rekod.theme.auto')], ['light', t('rekod.theme.light')], ['dark', t('rekod.theme.dark')]], (v) => {
            update((s) => (s.settings.theme = v));
            applyTheme();
          }),
          select(t('rekod.speed'), String(state.settings.speechRate) as string, [['0.7', '0.7×'], ['0.9', '0.9×'], ['1', '1.0×']], (v) => {
            update((s) => (s.settings.speechRate = Number(v)));
            setRate(Number(v));
          }),
          toggle(t('rekod.kana'), state.settings.kanaHints, (v) => update((s) => (s.settings.kanaHints = v))),
          toggle(t('rekod.backup_rem'), state.settings.backupReminder, (v) => update((s) => (s.settings.backupReminder = v))),
          button(t('rekod.voice_check'), () => void sheet((close) => voiceCheck(() => close())), 'btn btn-ghost'),
          button(
            t('rekod.reset'),
            async () => {
              if (!(await confirmDialog(t('rekod.reset_confirm'), t('rekod.reset'), t('common.cancel'), true))) return;
              await db.del('state');
              await replaceState(defaultState());
              await saveNow();
              location.hash = '';
              location.reload();
            },
            'btn btn-danger-ghost',
          ),
        ),
        h('section', { class: 'card-box' }, h('h2', null, t('rekod.about')), h('p', { class: 'small' }, t('rekod.privacy')), h('p', { class: 'muted small' }, `Kata-Kata v${__APP_VERSION__}`)),
      ),
    );
  };
  draw();
}
