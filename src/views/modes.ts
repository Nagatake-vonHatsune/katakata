// Sedia Kelas, Main (mini-games) and Jaring Kata screens.
import { content, gloss, srsKey } from '../core/content';
import { getLang, t } from '../core/i18n';
import { chapterProgress, isReady, sceneProgress } from '../core/progress';
import { buildCari, buildKad, buildSedia, buildSusun, cariCards, type Session } from '../core/session';
import { isKnown } from '../core/srs';
import { state } from '../core/state';
import { button, h, mount, progressBar } from '../core/ui';
import { sessionMeta } from './session';
import { chips, editHook, topBar } from './widgets';

export interface ModeNav {
  go(route: string): void;
  run(session: Session): void;
}

export function renderSediaList(root: HTMLElement, nav: ModeNav): void {
  const lang = getLang();
  mount(
    root,
    h(
      'div',
      { class: 'screen' },
      topBar(t('sedia.title'), () => nav.go('')),
      h('p', { class: 'lead' }, t('sedia.body')),
      h(
        'div',
        { class: 'list' },
        content.chapters.map((ch) => {
          const p = chapterProgress(ch.chapter);
          const ready = isReady(ch.chapter);
          return h(
            'button',
            { class: 'list-item', type: 'button', onclick: () => nav.go(`sedia/${ch.chapter}`) },
            h('span', { class: 'li-title' }, `${t('common.chapter', { n: ch.chapter })}  `, h('span', { lang: 'ms' }, ch.title.ms)),
            h('span', { class: 'muted small' }, lang === 'ja' ? ch.title.ja ?? ch.title.en : ch.title.en),
            progressBar(p.coreKnown, p.coreTotal),
            h('span', { class: 'small' }, ready ? '✅ ' + t('sedia.ready') : t('sedia.progress', { a: p.coreKnown, b: p.coreTotal })),
          );
        }),
      ),
    ),
  );
}

export function renderSediaChapter(root: HTMLElement, chapter: number, nav: ModeNav): void {
  const ch = content.chapters.find((c) => c.chapter === chapter);
  if (!ch) return nav.go('sedia');
  const lang = getLang();
  const p = chapterProgress(chapter);
  const session = buildSedia(chapter);
  const scene = content.scenes.find((s) => s.id === ch.sedia_kelas.scene);
  const frames = ch.sedia_kelas.frames.map((id) => ch.frames.find((f) => f.id === id)!);
  mount(
    root,
    h(
      'div',
      { class: 'screen' },
      topBar(t('common.chapter', { n: chapter }), () => nav.go('sedia')),
      h('h2', { lang: 'ms' }, ch.title.ms),
      h('p', { class: 'muted' }, lang === 'ja' ? ch.title.ja ?? '' : ch.title.en),
      isReady(chapter) ? h('p', { class: 'ready-badge' }, '✅ ' + t('sedia.ready')) : null,
      progressBar(p.coreKnown, p.coreTotal),
      h('p', { class: 'small' }, t('sedia.progress', { a: p.coreKnown, b: p.coreTotal })),
      button(`${p.coreKnown ? t('sedia.continue') : t('sedia.start')} · ${sessionMeta(session.steps)}`, () => nav.run(session), 'btn btn-primary btn-wide'),
      h('section', { class: 'card-box' }, h('h3', null, t('sedia.frames')), h('ul', { class: 'word-list' }, frames.map((f) => h('li', null, h('b', { lang: 'ms' }, f.frame), h('br'), h('span', { class: 'muted small' }, lang === 'ja' && f.meaning_ja ? f.meaning_ja : f.meaning_en))))),
      scene
        ? h(
            'section',
            { class: 'card-box' },
            h('h3', null, t('sedia.scene', { name: `${scene.title.ms}` })),
            h('p', { class: 'muted small' }, lang === 'ja' ? scene.setting.ja ?? scene.setting.en ?? '' : scene.setting.en ?? ''),
          )
        : null,
      h(
        'section',
        { class: 'card-box' },
        h('h3', null, `${t('sedia.core')} (${ch.sedia_kelas.cards.length})`),
        h(
          'ul',
          { class: 'word-list compact' },
          ch.sedia_kelas.cards.map((id) => {
            const c = content.cards.get(id)!;
            const known = isKnown(state.srs[srsKey(id)]);
            return h('li', { class: known ? 'known' : '' }, known ? '✓ ' : '・', h('b', { lang: 'ms' }, c.term), ' — ', known ? gloss(c, lang) : '？');
          }),
        ),
      ),
    ),
  );
}

export function renderMain(root: HTMLElement, nav: ModeNav, sub?: string): void {
  const lang = getLang();
  if (sub === 'cari') {
    const scenes = content.scenes.filter((s) => cariCards(s.id).length >= 4);
    return mount(
      root,
      h(
        'div',
        { class: 'screen' },
        topBar(t('game.cari.name'), () => nav.go('main')),
        h('p', { class: 'lead' }, t('main.pick_scene')),
        h(
          'div',
          { class: 'list' },
          scenes.map((s) =>
            h(
              'button',
              { class: 'list-item', type: 'button', onclick: () => nav.run(buildCari(s.id)) },
              h('span', { class: 'li-title' }, cariCards(s.id).slice(0, 4).map((c) => c.image).join(' '), '  ', h('span', { lang: 'ms' }, s.title.ms)),
              h('span', { class: 'muted small' }, lang === 'ja' ? s.title.ja ?? s.title.en : s.title.en),
            ),
          ),
        ),
      ),
    );
  }
  if (sub === 'susun') {
    return mount(
      root,
      h(
        'div',
        { class: 'screen' },
        topBar(t('game.susun.name'), () => nav.go('main')),
        h('p', { class: 'lead' }, t('main.pick_chapter')),
        h(
          'div',
          { class: 'list' },
          content.chapters.map((ch) =>
            h(
              'button',
              { class: 'list-item', type: 'button', onclick: () => nav.run(buildSusun(ch.chapter)) },
              h('span', { class: 'li-title' }, `${t('common.chapter', { n: ch.chapter })}  `, h('span', { lang: 'ms' }, ch.title.ms)),
              h('span', { class: 'muted small' }, `${ch.frames.length} ${t('misc.patterns')}`),
            ),
          ),
        ),
      ),
    );
  }
  const hasWords = Object.keys(state.srs).length > 0;
  const game = (name: string, desc: string, onclick: () => void, disabled = false) =>
    h('button', { class: 'list-item', type: 'button', onclick, disabled }, h('span', { class: 'li-title' }, name), h('span', { class: 'muted small' }, desc));
  mount(
    root,
    h(
      'div',
      { class: 'screen' },
      topBar(t('main.title'), () => nav.go('')),
      h(
        'div',
        { class: 'list' },
        game(t('game.kad.name'), hasWords ? t('game.kad.howto') : t('main.need_words'), () => nav.run(buildKad()), !hasWords),
        game(t('game.cari.name'), t('game.cari.howto'), () => nav.go('main/cari')),
        game(t('game.susun.name'), t('game.susun.howto'), () => nav.go('main/susun')),
      ),
      h('p', { class: 'muted small' }, t('main.phase2')),
    ),
  );
}

export function renderJaring(root: HTMLElement, nav: ModeNav): void {
  const lang = getLang();
  const search = h('input', { class: 'input', type: 'search', placeholder: t('jaring.search'), 'aria-label': t('jaring.search') }) as HTMLInputElement;
  const list = h('div', { class: 'jaring-list' });
  const groups = [
    ...content.chapters.map((ch) => ({ id: `kelas-${ch.id}`, title: `${t('common.chapter', { n: ch.chapter })} ${ch.title.ms}`, cards: ch.cards })),
    ...content.scenes.map((s) => ({ id: `dunia-${s.id}`, title: `${s.world.ms} · ${s.title.ms}`, cards: s.cards })),
  ];
  const met = groups.reduce((n, g) => n + g.cards.filter((c) => state.srs[srsKey(c.id)]).length, 0);
  const draw = () => {
    const q = search.value.trim().toLowerCase();
    list.replaceChildren(
      ...groups
        .map((g) => {
          const cards = g.cards.filter((c) => state.srs[srsKey(c.id)] && (!q || c.term.toLowerCase().includes(q) || gloss(c, lang).toLowerCase().includes(q) || c.gloss_en.toLowerCase().includes(q)));
          if (!cards.length) return null;
          return h(
            'section',
            { class: 'card-box' },
            h('h3', null, g.title),
            cards.map((c) =>
              h(
                'div',
                { class: 'jaring-word' },
                h('button', { class: 'linklike', type: 'button', onclick: async () => { await editHook(c); draw(); } }, h('b', { lang: 'ms' }, c.term), ' — ', gloss(c, lang)),
                chips(c),
              ),
            ),
          );
        })
        .filter((x): x is HTMLElement => !!x),
    );
    if (!list.children.length) list.append(h('p', { class: 'muted' }, t('jaring.none')));
  };
  search.addEventListener('input', draw);
  mount(
    root,
    h(
      'div',
      { class: 'screen' },
      topBar(t('jaring.title'), () => nav.go('')),
      h('p', { class: 'lead' }, t('jaring.body')),
      h('p', { class: 'small' }, t('jaring.count', { n: met })),
      h(
        'div',
        { class: 'scene-progress' },
        content.scenes.map((s) => {
          const sp = sceneProgress(s.id);
          return h('div', { class: 'sp' }, h('span', { class: 'small' }, s.title.ms), progressBar(sp.known, sp.total));
        }),
      ),
      search,
      list,
    ),
  );
  draw();
}
