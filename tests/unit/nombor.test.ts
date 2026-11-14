// Nombor & Masa generators (src/core/nombor.ts): every number 0 to 1,000,000 by rule, fixed fixtures, every
// 5-minute time across the day, money, fractions, decimals, percent and dates, the questions, and the
// Indonesian-form checks (the shared stage rules' disallowed forms plus this mode's own list).
import { describe, expect, it } from 'vitest';
import { Checker } from '../../tools/stage-rules.mjs';
import en from '../../i18n/en.json';
import ja from '../../i18n/ja.json';
import msUi from '../../i18n/ms.json';
import {
  accepted, buildMatches, DAY_PARTS, dateReading, DAYS, dayPart, decimalReading, FRACTIONS, formatMoney, formatNumber,
  formatTime, indonesianForms, MAX_NUMBER, moneyReading, MONTHS, numberReading, numberToWords, parseNumberWords,
  PARTS, percentReading, PERCENTS, phoneToWords, questionStrings, RELATIVE, round, timeReading, NUMBER_LEVELS,
  type Question, type Rng,
} from '../../src/core/nombor';

/** Small seeded generator (mulberry32) so failures are reproducible. */
function seeded(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const ONES = ['satu', 'dua', 'tiga', 'empat', 'lima', 'enam', 'tujuh', 'lapan', 'sembilan'];

/** An independent statement of the rules, written differently from the generator (recursive, by groups). */
function byRule(n: number): string {
  if (n === 0) return 'kosong';
  if (n === 1_000_000) return 'sejuta';
  const group = (k: number, unit: string, se: string): string => (k === 1 ? se : `${byRule(k)} ${unit}`);
  if (n >= 1000) return [group(Math.floor(n / 1000), 'ribu', 'seribu'), n % 1000 ? byRule(n % 1000) : ''].filter(Boolean).join(' ');
  if (n >= 100) return [group(Math.floor(n / 100), 'ratus', 'seratus'), n % 100 ? byRule(n % 100) : ''].filter(Boolean).join(' ');
  if (n >= 20) return [`${ONES[Math.floor(n / 10) - 1]} puluh`, n % 10 ? ONES[(n % 10) - 1] : ''].filter(Boolean).join(' ');
  if (n >= 12) return `${ONES[n - 11]} belas`;
  if (n === 11) return 'sebelas';
  if (n === 10) return 'sepuluh';
  return ONES[n - 1];
}

describe('numbers 0 to 1,000,000', () => {
  it.each([
    [0, 'kosong'],
    [11, 'sebelas'],
    [19, 'sembilan belas'],
    [20, 'dua puluh'],
    [21, 'dua puluh satu'],
    [100, 'seratus'],
    [101, 'seratus satu'],
    [110, 'seratus sepuluh'],
    [111, 'seratus sebelas'],
    [999, 'sembilan ratus sembilan puluh sembilan'],
    [1000, 'seribu'],
    [1001, 'seribu satu'],
    [10_000, 'sepuluh ribu'],
    [100_000, 'seratus ribu'],
    [999_999, 'sembilan ratus sembilan puluh sembilan ribu sembilan ratus sembilan puluh sembilan'],
    [1_000_000, 'sejuta'],
    // More fixtures: teens and se- inside the thousands, zeros never said.
    [10, 'sepuluh'],
    [12, 'dua belas'],
    [200, 'dua ratus'],
    [205, 'dua ratus lima'],
    [1010, 'seribu sepuluh'],
    [1100, 'seribu seratus'],
    [11_000, 'sebelas ribu'],
    [12_500, 'dua belas ribu lima ratus'],
    [21_000, 'dua puluh satu ribu'],
    [101_000, 'seratus satu ribu'],
    [110_011, 'seratus sepuluh ribu sebelas'],
  ])('%i -> %s', (n, words) => expect(numberToWords(n)).toBe(words));

  it('zero shows both: kosong (everyday) and sifar (formal)', () => {
    const r = numberReading(0);
    expect(r.text).toBe('kosong');
    expect(r.label).toBe('everyday');
    expect(r.variants).toEqual([{ text: 'sifar', label: 'formal' }]);
  });

  it('every value 0 to 1,000,000 matches the rules, reads back, and never says satu before a unit', () => {
    const bad: string[] = [];
    for (let n = 0; n <= MAX_NUMBER; n++) {
      const w = numberToWords(n);
      if (w !== byRule(n)) bad.push(`${n}: ${w} (rule: ${byRule(n)})`);
      else if (parseNumberWords(w) !== n) bad.push(`${n}: ${w} reads back as ${parseNumberWords(w)}`);
      // A group never starts with «satu» + unit (seribu, not satu ribu); «dua puluh satu ribu» and «seratus satu ribu» are fine.
      else if (/(^|\bribu )satu (puluh|belas|ratus|ribu|juta)\b/.test(w)) bad.push(`${n}: ${w} has satu + unit`);
      else if (n > 0 && /\b(kosong|sifar)\b/.test(w)) bad.push(`${n}: ${w} says zero inside a number`);
      if (bad.length > 5) break;
    }
    expect(bad).toEqual([]);
  });

  it('rejects values outside the range', () => {
    expect(() => numberToWords(-1)).toThrow();
    expect(() => numberToWords(1_000_001)).toThrow();
    expect(() => numberToWords(2.5)).toThrow();
  });

  it('formats with thousands commas', () => {
    expect(formatNumber(1250)).toBe('1,250');
    expect(formatNumber(1_000_000)).toBe('1,000,000');
    expect(formatNumber(999)).toBe('999');
  });

  it('phone numbers are read digit by digit, zero as kosong', () => {
    expect(phoneToWords('012-345 6789')).toBe('kosong satu dua, tiga empat lima, enam tujuh lapan sembilan');
    expect(phoneToWords('019-000 1010')).toBe('kosong satu sembilan, kosong kosong kosong, satu kosong satu kosong');
  });
});

describe('days, months, dates', () => {
  it('Malaysian day names, Sunday is Ahad', () => {
    expect(DAYS).toEqual(['Ahad', 'Isnin', 'Selasa', 'Rabu', 'Khamis', 'Jumaat', 'Sabtu']);
    expect(RELATIVE[-1]).toBe('semalam');
    expect(RELATIVE[0]).toBe('hari ini');
    expect(RELATIVE[1]).toBe('esok');
    expect(RELATIVE[2]).toBe('lusa');
  });
  it('Malaysian month spellings', () => {
    expect(MONTHS).toEqual(['Januari', 'Februari', 'Mac', 'April', 'Mei', 'Jun', 'Julai', 'Ogos', 'September', 'Oktober', 'November', 'Disember']);
  });
  it('15 Ogos 2026 = lima belas Ogos dua ribu dua puluh enam, haribulan as the variant', () => {
    const r = dateReading(15, 8, 2026);
    expect(r.text).toBe('lima belas Ogos dua ribu dua puluh enam');
    expect(r.variants).toEqual([{ text: 'lima belas haribulan Ogos dua ribu dua puluh enam', label: 'also' }]);
  });
  it.each([
    [1, 1, 2000, 'satu Januari dua ribu'],
    [31, 12, 1999, 'tiga puluh satu Disember seribu sembilan ratus sembilan puluh sembilan'],
    [11, 3, 2011, 'sebelas Mac dua ribu sebelas'],
    [20, 6, 2035, 'dua puluh Jun dua ribu tiga puluh lima'],
    [10, 7, 2010, 'sepuluh Julai dua ribu sepuluh'],
  ])('%i/%i/%i -> %s', (d, m, y, text) => expect(dateReading(d, m, y).text).toBe(text));
  it('every day of every month of 2024 (a leap year) reads back', () => {
    for (let m = 1; m <= 12; m++)
      for (let d = 1; d <= new Date(Date.UTC(2024, m, 0)).getUTCDate(); d++) {
        const [dayWords] = dateReading(d, m, 2024).text.split(` ${MONTHS[m - 1]} `);
        expect(parseNumberWords(dayWords)).toBe(d);
      }
  });
});

describe('fractions, decimals, percent', () => {
  it('fractions, with the ledger spellings accepted', () => {
    const f = Object.fromEntries(FRACTIONS.map((x) => [x.sym, accepted(x.reading)]));
    expect(f['½']).toEqual(['setengah', 'separuh']);
    expect(f['⅓']).toEqual(['satu pertiga', 'satu per tiga', 'sepertiga']);
    expect(f['⅔']).toEqual(['dua pertiga', 'dua per tiga']);
    expect(f['¼']).toEqual(['suku', 'satu perempat']);
    expect(f['¾']).toEqual(['tiga suku', 'tiga perempat']);
  });
  it.each([
    ['2.5', 'dua perpuluhan lima'],
    ['3.14', 'tiga perpuluhan satu empat'],
    ['12.05', 'dua belas perpuluhan kosong lima'],
    ['0.5', 'kosong perpuluhan lima'],
  ])('%s -> %s', (v, text) => expect(decimalReading(v).text).toBe(text));
  it('0.5 also shows sifar (formal)', () => expect(decimalReading('0.5').variants).toEqual([{ text: 'sifar perpuluhan lima', label: 'formal' }]));
  it.each([
    ['50', 'lima puluh peratus'],
    ['100', 'seratus peratus'],
    ['15', 'lima belas peratus'],
    ['2.5', 'dua perpuluhan lima peratus'],
    ['12.5', 'dua belas perpuluhan lima peratus'],
  ])('%s%% -> %s', (v, text) => expect(percentReading(v).text).toBe(text));
});

describe('money', () => {
  it.each([
    [50, 'lima puluh sen', 'RM0.50'],
    [450, 'empat ringgit lima puluh sen', 'RM4.50'],
    [405, 'empat ringgit lima sen', 'RM4.05'],
    [100, 'satu ringgit', 'RM1.00'],
    [1250, 'dua belas ringgit lima puluh sen', 'RM12.50'],
    [10_000, 'seratus ringgit', 'RM100.00'],
    [125_000, 'seribu dua ratus lima puluh ringgit', 'RM1,250.00'],
    [99_995, 'sembilan ratus sembilan puluh sembilan ringgit sembilan puluh lima sen', 'RM999.95'],
  ])('%i sen -> %s', (cents, text, shown) => {
    expect(moneyReading(cents).text).toBe(text);
    expect(formatMoney(cents)).toBe(shown);
  });
  it('RM4.50: «empat ringgit setengah» is accepted and labelled spoken', () => {
    expect(moneyReading(450).variants).toEqual([{ text: 'empat ringgit setengah', label: 'spoken' }]);
    expect(moneyReading(50).variants).toEqual([]);
    expect(moneyReading(455).variants).toEqual([]);
  });
  it('every amount RM0.05 to RM1,250.00 in 5 sen steps reads back', () => {
    for (let c = 5; c <= 125_000; c += 5) {
      const t = moneyReading(c).text;
      const m = t.match(/^(?:(.+) ringgit)?(?: ?(.+) sen)?$/)!;
      expect((m[1] ? parseNumberWords(m[1]) * 100 : 0) + (m[2] ? parseNumberWords(m[2]) : 0)).toBe(c);
    }
  });
});

describe('clock times', () => {
  it.each([
    [15, 30, 'pukul tiga setengah petang', ['pukul tiga tiga puluh petang']],
    [16, 15, 'pukul empat suku petang', ['pukul empat lima belas minit petang']],
    [8, 0, 'pukul lapan pagi', []],
    [9, 5, 'pukul sembilan lima minit pagi', []],
    [12, 0, 'pukul dua belas tengah hari', []],
    [0, 0, 'pukul dua belas tengah malam', []],
    [21, 45, 'pukul sembilan empat puluh lima minit malam', []],
    [13, 10, 'pukul satu sepuluh minit tengah hari', []],
  ])('%i:%i -> %s', (h, m, text, variants) => {
    const r = timeReading(h, m);
    expect(r.text).toBe(text);
    expect(r.variants.map((v) => v.text)).toEqual(variants);
  });

  it('every 5 minutes of the day: pukul + 12-hour clock + minutes + the (proposed) part of the day', () => {
    const parts = new Set<string>();
    for (let h = 0; h < 24; h++)
      for (let m = 0; m < 60; m += 5) {
        const r = timeReading(h, m);
        const part = dayPart(h, m);
        parts.add(part);
        expect(r.text.startsWith('pukul ')).toBe(true);
        expect(r.text.endsWith(` ${part}`)).toBe(true);
        const body = r.text.slice('pukul '.length, -part.length - 1);
        const h12 = h % 12 || 12;
        const hourWords = numberToWords(h12);
        expect(body.startsWith(hourWords)).toBe(true);
        const rest = body.slice(hourWords.length).trim();
        if (m === 0) expect(rest).toBe('');
        else if (m === 15) expect(rest).toBe('suku');
        else if (m === 30) expect(rest).toBe('setengah');
        else expect(rest).toBe(`${numberToWords(m)} minit`);
        // No 24-hour reading (the hour said is 1 to 12), no «jam» for the clock time.
        expect(parseNumberWords(hourWords)).toBe(h12);
        expect(h12).toBeLessThanOrEqual(12);
        expect(accepted(r).join(' ')).not.toMatch(/\bjam\b/);
      }
    expect([...parts].sort()).toEqual(['malam', 'pagi', 'petang', 'tengah hari', 'tengah malam']);
  });

  it('the proposed day parts cover every minute exactly once', () => {
    for (let t = 0; t < 24 * 60; t++) expect(DAY_PARTS.filter((p) => t >= p.from && t <= p.to)).toHaveLength(1);
    expect(dayPart(0, 0)).toBe('tengah malam');
    expect(dayPart(0, 5)).toBe('pagi');
    expect(dayPart(11, 55)).toBe('pagi');
    expect(dayPart(13, 55)).toBe('tengah hari');
    expect(dayPart(14, 0)).toBe('petang');
    expect(dayPart(18, 55)).toBe('petang');
    expect(dayPart(19, 0)).toBe('malam');
  });

  it('formats the time on screen as 12-hour (en) or 24-hour digits (ja)', () => {
    expect(formatTime(15, 30, 'en')).toBe('3:30 pm');
    expect(formatTime(0, 0, 'en')).toBe('12:00 am');
    expect(formatTime(12, 5, 'en')).toBe('12:05 pm');
    expect(formatTime(15, 30, 'ja')).toBe('15:30');
  });
});

describe('questions', () => {
  const rounds: Question[] = [];
  for (let seed = 1; seed <= 60; seed++)
    for (const part of PARTS)
      for (const level of part === 'nombor' ? NUMBER_LEVELS.map((l) => l.id) : (['n10'] as const)) rounds.push(...round(part, seeded(seed * 31 + part.length), level));

  it('every round has 8 questions, four distinct options, the answer among them', () => {
    expect(rounds.length).toBe(60 * (6 + 5) * 8);
    for (const q of rounds) {
      if (q.dir === 'build') {
        expect(q.blocks!.length).toBeGreaterThanOrEqual(q.reading.text.split(' ').length + 1);
        expect(buildMatches(q, q.reading.text.split(' '))).toBe(true);
        continue;
      }
      expect(q.options).toHaveLength(4);
      expect(new Set(q.options.map((o) => JSON.stringify(o))).size).toBe(4);
      expect(q.answer).toBeGreaterThanOrEqual(0);
      const right = q.options[q.answer];
      if (q.dir === 'read') {
        expect(right).toEqual({ kind: 'ms', text: q.reading.text });
        // No distractor is another accepted form of the right reading.
        for (const o of q.options) if (o !== right && o.kind === 'ms') expect(accepted(q.reading)).not.toContain(o.text);
      }
    }
  });

  it('distractors target the named confusions', () => {
    const texts = (pred: (q: Question) => boolean) => rounds.filter(pred).flatMap((q) => q.options.map((o) => (o.kind === 'ms' ? o.text : '')));
    // belas against puluh
    expect(texts((q) => q.part === 'nombor' && /belas/.test(q.reading.text)).some((t) => /puluh/.test(t))).toBe(true);
    // se- against satu
    expect(texts((q) => q.part === 'nombor' && /\bseratus\b/.test(q.reading.text)).some((t) => /satu ratus/.test(t))).toBe(true);
    // suku against setengah
    expect(texts((q) => q.part === 'masa' && /suku/.test(q.reading.text)).some((t) => /setengah/.test(t))).toBe(true);
    // petang against malam
    expect(texts((q) => q.part === 'masa' && /petang$/.test(q.reading.text)).some((t) => /malam$/.test(t))).toBe(true);
  });

  it('a built answer matches only an accepted reading', () => {
    const q = rounds.find((x) => x.dir === 'build' && x.part === 'wang')!;
    expect(buildMatches(q, q.reading.text.split(' '))).toBe(true);
    expect(buildMatches(q, q.reading.text.split(' ').reverse())).toBe(q.reading.text.split(' ').length === 1);
  });

  it('every generated string passes the shared Indonesian-form check and this mode\'s own list', () => {
    const strings = new Set<string>();
    for (const q of rounds) for (const s of questionStrings(q)) strings.add(s);
    // Plus everything the generators can say: all times, fractions, percents, months, days, a sweep of numbers and money.
    for (let h = 0; h < 24; h++) for (let m = 0; m < 60; m += 5) accepted(timeReading(h, m)).forEach((s) => strings.add(s));
    FRACTIONS.forEach((f) => accepted(f.reading).forEach((s) => strings.add(s)));
    PERCENTS.forEach((p) => accepted(percentReading(p)).forEach((s) => strings.add(s)));
    for (let m = 1; m <= 12; m++) accepted(dateReading(28, m, 2026)).forEach((s) => strings.add(s));
    [...DAYS, ...Object.values(RELATIVE)].forEach((s) => strings.add(s));
    for (let c = 50; c <= 125_000; c += 1235) accepted(moneyReading(c)).forEach((s) => strings.add(s));
    // Numbers: all the words and word pairs any number 0 to 1,000,000 can contain (complete for one- and two-word forms).
    const pairs = new Set<string>();
    for (let n = 0; n <= MAX_NUMBER; n += n < 2000 ? 1 : 997) {
      const w = numberToWords(n).split(' ');
      w.forEach((x, i) => pairs.add(i ? `${w[i - 1]} ${x}` : x));
    }
    pairs.forEach((p) => strings.add(p));

    const checker = new Checker();
    const segments = [...strings].map((text, i) => ({ unit: 'nombor-masa', chapter: null, source: `gen|${i}`, text, kind: 'model' }));
    const result = checker.inspect(segments);
    const malaysian = Object.values(result.violations as Record<string, { check: string; term: string }>).filter((v) => v.check === 'malaysian-form');
    expect(malaysian).toEqual([]);
    const own = [...strings].map((s) => [s, indonesianForms(s)] as const).filter(([, f]) => f.length);
    expect(own).toEqual([]);
    expect(strings.size).toBeGreaterThan(1000);
  });

  it('the mode\'s own list catches the Indonesian forms it names', () => {
    for (const s of ['nol', 'Maret', 'Juni', 'Juli', 'Agustus', 'Desember', 'hari Minggu', 'lima puluh persen', 'jam tiga'])
      expect(indonesianForms(s).length).toBeGreaterThan(0);
    expect(indonesianForms('dua jam')).toEqual([]);
  });

  it('the mode\'s Malay interface text passes both checks', () => {
    const keys = Object.keys(msUi).filter((k) => k.startsWith('nm.'));
    expect(keys.length).toBeGreaterThan(20);
    const texts = keys.map((k) => (msUi as Record<string, string>)[k]);
    const checker = new Checker();
    const result = checker.inspect(texts.map((text, i) => ({ unit: 'nombor-masa-ui', chapter: null, source: `ui|${i}`, text, kind: 'model' })));
    expect(Object.values(result.violations as Record<string, { check: string }>).filter((v) => v.check === 'malaysian-form')).toEqual([]);
    // «minggu» (week) is fine in prose; the own-list check is for generated readings, so only the clear forms here.
    expect(texts.filter((s) => /\b(nol|persen|maret|juni|juli|agustus|desember)\b/i.test(s))).toEqual([]);
  });

  it('every nm.* key exists in en, ja and ms (hooks: en and ja)', () => {
    const e = Object.keys(en).filter((k) => k.startsWith('nm.'));
    const j = new Set(Object.keys(ja));
    const m = new Set(Object.keys(msUi));
    expect(e.filter((k) => !j.has(k))).toEqual([]);
    expect(e.filter((k) => !k.startsWith('nm.hook.') && !m.has(k))).toEqual([]);
  });
});
