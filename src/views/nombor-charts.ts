// Nombor & Masa: the drawn pieces (clock face, calendar page, price tag, fraction pie, number reels) and the three
// charts (number blocks, clock with the parts of the day, calendar strip). Plain SVG and DOM, offline.
import { getLang, t } from '../core/i18n';
import {
  DAY_PARTS, DAYS, dayPart, FRACTIONS, MONTHS, RELATIVE, daysInMonth, formatMoney, formatTime, numberToWords,
  moneyReading, timeReading, type ChartId, type DayPart,
} from '../core/nombor';
import { h } from '../core/ui';

const NS = 'http://www.w3.org/2000/svg';
type SvgAttrs = Record<string, string | number>;
export function svg(tag: string, attrs: SvgAttrs = {}, ...children: Array<SVGElement | string | null>): SVGElement {
  const el = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
  for (const c of children) if (c !== null) el.append(typeof c === 'string' ? document.createTextNode(c) : c);
  return el;
}

// ---------------------------------------------------------------- names in the interface language

const EN_DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const JA_DAYS = ['日曜日', '月曜日', '火曜日', '水曜日', '木曜日', '金曜日', '土曜日'];
const EN_MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** Day and month names in the interface language. A Malay interface shows English, so a question never shows its own answer. */
export function dayName(day: number): string {
  return getLang() === 'ja' ? JA_DAYS[day] : EN_DAYS[day];
}
export function monthName(month: number): string {
  return getLang() === 'ja' ? `${month}月` : EN_MONTHS[month - 1];
}
export function dateLabel(day: number, month: number, year: number): string {
  return getLang() === 'ja' ? `${year}年${month}月${day}日` : `${day} ${EN_MONTHS[month - 1]} ${year}`;
}

export const PART_ICON: Record<DayPart, string> = { pagi: '🌅', 'tengah hari': '☀️', petang: '🌇', malam: '🌙', 'tengah malam': '🌌' };
const PART_COLOR: Record<DayPart, string> = { pagi: '#f3c969', 'tengah hari': '#f08a4b', petang: '#c96f8a', malam: '#3f5a8a', 'tengah malam': '#1f2a44' };

// ---------------------------------------------------------------- clock

export interface ClockHandle {
  el: SVGElement;
  set(h24: number, m: number): void;
}

/** A 12-hour clock face. Hands at h:m; numbers 1 to 12. */
export function clockFace(h24: number, m: number, size = 220): ClockHandle {
  const r = 100;
  const face = svg('svg', { viewBox: '-110 -110 220 220', width: size, height: size, class: 'nm-clock', role: 'img' });
  face.append(svg('circle', { r, class: 'nm-clock-face' }));
  for (let i = 0; i < 60; i++) {
    const a = (i * Math.PI) / 30;
    const long = i % 5 === 0;
    face.append(svg('line', { x1: Math.sin(a) * (long ? 84 : 90), y1: -Math.cos(a) * (long ? 84 : 90), x2: Math.sin(a) * 96, y2: -Math.cos(a) * 96, class: long ? 'nm-tick nm-tick-5' : 'nm-tick' }));
  }
  for (let n = 1; n <= 12; n++) {
    const a = (n * Math.PI) / 6;
    face.append(svg('text', { x: Math.sin(a) * 72, y: -Math.cos(a) * 72 + 7, class: 'nm-clock-num', 'text-anchor': 'middle' }, String(n)));
  }
  const hour = svg('line', { x1: 0, y1: 10, x2: 0, y2: -44, class: 'nm-hand nm-hand-h', 'data-hand': 'h' });
  const minute = svg('line', { x1: 0, y1: 14, x2: 0, y2: -62, class: 'nm-hand nm-hand-m', 'data-hand': 'm' });
  face.append(hour, minute, svg('circle', { r: 6, class: 'nm-hub' }));
  const set = (hh: number, mm: number) => {
    hour.setAttribute('transform', `rotate(${((hh % 12) + mm / 60) * 30})`);
    minute.setAttribute('transform', `rotate(${mm * 6})`);
    face.setAttribute('aria-label', formatTime(hh, mm, getLang()));
  };
  set(h24, m);
  return { el: face, set };
}

/** Small clock for an answer option: face plus the time in digits. */
export function miniClock(h24: number, m: number): HTMLElement {
  return h('span', { class: 'nm-mini-clock' }, clockFace(h24, m, 64).el, h('span', { class: 'nm-mini-time' }, formatTime(h24, m, getLang())));
}

/** A 24-hour strip: the sun's place in the day, no words (the reading is the question). */
export function skyStrip(h24: number, m: number, labels = false): HTMLElement {
  const box = svg('svg', { viewBox: '0 0 240 28', class: 'nm-sky', 'aria-hidden': 'true' });
  for (const p of DAY_PARTS) {
    if (p.part === 'tengah malam') continue;
    const x = (p.from / 1440) * 240;
    const w = ((p.to - p.from + 1) / 1440) * 240;
    box.append(svg('rect', { x, y: 4, width: w, height: 20, fill: PART_COLOR[p.part], opacity: 0.85 }));
    if (labels) box.append(svg('text', { x: x + w / 2, y: 18, 'text-anchor': 'middle', class: 'nm-sky-label' }, p.part === 'tengah hari' ? 't.h.' : p.part));
  }
  const x = ((h24 * 60 + m) / 1440) * 240;
  box.append(svg('line', { x1: x, y1: 0, x2: x, y2: 28, class: 'nm-sky-now' }));
  return h('div', { class: 'nm-sky-wrap' }, box);
}

// ---------------------------------------------------------------- other pieces

export function priceTag(cents: number): HTMLElement {
  return h('div', { class: 'nm-price' }, h('span', { class: 'nm-price-hole', 'aria-hidden': 'true' }), formatMoney(cents));
}

export function fractionPie(id: string, size = 96): HTMLElement {
  const f = FRACTIONS.find((x) => x.id === id)!;
  const r = 40;
  const pie = svg('svg', { viewBox: '-50 -50 100 100', width: size, height: size, class: 'nm-pie', 'aria-hidden': 'true' });
  pie.append(svg('circle', { r, class: 'nm-pie-bg' }));
  const end = (2 * Math.PI * f.num) / f.den;
  const large = end > Math.PI ? 1 : 0;
  pie.append(svg('path', { d: `M0 0 L0 ${-r} A${r} ${r} 0 ${large} 1 ${Math.sin(end) * r} ${-Math.cos(end) * r} Z`, class: 'nm-pie-fill' }));
  for (let i = 0; i < f.den; i++) {
    const a = (2 * Math.PI * i) / f.den;
    pie.append(svg('line', { x1: 0, y1: 0, x2: Math.sin(a) * r, y2: -Math.cos(a) * r, class: 'nm-pie-line' }));
  }
  return h('span', { class: 'nm-frac' }, pie, h('span', { class: 'nm-frac-sym' }, f.sym));
}

/** Number reels (a slot machine): one box per digit, commas between groups. */
export function reels(text: string): HTMLElement {
  return h('div', { class: 'nm-reels', 'aria-label': text }, text.split('').map((c) => (/\d/.test(c) ? h('span', { class: 'nm-reel' }, c) : h('span', { class: 'nm-reel-sep' }, c))));
}

/** A calendar page for one month; the chosen day is marked. */
export function calendarPage(day: number | null, month: number, year: number, onPick?: (d: number) => void, showName = true): HTMLElement {
  const first = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  const n = daysInMonth(month, year);
  const cells: HTMLElement[] = DAYS.map((d) => h('span', { class: 'nm-cal-dow', lang: 'ms' }, d));
  for (let i = 0; i < first; i++) cells.push(h('span', { class: 'nm-cal-blank' }));
  for (let d = 1; d <= n; d++)
    cells.push(
      onPick
        ? h('button', { class: 'nm-cal-day' + (d === day ? ' on' : ''), type: 'button', onclick: () => onPick(d) }, String(d))
        : h('span', { class: 'nm-cal-day' + (d === day ? ' on' : '') }, String(d)),
    );
  return h(
    'div',
    { class: 'nm-cal' },
    h('div', { class: 'nm-cal-head' }, showName ? h('b', { lang: 'ms' }, `${MONTHS[month - 1]} ${year}`) : h('b', null, `${monthName(month)} ${year}`)),
    h('div', { class: 'nm-cal-grid' }, cells),
  );
}

/** The week from Ahad to Sabtu; today and an optional target day are marked. */
export function weekStrip(today: number | null, target: number | null, onPick?: (d: number) => void, names = true): HTMLElement {
  return h(
    'div',
    { class: 'nm-week' },
    DAYS.map((d, i) => {
      const cls = 'nm-week-day' + (i === today ? ' today' : '') + (i === target ? ' target' : '');
      const inner = [names ? h('b', { lang: 'ms' }, d) : h('b', null, dayName(i).slice(0, getLang() === 'ja' ? 1 : 3)), h('span', { class: 'nm-week-mark', 'aria-hidden': 'true' }, i === target ? '❓' : i === today ? '📍' : '')];
      return onPick ? h('button', { class: cls, type: 'button', onclick: () => onPick(i) }, inner) : h('span', { class: cls }, inner);
    }),
  );
}

// ---------------------------------------------------------------- charts

function blockRow(label: string, words: string[]): HTMLElement {
  return h('div', { class: 'nm-row' }, h('span', { class: 'nm-row-label' }, label), h('span', { class: 'nm-blocks' }, words.map((w) => h('span', { class: 'nm-block', lang: 'ms' }, w))));
}

function blocksChart(focus: 'nombor' | 'pecahan' | 'wang'): HTMLElement[] {
  const ones = [1, 2, 3, 4, 5, 6, 7, 8, 9];
  const numbers = h(
    'section',
    { class: 'nm-chart-sec' },
    h('h4', null, t('nm.chart.blocks')),
    blockRow('0', ['kosong', 'sifar']),
    blockRow('1–10', [...ones.map(numberToWords), 'sepuluh']),
    blockRow('11–19', ones.map((n) => numberToWords(10 + n))),
    blockRow('×10', ones.map((n) => numberToWords(n * 10))),
    blockRow('×100', ones.map((n) => numberToWords(n * 100))),
    blockRow('×1,000', [1, 2, 10, 11, 20, 100].map((n) => numberToWords(n * 1000))),
    blockRow('1,000,000', ['sejuta']),
    h('p', { class: 'small' }, t('nm.chart.zero')),
    h('p', { class: 'small' }, t('nm.chart.se')),
    h('p', { class: 'small' }, t('nm.chart.man')),
    h('p', { class: 'small' }, t('nm.chart.build')),
    h('div', { class: 'nm-build-example' }, h('b', null, '2,345 ='), ['dua ribu', 'tiga ratus', 'empat puluh', 'lima'].map((w, i) => h('span', { class: `nm-block nm-block-${i}`, lang: 'ms' }, w))),
  );
  const fractions = h(
    'section',
    { class: 'nm-chart-sec' },
    h('h4', null, t('nm.chart.fractions')),
    FRACTIONS.map((f) => h('div', { class: 'nm-row' }, h('span', { class: 'nm-row-label' }, f.sym), h('span', { lang: 'ms' }, f.reading.text, f.reading.variants.length ? h('span', { class: 'muted' }, ' · ' + f.reading.variants.map((v) => v.text).join(' · ')) : null))),
    h('div', { class: 'nm-row' }, h('span', { class: 'nm-row-label' }, '2.5'), h('span', { lang: 'ms' }, 'dua perpuluhan lima')),
    h('div', { class: 'nm-row' }, h('span', { class: 'nm-row-label' }, '50%'), h('span', { lang: 'ms' }, 'lima puluh peratus')),
  );
  const money = h(
    'section',
    { class: 'nm-chart-sec' },
    h('h4', null, t('nm.chart.money')),
    [50, 450, 1250, 125_000].map((c) => {
      const r = moneyReading(c);
      return h(
        'div',
        { class: 'nm-row' },
        h('span', { class: 'nm-row-label' }, formatMoney(c)),
        h('span', null, h('span', { lang: 'ms' }, r.text), r.variants.map((v) => h('span', { class: 'muted small' }, ` · ${t('nm.label.' + v.label)}: `, h('span', { lang: 'ms' }, v.text)))),
      );
    }),
  );
  return focus === 'pecahan' ? [fractions, numbers, money] : focus === 'wang' ? [money, numbers, fractions] : [numbers, fractions, money];
}

function clockChart(): HTMLElement[] {
  // A 24-hour ring with the proposed parts of the day.
  const ring = svg('svg', { viewBox: '-120 -120 240 240', width: 240, height: 240, class: 'nm-ring', role: 'img', 'aria-label': t('nm.chart.clock') });
  const arc = (from: number, to: number, r1: number, r2: number) => {
    const a1 = (from / 1440) * 2 * Math.PI;
    const a2 = ((to + 1) / 1440) * 2 * Math.PI;
    const large = a2 - a1 > Math.PI ? 1 : 0;
    const p = (a: number, r: number) => `${Math.sin(a) * r} ${-Math.cos(a) * r}`;
    return `M${p(a1, r2)} A${r2} ${r2} 0 ${large} 1 ${p(a2, r2)} L${p(a2, r1)} A${r1} ${r1} 0 ${large} 0 ${p(a1, r1)} Z`;
  };
  for (const p of DAY_PARTS) {
    if (p.part === 'tengah malam') continue;
    ring.append(svg('path', { d: arc(p.from, p.to, 62, 100), fill: PART_COLOR[p.part], opacity: 0.85 }));
    const mid = (((p.from + p.to) / 2 / 1440) * 2 * Math.PI);
    ring.append(svg('text', { x: Math.sin(mid) * 81, y: -Math.cos(mid) * 81 + 4, 'text-anchor': 'middle', class: 'nm-ring-label' }, p.part === 'tengah hari' ? 't. hari' : p.part));
  }
  for (const hr of [0, 6, 12, 18]) {
    const a = (hr / 24) * 2 * Math.PI;
    ring.append(svg('text', { x: Math.sin(a) * 112, y: -Math.cos(a) * 112 + 4, 'text-anchor': 'middle', class: 'nm-ring-hour' }, String(hr)));
  }
  ring.append(svg('text', { x: 0, y: -40, 'text-anchor': 'middle', class: 'nm-ring-mid' }, '🌌 0:00'), svg('text', { x: 0, y: -24, 'text-anchor': 'middle', class: 'nm-ring-mid', 'font-size': 10 }, 'tengah malam'), svg('text', { x: 0, y: 12, 'text-anchor': 'middle', class: 'nm-ring-mid' }, '24h'));
  const parts = h(
    'ul',
    { class: 'nm-parts' },
    (['pagi', 'tengah hari', 'petang', 'malam', 'tengah malam'] as DayPart[]).map((p) => {
      const span = DAY_PARTS.find((x) => x.part === p)!;
      const fmt = (min: number) => `${Math.floor(min / 60)}:${String(min % 60).padStart(2, '0')}`;
      return h('li', null, h('span', { 'aria-hidden': 'true' }, PART_ICON[p] + ' '), h('b', { lang: 'ms' }, p), ` ${t('nm.dp.' + p.replace(' ', '_'))} `, h('span', { class: 'muted small' }, p === 'tengah malam' ? '0:00' : `${fmt(span.from === 1 ? 0 : span.from)}–${fmt(span.to + 1)}`));
    }),
  );
  const quarters = clockFace(3, 15, 150);
  const examples = h(
    'ul',
    { class: 'nm-parts' },
    [[15, 0], [15, 15], [15, 30], [15, 20]].map(([hh, mm]) => h('li', null, h('span', { class: 'muted small' }, formatTime(hh, mm, getLang()) + ' '), h('b', { lang: 'ms' }, timeReading(hh, mm).text))),
  );
  return [
    h('section', { class: 'nm-chart-sec center' }, h('h4', null, t('nm.chart.clock')), ring, parts, h('p', { class: 'muted small' }, t('nm.parts_note'))),
    h('section', { class: 'nm-chart-sec center' }, h('h4', null, t('nm.chart.quarter')), quarters.el, examples, h('p', { class: 'small' }, t('nm.chart.pukul'))),
  ];
}

function calendarChart(): HTMLElement[] {
  const today = 3; // Rabu, as the example
  const rel = h(
    'div',
    { class: 'nm-rel' },
    [-2, -1, 0, 1, 2].map((o) =>
      h('div', { class: 'nm-rel-cell' + (o === 0 ? ' today' : '') }, h('span', { class: 'small muted' }, dayName((today + o + 7) % 7)), h('b', { lang: 'ms' }, RELATIVE[o]), h('span', { class: 'small' }, t('nm.rel.' + o))),
    ),
  );
  return [
    h(
      'section',
      { class: 'nm-chart-sec' },
      h('h4', null, t('nm.chart.week')),
      h('div', { class: 'nm-week nm-week-chart' }, DAYS.map((d, i) => h('span', { class: 'nm-week-day' }, h('b', { lang: 'ms' }, d), h('span', { class: 'small muted' }, dayName(i))))),
      h('h4', null, t('nm.chart.rel')),
      rel,
    ),
    h(
      'section',
      { class: 'nm-chart-sec' },
      h('h4', null, t('nm.chart.months')),
      h('div', { class: 'nm-months' }, MONTHS.map((m, i) => h('span', { class: 'nm-month' }, h('span', { class: 'small muted' }, String(i + 1)), h('b', { lang: 'ms' }, m)))),
      h('h4', null, t('nm.chart.date')),
      h('p', null, h('b', null, '15 Ogos 2026'), ' = ', h('span', { lang: 'ms' }, 'lima belas Ogos dua ribu dua puluh enam')),
      h('p', { class: 'small muted' }, `${t('nm.label.also')}: `, h('span', { lang: 'ms' }, 'lima belas haribulan Ogos dua ribu dua puluh enam')),
    ),
  ];
}

export function chartContent(id: ChartId, focus: 'nombor' | 'pecahan' | 'wang' = 'nombor'): HTMLElement {
  const body = id === 'blocks' ? blocksChart(focus) : id === 'clock' ? clockChart() : calendarChart();
  return h('div', { class: 'nm-chart', 'data-chart': id }, body);
}

/** For the clock explorer: the reading of a time plus its part-of-day icon. */
export function partIcon(h24: number, m: number): string {
  return PART_ICON[dayPart(h24, m)];
}
