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

/** The chapter a pack is checked at: its own chapter, or null for Jambatan (Hanashishou words, no chapter). */
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
  const segs = [];
  for (const c of pack.cards ?? [])
    segs.push({ unit, chapter, source: c.id, text: c.term, source_text: `${c.term} ${c.note ?? ''}`, kind: 'vocabulary' });
  for (const f of pack.frames ?? []) {
    segs.push({ unit, chapter, source: f.id, text: (f.frame ?? '').replace(/\([^)]*\)/g, ' '), kind: 'model' });
    segs.push({ unit, chapter, source: f.id, text: f.example ?? '', kind: 'model' });
  }
  for (const l of pack.scenario?.lines ?? []) segs.push({ unit, chapter, source: l.id, text: l.ms, kind: 'model' });
  return segs;
}

/**
 * @param {Array<{kind:string,id:string,chapter?:number,cards:any[],frames?:any[],scenario?:any}>} packs
 * @param {{checker?: Checker}} [opts]
 * @returns {{flags: Array<{id:string,unit:string,check:string,word:string,text:string,reason:string}>, passes: any[], findings: Record<string, number>}}
 */
export function runAffixGuard(packs, opts = {}) {
  const checker = opts.checker ?? new Checker();
  // Chapter order, Kelas before Dunia: the register check needs the standard form taught first.
  const ordered = [...packs].sort((a, b) => (guardChapter(a) ?? 99) - (guardChapter(b) ?? 99) || (a.kind === 'kelas' ? -1 : 1) - (b.kind === 'kelas' ? -1 : 1));
  const unitChapter = new Map(ordered.map((p) => [`${p.kind}-${p.id}`, { chapter: guardChapter(p), kelas: p.kind === 'kelas' }]));
  const result = checker.inspect(ordered.flatMap(packSegments));
  const flags = [];
  const findings = {};
  const blocking = (e) => {
    const u = unitChapter.get(e.unit);
    const stage2 = u?.kelas && u.chapter !== null && u.chapter >= STAGE2_FROM;
    if (stage2) return true;
    if (u?.chapter === null) return e.check === 'malaysian-form';
    return ALWAYS_BLOCKING.has(e.check);
  };
  for (const e of [...Object.values(result.violations), ...Object.values(result.ledger_gaps)]) {
    if (blocking(e)) {
      for (const ev of e.evidence) flags.push({ id: ev.source, unit: e.unit, check: e.check, word: e.term, text: ev.text, reason: e.reasons.join(' ') });
    } else findings[e.check] = (findings[e.check] ?? 0) + 1;
  }
  return { flags, passes: result.derivations, findings };
}
