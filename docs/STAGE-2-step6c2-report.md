# Stage 2, build step 6c-2: the new shared rules, the exemption removed, the step 6b follow-ups (15 Nov 2026)

Authorised by Sam. Worked on the session branch `step6c2`; `main` was fast-forwarded to it at the end (the final hash is in the hand-off message and in HANDOFF.md).
Cikgu Sensai was read at `a235a35` (rules at `909596e`) and Hanashishou at `4be57ac` (main); neither was edited, and nothing was pushed to either.
Hanashishou is private, so `add_repo` attached it with credentials; it was only cloned, and built from a scratch copy (`git archive`), never in place.

## Summary

- **Rules**: `stage-rules.json` and `stage-rules-fixtures.json` copied unedited from Cikgu Sensai `909596e` (81 to 95 cases, `SOURCE.json` updated). The guard runs the two new keys. **All 95 cases give their expected result; the affix guard reports 0 flags in all 48 packs.**
- **Exemption removed**: the step 6b bridge-batch exemption is gone; `tools/stage-rules.mjs` now follows Cikgu Sensai's rule (section 3).
- **"In both"**: Yes for the 264 Jambatan rows (264 M cells).
- **Social split**: the 118-card scene is three scenes (45 / 46 / 27); every card keeps its ID.
- **Cross-app test**: `tests/e2e/bridge.cjs` passes.
- **Write-back**: 382 cells (118 K, 264 M), verified; Journal rows 219 to 224.
- **Checks** (chained): `npm run check && smoke.cjs && fun.cjs && bridge.cjs` all pass. The build is reproducible (section 8).

## 1. Ledger sync

The sheet differed from the snapshot (`e4e294d`) in exactly the two expected cells and nothing else (checked cell by cell over the whole tab):

- L-0195 Action (Q196): «KD4 check; Kata-Kata: card terms … pick up the alias» to «KD4 check»;
- L-1303 Action (Q1304): the «(none: Retired; …)» text to blank.

Snapshot commit `8bbeb67`. A second read just before the write-back was byte-identical to the first.

## 2. Rules sync and fixtures

- Copied from Cikgu Sensai `909596e03db373b14de213ad64f8a0a73afdeea7`: `stage-rules.json` (sha256 `ad1c9f76…`), `stage-rules-fixtures.json` (`17bc3b70…`). `malay-proper-nouns.json` is byte-identical at that commit, so it is unchanged. `SOURCE.json` has the commit and the hashes; the unit test checks them.
- The rules file changed only in text: a new `format.ledger_rows_and_chapters` entry, and the `family_resolution` and `shape_tests` wording (only a row with a chapter counts). No gate, list or number changed.
- **Fixtures**: 14 new cases, 95 in all. `runFixtureCase` now returns the whole result and `fixtureAgrees` also checks `expect_gaps` (each term must be a ledger gap) and `expect_no_gaps` (none may be). The unit test asserts 95 cases and that all agree: **95 of 95**, no known divergence.

## 3. The rule, and the exemption removed

`tools/stage-rules.mjs` is a line-by-line port of Cikgu Sensai's `language_checks.py` at `a235a35`:

1. **A placed row is checked whole from its own chapter on.** `derivation()` returns nothing for a form whose own live row is placed at or before the unit's chapter (`placedBy`). Before that chapter a regular derivation from a placed root still applies (the `seminggu` in chapter 4 case; `disemak` in unit 11B).
2. **A row with no chapter is no root and counts as no row in a chaptered unit.** A new `placed` set (forms with at least one row that has a chapter) replaces the whole ledger in: `known` (roots, bases, shape tests), the -nya, -kah, -lah, se- and di- derivations, the early-use checks, the superlative test, the R4 -lah test, the family tags, and the POS noun test. `rowsFor(term, ch)` drops unplaced live rows in a chaptered unit: a bridge-only word is a gap, an unplaced phrase such as «pusat beli-belah» is skipped and its words are checked one by one. In a unit with no chapter (Jambatan packs) the row is an entry, as before. A retired row is not live.
3. **Practice-pool rows keep «primes Ch18»**: placement is still read from the place column, so `disemak` stays di- + `semak`.
- **Exemption removed**: the `Origin: Hanashishou bridge batch…` skip is deleted. The two old unit tests of the exemption were replaced by tests of the shared rule (no exemption by origin; an unplaced row of any origin counts as no row; derivation before a row's own chapter; retired rows).
- «biasanya» (c10), «akhirnya» (c14) and «terlalu» (c06) pass as whole words; the guard reports 0 flags (11 derivations checked). Stage 1 findings that do not block: 7 register and 5 ledger gap, as before.
- **The Kata-Kata addition kept**: written «-lah» joined to a word (from chapter 17) stays; Cikgu Sensai's checker has the same rule since step 6c-1 (`-lah` line), so the two now agree on it.
- **One deviation Cikgu Sensai asked Sam to confirm** (rule 1 starts at the row's own chapter, not "never split"): this port follows the code as shipped, so Kata-Kata and Cikgu Sensai agree. See question 3.

## 4. Step 6b follow-ups

1. **«Cara bermain» kept** (kegemaran, sifu; `jambatan-tutorial`, 2 cards): nothing changed; recorded in the Journal.
2. **The five older cards kept** (talian bank, letih, encik pula, jujurnya, lenguh): nothing changed; recorded.
3. **"In both" = Yes** for the 264 Jambatan rows. They were the 264 Jambatan rows with a blank M cell: L-1310 to L-1493 (184) and the 80 group (a) rows; the 82 older ones already said Yes. Written with `writeback.py` (the plan now accepts `"both": "Yes"` for column M): plan, write, whole-tab read, verify. See question 1 about two of them.
4. **Social split** (section 5).
5. **Cross-app test** (section 6).

## 5. The Social scene, split

Split by what the words suggest (118 cards, all assigned; the importer refuses an unassigned social word):

| Scene (pack id) | Title (ms / en / ja draft) | Cards | Words, for example |
| --- | --- | ---: | --- |
| `jambatan-social-talk` | Berbual dan menerangkan / Talking and explaining / 話す・説明する | 45 | nota, ayat, beri, sebut, dapat, tentang, cara, cerita, terangkan, maksudnya |
| `jambatan-social-events` | Acara dan keluar / Events and outings / イベントとお出かけ | 46 | bunyi, cadang, konsert, acara, rancang, bunga api, kahwin, pengantin, jalan sesak |
| `jambatan-social-feelings` | Perasaan dan pendapat / Feelings and opinions / 気持ちと意見 | 27 | mungkin, salah, tepat, pasti, hebat, menarik, gementar, pendapat, jujur, berbaloi |

- **Order**: inside each scene, by the number of Hanashishou scenes that use the word (most first), ties alphabetical, as before; the five cards no scene meets now come last.
- **IDs**: the format allows a card in any scene, so **no ID changed** (`ms-j-social-NN` stays; a test checks that all 118 keep that shape). A new social card, if the ledger ever gets one, would also be numbered `ms-j-social-NN`. Only the scene (`dunia-jambatan-social-talk`, `-events`, `-feelings`), the card's babak link and the ledger place change. The old pack file `jambatan-social.json` is removed by the importer. Learner progress is keyed by card ID, so none is lost.
- **Ledger places**: 118 K cells moved from «Jambatan · Social life» to «Jambatan · <scene>». The Hanashishou (pack · band) cell (L) still says `social`. The importer's map now covers every Jambatan row (the places are rewritten from the scene), so a future scene change is one run.
- 48 packs now (46 + 2). Jambatan total is still 346 cards in 8 scenes.

## 6. Cross-app test

Hanashishou main (`4be57ac`) was built from a scratch copy (`npm ci`, `npm run build`) and served with `vite preview --port 4179`; Kata-Kata on 4173. `tests/e2e/bridge.cjs`: Kata-Kata exports `katakata-words_Aiko_2026-11-14.json` with 5 words, 4 in Hanashishou; Hanashishou previews «マレー語の単語帳に 4 語が入ります», imports them, suggests band 1, carries the «pejabat pos» interval over, and neither app throws a page error. Passed. Hanashishou was not edited.

## 7. Ledger cells and Journal

- **Cells**: 118 K (places of the split Social cards) + 264 M (In both) = 382. Five single-column writes: K705:K721, K854:K914, K1310:K1491, M722:M916, M1309:M1494; cells inside a run that needed no change were written back unchanged (as in step 6b). Whole Ledger tab read before (twice, identical) and after; `writeback.py verify`: **382 changed, 382 planned, nothing else**. J, Action, Last changed and Changed by were not touched.
- **Journal**: rows 219 to 224 (tail read first: row 218 was the last; written with `update_values` A219:I224, read back). One typo (D223 cited rows 220 and 221 instead of 221 and 222) was corrected the same session. Row 217 was already marked Done (row 218).
- Snapshot after the write-back: `69f6399`.

## 8. Checks and reproducibility

- `npm run check` (typecheck, unit tests, content check, build), `smoke.cjs`, `fun.cjs`, `bridge.cjs`: all pass, chained with `&&`.
- The whole pipeline (`make_vocab_bank_v6.py`, `import_vocab_bank.py`, `import_hanashishou_bridge.py`) was re-run from the committed inputs: every pack file is byte-identical to the committed one. The only difference is the workbook's `docProps/core.xml` modified time (the v6 workbook was left as committed). A second importer run gives identical files, and so does one from the post-write-back ledger.
- Not changed: the metfirst audit (`content/bridge/hanashishou-metfirst.json`): neither Hanashishou nor any ledger Malay cell changed.

## 9. Not verified

- Kamus Dewan (nothing here is checked against it).
- The three scene titles and the Japanese titles and setting lines (my drafts); never seen on a phone.
- Whether the topics are the grouping you want: the Talking scene is the "everything else" scene (function words, saying and explaining), the Feelings scene is the small one.

## Questions for Sam

1. **L-1308 hidup and L-1309 giliran** now say In both = Yes (you asked for all 264), but their Hanashishou (pack · band) cell is empty (their scenes' most common pack was used for the card). Fill the cell, or blank M on those two?
2. **The split**: keep these three topics and titles, or move words between scenes (Feelings has 27 against 45 and 46)? A word moves by editing `SOCIAL_SPLIT` in the importer and re-running it; the IDs do not change.
3. **Cikgu Sensai's rule 1 deviation** (the rule starts at a row's own chapter): Kata-Kata follows the shipped code. If you want the literal "never split", the 8 uses it would break (seminggu, sebulan, disemak) must change first, in Cikgu Sensai.
4. **Cikgu Sensai refresh**: its ledger copy should take this snapshot (118 places, 264 In both cells). No class card changed, so `c01` to `c18` stay as they are.
