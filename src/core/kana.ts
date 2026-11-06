// Katakana pronunciation hints for Malay (spec 7). Rule-based and approximate:
// Malay spelling is regular enough for a hint, but a hint is only a crutch, so
// the app fades it after a word's first few appearances.

const VOWELS = 'aeiou';

// Onset consonant + vowel -> kana. Index order: a, e, i, o, u.
const ROWS: Record<string, [string, string, string, string, string]> = {
  '': ['ア', 'エ', 'イ', 'オ', 'ウ'],
  k: ['カ', 'ケ', 'キ', 'コ', 'ク'],
  g: ['ガ', 'ゲ', 'ギ', 'ゴ', 'グ'],
  s: ['サ', 'セ', 'シ', 'ソ', 'ス'],
  z: ['ザ', 'ゼ', 'ジ', 'ゾ', 'ズ'],
  t: ['タ', 'テ', 'ティ', 'ト', 'トゥ'],
  d: ['ダ', 'デ', 'ディ', 'ド', 'ドゥ'],
  n: ['ナ', 'ネ', 'ニ', 'ノ', 'ヌ'],
  h: ['ハ', 'ヘ', 'ヒ', 'ホ', 'フ'],
  b: ['バ', 'ベ', 'ビ', 'ボ', 'ブ'],
  p: ['パ', 'ペ', 'ピ', 'ポ', 'プ'],
  f: ['ファ', 'フェ', 'フィ', 'フォ', 'フ'],
  v: ['ヴァ', 'ヴェ', 'ヴィ', 'ヴォ', 'ヴ'],
  m: ['マ', 'メ', 'ミ', 'モ', 'ム'],
  y: ['ヤ', 'イェ', 'イ', 'ヨ', 'ユ'],
  r: ['ラ', 'レ', 'リ', 'ロ', 'ル'],
  l: ['ラ', 'レ', 'リ', 'ロ', 'ル'],
  w: ['ワ', 'ウェ', 'ウィ', 'ウォ', 'ウ'],
  c: ['チャ', 'チェ', 'チ', 'チョ', 'チュ'],
  j: ['ジャ', 'ジェ', 'ジ', 'ジョ', 'ジュ'],
  sy: ['シャ', 'シェ', 'シ', 'ショ', 'シュ'],
  ny: ['ニャ', 'ニェ', 'ニ', 'ニョ', 'ニュ'],
  ng: ['ンガ', 'ンゲ', 'ンギ', 'ンゴ', 'ング'],
  kh: ['ハ', 'ヘ', 'ヒ', 'ホ', 'フ'],
  gh: ['ガ', 'ゲ', 'ギ', 'ゴ', 'グ'],
};

// A consonant closing a syllable (no vowel after it).
const CODA: Record<string, string> = {
  k: 'ッ', t: 'ッ', p: 'ッ', b: 'ッ', d: 'ッ', g: 'ッ', q: 'ッ',
  n: 'ン', ng: 'ン', m: 'ム', s: 'ス', r: 'ル', l: 'ル', h: '', f: 'フ', z: 'ズ', x: 'クス', v: 'ヴ', kh: '', sy: 'シュ',
};

const DIGRAPHS = ['ng', 'ny', 'sy', 'kh', 'gh'];

function vowelIndex(v: string): number {
  return 'aeiou'.indexOf(v) === -1 ? 0 : ['a', 'e', 'i', 'o', 'u'].indexOf(v);
}

function wordToKana(word: string): string {
  const w = word.toLowerCase().replace(/q/g, 'k').replace(/x/g, 'ks');
  let out = '';
  let i = 0;
  const readCons = (at: number): string => {
    for (const d of DIGRAPHS) if (w.startsWith(d, at)) return d;
    const ch = w[at];
    return ch && !VOWELS.includes(ch) && /[a-z]/.test(ch) ? ch : '';
  };
  while (i < w.length) {
    const cons = readCons(i);
    const afterCons = i + cons.length;
    const v = w[afterCons];
    if (v && VOWELS.includes(v)) {
      const row = ROWS[cons] ?? ROWS[''];
      out += row[vowelIndex(v)];
      // Long vowels written twice (maaf) stay as two kana: マアフ.
      i = afterCons + 1;
      continue;
    }
    if (!cons) {
      i++;
      continue;
    }
    // Coda consonant.
    const next = readCons(afterCons);
    const nextIsVowel = w[afterCons + next.length] !== undefined && VOWELS.includes(w[afterCons + next.length]);
    if (cons === next && nextIsVowel) out += 'ッ';
    else if (cons === 'm' && next && 'pbm'.includes(next)) out += 'ン';
    else out += CODA[cons] ?? '';
    i = afterCons;
  }
  return out;
}

export function toKana(term: string): string {
  return term
    .replace(/\(.*?\)/g, ' ')
    .split(/\s*\/\s*/)
    .map((alt) =>
      alt
        .split(/[\s-]+/)
        .map((part) => part.replace(/[^A-Za-z]/g, ''))
        .filter(Boolean)
        .map(wordToKana)
        .join(' '),
    )
    .filter(Boolean)
    .join(' ／ ');
}

export type PronTip = 'final' | 'rl' | 'e' | 'ng';

/** Which of the four pronunciation points (spec 7) apply to a term. */
export function pronTips(term: string): PronTip[] {
  const words = term.toLowerCase().replace(/\(.*?\)/g, ' ').match(/[a-z]+/g) ?? [];
  const tips = new Set<PronTip>();
  for (const w of words) {
    if (/[kptsmnlrh]$/.test(w) && !/ng$/.test(w)) tips.add('final');
    if (/[rl]/.test(w)) tips.add('rl');
    if (/e/.test(w)) tips.add('e');
    if (/ng|ny/.test(w)) tips.add('ng');
  }
  return [...tips].slice(0, 2);
}
