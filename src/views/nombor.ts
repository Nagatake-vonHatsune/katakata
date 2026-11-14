// Nombor & Masa: a standalone mode, open from day one (Sam, 15 Nov 2026). Six parts (numbers, days, months and dates,
// fractions, money, time), each with a hands-on explorer (roll the numbers, turn the calendar, spin the clock), a chart,
// draft memory hooks, and an 8-question round. Practice only: nothing here touches the review schedule.
import { getLang, t } from '../core/i18n';
import {
  buildMatches, dateReading, DAYS, dayAfter, decimalReading, FRACTIONS, formatMoney, formatNumber, moneyReading, NUMBER_LEVELS, numberReading, PART_CHART, PARTS, percentReading, phoneToWords, randomDate,
  randomDecimal, randomMoney, randomNumber, randomPhone, randomTime, RELATIVE, round, timeReading, PERCENTS,
  type NumberLevel, type PartId, type Question, type Reading, type Shown,
} from '../core/nombor';
import { speak, stopSpeech, voiceKind } from '../core/tts';
import { button, h, mount, sheet } from '../core/ui';
import {
  calendarPage, chartContent, clockFace, dateLabel, dayName, fractionPie, miniClock, monthName, partIcon, priceTag,
  reels, skyStrip, weekStrip,
} from './nombor-charts';
import { topBar } from './widgets';

const PART_MS: Record<PartId, string> = { nombor: 'Nombor', hari: 'Hari', bulan: 'Bulan dan tarikh', pecahan: 'Pecahan dan peratus', wang: 'Wang', masa: 'Masa' };
const PART_ICON: Record<PartId, string> = { nombor: '🔢', hari: '🗓️', bulan: '📆', pecahan: '🍰', wang: '💵', masa: '🕒' };

let level: NumberLevel = 'n10';
const canSpeak = () => typeof speechSynthesis !== 'undefined';

function listen(text: string): HTMLElement | null {
  if (!canSpeak()) return null;
  return button(t('sess.listen'), () => void speak(text), 'btn btn-audio btn-small nm-listen');
}

/** The reading: standard form first, each variant with its label (Spoken, Also standard, Formal …). */
function readingBox(r: Reading): HTMLElement {
  return h(
    'div',
    { class: 'nm-reading', 'aria-live': 'polite' },
    h('div', { class: 'nm-reading-main' }, h('b', { lang: 'ms' }, r.text), r.label ? h('span', { class: 'nm-tag' }, t('nm.label.' + r.label)) : null, listen(r.text)),
    r.variants.map((v) => h('div', { class: 'nm-reading-alt' }, h('span', { class: 'nm-tag' + (v.label === 'spoken' ? ' nm-tag-spoken' : '') }, t('nm.label.' + v.label)), h('span', { lang: 'ms' }, v.text), listen(v.text))),
  );
}

function openChart(part: PartId): void {
  const id = PART_CHART[part];
  void sheet((close) => [chartContent(id, part === 'pecahan' || part === 'wang' ? part : 'nombor'), button(t('common.close'), () => close(), 'btn btn-ghost btn-wide')], { label: t('nm.chart.' + id) });
  // The sheet focuses its first button (Close, at the bottom); show the chart from the top.
  requestAnimationFrame(() => document.querySelector('.sheet')?.scrollTo(0, 0));
}

function voiceNote(): HTMLElement {
  const note = h('p', { class: 'muted small nm-voice-note' });
  if (!canSpeak()) note.textContent = t('nm.no_voice');
  else void voiceKind().then((k) => k === 'none' && (note.textContent = t('nm.no_voice')));
  return note;
}

// ---------------------------------------------------------------- hub

export function renderNombor(root: HTMLElement, go: (r: string) => void, arg?: string): void {
  stopSpeech();
  if (arg && (PARTS as string[]).includes(arg)) return renderPart(root, go, arg as PartId);
  const lang = getLang();
  mount(
    root,
    h(
      'div',
      { class: 'screen nm' },
      topBar(t('nm.title'), () => go('')),
      h('p', { class: 'lead' }, t('nm.lead')),
      h(
        'div',
        { class: 'list' },
        PARTS.map((p, i) =>
          h(
            'button',
            { class: 'list-item nm-part-item', type: 'button', 'data-part': p, onclick: () => go(`nombor/${p}`) },
            h('span', { class: 'li-title' }, h('span', { 'aria-hidden': 'true' }, PART_ICON[p] + '  '), `${i + 1}. `, h('span', { lang: 'ms' }, PART_MS[p])),
            lang === 'ms' ? null : h('span', { class: 'muted small' }, t('nm.part.' + p)),
          ),
        ),
      ),
      h(
        'section',
        { class: 'card-box stack' },
        h('h3', null, t('nm.charts')),
        h(
          'div',
          { class: 'row' },
          (['nombor', 'masa', 'bulan'] as PartId[]).map((p) => button(t('nm.chart.' + PART_CHART[p]), () => openChart(p), 'btn btn-ghost btn-small')),
        ),
      ),
    ),
  );
}

// ---------------------------------------------------------------- part screen with its explorer

function renderPart(root: HTMLElement, go: (r: string) => void, part: PartId): void {
  const lang = getLang();
  const levels =
    part === 'nombor'
      ? h(
          'div',
          { class: 'seg nm-levels', role: 'radiogroup', 'aria-label': t('nm.level') },
          NUMBER_LEVELS.map((l) =>
            h(
              'button',
              {
                class: 'seg-btn' + (l.id === level ? ' on' : ''),
                type: 'button',
                role: 'radio',
                'aria-checked': String(l.id === level),
                onclick: () => {
                  level = l.id;
                  renderPart(root, go, part);
                },
              },
              t('nm.level.' + l.id),
            ),
          ),
        )
      : null;
  const hooks = [1, 2].map((n) => h('li', null, t(`nm.hook.${part}.${n}`)));
  mount(
    root,
    h(
      'div',
      { class: 'screen nm', 'data-part': part },
      topBar(`${PART_ICON[part]} ${PART_MS[part]}`, () => go('nombor')),
      lang === 'ms' ? null : h('p', { class: 'muted' }, t('nm.part.' + part)),
      levels,
      h('section', { class: 'card-box nm-explore' }, h('h3', null, t('nm.explore')), explorer(part)),
      voiceNote(),
      h(
        'div',
        { class: 'stack' },
        button(t('nm.play'), () => playRound(root, go, part), 'btn btn-primary btn-wide nm-play'),
        button('📊 ' + t('nm.chart.' + PART_CHART[part]), () => openChart(part), 'btn btn-ghost btn-wide nm-chart-btn'),
      ),
      h('section', { class: 'card-box' }, h('h3', null, t('nm.hooks')), h('ul', { class: 'word-list nm-hooks' }, hooks)),
    ),
  );
}

function explorer(part: PartId): HTMLElement {
  const out = h('div', { class: 'nm-reading-slot' });
  const show = (r: Reading) => out.replaceChildren(readingBox(r));
  switch (part) {
    case 'nombor': {
      const stage = h('div', { class: 'nm-stage' });
      const roll = (phone: boolean) => {
        const final = phone ? randomPhone(Math.random) : formatNumber(randomNumber(Math.random, level));
        spinReels(stage, final, () => show(phone ? { text: phoneToWords(final), variants: [] } : numberReading(Number(final.replace(/,/g, '')))));
      };
      stage.append(reels(formatNumber(0)));
      show(numberReading(0));
      return h(
        'div',
        { class: 'stack' },
        stage,
        h('div', { class: 'row' }, button('🎰 ' + t('nm.roll'), () => roll(false), 'btn btn-primary nm-roll'), level === 'n10' ? button('📱 ' + t('nm.phone'), () => roll(true), 'btn nm-roll-phone') : null),
        out,
      );
    }
    case 'hari': {
      let today = new Date().getDay();
      const strip = h('div');
      const draw = () => {
        strip.replaceChildren(
          weekStrip(today, null, (d) => {
            today = d;
            draw();
          }),
          h(
            'div',
            { class: 'nm-rel' },
            [-1, 0, 1, 2].map((o) =>
              h(
                'button',
                { class: 'nm-rel-cell' + (o === 0 ? ' today' : ''), type: 'button', onclick: () => show({ text: `${RELATIVE[o][0].toUpperCase()}${RELATIVE[o].slice(1)} hari ${DAYS[dayAfter(today, o)]}.`, variants: [] }) },
                h('b', { lang: 'ms' }, RELATIVE[o]),
                h('span', { class: 'small muted', lang: 'ms' }, DAYS[dayAfter(today, o)]),
              ),
            ),
          ),
        );
        show({ text: `Hari ini hari ${DAYS[today]}.`, variants: [] });
      };
      draw();
      return h('div', { class: 'stack' }, h('p', { class: 'small muted' }, t('nm.today_pick')), strip, out);
    }
    case 'bulan': {
      const now = new Date();
      let [d, m, y] = [now.getDate(), now.getMonth() + 1, now.getFullYear()];
      const page = h('div', { class: 'nm-page' });
      const draw = (flip = false) => {
        page.replaceChildren(calendarPage(d, m, y, (nd) => ((d = nd), draw())));
        if (flip) {
          page.classList.remove('nm-flip');
          void page.offsetWidth;
          page.classList.add('nm-flip');
        }
        show(dateReading(d, m, y));
      };
      const turn = (step: number) => {
        m += step;
        if (m > 12) ((m = 1), y++);
        if (m < 1) ((m = 12), y--);
        d = Math.min(d, new Date(Date.UTC(y, m, 0)).getUTCDate());
        draw(true);
      };
      draw();
      return h(
        'div',
        { class: 'stack' },
        h('div', { class: 'row nm-cal-nav' }, button('‹', () => turn(-1), 'btn btn-small'), button('📆 ' + t('nm.turn'), () => (([d, m, y] = randomDate(Math.random)), draw(true)), 'btn btn-primary nm-turn'), button('›', () => turn(1), 'btn btn-small')),
        page,
        out,
      );
    }
    case 'pecahan': {
      const stage = h('div', { class: 'nm-stage' });
      const set = (el: HTMLElement, r: Reading) => (stage.replaceChildren(el), show(r));
      set(fractionPie('half'), FRACTIONS[0].reading);
      return h(
        'div',
        { class: 'stack' },
        stage,
        h(
          'div',
          { class: 'row nm-chips' },
          FRACTIONS.map((f) => button(f.sym, () => set(fractionPie(f.id), f.reading), 'btn btn-small nm-chip')),
          button('2.5', () => set(h('div', { class: 'nm-big' }, '2.5'), decimalReading('2.5')), 'btn btn-small nm-chip'),
          button('🎲 0.0', () => {
            const v = randomDecimal(Math.random);
            set(h('div', { class: 'nm-big' }, v), decimalReading(v));
          }, 'btn btn-small nm-chip'),
          button('🎲 %', () => {
            const v = PERCENTS[Math.floor(Math.random() * PERCENTS.length)];
            set(h('div', { class: 'nm-big' }, v + '%'), percentReading(v));
          }, 'btn btn-small nm-chip'),
        ),
        out,
      );
    }
    case 'wang': {
      const stage = h('div', { class: 'nm-stage' }, priceTag(450));
      show(moneyReading(450));
      return h(
        'div',
        { class: 'stack' },
        stage,
        button('🎲 ' + t('nm.roll_price'), () => {
          const c = randomMoney(Math.random);
          stage.replaceChildren(priceTag(c));
          stage.firstElementChild?.classList.add('nm-pop');
          show(moneyReading(c));
        }, 'btn btn-primary nm-roll'),
        out,
      );
    }
    case 'masa':
      return clockExplorer(show, out);
  }
}

function spinReels(stage: HTMLElement, final: string, done: () => void): void {
  const started = performance.now();
  const tick = () => {
    const tSpent = performance.now() - started;
    if (tSpent > 550 || matchMedia('(prefers-reduced-motion: reduce)').matches) {
      stage.replaceChildren(reels(final));
      done();
      return;
    }
    stage.replaceChildren(reels(final.replace(/\d/g, () => String(Math.floor(Math.random() * 10)))));
    requestAnimationFrame(tick);
  };
  tick();
}

/** The clock explorer: drag either hand (the minute hand carries the hour, the hour hand moves through the 24 hours), or spin. */
function clockExplorer(show: (r: Reading) => void, out: HTMLElement): HTMLElement {
  let total = 15 * 60 + 30; // minutes since midnight
  const clock = clockFace(15, 30, 240);
  const sky = h('div');
  const label = h('div', { class: 'nm-time-label' });
  const draw = () => {
    const hh = Math.floor(total / 60);
    const mm = total % 60;
    clock.set(hh, mm);
    sky.replaceChildren(skyStrip(hh, mm));
    label.textContent = `${partIcon(hh, mm)} ${formatTimeLocal(hh, mm)}`;
    show(timeReading(hh, mm));
  };
  let dragging: 'h' | 'm' | null = null;
  const angleOf = (e: PointerEvent) => {
    const r = (clock.el as SVGGraphicsElement).getBoundingClientRect();
    const x = e.clientX - (r.left + r.width / 2);
    const y = e.clientY - (r.top + r.height / 2);
    return { a: ((Math.atan2(x, -y) * 180) / Math.PI + 360) % 360, d: Math.hypot(x, y) / (r.width / 2) };
  };
  clock.el.addEventListener('pointerdown', (e) => {
    const { d } = angleOf(e as PointerEvent);
    dragging = d > 0.6 ? 'm' : 'h';
    (clock.el as Element).setPointerCapture?.((e as PointerEvent).pointerId);
    e.preventDefault();
  });
  clock.el.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const { a } = angleOf(e as PointerEvent);
    const hh = Math.floor(total / 60);
    const mm = total % 60;
    if (dragging === 'm') {
      const nm = Math.round(a / 30) * 5 % 60;
      let dm = nm - mm;
      if (dm > 30) dm -= 60;
      if (dm < -30) dm += 60;
      if (!dm) return;
      total = (total + dm + 1440) % 1440;
    } else {
      const nh = Math.round(a / 30) % 12;
      let dh = nh - (hh % 12);
      if (dh > 6) dh -= 12;
      if (dh < -6) dh += 12;
      if (!dh) return;
      total = (total + dh * 60 + 1440) % 1440;
    }
    draw();
  });
  const stop = () => (dragging = null);
  clock.el.addEventListener('pointerup', stop);
  clock.el.addEventListener('pointercancel', stop);
  const spin = () => {
    const [th, tm] = randomTime(Math.random);
    animateClock(total, th * 60 + tm, (v) => {
      total = v;
      const hh = Math.floor(v / 60);
      clock.set(hh, v % 60);
    }, () => {
      total = th * 60 + tm;
      draw();
    });
  };
  draw();
  return h(
    'div',
    { class: 'stack center' },
    h('p', { class: 'small muted' }, t('nm.drag')),
    h('div', { class: 'nm-clock-wrap' }, clock.el),
    label,
    sky,
    button('🌀 ' + t('nm.spin'), spin, 'btn btn-primary nm-spin'),
    out,
  );
}

function formatTimeLocal(hh: number, mm: number): string {
  const lang = getLang();
  return lang === 'ja' ? `${hh}:${String(mm).padStart(2, '0')}` : `${hh % 12 || 12}:${String(mm).padStart(2, '0')} ${hh < 12 ? 'am' : 'pm'}`;
}

/** Spin the hands forward (at least one full turn of the hour hand) to a target time. */
function animateClock(from: number, to: number, frame: (v: number) => void, done: () => void): void {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return done();
  const target = to + (to <= from ? 1440 : 0) + 720;
  const start = performance.now();
  const dur = 900;
  const step = () => {
    const p = Math.min(1, (performance.now() - start) / dur);
    const e = 1 - Math.pow(1 - p, 3);
    frame(Math.round(from + (target - from) * e) % 1440);
    if (p < 1) requestAnimationFrame(step);
    else done();
  };
  step();
}

// ---------------------------------------------------------------- the round

function shownEl(s: Shown, big: boolean): HTMLElement {
  switch (s.kind) {
    case 'number': return big ? reels(formatNumber(s.n)) : h('span', { class: 'nm-opt-num' }, formatNumber(s.n));
    case 'phone': return h('div', { class: 'nm-phone' }, '📱 ', s.phone);
    case 'day': return big ? h('div', { class: 'nm-daycard' }, dayName(s.day)) : h('span', null, dayName(s.day));
    case 'relative': return h('div', { class: 'stack' }, weekStrip(s.today, dayAfter(s.today, s.offset), undefined, false), h('p', { class: 'small muted center' }, t('nm.legend')));
    case 'month': return big ? h('div', { class: 'nm-daycard' }, monthName(s.month)) : h('span', null, monthName(s.month));
    case 'date': return big ? h('div', { class: 'nm-page' }, calendarPage(s.day, s.month, s.year, undefined, false), h('p', { class: 'center' }, dateLabel(s.day, s.month, s.year))) : h('span', null, dateLabel(s.day, s.month, s.year));
    case 'fraction': return fractionPie(s.id, big ? 96 : 44);
    case 'decimal': return h('span', { class: big ? 'nm-big' : 'nm-opt-num' }, s.value);
    case 'percent': return h('span', { class: big ? 'nm-big' : 'nm-opt-num' }, s.value + '%');
    case 'money': return big ? priceTag(s.cents) : h('span', { class: 'nm-opt-num' }, formatMoney(s.cents));
    case 'time': return big ? h('div', { class: 'stack center' }, clockFace(s.h, s.m, 200).el, h('div', { class: 'nm-time-label' }, formatTimeLocal(s.h, s.m)), skyStrip(s.h, s.m)) : miniClock(s.h, s.m);
    case 'ms': return big ? h('div', { class: 'nm-ms-prompt' }, h('b', { lang: 'ms' }, s.text), listen(s.text)) : h('span', { lang: 'ms' }, s.text);
  }
}

function promptFor(q: Question): string {
  if (q.dir === 'build') return t('nm.q.build');
  if (q.dir === 'pick') return t('nm.q.pick');
  if (q.shown.kind === 'relative') return t('nm.q.relative');
  return t('nm.q.read');
}

function playRound(root: HTMLElement, go: (r: string) => void, part: PartId): void {
  const qs = round(part, Math.random, level);
  let i = 0;
  let right = 0;
  const next = () => {
    stopSpeech();
    if (i >= qs.length) return summary();
    const q = qs[i];
    const stage = h('div', { class: 'nm-q-stage' });
    const feedback = h('div', { class: 'nm-feedback', 'aria-live': 'polite' });
    const body = h('div', { class: 'stack' });
    const finish = (ok: boolean) => {
      if (ok) right++;
      feedback.replaceChildren(
        h('div', { class: 'feedback ' + (ok ? 'ok' : 'neutral') }, ok ? t('nm.right') : t('nm.answer')),
        readingBox(q.reading),
        h('div', { class: 'row' }, button('📊 ' + t('nm.chart.' + q.chart), () => openChart(part), 'btn btn-ghost nm-fb-chart'), button(t('nm.next') + ' ›', () => ((i += 1), next()), 'btn btn-primary btn-next nm-next')),
      );
      feedback.querySelector<HTMLButtonElement>('.nm-next')?.focus();
    };
    if (q.dir === 'build') body.append(builder(q, finish));
    else {
      const list = h('div', { class: 'options nm-options' + (q.options[0].kind === 'time' ? ' nm-options-grid' : '') });
      q.options.forEach((o, k) => {
        const b = h('button', { class: 'opt nm-opt', type: 'button', 'data-right': String(k === q.answer) }, shownEl(o, false)) as HTMLButtonElement;
        b.addEventListener('click', () => {
          list.querySelectorAll('button').forEach((x) => ((x as HTMLButtonElement).disabled = true));
          const ok = k === q.answer;
          b.classList.add(ok ? 'opt-correct' : 'opt-chosen');
          if (!ok) list.children[q.answer].classList.add('opt-answer');
          finish(ok);
        });
        list.append(b);
      });
      body.append(list);
    }
    mount(
      root,
      h(
        'div',
        { class: 'screen nm nm-round', 'data-part': part, 'data-dir': q.dir },
        topBar(`${PART_ICON[part]} ${i + 1} / ${qs.length}`, () => renderPart(root, go, part)),
        h('p', { class: 'instruction' }, promptFor(q)),
        stage,
        body,
        feedback,
      ),
    );
    showQuestion(stage, q);
  };
  const summary = () =>
    mount(
      root,
      h(
        'div',
        { class: 'screen summary nm' },
        h('h1', { class: 'center' }, '🎉 ' + t('nm.done')),
        h('p', { class: 'center nm-score' }, t('nm.score', { a: right, b: qs.length })),
        h('div', { class: 'stack' }, button(t('nm.again'), () => playRound(root, go, part), 'btn btn-primary btn-wide'), button('📊 ' + t('nm.chart.' + PART_CHART[part]), () => openChart(part), 'btn btn-ghost btn-wide'), button(t('nm.back'), () => go('nombor'), 'btn btn-ghost btn-wide')),
      ),
    );
  next();
}

/** Show the question's thing, with its gadget's motion: numbers roll, the clock spins, the calendar turns. */
function showQuestion(stage: HTMLElement, q: Question): void {
  const s = q.shown;
  if (s.kind === 'number') return spinReels(stage, formatNumber(s.n), () => undefined);
  if (s.kind === 'time') {
    const el = shownEl(s, true);
    stage.replaceChildren(el);
    const face = el.querySelector('svg.nm-clock') as SVGElement;
    const hands = { h: face.querySelector('[data-hand="h"]')!, m: face.querySelector('[data-hand="m"]')! };
    animateClock(0, s.h * 60 + s.m, (v) => {
      hands.h.setAttribute('transform', `rotate(${(((Math.floor(v / 60)) % 12) + (v % 60) / 60) * 30})`);
      hands.m.setAttribute('transform', `rotate(${(v % 60) * 6})`);
    }, () => {
      hands.h.setAttribute('transform', `rotate(${((s.h % 12) + s.m / 60) * 30})`);
      hands.m.setAttribute('transform', `rotate(${s.m * 6})`);
    });
    return;
  }
  const el = shownEl(s, true);
  if (s.kind === 'date' || s.kind === 'month' || s.kind === 'money') el.classList.add('nm-flip');
  stage.replaceChildren(el);
}

/** Build the Malay from blocks: tap a block to place it, tap a placed block to take it back. */
function builder(q: Question, finish: (ok: boolean) => void): HTMLElement {
  const bank = q.blocks!.map((w, k) => ({ w, k }));
  const built: typeof bank = [];
  let done = false;
  const answer = h('div', { class: 'tiles tiles-answer nm-built', 'aria-label': 'answer' });
  const bankRow = h('div', { class: 'tiles tiles-bank nm-bank' });
  const draw = () => {
    answer.replaceChildren(...built.map((b) => h('button', { class: 'tile tile-on', type: 'button', lang: 'ms', onclick: () => !done && (built.splice(built.indexOf(b), 1), bank.push(b), draw()) }, b.w)));
    bankRow.replaceChildren(...bank.map((b) => h('button', { class: 'tile nm-tile', type: 'button', lang: 'ms', onclick: () => !done && (bank.splice(bank.indexOf(b), 1), built.push(b), draw()) }, b.w)));
  };
  draw();
  const check = button(t('nm.check'), () => {
    if (done || !built.length) return;
    done = true;
    check.disabled = true;
    const words = built.map((b) => b.w);
    const ok = buildMatches(q, words);
    answer.classList.add(ok ? 'nm-built-ok' : 'nm-built-no');
    finish(ok);
  }, 'btn btn-primary btn-wide nm-check');
  return h('div', { class: 'stack nm-builder', 'data-answer': q.reading.text }, answer, bankRow, h('div', { class: 'row' }, button(t('nm.clear'), () => !done && (bank.push(...built.splice(0)), draw()), 'btn btn-ghost'), check));
}
