#!/usr/bin/env node
// Check Malay lines at a chapter with the stage-aware rules, before they go into the workbook.
// Usage: node tools/stage-check.mjs <chapter> "Saya bekerja di Kuala Lumpur." "Pukul berapa kita bertolak?" ...
// Prints ✓ or ✗ per line with every finding (affix, ledger placement, register, Malaysian form, ledger gap).
// Stage 2 Kelas packs must be clean on all of them (tools/affix-guard.mjs). Uses the ledger snapshot and
// the Kelas packs on disk, so sync the snapshot from the sheet first.
import { Checker } from './stage-rules.mjs';

const [chapter, ...lines] = process.argv.slice(2);
if (!chapter || !lines.length) {
  console.error('usage: node tools/stage-check.mjs <chapter> "<Malay line>" ...');
  process.exit(2);
}
const checker = new Checker();
let bad = 0;
for (const text of lines) {
  const r = checker.inspect([{ unit: `kelas-c${chapter.padStart(2, '0')}`, chapter: Number(chapter), source: 'cli', text, kind: 'model' }]);
  const found = [
    ...Object.values(r.violations).map((v) => `${v.check}: ${v.term} (${v.reasons.join(' ')})`),
    ...Object.values(r.ledger_gaps).map((v) => `ledger gap: ${v.term}`),
  ];
  if (found.length) bad++;
  console.log(`${found.length ? '✗' : '✓'} ${text}${found.length ? '\n    ' + found.join('\n    ') : ''}`);
}
process.exit(bad ? 1 : 0);
