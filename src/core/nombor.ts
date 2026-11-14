// Nombor & Masa: generators for Malay numbers, days, months and dates, fractions, decimals and percent,
// money and clock times, plus the questions the mode asks. Pure functions (no DOM), so every rule is unit-tested
// (tests/unit/nombor.test.ts).
//
// Malaysian standard forms only (Sam, 15 Nov 2026): standard first, spoken forms marked. The words come from the
// ledger rows of chapters 3 and 4 (L-0099 to L-0143, L-0157 to L-0181, L-0989 to L-0994, L-1032 to L-1044) and
// L-1410 «haribulan». Open questions for Sam are listed in docs/NOMBOR-MASA-report.md (the day-part boundaries,
// «kurang suku», «haribulan», the spelling of «pertiga» / «per tiga», «minit» after the minutes).

export type Rng = () => number;

/** How a variant reading is labelled in feedback. */
export type VariantLabel = 'spoken' | 'standard' | 'formal' | 'everyday' | 'also';

export interface Reading {
  /** The standard reading, shown first. */
  text: string;
  /** Label for the standard reading itself, when it has one (zero: «kosong» is everyday). */
  label?: VariantLabel;
  /** Other accepted readings, each labelled. */
  variants: Array<{ text: string; label: VariantLabel }>;
}

const reading = (text: string, variants: Reading['variants'] = [], label?: VariantLabel): Reading => ({ text, variants, label });

/** Every accepted form of a reading. */
export function accepted(r: Reading): string[] {
  return [r.text, ...r.variants.map((v) => v.text)];
}

// ---------------------------------------------------------------- numbers

export const ONES = ['kosong', 'satu', 'dua', 'tiga', 'empat', 'lima', 'enam', 'tujuh', 'lapan', 'sembilan'] as const;
export const MAX_NUMBER = 1_000_000;

function under100(n: number): string {
  if (n < 10) return ONES[n];
  if (n === 10) return 'sepuluh';
  if (n === 11) return 'sebelas';
  if (n < 20) return `${ONES[n - 10]} belas`;
  const tens = Math.floor(n / 10);
  const unit = n % 10;
  return `${ONES[tens]} puluh${unit ? ' ' + ONES[unit] : ''}`;
}

function under1000(n: number): string {
  const hundreds = Math.floor(n / 100);
  const rest = n % 100;
  const out: string[] = [];
  if (hundreds) out.push(hundreds === 1 ? 'seratus' : `${ONES[hundreds]} ratus`);
  if (rest) out.push(under100(rest));
  return out.join(' ');
}

/**
 * A whole number from 0 to 1,000,000 in words. Rules: se- replaces «satu» before puluh, belas, ratus, ribu and juta
 * (sepuluh, sebelas, seratus, seribu, sejuta); 12 to 19 are «X belas»; tens are «X puluh»; a zero digit is never said
 * inside a number; 0 alone is «kosong» (everyday; «sifar» is the formal form, see numberReading).
 */
export function numberToWords(n: number): string {
  if (!Number.isInteger(n) || n < 0 || n > MAX_NUMBER) throw new RangeError(`numberToWords: ${n}`);
  if (n === 0) return 'kosong';
  if (n === MAX_NUMBER) return 'sejuta';
  const thousands = Math.floor(n / 1000);
  const rest = n % 1000;
  const out: string[] = [];
  if (thousands) out.push(thousands === 1 ? 'seribu' : `${under1000(thousands)} ribu`);
  if (rest) out.push(under1000(rest));
  return out.join(' ');
}

export function numberReading(n: number): Reading {
  if (n === 0) return reading('kosong', [{ text: 'sifar', label: 'formal' }], 'everyday');
  return reading(numberToWords(n));
}

/** Reads number words back (used by the tests to check the generator by a second method). Returns NaN for unknown words. */
export function parseNumberWords(s: string): number {
  let total = 0;
  let cur = 0;
  let last = 0;
  for (const w of s.trim().split(/\s+/)) {
    const d = (ONES as readonly string[]).indexOf(w);
    if (w === 'sifar') { cur += 0; last = 0; }
    else if (d >= 0) { cur += d; last = d; }
    else if (w === 'sepuluh') { cur += 10; last = 0; }
    else if (w === 'sebelas') { cur += 11; last = 0; }
    else if (w === 'belas') { cur += 10; last = 0; }
    else if (w === 'puluh') { cur += last * 9; last = 0; }
    else if (w === 'seratus') { cur += 100; last = 0; }
    else if (w === 'ratus') { cur += last * 99; last = 0; }
    else if (w === 'seribu') { total += 1000; }
    else if (w === 'ribu') { total += cur * 1000; cur = 0; last = 0; }
    else if (w === 'sejuta') { total += 1_000_000; }
    else return NaN;
  }
  return total + cur;
}

/** 1234567 -> "1,234,567" (Malaysian and Japanese both group by thousands with commas). */
export function formatNumber(n: number): string {
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/** Number levels of part 1, in teaching order. */
export const NUMBER_LEVELS = [
  { id: 'n10', min: 0, max: 10 },
  { id: 'n19', min: 11, max: 19 },
  { id: 'n99', min: 20, max: 99 },
  { id: 'n999', min: 100, max: 999 },
  { id: 'n999k', min: 1000, max: 999_999 },
  { id: 'n1m', min: 100_000, max: 1_000_000 },
] as const;
export type NumberLevel = (typeof NUMBER_LEVELS)[number]['id'];

const int = (rng: Rng, min: number, max: number) => min + Math.floor(rng() * (max - min + 1));
const pick = <T,>(rng: Rng, arr: readonly T[]): T => arr[Math.floor(rng() * arr.length)];

export function randomNumber(rng: Rng, level: NumberLevel): number {
  const l = NUMBER_LEVELS.find((x) => x.id === level)!;
  if (level === 'n1m') return rng() < 0.4 ? MAX_NUMBER : pick(rng, [100_000, 250_000, 500_000, 750_000, 900_000, 999_999, int(rng, 100, 999) * 1000]);
  if (level === 'n999k') {
    // Mostly round-ish numbers people meet (prices, distances), sometimes any number.
    const r = rng();
    if (r < 0.3) return int(rng, 1, 99) * 1000;
    if (r < 0.6) return int(rng, 10, 999) * 100;
    if (r < 0.75) return pick(rng, [1000, 1001, 1100, 10_000, 11_000, 100_000, 101_000]);
    return int(rng, l.min, l.max);
  }
  return int(rng, l.min, l.max);
}

/** Wrong readings that target real confusions: belas against puluh, «satu» against se-, place value, digit order. */
export function numberDistractors(n: number, rng: Rng = Math.random): string[] {
  const right = numberToWords(n);
  const out = new Set<string>();
  // se- against satu: «satu ratus» for «seratus» (the classic learner slip). Not «satu juta», which is also heard.
  const seSwap = right.replace(/\bse(puluh|belas|ratus|ribu)\b/, (_, b) => `satu ${b}`);
  if (seSwap !== right) out.add(seSwap);
  // belas against puluh.
  if (/\bbelas\b/.test(right)) out.add(right.replace(/\bbelas\b/, 'puluh'));
  else if (/\bpuluh\b/.test(right) && !/\bsepuluh\b/.test(right)) out.add(right.replace(/(\w+) puluh(?: (\w+))?/, (_m, a) => `${a} belas`));
  // Place value: ratus against ribu.
  if (/\bratus\b/.test(right) && !/\bribu\b/.test(right)) out.add(right.replace(/\bratus\b/, 'ribu'));
  else if (/\bribu\b/.test(right)) out.add(right.replace(/\bribu\b/, 'ratus'));
  // Digit order (46 against 64) and neighbours.
  const near = [Number(String(n).split('').reverse().join('')), n + 1, n - 1, n + 10, n - 10, n * 10, Math.floor(n / 10), n + 2, n + 3];
  for (const m of near) if (m >= 0 && m <= MAX_NUMBER && m !== n) out.add(numberToWords(m));
  out.delete(right);
  if (n === 0) out.delete('sifar');
  return shuffled(rng, [...out]).slice(0, 6);
}

/** Wrong numbers for the reverse question (read the Malay, pick the number). */
export function numberValueDistractors(n: number, rng: Rng = Math.random): number[] {
  const out = new Set<number>();
  const s = String(n);
  if (n >= 11 && n <= 19) out.add((n - 10) * 10);
  if (n % 10 === 0 && n >= 20 && n <= 90) out.add(10 + n / 10);
  if (s.length > 1) out.add(Number(s.split('').reverse().join('')));
  out.add(n * 10 <= MAX_NUMBER ? n * 10 : Math.floor(n / 10));
  out.add(n + 1 <= MAX_NUMBER ? n + 1 : n - 2);
  out.add(n >= 10 ? n - 10 : n + 2);
  out.delete(n);
  for (let k = 3; out.size < 4; k++) out.add(n + k <= MAX_NUMBER ? n + k : n - k);
  return shuffled(rng, [...out].filter((x) => x >= 0 && x <= MAX_NUMBER)).slice(0, 6);
}

// ---------------------------------------------------------------- phone numbers

/** Phone numbers are read digit by digit; 0 is «kosong» (everyday). The groups follow the written groups. */
export function phoneToWords(phone: string): string {
  return phone
    .split(/[-\s]+/)
    .filter(Boolean)
    .map((g) => g.split('').map((d) => ONES[Number(d)]).join(' '))
    .join(', ');
}

export function randomPhone(rng: Rng): string {
  const prefix = pick(rng, ['012', '013', '016', '017', '019']);
  const digits = Array.from({ length: 7 }, () => int(rng, 0, 9)).join('');
  return `${prefix}-${digits.slice(0, 3)} ${digits.slice(3)}`;
}

export function phoneDistractors(phone: string, rng: Rng = Math.random): string[] {
  const right = phoneToWords(phone);
  const out = new Set<string>();
  const [prefix, a, b] = phone.split(/[-\s]+/);
  // Reading a group as a number instead of digit by digit (the target confusion).
  out.add([`kosong ${numberToWords(Number(prefix.slice(1)))}`, a.split('').map((d) => ONES[+d]).join(' '), b.split('').map((d) => ONES[+d]).join(' ')].join(', '));
  // Two digits swapped, one digit changed.
  const all = (prefix + a + b).split('');
  for (let tries = 0; out.size < 4 && tries < 20; tries++) {
    const d = all.slice();
    const i = int(rng, 3, d.length - 2);
    if (tries % 2) [d[i], d[i + 1]] = [d[i + 1], d[i]];
    else d[i] = String((Number(d[i]) + int(rng, 1, 8)) % 10);
    const p = `${d.slice(0, 3).join('')}-${d.slice(3, 6).join('')} ${d.slice(6).join('')}`;
    out.add(phoneToWords(p));
  }
  out.delete(right);
  return [...out];
}

// ---------------------------------------------------------------- days

/** Index = JavaScript getDay() (0 = Sunday). Sunday is «Ahad» in Malaysia. */
export const DAYS = ['Ahad', 'Isnin', 'Selasa', 'Rabu', 'Khamis', 'Jumaat', 'Sabtu'] as const;
/** Days relative to today; «kelmarin» (Ch4, L-0171's card ms-c04-017) is shown in the chart and used as a distractor. */
export const RELATIVE: Record<number, string> = { [-2]: 'kelmarin', [-1]: 'semalam', 0: 'hari ini', 1: 'esok', 2: 'lusa' };
export const RELATIVE_TAUGHT = [-1, 0, 1, 2] as const;

export const dayAfter = (day: number, offset: number) => (((day + offset) % 7) + 7) % 7;

// ---------------------------------------------------------------- months and dates

export const MONTHS = ['Januari', 'Februari', 'Mac', 'April', 'Mei', 'Jun', 'Julai', 'Ogos', 'September', 'Oktober', 'November', 'Disember'] as const;

export function daysInMonth(month: number, year: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/**
 * «15 Ogos 2026» = «lima belas Ogos dua ribu dua puluh enam»: day number, month name, year as a whole number.
 * Variant: «lima belas haribulan Ogos …» (the ledger's L-1410 «haribulan»; Sam's note on L-1032 writes «hari bulan»).
 */
export function dateReading(day: number, month: number, year: number): Reading {
  const d = numberToWords(day);
  const y = numberToWords(year);
  const m = MONTHS[month - 1];
  return reading(`${d} ${m} ${y}`, [{ text: `${d} haribulan ${m} ${y}`, label: 'also' }]);
}

export function formatDateMs(day: number, month: number, year: number): string {
  return `${day} ${MONTHS[month - 1]} ${year}`;
}

export function randomDate(rng: Rng): [number, number, number] {
  const year = int(rng, 2000, 2035);
  const month = int(rng, 1, 12);
  return [int(rng, 1, daysInMonth(month, year)), month, year];
}

export function dateDistractors(day: number, month: number, year: number, rng: Rng = Math.random): string[] {
  const right = dateReading(day, month, year).text;
  const out = new Set<string>();
  const nextMonth = (month % 12) + 1;
  const safeDay = (d: number, m: number) => Math.min(d, daysInMonth(m, year));
  out.add(dateReading(safeDay(day, nextMonth), nextMonth, year).text);
  const prevMonth = ((month + 10) % 12) + 1;
  out.add(dateReading(safeDay(day, prevMonth), prevMonth, year).text);
  // Day digits swapped (12 against 21) or belas against puluh.
  const swapped = Number(String(day).padStart(2, '0').split('').reverse().join(''));
  if (swapped >= 1 && swapped <= daysInMonth(month, year) && swapped !== day) out.add(dateReading(swapped, month, year).text);
  if (day >= 11 && day <= 19) out.add(right.replace(/\bbelas\b/, 'puluh'));
  out.add(dateReading(day, month, year + pick(rng, [1, -1, 10])).text);
  out.delete(right);
  return shuffled(rng, [...out]).slice(0, 5);
}

// ---------------------------------------------------------------- fractions, decimals, percent

export interface Fraction {
  id: string;
  sym: string;
  num: number;
  den: number;
  reading: Reading;
}

/**
 * Fractions: the spellings follow Sam's brief (15 Nov 2026): «satu pertiga», «dua pertiga», «satu perempat», «tiga perempat».
 * The ledger (L-0141) writes «satu per tiga / sepertiga»; both are accepted, the difference is an open question for Sam.
 */
export const FRACTIONS: Fraction[] = [
  { id: 'half', sym: '½', num: 1, den: 2, reading: reading('setengah', [{ text: 'separuh', label: 'also' }]) },
  { id: 'third', sym: '⅓', num: 1, den: 3, reading: reading('satu pertiga', [{ text: 'satu per tiga', label: 'also' }, { text: 'sepertiga', label: 'also' }]) },
  { id: 'twothirds', sym: '⅔', num: 2, den: 3, reading: reading('dua pertiga', [{ text: 'dua per tiga', label: 'also' }]) },
  { id: 'quarter', sym: '¼', num: 1, den: 4, reading: reading('suku', [{ text: 'satu perempat', label: 'also' }]) },
  { id: 'threequarters', sym: '¾', num: 3, den: 4, reading: reading('tiga suku', [{ text: 'tiga perempat', label: 'also' }]) },
];

/** Decimals: whole part in words, «perpuluhan», then each digit after the point one by one (2.5 = «dua perpuluhan lima»). */
export function decimalReading(value: string): Reading {
  const [whole, frac] = value.split('.');
  const digits = frac.split('').map((d) => ONES[Number(d)]).join(' ');
  if (Number(whole) === 0) return reading(`kosong perpuluhan ${digits}`, [{ text: `sifar perpuluhan ${digits}`, label: 'formal' }], 'everyday');
  return reading(`${numberToWords(Number(whole))} perpuluhan ${digits}`);
}

/** «lima puluh peratus» = 50%; a decimal percent reads the decimal first (2.5% = «dua perpuluhan lima peratus»). */
export function percentReading(value: string): Reading {
  const base = value.includes('.') ? decimalReading(value) : numberReading(Number(value));
  return reading(`${base.text} peratus`, base.variants.map((v) => ({ ...v, text: `${v.text} peratus` })), base.label);
}

export function randomDecimal(rng: Rng): string {
  const whole = rng() < 0.1 ? 0 : int(rng, 1, 20);
  const frac = rng() < 0.7 ? String(int(rng, 1, 9)) : String(int(rng, 1, 9)) + String(int(rng, 1, 9));
  return `${whole}.${frac}`;
}

export const PERCENTS = ['5', '10', '15', '20', '25', '30', '40', '50', '60', '70', '75', '80', '90', '100', '2.5', '12.5'] as const;

export function decimalDistractors(value: string, rng: Rng = Math.random): string[] {
  const [whole, frac] = value.split('.');
  const right = decimalReading(value).text;
  const out = new Set<string>();
  // The point dropped: 2.5 read as 25 (the target confusion).
  const joined = Number(whole + frac);
  if (joined <= MAX_NUMBER) out.add(numberToWords(joined));
  if (whole.length === 1 && frac.length === 1 && whole !== '0') out.add(decimalReading(`${frac}.${whole}`).text);
  if (frac.length === 1) out.add(decimalReading(`${whole}.0${frac}`).text);
  // The digits after the point read as a number (3.14 read as «tiga perpuluhan empat belas»).
  if (frac.length === 2 && frac[0] !== '0') out.add(`${numberToWords(Number(whole))} perpuluhan ${numberToWords(Number(frac))}`);
  out.add(decimalReading(`${Number(whole) + 1}.${frac}`).text);
  out.add(`${numberToWords(Number(whole) || 1)} peratus ${frac.split('').map((d) => ONES[+d]).join(' ')}`);
  out.delete(right);
  for (const v of decimalReading(value).variants) out.delete(v.text);
  return shuffled(rng, [...out]).slice(0, 5);
}

export function percentDistractors(value: string, rng: Rng = Math.random): string[] {
  const right = percentReading(value).text;
  const out = new Set<string>();
  if (!value.includes('.')) {
    for (const s of numberDistractors(Number(value), rng)) out.add(`${s} peratus`);
  } else {
    for (const s of decimalDistractors(value, rng)) out.add(`${s} peratus`);
  }
  if (value === '50') out.add('setengah peratus');
  out.delete(right);
  return shuffled(rng, [...out].filter((s) => !/peratus .*peratus/.test(s))).slice(0, 5);
}

// ---------------------------------------------------------------- money

/** «RM4.50» = «empat ringgit lima puluh sen» (standard); «empat ringgit setengah» is accepted and labelled spoken. */
export function moneyReading(cents: number): Reading {
  if (!Number.isInteger(cents) || cents <= 0 || cents > 100 * MAX_NUMBER) throw new RangeError(`moneyReading: ${cents}`);
  const rm = Math.floor(cents / 100);
  const sen = cents % 100;
  const parts: string[] = [];
  if (rm) parts.push(`${numberToWords(rm)} ringgit`);
  if (sen) parts.push(`${numberToWords(sen)} sen`);
  const variants: Reading['variants'] = rm && sen === 50 ? [{ text: `${numberToWords(rm)} ringgit setengah`, label: 'spoken' }] : [];
  return reading(parts.join(' '), variants);
}

export function formatMoney(cents: number): string {
  const rm = Math.floor(cents / 100);
  return `RM${formatNumber(rm)}.${String(cents % 100).padStart(2, '0')}`;
}

export const MONEY_MIN = 50;
export const MONEY_MAX = 125_000;

export function randomMoney(rng: Rng): number {
  const r = rng();
  if (r < 0.15) return int(rng, 10, 19) * 5; // sen only, 50 to 95 sen
  if (r < 0.3) return int(rng, 1, 20) * 100 + 50; // x ringgit 50 sen (the spoken «setengah» case)
  if (r < 0.65) return int(rng, 1, 99) * 100 + int(rng, 0, 19) * 5;
  if (r < 0.9) return int(rng, 100, 999) * 100 + pick(rng, [0, 0, 50, 90]);
  return pick(rng, [1000_00, 1100_00, 1200_00, 1250_00, int(rng, 1000, 1250) * 100]);
}

export function moneyDistractors(cents: number, rng: Rng = Math.random): string[] {
  const r = moneyReading(cents);
  const right = r.text;
  const rm = Math.floor(cents / 100);
  const sen = cents % 100;
  const out = new Set<string>();
  // 4.50 against 4.05 (the sen read as a single digit).
  if (rm && sen % 10 === 0 && sen) out.add(moneyReading(rm * 100 + sen / 10).text);
  if (rm && sen && sen < 10) out.add(moneyReading(rm * 100 + sen * 10).text);
  // Ringgit and sen swapped.
  if (rm && sen && rm < 100 && sen < 100) out.add(`${numberToWords(sen)} ringgit ${numberToWords(rm)} sen`);
  // belas / puluh and se- / satu on the ringgit part.
  if (rm) for (const d of numberDistractors(rm, rng).slice(0, 3)) out.add(right.replace(new RegExp(`^${numberToWords(rm)} ringgit`), `${d} ringgit`));
  if (!rm) for (const d of numberDistractors(sen, rng).slice(0, 3)) out.add(`${d} sen`);
  // Sen read as ringgit.
  if (!rm) out.add(`${numberToWords(sen)} ringgit`);
  out.delete(right);
  for (const v of r.variants) out.delete(v.text);
  return shuffled(rng, [...out]).slice(0, 5);
}

export function moneyValueDistractors(cents: number, rng: Rng = Math.random): number[] {
  const rm = Math.floor(cents / 100);
  const sen = cents % 100;
  const out = new Set<number>();
  if (rm && sen % 10 === 0 && sen) out.add(rm * 100 + sen / 10);
  if (rm && sen && sen < 10) out.add(rm * 100 + sen * 10);
  if (rm && rm < 100 && sen && sen < 100) out.add(sen * 100 + rm);
  for (const m of numberValueDistractors(rm || sen, rng).slice(0, 3)) out.add(rm ? m * 100 + sen : m);
  out.add(rm ? cents + 100 : cents * 100);
  out.add(rm > 1 ? cents - 100 : cents + 5);
  out.delete(cents);
  return shuffled(rng, [...out].filter((x) => x >= 1 && x <= MONEY_MAX * 10)).slice(0, 5);
}

// ---------------------------------------------------------------- time

export type DayPart = 'pagi' | 'tengah hari' | 'petang' | 'malam' | 'tengah malam';

/**
 * PROPOSED boundaries (Claude's draft, 15 Nov 2026; Sam to confirm, see the report): 12:00 midnight exactly is
 * «tengah malam»; 00:01 to 11:59 «pagi»; 12:00 to 13:59 «tengah hari»; 14:00 to 18:59 «petang»; 19:00 to 23:59 «malam».
 */
export const DAY_PARTS: Array<{ part: DayPart; from: number; to: number }> = [
  { part: 'tengah malam', from: 0, to: 0 },
  { part: 'pagi', from: 1, to: 11 * 60 + 59 },
  { part: 'tengah hari', from: 12 * 60, to: 13 * 60 + 59 },
  { part: 'petang', from: 14 * 60, to: 18 * 60 + 59 },
  { part: 'malam', from: 19 * 60, to: 23 * 60 + 59 },
];

export function dayPart(h24: number, m: number): DayPart {
  const t = h24 * 60 + m;
  return DAY_PARTS.find((p) => t >= p.from && t <= p.to)!.part;
}

/**
 * Hours used in quiz questions: well inside each part, so no question depends on a boundary Sam has not settled.
 * The clock can still be dragged to any time; the reading then uses the proposed boundaries above.
 */
export const QUIZ_HOURS: Record<Exclude<DayPart, 'tengah malam'>, number[]> = {
  pagi: [6, 7, 8, 9, 10],
  'tengah hari': [12],
  petang: [15, 16, 17],
  malam: [20, 21, 22],
};

/**
 * «pukul» + hour (1 to 12) + minutes + part of the day. :15 is «suku» (also «lima belas minit»), :30 is «setengah»
 * (also «tiga puluh», both standard, Sam 15 Nov 2026), other minutes are «N minit». «kurang suku» is left out
 * (no reliable source checked yet), and there is no 24-hour reading. Never «jam» for the clock time.
 */
export function timeReading(h24: number, m: number): Reading {
  if (!Number.isInteger(h24) || h24 < 0 || h24 > 23 || !Number.isInteger(m) || m < 0 || m > 59) throw new RangeError(`timeReading: ${h24}:${m}`);
  const part = dayPart(h24, m);
  const hour = numberToWords(h24 % 12 || 12);
  if (m === 0) return reading(`pukul ${hour} ${part}`);
  if (m === 15) return reading(`pukul ${hour} suku ${part}`, [{ text: `pukul ${hour} lima belas minit ${part}`, label: 'standard' }]);
  if (m === 30) return reading(`pukul ${hour} setengah ${part}`, [{ text: `pukul ${hour} tiga puluh ${part}`, label: 'standard' }]);
  return reading(`pukul ${hour} ${numberToWords(m)} minit ${part}`);
}

/** "3:30 pm" (en) or "15:30" (ja). Digits on screen only; nothing here is spoken. */
export function formatTime(h24: number, m: number, lang: string): string {
  const mm = String(m).padStart(2, '0');
  if (lang === 'ja') return `${h24}:${mm}`;
  return `${h24 % 12 || 12}:${mm} ${h24 < 12 ? 'am' : 'pm'}`;
}

export function randomTime(rng: Rng): [number, number] {
  const r = rng();
  if (r < 0.05) return [0, 0];
  const part = pick(rng, Object.keys(QUIZ_HOURS) as Array<keyof typeof QUIZ_HOURS>);
  const h = pick(rng, QUIZ_HOURS[part]);
  const m = rng() < 0.55 ? pick(rng, [0, 15, 30]) : pick(rng, [5, 10, 20, 25, 35, 40, 45, 50, 55]);
  return [h, m];
}

const OTHER_PART: Record<DayPart, DayPart[]> = {
  pagi: ['petang', 'malam'],
  'tengah hari': ['tengah malam', 'petang'],
  petang: ['malam', 'pagi'],
  malam: ['petang', 'pagi'],
  'tengah malam': ['tengah hari', 'petang'],
};

export function timeDistractors(h24: number, m: number, rng: Rng = Math.random): string[] {
  const r = timeReading(h24, m);
  const part = dayPart(h24, m);
  const out: string[] = [];
  const swapPart = (s: string, to: DayPart) => s.replace(new RegExp(`${part}$`), to);
  // suku against setengah.
  if (m === 15) out.push(r.text.replace(' suku ', ' setengah '));
  if (m === 30) out.push(r.text.replace(' setengah ', ' suku '));
  // petang against malam (and the other near parts).
  out.push(swapPart(r.text, OTHER_PART[part][0]));
  // belas against puluh in the minutes.
  if (m >= 20 && m % 10 === 0) out.push(r.text.replace(/(\w+) puluh minit/, (_x, a) => `${a} belas minit`));
  if (m >= 11 && m <= 19 && m !== 15) out.push(r.text.replace(/belas minit/, 'puluh minit'));
  // Hour and minutes swapped, hour off by one, the other part.
  const hour = h24 % 12 || 12;
  if ((m === 5 || m === 10) && m !== hour) out.push(`pukul ${numberToWords(m)} ${numberToWords(hour)} minit ${part}`);
  const nh = (h24 + 1) % 24;
  out.push(timeReading(nh, m).text.replace(/ (pagi|tengah hari|petang|malam|tengah malam)$/, ` ${part}`));
  out.push(swapPart(r.text, OTHER_PART[part][1]));
  const all = new Set(out);
  for (const a of accepted(r)) all.delete(a);
  const list = [...all];
  // Keep the targeted confusions first, then shuffle the rest.
  return [...list.slice(0, 2), ...shuffled(rng, list.slice(2))].slice(0, 5);
}

// ---------------------------------------------------------------- questions

export type PartId = 'nombor' | 'hari' | 'bulan' | 'pecahan' | 'wang' | 'masa';
export const PARTS: PartId[] = ['nombor', 'hari', 'bulan', 'pecahan', 'wang', 'masa'];
export type ChartId = 'blocks' | 'clock' | 'calendar';
export const PART_CHART: Record<PartId, ChartId> = { nombor: 'blocks', hari: 'calendar', bulan: 'calendar', pecahan: 'blocks', wang: 'blocks', masa: 'clock' };

/** What the question shows, or what an option shows. The view draws each kind (a clock, a price tag, a calendar page …). */
export type Shown =
  | { kind: 'number'; n: number }
  | { kind: 'phone'; phone: string }
  | { kind: 'day'; day: number }
  | { kind: 'relative'; today: number; offset: number }
  | { kind: 'month'; month: number }
  | { kind: 'date'; day: number; month: number; year: number }
  | { kind: 'fraction'; id: string }
  | { kind: 'decimal'; value: string }
  | { kind: 'percent'; value: string }
  | { kind: 'money'; cents: number }
  | { kind: 'time'; h: number; m: number }
  | { kind: 'ms'; text: string };

export interface Question {
  part: PartId;
  /** read: see the thing, pick the Malay. pick: read the Malay, pick the thing. build: build the Malay from blocks. */
  dir: 'read' | 'pick' | 'build';
  shown: Shown;
  options: Shown[];
  answer: number;
  reading: Reading;
  /** build: the blocks, shuffled (the reading's words plus two decoys). */
  blocks?: string[];
  chart: ChartId;
}

export function shuffled<T>(rng: Rng, arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function choose(rng: Rng, right: Shown, wrong: Shown[]): { options: Shown[]; answer: number } {
  const key = (s: Shown) => JSON.stringify(s);
  const seen = new Set([key(right)]);
  const picked: Shown[] = [];
  for (const w of wrong) {
    if (picked.length === 3) break;
    if (seen.has(key(w))) continue;
    seen.add(key(w));
    picked.push(w);
  }
  if (picked.length < 3) throw new Error(`not enough distractors for ${key(right)}`);
  const options = shuffled(rng, [right, ...picked]);
  return { options, answer: options.findIndex((o) => key(o) === key(right)) };
}

const ms = (text: string): Shown => ({ kind: 'ms', text });
const cap = (s: string) => s[0].toUpperCase() + s.slice(1);

function readQ(part: PartId, rng: Rng, shown: Shown, r: Reading, wrong: string[]): Question {
  const bad = new Set(accepted(r));
  const { options, answer } = choose(rng, ms(r.text), wrong.filter((w) => !bad.has(w)).map(ms));
  return { part, dir: 'read', shown, options, answer, reading: r, chart: PART_CHART[part] };
}

function pickQ(part: PartId, rng: Rng, right: Shown, r: Reading, wrong: Shown[], showVariant = false): Question {
  const shown = ms(showVariant && r.variants.length ? r.variants[0].text : r.text);
  const { options, answer } = choose(rng, right, wrong);
  return { part, dir: 'pick', shown, options, answer, reading: r, chart: PART_CHART[part] };
}

const DECOYS: Record<string, string[]> = { puluh: ['belas'], belas: ['puluh'], ratus: ['ribu'], ribu: ['ratus'], seratus: ['satu'], seribu: ['satu'], sepuluh: ['satu'], sebelas: ['satu'], ringgit: ['sen'], sen: ['ringgit'] };

function buildQ(part: PartId, rng: Rng, shown: Shown, r: Reading): Question {
  const words = r.text.split(' ');
  const decoys = new Set<string>();
  for (const w of words) for (const d of DECOYS[w] ?? []) if (!words.includes(d)) decoys.add(d);
  for (const d of shuffled(rng, ['belas', 'puluh', 'ratus', 'ribu', 'satu', 'dua'])) if (decoys.size < 2 && !words.includes(d)) decoys.add(d);
  return { part, dir: 'build', shown, options: [], answer: -1, reading: r, blocks: shuffled(rng, [...words, ...[...decoys].slice(0, 2)]), chart: PART_CHART[part] };
}

/** Does a built answer match? Any accepted reading counts (the spoken one is labelled in feedback). */
export function buildMatches(q: Question, built: string[]): boolean {
  return accepted(q.reading).includes(built.join(' '));
}

export function numberQuestion(rng: Rng, level: NumberLevel, dir: Question['dir']): Question {
  if (level === 'n10' && dir === 'read' && rng() < 0.3) {
    const phone = randomPhone(rng);
    return readQ('nombor', rng, { kind: 'phone', phone }, reading(phoneToWords(phone)), phoneDistractors(phone, rng));
  }
  const n = randomNumber(rng, level);
  const r = numberReading(n);
  if (dir === 'build' && r.text.includes(' ')) return buildQ('nombor', rng, { kind: 'number', n }, r);
  if (dir === 'pick') return pickQ('nombor', rng, { kind: 'number', n }, r, numberValueDistractors(n, rng).map((x) => ({ kind: 'number', n: x })));
  return readQ('nombor', rng, { kind: 'number', n }, r, numberDistractors(n, rng));
}

export function dayQuestion(rng: Rng, dir: Question['dir']): Question {
  const today = int(rng, 0, 6);
  if (rng() < 0.5) {
    const offset = pick(rng, RELATIVE_TAUGHT);
    if (dir === 'pick') {
      // «Hari ini hari Isnin. Lusa hari apa?»: read the Malay, pick the day it points to.
      const target = dayAfter(today, offset);
      const word = RELATIVE[offset];
      const r = reading(`${cap(word)} hari ${DAYS[target]}.`);
      const wrong = shuffled(rng, [-2, -1, 0, 1, 2, 3].filter((o) => o !== offset)).map((o) => ({ kind: 'day' as const, day: dayAfter(today, o) }));
      const { options, answer } = choose(rng, { kind: 'day', day: target }, wrong);
      return { part: 'hari', dir: 'pick', shown: ms(`Hari ini hari ${DAYS[today]}. ${cap(word)} hari apa?`), options, answer, reading: r, chart: 'calendar' };
    }
    const r = reading(RELATIVE[offset]);
    const wrong = [-2, -1, 0, 1, 2].filter((o) => o !== offset).map((o) => RELATIVE[o]);
    return readQ('hari', rng, { kind: 'relative', today, offset }, r, shuffled(rng, wrong));
  }
  const r = reading(DAYS[today]);
  const near = [1, -1, 2, -2, 3].map((o) => dayAfter(today, o));
  if (dir === 'pick') return pickQ('hari', rng, { kind: 'day', day: today }, r, near.map((d) => ({ kind: 'day', day: d })));
  return readQ('hari', rng, { kind: 'day', day: today }, r, near.map((d) => DAYS[d]));
}

/** Months often mixed up: neighbours and look-alikes (Jun / Julai, Mac / Mei, September … Disember). */
const MONTH_CONFUSIONS: Record<number, number[]> = { 1: [2, 6], 2: [1, 11], 3: [5, 4], 4: [3, 8], 5: [3, 6], 6: [7, 1], 7: [6, 8], 8: [4, 7], 9: [11, 12], 10: [9, 11], 11: [9, 12], 12: [11, 10] };

export function monthQuestion(rng: Rng, dir: Question['dir']): Question {
  if (rng() < 0.4) {
    const month = int(rng, 1, 12);
    const r = reading(MONTHS[month - 1]);
    const wrong = [...MONTH_CONFUSIONS[month], (month % 12) + 1, ((month + 10) % 12) + 1, ((month + 1) % 12) + 1, ((month + 9) % 12) + 1];
    if (dir === 'pick') return pickQ('bulan', rng, { kind: 'month', month }, r, wrong.map((m) => ({ kind: 'month', month: m })));
    return readQ('bulan', rng, { kind: 'month', month }, r, wrong.map((m) => MONTHS[m - 1]));
  }
  const [d, m, y] = randomDate(rng);
  const r = dateReading(d, m, y);
  if (dir === 'pick') {
    const wrong: Shown[] = [];
    const nm = MONTH_CONFUSIONS[m][0];
    wrong.push({ kind: 'date', day: Math.min(d, daysInMonth(nm, y)), month: nm, year: y });
    const sw = Number(String(d).padStart(2, '0').split('').reverse().join(''));
    if (sw >= 1 && sw <= daysInMonth(m, y) && sw !== d) wrong.push({ kind: 'date', day: sw, month: m, year: y });
    if (d >= 11 && d <= 19 && (d - 10) * 10 <= daysInMonth(m, y)) wrong.push({ kind: 'date', day: (d - 10) * 10, month: m, year: y });
    wrong.push({ kind: 'date', day: d, month: m, year: y + 1 }, { kind: 'date', day: Math.max(1, d - 1), month: m, year: y }, { kind: 'date', day: Math.min(d, 28), month: MONTH_CONFUSIONS[m][1], year: y });
    return pickQ('bulan', rng, { kind: 'date', day: d, month: m, year: y }, r, wrong, rng() < 0.3);
  }
  return readQ('bulan', rng, { kind: 'date', day: d, month: m, year: y }, r, dateDistractors(d, m, y, rng));
}

export function fractionQuestion(rng: Rng, dir: Question['dir']): Question {
  const kind = pick(rng, ['fraction', 'fraction', 'decimal', 'percent'] as const);
  if (kind === 'fraction') {
    const f = pick(rng, FRACTIONS);
    const others = shuffled(rng, FRACTIONS.filter((x) => x.id !== f.id));
    // suku against setengah first.
    const first = f.id === 'quarter' ? 'half' : f.id === 'half' ? 'quarter' : f.id === 'threequarters' ? 'quarter' : null;
    const ordered = first ? [FRACTIONS.find((x) => x.id === first)!, ...others.filter((x) => x.id !== first)] : others;
    if (dir === 'pick') return pickQ('pecahan', rng, { kind: 'fraction', id: f.id }, f.reading, ordered.map((x) => ({ kind: 'fraction', id: x.id })));
    return readQ('pecahan', rng, { kind: 'fraction', id: f.id }, f.reading, ordered.map((x) => x.reading.text));
  }
  if (kind === 'decimal') {
    const v = randomDecimal(rng);
    const r = decimalReading(v);
    if (dir === 'pick') {
      const [w, f] = v.split('.');
      const wrong = [`${w}${f}`, `${f}.${w}`, `${Number(w) + 1}.${f}`, ...(f.length === 1 ? [`${w}.0${f}`] : [])];
      return pickQ('pecahan', rng, { kind: 'decimal', value: v }, r, wrong.filter((x) => x !== v).map((x) => (x.includes('.') ? { kind: 'decimal', value: x } : { kind: 'number', n: Number(x) })));
    }
    return readQ('pecahan', rng, { kind: 'decimal', value: v }, r, decimalDistractors(v, rng));
  }
  const v = pick(rng, PERCENTS);
  const r = percentReading(v);
  if (dir === 'pick') {
    const wrong = shuffled(rng, PERCENTS.filter((x) => x !== v)).slice(0, 3);
    const n = Number(v);
    const conf = n >= 20 && n <= 90 && n % 10 === 0 ? [String(10 + n / 10)] : n > 10 && n < 20 ? [String((n - 10) * 10)] : [];
    return pickQ('pecahan', rng, { kind: 'percent', value: v }, r, [...conf, ...wrong].map((x) => ({ kind: 'percent', value: x })));
  }
  return readQ('pecahan', rng, { kind: 'percent', value: v }, r, percentDistractors(v, rng));
}

export function moneyQuestion(rng: Rng, dir: Question['dir']): Question {
  const cents = randomMoney(rng);
  const r = moneyReading(cents);
  if (dir === 'build') return buildQ('wang', rng, { kind: 'money', cents }, r);
  if (dir === 'pick') return pickQ('wang', rng, { kind: 'money', cents }, r, moneyValueDistractors(cents, rng).map((c) => ({ kind: 'money', cents: c })), r.variants.length > 0 && rng() < 0.5);
  return readQ('wang', rng, { kind: 'money', cents }, r, moneyDistractors(cents, rng));
}

export function timeQuestion(rng: Rng, dir: Question['dir']): Question {
  const [h, m] = randomTime(rng);
  const r = timeReading(h, m);
  if (dir === 'pick') {
    const part = dayPart(h, m);
    const wrong: Shown[] = [];
    if (m === 15) wrong.push({ kind: 'time', h, m: 30 });
    if (m === 30) wrong.push({ kind: 'time', h, m: 15 });
    // The same hour in the other half of the day (petang against malam, pagi against petang).
    wrong.push({ kind: 'time', h: (h + 12) % 24, m });
    if (part === 'petang') wrong.push({ kind: 'time', h: h + 4 <= 23 ? h + 4 : h - 4, m });
    if (part === 'malam') wrong.push({ kind: 'time', h: h - 4, m });
    wrong.push({ kind: 'time', h: (h + 1) % 24, m }, { kind: 'time', h, m: (m + 15) % 60 }, { kind: 'time', h: (h + 23) % 24, m });
    return pickQ('masa', rng, { kind: 'time', h, m }, r, wrong, rng() < 0.3);
  }
  return readQ('masa', rng, { kind: 'time', h, m }, r, timeDistractors(h, m, rng));
}

/** One round of a part: 8 questions, mostly "read", some "pick", and a "build" where the part has one. */
export function round(part: PartId, rng: Rng = Math.random, level: NumberLevel = 'n10', size = 8): Question[] {
  const dirs: Question['dir'][] = ['read', 'read', 'pick', 'read', 'pick', 'read', 'read', 'pick'];
  if (part === 'nombor' && level !== 'n10') dirs[5] = 'build';
  if (part === 'wang') dirs[5] = 'build';
  const make = (dir: Question['dir']): Question => {
    switch (part) {
      case 'nombor': return numberQuestion(rng, level, dir);
      case 'hari': return dayQuestion(rng, dir);
      case 'bulan': return monthQuestion(rng, dir);
      case 'pecahan': return fractionQuestion(rng, dir);
      case 'wang': return moneyQuestion(rng, dir);
      case 'masa': return timeQuestion(rng, dir);
    }
  };
  const out: Question[] = [];
  const seen = new Set<string>();
  for (let i = 0; out.length < size && i < size * 6; i++) {
    const q = make(dirs[out.length % dirs.length]);
    const k = q.reading.text;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(q);
  }
  return out;
}

/** Every Malay string a question can show or speak (for the Indonesian-form check). */
export function questionStrings(q: Question): string[] {
  const out = [...accepted(q.reading)];
  if (q.shown.kind === 'ms') out.push(q.shown.text);
  for (const o of q.options) if (o.kind === 'ms') out.push(o.text);
  if (q.blocks) out.push(q.blocks.join(' '));
  return out;
}

/**
 * Indonesian forms this mode must never produce. Kata-Kata's own list for numbers and time, checked in addition to the
 * shared stage rules' disallowed forms (content/rules/stage-rules.json, which this repo does not edit): «nol», the
 * Indonesian month spellings, «Minggu» as a day name, «persen», and «jam» before an hour as the clock time.
 */
export const INDONESIAN_NUMBER_FORMS: Array<[RegExp, string]> = [
  [/\bnol\b/i, 'kosong / sifar'],
  [/\bmaret\b/i, 'Mac'],
  [/\bjuni\b/i, 'Jun'],
  [/\bjuli\b/i, 'Julai'],
  [/\bagustus\b/i, 'Ogos'],
  [/\bdesember\b/i, 'Disember'],
  [/\bpersen\b/i, 'peratus'],
  [/\b(hari )?minggu\b/i, 'Ahad (Sunday); «minggu» is "week"'],
  [/\bjam (satu|dua|tiga|empat|lima|enam|tujuh|lapan|sembilan|sepuluh|sebelas)\b/i, 'pukul'],
];

export function indonesianForms(text: string): string[] {
  return INDONESIAN_NUMBER_FORMS.filter(([re]) => re.test(text)).map(([re, good]) => `${re.source} (use ${good})`);
}
