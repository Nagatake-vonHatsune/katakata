// Affix guard (spec 11.4), stage-aware since Stage 2 (13 Nov 2026).
//
// The gates, whole words, look-alike roots, register pairs and disallowed forms are not written here any
// more: they come from content/rules/stage-rules.json, an unedited copy of Cikgu Sensai's
// curriculum/stage-rules.json (source commit in content/rules/SOURCE.json), read by tools/stage-rules.mjs,
// which ports Cikgu Sensai's checker. Every text is checked at its own pack's chapter, and a chunk,
// lex or recognise-only exemption only applies from its own chapter, inside the text that contains the
// whole phrase. So a chapter 12 chunk can never make a word legal in chapters 1 to 9.
//
// What blocks the build:
// - every pack with a chapter (Kelas chapters, Dunia scenes): "affix" and "malaysian-form" findings;
// - Stage 2 Kelas packs (chapter 10 and later) are held to every check, as Cikgu Sensai holds its
//   re-authored units: also "register", "ledger" (a word placed after the chapter, or not placed) and
//   ledger gaps (a word with no ledger row);
// - Jambatan packs carry Hanashishou's own words, which Kata-Kata does not teach in a chapter: they are
//   checked as unplaced units (chapter null), so only "malaysian-form" applies, as for Cikgu Sensai's
//   unplaced packs.
// Stage 1 "register" and "ledger" findings are reported as counts, not blocking (the Stage 1 packs were
// written before these checks; Cikgu Sensai keeps the same kind of findings in a frozen baseline).
//
// ⚡ packs (kind "stretch", content/ms/stretch/xNN.json; rules commit fc7dec4, format.extension_rows, and the design note
// section 5): every segment is extension content of chapter N, checked at N in Kata-Kata's own-chapter view, where only
// «ChN (extension)» rows are placed (other chapters' extension rows count as no row). Every check blocks, in chapters 1 to 9
// too (the ledger-placement check is on for ⚡ packs of Stage 1 chapters). Each ⚡ pack is checked after the core packs of
// chapters 1 to N, in its own pass, so the register check sees what the core course taught by then, and nothing a ⚡ pack
// teaches ever counts for a core pack. Core packs read extension rows as no row (the core view), as before.

import { Checker } from './stage-rules.mjs';

export const STAGE2_FROM = 10;
const ALWAYS_BLOCKING = new Set(['affix', 'malaysian-form']);

/** Legacy shape test, kept for the Python tools that copy it (bridge root-word filter, ledger builder). */
export function looksAffixed(word) {
  const w = word.toLowerCase();
  if (w.startsWith('ber')) return true;
  if (/^be[kl]/.test(w)) return true;
  if (/^me[^aeiou\W]/.test(w)) return true;
  return false;
}

export function words(text) {
  return (text ?? '').match(/[A-Za-z][A-Za-z'-]*/g)?.map((w) => w.replace(/^[-']+|[-']+$/g, '')) ?? [];
}

/** The chapter a pack is checked at: its own chapter (⚡ packs too), or null for Jambatan (Hanashishou words, no chapter). */
export function guardChapter(pack) {
  if (pack.kind === 'dunia' && String(pack.id).startsWith('jambatan')) return null;
  return typeof pack.chapter === 'number' ? pack.chapter : null;
}

/**
 * Segments for one pack, in teaching order: cards (vocabulary), then frames and scenario lines (models).
 * Frame slot labels in brackets, such as "(verb)", are English and are left out.
 */
export function packSegments(pack) {
  const unit = `${pack.kind}-${pack.id}`;
  const chapter = guardChapter(pack);
  // ⚡ content: Kata-Kata's own-chapter extension view (a number), so only this chapter's extension rows are placed.
  const ext = pack.kind === 'stretch' ? { extension: chapter } : {};
  const segs = [];
  for (const c of pack.cards ?? [])
    segs.push({ unit, chapter, source: c.id, text: c.term, source_text: `${c.term} ${c.note ?? ''}`, kind: 'vocabulary', ...ext });
  for (const f of pack.frames ?? []) {
    segs.push({ unit, chapter, source: f.id, text: (f.frame ?? '').replace(/\([^)]*\)/g, ' '), kind: 'model', ...ext });
    segs.push({ unit, chapter, source: f.id, text: f.example ?? '', kind: 'model', ...ext });
    // Decoy tiles are Malay on screen too: each must be a word the chapter may use.
    for (const d of f.decoys ?? []) segs.push({ unit, chapter, source: `${f.id}|decoy`, text: d, kind: 'model', ...ext });
  }
  for (const l of pack.scenario?.lines ?? []) {
    segs.push({ unit, chapter, source: l.id, text: l.ms, kind: 'model', ...ext });
    // Wrong replies are shown Malay (checked like the line, but they teach nothing: kind 'test').
    for (const [i, ch] of (l.choices ?? []).entries()) segs.push({ unit, chapter, source: `${l.id}|choice${i + 1}`, text: ch, kind: 'test', field: 'prompt', ...ext });
  }
  return segs;
}

/**
 * @param {Array<{kind:string,id:string,chapter?:number,cards:any[],frames?:any[],scenario?:any}>} packs
 * @param {{checker?: Checker}} [opts]
 * @returns {{flags: Array<{id:string,unit:string,check:string,word:string,text:string,reason:string}>, passes: any[], findings: Record<string, number>}}
 */
export function runAffixGuard(packs, opts = {}) {
  const checker = opts.checker ?? new Checker();
  const core = packs.filter((p) => p.kind !== 'stretch');
  const stretch = packs.filter((p) => p.kind === 'stretch');
  // Chapter order, Kelas before Dunia: the register check needs the standard form taught first.
  const ordered = [...core].sort((a, b) => (guardChapter(a) ?? 99) - (guardChapter(b) ?? 99) || (a.kind === 'kelas' ? -1 : 1) - (b.kind === 'kelas' ? -1 : 1));
  const unitChapter = new Map(packs.map((p) => [`${p.kind}-${p.id}`, { chapter: guardChapter(p), kelas: p.kind === 'kelas', stretch: p.kind === 'stretch' }]));
  const result = checker.inspect(ordered.flatMap(packSegments));
  const entries = [...Object.values(result.violations), ...Object.values(result.ledger_gaps)];
  const derivations = [...result.derivations];
  for (const x of stretch) {
    const unit = `${x.kind}-${x.id}`;
    const before = ordered.filter((p) => guardChapter(p) !== null && guardChapter(p) <= x.chapter);
    const r = checker.inspect([...before.flatMap(packSegments), ...packSegments(x)]);
    entries.push(...[...Object.values(r.violations), ...Object.values(r.ledger_gaps)].filter((e) => e.unit === unit));
    derivations.push(...r.derivations.filter((d) => d.unit === unit));
  }
  const flags = [];
  const findings = {};
  const blocking = (e) => {
    const u = unitChapter.get(e.unit);
    if (u?.stretch) return true;
    const stage2 = u?.kelas && u.chapter !== null && u.chapter >= STAGE2_FROM;
    if (stage2) return true;
    if (u?.chapter === null) return e.check === 'malaysian-form';
    return ALWAYS_BLOCKING.has(e.check);
  };
  for (const e of entries) {
    if (blocking(e)) {
      for (const ev of e.evidence) flags.push({ id: ev.source, unit: e.unit, check: e.check, word: e.term, text: ev.text, reason: e.reasons.join(' ') });
    } else findings[e.check] = (findings[e.check] ?? 0) + 1;
  }
  return { flags, passes: derivations, findings };
}
