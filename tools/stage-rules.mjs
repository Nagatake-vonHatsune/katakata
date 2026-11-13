// Stage-aware Malay checks: a JavaScript port of Cikgu Sensai's `language_checks.py` Checker
// (affix gates, whole words, look-alike roots, register pairs, particles, disallowed forms).
//
// The rules are data, shared with Cikgu Sensai: content/rules/stage-rules.json is an unedited copy of
// Cikgu Sensai's curriculum/stage-rules.json (the commit is recorded in content/rules/SOURCE.json).
// Never edit the copy to make content pass; a rule change needs Sam's approval in Cikgu Sensai first.
//
// Differences from the Python reader, by design (Kata-Kata has its own data):
// - the ledger is Kata-Kata's snapshot (content/ledger/malay-ledger.csv), not Cikgu Sensai's copy;
// - the "pinned chapter files" are Kata-Kata's own Kelas packs (content/ms/kelas/cNN.json);
// - there is no mentions file (Kata-Kata has no ‹…› mention spans); callers may pass one.
// Everything else follows the Python line by line, so both give the same verdicts on the shared fixtures
// (content/rules/stage-rules-fixtures.json, run by tests/unit/stage-rules.test.ts).

import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const readJson = (p) => JSON.parse(readFileSync(p, 'utf8'));

const PROPER = new Set('a b c d emi farah osaka jepun pj shah alam kl sentral pasar seni aki mei qr rm am pm'.split(' '));
const NUMBERS = new Set('sifar kosong satu dua tiga empat lima enam tujuh lapan sembilan sepuluh sebelas belas puluh ratus ribu juta'.split(' '));
const CHUNK_TAGS = new Set(['chunk', 'chunk*', 'lex']);
const TAG_FAMILY = { 'ber-': 'ber-', 'meN-': 'meN-', '-kan': '-kan', '-i': '-i', 'ter-': 'ter-', 'di-': 'di-' };
const PLACE_NOTE = /(?:moved from|reviewed in|reused|was|waits for)\s+Ch\s*\d+/gi;
const UNPREFIX = [
  ['menge', ['']], ['meny', ['s']], ['meng', ['', 'k']], ['mem', ['', 'p']], ['men', ['', 't']], ['me', ['']],
  ['di', ['']], ['ber', ['']], ['be', ['']], ['ter', ['']],
];

export function tokens(s) {
  return (s ?? '').toLowerCase().match(/[a-z]+(?:[-'][a-z]+)*/g) ?? [];
}
export const norm = (s) => tokens(s).join(' ');
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const wordRe = (phrase) => new RegExp(`(?<!\\w)${esc(phrase)}(?!\\w)`);
const key = (unit, check, term) => [unit, check, term].join('|');

/** Chapter from the ledger place column only; notes and retired rows never place a row. */
export function placedChapter(place) {
  if (place.trim().toLowerCase().startsWith('retired')) return null;
  const found = [...place.replace(PLACE_NOTE, '').matchAll(/Ch\s*(\d+)/g)].map((m) => Number(m[1]));
  return found.length ? Math.min(...found) : null;
}

/** Minimal RFC 4180 CSV reader (quoted fields, doubled quotes, CRLF). Returns objects keyed by the header. */
export function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') { row.push(field); field = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(field); rows.push(row); row = []; field = '';
    } else field += ch;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  const [header, ...body] = rows.filter((r) => r.length > 1 || r[0]);
  return body.map((r) => Object.fromEntries(header.map((h, i) => [h, r[i] ?? ''])));
}

export function loadRules(dir = join(ROOT, 'content', 'rules')) {
  return {
    rules: readJson(join(dir, 'stage-rules.json')),
    names: readJson(join(dir, 'malay-proper-nouns.json')).names,
  };
}

export function loadLedger(file = join(ROOT, 'content', 'ledger', 'malay-ledger.csv')) {
  return parseCsv(readFileSync(file, 'utf8'));
}

/** Kata-Kata's Kelas packs, as {chapter, cards}. */
export function loadKelas(dir = join(ROOT, 'content', 'ms', 'kelas')) {
  return readdirSync(dir)
    .filter((f) => /^c\d\d\.json$/.test(f))
    .sort()
    .map((f) => ({ chapter: Number(f.slice(1, 3)), cards: readJson(join(dir, f)).cards }));
}

export class Checker {
  /**
   * @param {{rules?: any, names?: string[], ledger?: any[], kelas?: {chapter:number,cards:any[]}[], mentions?: Record<string,string>}} [opts]
   */
  constructor(opts = {}) {
    const loaded = opts.rules ? { rules: opts.rules, names: opts.names ?? [] } : loadRules();
    const rules = loaded.rules;
    const ledger = opts.ledger ?? loadLedger();
    const kelas = opts.kelas ?? loadKelas();
    /** @type {Map<string, any[]>} */
    this.entries = new Map();
    /** @type {Map<string, any[]>} */
    this.cards = new Map();
    /** @type {Array<[string, number]>} */
    this.chunks = [];
    const push = (m, k, v) => (m.has(k) ? m.get(k).push(v) : m.set(k, [v]));
    for (const r of ledger) {
      const row = { ...r, _chapter: placedChapter(r['Kata-Kata place']) };
      for (const form of row.Malay.replace(/\([^)]*\)/g, '').split('/')) if (norm(form)) push(this.entries, norm(form), row);
    }
    for (const { chapter, cards } of kelas) {
      for (const c of cards) {
        for (const v of c.term.split(' / ')) {
          push(this.cards, norm(v), c);
          if (CHUNK_TAGS.has(c.affix_tag) || c.recognise_only) this.chunks.push([norm(v), chapter]);
        }
      }
    }
    const ledgerChunks = new Set();
    for (const [t, rows] of this.entries)
      for (const r of rows)
        if (CHUNK_TAGS.has(r['Affix tag']) && r._chapter !== null && r['Review status'] !== 'Retired') ledgerChunks.add(`${r._chapter}\u0000${t}`);
    for (const k of ledgerChunks) {
      const [ch, t] = k.split('\u0000');
      this.chunks.push([t, Number(ch)]);
    }
    this.gates = Object.fromEntries(rules.affix_gates.map((g) => [g.family, g.chapter]));
    this.disallowed = { ...rules.disallowed_forms };
    this.pairs = rules.register_pairs.map((p) => [p.spoken, p.standard, p.from_chapter]);
    this.particles = rules.particles.map((p) => p.form);
    this.notParticle = new Set(rules.particles.flatMap((p) => p.not_particle ?? []));
    this.wholeWords = rules.whole_words.map((w) => [w.form, w.chapter]);
    this.superlatives = new Set(rules.ter_superlatives);
    const look = rules.lookalike_roots;
    this.roots = new Set([...look.kata_kata_allow_list.split(/\s+/).filter(Boolean), ...look.sam_local]);
    this.mentions = Object.fromEntries(Object.entries(opts.mentions ?? {}).map(([k, v]) => [norm(k), v]));
    this.proper = new Set([...PROPER, ...loaded.names.flatMap((n) => tokens(n))]);
    this.maxlen = Math.max(...[...this.entries.keys()].map((t) => t.split(' ').length));
    this.known = new Set([...this.entries.keys(), ...this.cards.keys(), ...this.roots]);
  }

  rowsOf(t) { return this.entries.get(t) ?? []; }
  cardsOf(t) { return this.cards.get(t) ?? []; }

  compositional(term, parts) {
    return this.rowsOf(term).every((r) => r._chapter === null) && parts.every((t) => this.entries.has(t));
  }
  knownBy(term, ch) { return this.rowsOf(term).some((r) => r._chapter !== null && r._chapter <= ch); }
  noun(t) {
    return this.cardsOf(t).some((c) => ['n', 'noun', 'counter', 'num'].includes(c.pos)) ||
      this.rowsOf(t).some((r) => ['n', 'noun', 'counter'].includes(r.POS));
  }
  isAdj(t) { return this.cardsOf(t).some((c) => c.pos === 'adj'); }
  isVerb(t) { return this.cardsOf(t).some((c) => c.pos === 'v'); }

  /** Productive Stage 1 forms only after their rule; the root is checked separately. Returns [base, rule] or null. */
  derivation(w, ch) {
    if (ch === null) return null;
    const g = this.gates;
    if (w.startsWith('ke') && NUMBERS.has(w.slice(2)) && ch >= g['ke- ordinal']) return [w.slice(2), 'ke- ordinal'];
    if (w.endsWith('nya') && w.length > 4 && ch >= g['-nya'] && (this.entries.has(w.slice(0, -3)) || this.cards.has(w.slice(0, -3)) || w === 'ceritanya'))
      return [w.slice(0, -3), '-nya'];
    if (w.endsWith('kah') && w.length > 4 && ch >= g['-kah']) return [w.slice(0, -3), '-kah'];
    if (w.startsWith('se') && w.length > 3) {
      const base = w.slice(2);
      if (this.noun(base)) return [base, 'se- noun; base chapter checked separately'];
      if (ch >= g['se- comparison'] && this.knownBy(base, ch) && this.isAdj(base)) return [base, 'se- comparison'];
    }
    if (w.startsWith('di') && ch >= g['di-'] && this.knownBy(w.slice(2), ch)) return [w.slice(2), 'di- passive'];
    if (w.startsWith('ter') && ch >= g['ter- superlative'] && this.superlative(w) && this.knownBy(w.slice(3), ch)) return [w.slice(3), 'ter- superlative'];
    if (w.endsWith('an') && ch >= g['-an'] && this.knownBy(w.slice(0, -2), ch) && this.isVerb(w.slice(0, -2))) return [w.slice(0, -2), '-an nominalisation'];
    return null;
  }

  /** Chapter 6 superlative: a listed whole word, or ter- + an adjective with no ledger row of its own. */
  superlative(w) {
    if (this.superlatives.has(w)) return true;
    return w.startsWith('ter') && !this.entries.has(w) && this.isAdj(w.slice(3));
  }

  bases(w) {
    const out = new Set([w]);
    for (const [p, adds] of UNPREFIX) if (w.startsWith(p) && w.length - p.length >= 3) for (const a of adds) out.add(a + w.slice(p.length));
    return out;
  }
  isBase(b) { return b.length >= 3 && this.known.has(b); }

  /** Families read from spelling alone (stage-rules.json, format.shape_tests). */
  shapeFamilies(w) {
    const f = new Set();
    if (w.startsWith('ber') || /^be[kl]/.test(w)) f.add('ber-');
    if (/^me[^aeiou\W]/.test(w)) f.add('meN-');
    if (w.endsWith('kan') && w.length > 5 && [...this.bases(w.slice(0, -3))].some((b) => this.isBase(b))) f.add('-kan');
    if (w.endsWith('i') && w.length > 4 && /^(me|di)/.test(w) &&
        [...this.bases(w)].some((b) => b !== w && b.endsWith('i') && this.isBase(b.slice(0, -1)))) f.add('-i');
    if (w.startsWith('ter') && w.length > 5 && this.isBase(w.slice(3))) f.add('ter-');
    return f;
  }

  /** Gated Stage 2 families of one word (stage-rules.json, format.family_resolution). */
  families(w, ch) {
    if (this.roots.has(w) || this.wholeWords.some(([form, first]) => form === w && (ch === null || ch >= first))) return new Set();
    const tags = this.rowsOf(w).flatMap((r) => r['Affix tag'].split(/\s+/).filter(Boolean));
    const fam = tags.some((t) => t !== 'root') ? new Set(tags.filter((t) => t in TAG_FAMILY).map((t) => TAG_FAMILY[t])) : this.shapeFamilies(w);
    if (fam.has('ter-')) {
      fam.delete('ter-');
      if (!this.superlative(w)) fam.add('ter- accident');
    }
    return fam;
  }

  placedBy(w, ch) {
    return this.rowsOf(w).some((r) => r._chapter !== null && r._chapter <= ch && r['Review status'] !== 'Retired');
  }

  /**
   * Check segments in order, as one unit sequence.
   * Segment: {unit, chapter (number or null), source, text, source_text?, kind ('vocabulary'|'model'|'mention'|'test'), field? ('prompt'|'answer_key')}
   * @returns {{violations: Record<string, any>, ledger_gaps: Record<string, any>, derivations: any[]}}
   */
  inspect(segments) {
    const violations = {};
    const gaps = {};
    const derived = new Map();
    const seenStandard = new Set();
    const labelled = new Set();
    const add = (dst, s, check, term, reason) => {
      const k = key(s.unit, check, term);
      const e = (dst[k] ??= { unit: s.unit, check, term, reasons: [], evidence: [] });
      if (!e.reasons.includes(reason)) e.reasons.push(reason);
      if (!e.evidence.some((x) => x.source === s.source && x.text === s.text)) e.evidence.push({ source: s.source, text: s.text });
    };
    const g = this.gates;
    for (const s of segments) {
      const text = norm(s.text);
      const ts = tokens(s.text);
      const ch = s.chapter ?? null;
      const seq = ch === null ? s.unit : 'stage';
      const kind = s.kind ?? 'model';
      const sourceText = s.source_text ?? s.text;
      // Disallowed (Indonesian) forms, as whole words and inside hyphenated words.
      const parts = new Set([...ts, ...ts.flatMap((t) => t.split('-'))]);
      const note = kind === 'mention' && (this.mentions[text] ?? '').toLowerCase().includes('do not use');
      for (const [bad, good] of Object.entries(this.disallowed))
        if (parts.has(bad) && !note) add(violations, s, 'malaysian-form', bad, `Disallowed (Indonesian) form; use ${good}`);
      if (kind === 'mention') continue;
      for (const [spoken, standard, first] of this.pairs) {
        if (ch !== null && ch < first) continue;
        if (wordRe(spoken).test(text)) {
          if (!seenStandard.has(`${seq}|${standard}`)) add(violations, s, 'register', spoken, `Standard ${standard} has no earlier target-language teaching occurrence.`);
          if (!labelled.has(`${seq}|${spoken}`) && !/\bspoken\b/i.test(sourceText)) add(violations, s, 'register', spoken, 'Spoken form lacks an explicit spoken label in prior teaching.');
        }
      }
      // R4: «lah» and «kan» are recognition and optional production; no answer key may require them.
      if (kind === 'test' && s.field === 'answer_key') {
        for (const w of ts)
          for (const particle of this.particles)
            if (w === particle || (particle === 'lah' && w.endsWith('lah') && !this.entries.has(w) && !this.notParticle.has(w) && this.known.has(w.slice(0, -3))))
              add(violations, s, 'register', particle, `Particle «${particle}» is optional production (R4); a test answer key must not require it.`);
      }
      // A phrase exemption is scoped to its chapter and to this segment: it never exempts its words elsewhere.
      const exempt = new Set();
      for (const [phrase, first] of [...this.chunks, ...this.wholeWords])
        if (ch !== null && first <= ch && wordRe(phrase).test(text)) for (const t of tokens(phrase)) exempt.add(t);
      for (const w of new Set(ts)) {
        if (this.proper.has(w)) continue;
        if (ch !== null && !exempt.has(w)) {
          const early = [];
          if (ch < g['ke- ordinal'] && w.startsWith('ke') && NUMBERS.has(w.slice(2))) early.push(`ke- ordinal before chapter ${g['ke- ordinal']}`);
          if (ch < g['-nya'] && w.endsWith('nya') && (this.entries.has(w.slice(0, -3)) || w === 'ceritanya')) early.push(`-nya before chapter ${g['-nya']}`);
          if (ch < g['-kah'] && w.endsWith('kah') && this.entries.has(w.slice(0, -3))) early.push(`-kah before chapter ${g['-kah']}`);
          if (ch < g['di-'] && w.startsWith('di') && this.entries.has(w.slice(2)) && this.isVerb(w.slice(2))) early.push(`di- passive before chapter ${g['di-']}`);
          if (ch < g['ter- superlative'] && w.startsWith('ter') && this.isAdj(w.slice(3))) early.push(`ter- superlative before chapter ${g['ter- superlative']}`);
          for (const reason of early) add(violations, s, 'affix', w, reason);
        }
        const derivedForm = this.derivation(w, ch);
        const affixBase = derivedForm ? derivedForm[0] : w;
        if (!this.roots.has(affixBase) && !exempt.has(affixBase)) {
          if (ch !== null && ch < g['ber-'] && (affixBase.startsWith('ber') || /^be[kl]/.test(affixBase)))
            add(violations, s, 'affix', w, `ber-/be- shaped form before chapter ${g['ber-']}; no taught chunk or root exemption.`);
          if (ch !== null && ch < g['meN-'] && /^me[^aeiou\W]/.test(affixBase))
            add(violations, s, 'affix', w, `me- shaped form before chapter ${g['meN-']}; no taught chunk or root exemption.`);
        }
        // Stage-aware rule: every gate of the word's families is open, and the form's own ledger row
        // (or, for a Stage 1 derivation, its base's row) is placed at or before this chapter.
        if (ch !== null && !exempt.has(w) && !exempt.has(affixBase)) {
          const fam = [...this.families(affixBase, ch)].sort();
          for (const f of fam) if (ch < g[f]) add(violations, s, 'affix', w, `${f} form before chapter ${g[f]}.`);
          if (fam.length && fam.every((f) => ch >= g[f]) && !(this.placedBy(w, ch) || (derivedForm && this.placedBy(affixBase, ch))))
            add(violations, s, 'affix', w, `${fam.join('/')} form has no ledger row placed at or before chapter ${ch}.`);
        }
      }
      // Ledger coverage and placement, longest ledger phrase first.
      let i = 0;
      while (i < ts.length) {
        if (this.proper.has(ts[i])) { i++; continue; }
        let matched = null;
        for (let size = Math.min(this.maxlen, ts.length - i); size > 0; size--) {
          const term = ts.slice(i, i + size).join(' ');
          if (this.entries.has(term) && size > 1 && this.compositional(term, ts.slice(i, i + size))) continue;
          if (this.entries.has(term)) { matched = [term, size]; break; }
        }
        let [term, size] = matched ?? [ts[i], 1];
        const deriv = size === 1 ? this.derivation(term, ch) : null;
        if (deriv) {
          const [base, rule] = deriv;
          const d = { unit: s.unit, term, base, rule };
          derived.set(JSON.stringify(d), d);
          term = base;
        }
        const rows = this.rowsOf(term);
        if (!rows.length) add(gaps, s, 'ledger gap', term, 'No exact ledger entry for this term/base; not a lesson violation.');
        else if (ch !== null) {
          const taught = rows.map((r) => r._chapter).filter((c) => c !== null);
          if (!taught.length) add(violations, s, 'ledger', term, 'Ledger entry exists but has no chapter assignment.');
          else if (Math.min(...taught) > ch) add(violations, s, 'ledger', term, `First assigned chapter ${Math.min(...taught)}; used in chapter ${ch}.`);
        }
        i += size;
      }
      // Only vocabulary and model teaching counts as teaching, never a rubric or a task.
      if (kind === 'vocabulary' || kind === 'model') {
        for (const [spoken, standard] of this.pairs) {
          if (wordRe(standard).test(text)) seenStandard.add(`${seq}|${standard}`);
          if (text.includes(spoken) && /\bspoken\b/i.test(sourceText)) labelled.add(`${seq}|${spoken}`);
        }
      }
    }
    return { violations, ledger_gaps: gaps, derivations: [...derived.values()] };
  }
}

/**
 * Run one shared fixture case (content/rules/stage-rules-fixtures.json) the way Cikgu Sensai's
 * tests/test_stage_rules.py does. Returns the violations.
 */
export function runFixtureCase(checker, c) {
  const saved = checker.mentions;
  const mentions = { ...saved };
  const segments = c.segments.map((s, i) => {
    const ch = s.chapter;
    const kind = s.kind ?? 'model';
    if (kind === 'mention') mentions[norm(s.text)] = s.mention_source;
    return {
      unit: s.unit ?? `fixture-c${String(ch).padStart(2, '0')}`,
      chapter: ch,
      source: kind === 'test' ? `test:${c.id}-${i}|${s.field}` : `fixture|${i}`,
      field: s.field,
      text: s.text,
      source_text: s.source_text ?? s.text,
      kind,
    };
  });
  checker.mentions = mentions;
  try {
    return checker.inspect(segments).violations;
  } finally {
    checker.mentions = saved;
  }
}

/** True when a case's result matches its expectation. */
export function fixtureAgrees(c, violations) {
  const v = Object.values(violations);
  return c.expect === 'pass' ? v.length === 0 : v.some((e) => e.check === c.check);
}
