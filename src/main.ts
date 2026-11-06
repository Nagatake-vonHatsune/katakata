import './styles.css';
import { content } from './core/content';
import { isLang, setLang } from './core/i18n';
import { buildToday, buildUlang, type Session } from './core/session';
import { loadState, saveNow, state, update } from './core/state';
import { setRate } from './core/tts';
import { renderHome } from './views/home';
import { renderJaring, renderMain, renderSediaChapter, renderSediaList } from './views/modes';
import { renderOnboarding } from './views/onboarding';
import { applyTheme, renderRekod } from './views/rekod';
import { runSession } from './views/session';
import { renderTanya } from './views/tanya';
import { renderJambatan } from './views/jambatan';

const root = document.getElementById('app')!;
let inSession = false;

function go(route: string): void {
  const target = '#/' + route;
  if (location.hash === target) render();
  else location.hash = target;
}

function run(session: Session): void {
  inSession = true;
  void runSession(root, session, () => {
    inSession = false;
    go('');
    render();
  });
}

const nav = { go, run, startToday: () => run(buildToday()) };

function render(): void {
  if (inSession) return;
  if (!state.profile.onboarded) return renderOnboarding(root, () => go(''));
  const [route, arg] = location.hash.replace(/^#\/?/, '').split('/');
  switch (route) {
    case 'sedia':
      return arg ? renderSediaChapter(root, Number(arg), nav) : renderSediaList(root, nav);
    case 'ulang':
      history.replaceState(null, '', '#/');
      return run(buildUlang());
    case 'main':
      return renderMain(root, nav, arg);
    case 'jaring':
      return renderJaring(root, nav);
    case 'tanya':
      return renderTanya(root, go);
    case 'rekod':
      return renderRekod(root, go);
    case 'jambatan':
      return renderJambatan(root, go);
    default:
      return renderHome(root, nav);
  }
}

window.addEventListener('hashchange', () => {
  if (inSession) return;
  render();
});

async function start(): Promise<void> {
  await loadState();
  // Shareable language links: /?lang=en or /?lang=ms (or ja).
  const fromUrl = new URLSearchParams(location.search).get('lang');
  if (isLang(fromUrl) && fromUrl !== state.settings.lang) {
    update((s) => (s.settings.lang = fromUrl));
    await saveNow();
  }
  setLang(state.settings.lang);
  setRate(state.settings.speechRate);
  applyTheme();
  if (!content.chapters.length) console.warn('No live content packs found.');
  render();
  if ('serviceWorker' in navigator && import.meta.env.PROD) {
    navigator.serviceWorker.register('./sw.js').catch((e) => console.warn('SW registration failed', e));
  }
}

void start();
