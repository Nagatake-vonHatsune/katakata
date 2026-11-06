// Affix guard (spec 11.4): no ber- or me- words unless they are taught as
// chunks, lexicalised, recognise-only, or a look-alike root on the allow-list.

export const ALLOW_LIST = new Set([
  'berat', 'bersih', 'belok', 'belakang', 'belas', 'belum', 'beli', 'besar', 'bebas',
  'beliau', 'berus', 'merah', 'meja', 'meter', 'mesyuarat', 'mereka', 'mendung', 'menu',
  // Added 6 Nov 2026 (not in spec 11.4's list): a root that looks like be- + l, from Hanashishou's band 1-2 Malay deck.
  'belanja',
]);

const EXEMPT_TAGS = new Set(['chunk', 'chunk*', 'lex']);

/** True when a word has the shape of a ber-/be-/me- form. */
export function looksAffixed(word) {
  const w = word.toLowerCase();
  if (w.startsWith('ber')) return true;
  if (/^be[kl]/.test(w)) return true;
  // me-, mem-, men-, meng-, meny-: me followed by a consonant (so "Mei" is not caught)
  if (/^me[^aeiou\W]/.test(w)) return true;
  return false;
}

export function words(text) {
  return (text ?? '').match(/[A-Za-z][A-Za-z'-]*/g)?.map((w) => w.replace(/^[-']+|[-']+$/g, '')) ?? [];
}

/**
 * @param {Array<{kind:string,id:string,cards:any[],frames?:any[],scenario?:any}>} packs
 * @returns {{flags: Array<{id:string,source:string,word:string,text:string}>, passes: Array<{id:string,word:string,reason:string}>}}
 */
export function runAffixGuard(packs) {
  const exemptWords = new Set();
  for (const p of packs) {
    for (const c of p.cards) {
      if (EXEMPT_TAGS.has(c.affix_tag) || c.recognise_only) {
        for (const w of words(c.term)) exemptWords.add(w.toLowerCase());
      }
    }
  }
  const flags = [];
  const passes = [];
  const check = (id, source, text, card) => {
    for (const w of words(text)) {
      if (!looksAffixed(w)) continue;
      const lw = w.toLowerCase();
      let reason = null;
      if (card && (EXEMPT_TAGS.has(card.affix_tag) || card.recognise_only)) reason = `tagged ${card.affix_tag}`;
      else if (ALLOW_LIST.has(lw)) reason = 'allow-list root';
      else if (exemptWords.has(lw)) reason = 'in exempt chunk';
      if (reason) passes.push({ id, word: w, reason });
      else flags.push({ id, source, word: w, text });
    }
  };
  for (const p of packs) {
    for (const c of p.cards) check(c.id, 'card', c.term, c);
    for (const f of p.frames ?? []) {
      check(f.id, 'frame', f.frame);
      check(f.id, 'frame', f.example);
    }
    for (const l of p.scenario?.lines ?? []) check(l.id, 'scenario', l.ms);
  }
  return { flags, passes };
}
