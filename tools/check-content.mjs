#!/usr/bin/env node
// Content CI (spec 11.4): schema check, stage-aware affix guard, link check.
// Run: npm run content:check
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import Ajv from 'ajv';
import { runAffixGuard } from './affix-guard.mjs';
import { isExtensionPlace, loadLedger, placedChapter } from './stage-rules.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const contentDir = join(root, 'content', 'ms');

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? walk(p) : p.endsWith('.json') ? [p] : [];
  });
}

const schema = JSON.parse(readFileSync(join(root, 'content', 'schema', 'pack.schema.json'), 'utf8'));
const validate = new Ajv({ allErrors: true }).compile(schema);

const errors = [];
const packs = [];
for (const file of walk(contentDir)) {
  const rel = relative(root, file);
  let pack;
  try {
    pack = JSON.parse(readFileSync(file, 'utf8'));
  } catch (e) {
    errors.push(`${rel}: invalid JSON (${e.message})`);
    continue;
  }
  if (!validate(pack)) {
    for (const err of validate.errors) errors.push(`${rel}: schema ${err.instancePath || '/'} ${err.message}`);
    continue;
  }
  packs.push({ ...pack, _file: rel });
}

// A pack has cards, except a Kelas review chapter (Stage 2, chapter 18): no vocabulary of its own, but Sedia Kelas
// review cards, frames and a scenario.
for (const p of packs) {
  if (p.cards.length) continue;
  const review = p.kind === 'kelas' && p.sedia_kelas?.cards?.length && p.frames?.length && p.scenario?.lines?.length;
  if (!review) errors.push(`${p._file}: no cards (only a Kelas review chapter may have none)`);
}

// IDs unique across all packs
const cardById = new Map();
const sceneIds = new Set();
for (const p of packs) {
  sceneIds.add(`${p.kind}-${p.id}`);
  for (const c of p.cards) {
    if (cardById.has(c.id)) errors.push(`${p._file}: duplicate card id ${c.id}`);
    cardById.set(c.id, { ...c, _pack: p });
  }
}

// Link check
for (const p of packs) {
  for (const c of p.cards) {
    if (!c.links.some((l) => l.type === 'babak')) errors.push(`${p._file}: ${c.id} has no scene (babak) link`);
    if (!sceneIds.has(c.scene)) errors.push(`${p._file}: ${c.id} scene "${c.scene}" does not exist`);
    for (const l of c.links) {
      if (!l.target) continue;
      if (l.type === 'babak') {
        if (!sceneIds.has(l.target)) errors.push(`${p._file}: ${c.id} links to missing scene ${l.target}`);
        continue;
      }
      const t = cardById.get(l.target);
      if (!t) {
        errors.push(`${p._file}: ${c.id} links to missing card ${l.target}`);
        continue;
      }
      if (l.type === 'pasangan' && t.chapter > c.chapter)
        errors.push(`${p._file}: pair ${c.id} -> ${l.target} points to a later chapter (${t.chapter} > ${c.chapter})`);
    }
  }
  if (p.sedia_kelas) {
    const frameIds = new Set((p.frames ?? []).map((f) => f.id));
    for (const id of p.sedia_kelas.cards) if (!cardById.has(id)) errors.push(`${p._file}: sedia_kelas card ${id} missing`);
    for (const id of p.sedia_kelas.frames) if (!frameIds.has(id)) errors.push(`${p._file}: sedia_kelas frame ${id} missing`);
    if (p.sedia_kelas.scene && !sceneIds.has(`dunia-${p.sedia_kelas.scene}`))
      errors.push(`${p._file}: sedia_kelas scene ${p.sedia_kelas.scene} missing`);
  }
}

// ⚡ packs (kind stretch): one per chapter, holding a card for every «ChN (extension)» ledger row and nothing else; decoys are
// never tiles of their sentence; a reply line has a line before it.
const ledger = loadLedger();
for (const x of packs.filter((p) => p.kind === 'stretch')) {
  if (x.id !== `x${String(x.chapter).padStart(2, '0')}`) errors.push(`${x._file}: a ⚡ pack of chapter ${x.chapter} must be x${String(x.chapter).padStart(2, '0')}`);
  if (!packs.some((p) => p.kind === 'kelas' && p.chapter === x.chapter)) errors.push(`${x._file}: no Kelas chapter ${x.chapter}`);
  const rows = ledger.filter((r) => isExtensionPlace(r['Kata-Kata place']) && placedChapter(r['Kata-Kata place']) === x.chapter && r['Review status'] !== 'Retired');
  const terms = new Set(x.cards.map((c) => c.term));
  for (const r of rows) if (!terms.has(r.Malay.trim())) errors.push(`${x._file}: ledger ${r.ID} «${r.Malay}» is Ch${x.chapter} (extension) but has no ⚡ card`);
  const want = new Set(rows.map((r) => r.Malay.trim()));
  for (const c of x.cards) {
    if (!want.has(c.term)) errors.push(`${x._file}: ${c.id} «${c.term}» has no Ch${x.chapter} (extension) ledger row`);
    if (c.scene !== `stretch-${x.id}`) errors.push(`${x._file}: ${c.id} scene must be stretch-${x.id}`);
  }
  for (const f of x.frames ?? []) for (const d of f.decoys ?? []) if (f.example.split(/\s+/).includes(d)) errors.push(`${x._file}: ${f.id} decoy «${d}» is a tile of the sentence`);
  (x.scenario?.lines ?? []).forEach((l, i) => {
    if (l.choices && (i === 0 || l.choices.length !== 2 || (l.choices_en ?? []).length !== 2)) errors.push(`${x._file}: ${l.id} needs a line before it, two choices and two choices_en`);
  });
}

// Affix guard (stage-aware: content/rules/stage-rules.json, each text checked at its own chapter)
const { flags, passes, findings } = runAffixGuard(packs);
for (const f of flags) errors.push(`affix guard: ${f.id} (${f.unit}, ${f.check}) "${f.word}" in "${f.text}": ${f.reason}`);

const live = packs.filter((p) => p.status === 'live');
const liveCards = live.reduce((n, p) => n + p.cards.length, 0);
console.log(`content: ${packs.length} packs (${live.length} live, ${liveCards} live cards), ${cardById.size} cards total`);
const notBlocking = Object.entries(findings).map(([k, n]) => `${n} ${k}`).join(', ') || 'none';
console.log(`affix guard: ${flags.length} flags, ${passes.length} derivations checked; Stage 1 findings that do not block: ${notBlocking}`);
if (errors.length) {
  console.error(errors.map((e) => `  ✗ ${e}`).join('\n'));
  console.error(`content check failed: ${errors.length} problem(s)`);
  process.exit(1);
}
console.log('content check passed');
