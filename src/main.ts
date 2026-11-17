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
import { renderSettings } from './views/settings';
import { renderLaju } from './views/laju';
import { renderNombor } from './views/nombor';
import { renderStretch } from './views/stretch';
import { LANG_EVENT } from './views/langswitch';
import { loadTeacher } from './core/teacher';
import { applyTeacher, ordinaryKeys, renderStrip, setTeacherMode } from './views/teacher';
import { runClass } from './views/classroom';
import type { ClassActivity, ClassSource } from './core/classroom';
import { loadSlots } from './core/slots';
import { renderStudents } from './views/students';
import { loadCard, saveCard, slotBanner } from './views/memorycard';
import { installSlotHooks } from './views/teacher';

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

/** A class run from the teacher-mode launcher: like a session, the hash router waits until it ends. */
function runClassRun(src: ClassSource, activity: ClassActivity): void {
  inSession = true;
  void runClass(root, src, activity, {
    exit: () => {
      inSession = false;
      go('');
      render();
    },
    turnOff: () => {
      inSession = false;
      void setTeacherMode(false).then(() => {
        go('');
        render();
      });
    },
  });
}

const nav = { go, run, startToday: () => run(buildToday()), runClass: runClassRun };

function render(): void {
  if (inSession) return;
  if (!state.profile.onboarded) return renderOnboarding(root, () => go(''));
  const [route, arg, sub] = location.hash.replace(/^#\/?/, '').split('/');
  switch (route) {
    case 'sedia':
      if (arg && sub === 'x') return renderStretch(root, Number(arg), nav);
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
    case 'settings':
      return renderSettings(root, go);
    case 'laju':
      return renderLaju(root, go);
    case 'nombor':
      return renderNombor(root, go, arg);
    case 'students':
      return void renderStudents(root, go);
    default:
      return renderHome(root, nav);
  }
}

// Language changed from a 🌐 button: redraw the current screen (a running session picks it up on the next step).
window.addEventListener(LANG_EVENT, () => {
  renderStrip();
  if (!inSession && state.profile.onboarded) render();
});

// Teacher mode turned off from the strip's badge: redraw the screen in the phone layout.
window.addEventListener('katakata:teacher', () => {
  if (!inSession && state.profile.onboarded) render();
});

// Teacher mode: the keys and a presenter clicker also drive ordinary practice (class runs handle their own keys).
document.addEventListener('keydown', ordinaryKeys);

window.addEventListener('hashchange', () => {
  if (inSession) return;
  render();
});

async function start(): Promise<void> {
  await loadState();
  await loadTeacher();
  await loadSlots();
  installSlotHooks(go, () => {
    renderStrip();
    render();
  }, slotBanner, { saveCard: () => saveCard(), loadCard });
  // Shareable language links: /?lang=en or /?lang=ms (or ja).
  const fromUrl = new URLSearchParams(location.search).get('lang');
  if (isLang(fromUrl) && fromUrl !== state.settings.lang) {
    update((s) => (s.settings.lang = fromUrl));
    await saveNow();
  }
  setLang(state.settings.lang);
  setRate(state.settings.speechRate);
  applyTheme();
  applyTeacher();
  if (!content.chapters.length) console.warn('No live content packs found.');
  render();
  if ('serviceWorker' in navigator && import.meta.env.PROD) {
    navigator.serviceWorker.register('./sw.js').catch((e) => console.warn('SW registration failed', e));
  }
}

void start();
