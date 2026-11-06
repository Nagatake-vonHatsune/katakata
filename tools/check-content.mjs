#!/usr/bin/env node
// Content CI (spec 11.4): schema check, affix guard, link check.
// Run: npm run content:check
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import Ajv from 'ajv';
import { runAffixGuard } from './affix-guard.mjs';

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

// Affix guard
const { flags, passes } = runAffixGuard(packs);
for (const f of flags) errors.push(`affix guard: ${f.id} (${f.source}) "${f.word}" in "${f.text}" is a ber-/me- form; tag it chunk, lex or recognise-only, or add it to the allow-list if it is a root`);

const live = packs.filter((p) => p.status === 'live');
const liveCards = live.reduce((n, p) => n + p.cards.length, 0);
console.log(`content: ${packs.length} packs (${live.length} live, ${liveCards} live cards), ${cardById.size} cards total`);
console.log(`affix guard: ${flags.length} flags, ${passes.length} passes`);
if (errors.length) {
  console.error(errors.map((e) => `  ✗ ${e}`).join('\n'));
  console.error(`content check failed: ${errors.length} problem(s)`);
  process.exit(1);
}
console.log('content check passed');
