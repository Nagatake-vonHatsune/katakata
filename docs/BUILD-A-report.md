# Build A: 🔥 checkpoints and the ⚡ stage, pilot ⚡ 4 (report)

**15 Nov 2026 · Claude.** Brief: Sam's Build A message of 15 Nov 2026. The design note ([STRETCH-STAGE-design.md](STRETCH-STAGE-design.md)) was the spec,
except where Sam's decisions of 15 Nov changed it. Kata-Kata has no `AGENTS.md` or `CLAUDE.md`; I read `docs/HANDOFF.md` here and Cikgu Sensai's
`AGENTS.md` / `CLAUDE.md` at the rules commit.

## Summary

- **The engine is built for every chapter; only ⚡ 4 has content.** Each chapter has three 🔥 (class prep, its dialogue played once, every word known).
  When all are lit, a blue «4 ⚡» chip opens the ⚡ stage. Chapter 18 has **2** checkpoints (it has scenario lines, 22, but no cards of its own).
- **⚡ 4:** 19 extension cards (12 new ledger rows, 7 promoted from Jambatan with their schedules moved), 6 frames with decoy tiles, a 14-line dialogue
  with 5 reply steps. The guard checks every word of it at chapter 4, with every check blocking: 0 flags.
- **Ledger:** 12 rows inserted and 14 cells changed in the sheet, read back and verified (only the planned cells changed). Journal rows 228 and 229 (Open).
- **Laju! is ⏱️** everywhere; ⚡ now means only the stretch stage.
- **Tests:** unit 142 → 177, all pass; e2e smoke, fun, nombor and the new stretch test pass; 32 screenshots.

## 1. Commits and the final main hash

Docs first (step 1): the proposal branch's commit `9f61a69` was rebased onto `main` (`633f44c`) as `6850c66`, with one conflict in
`docs/HANDOFF.md` (both backlog lines kept), and `main` was fast-forwarded to it. Then, on `main`:

| Commit | What |
| --- | --- |
| `6850c66` | Vocabulary placement and ⚡ stage proposal (docs only), rebased |
| `bd13581` | Rules sync to Cikgu Sensai `fc7dec4` (104 fixtures) |
| `7bb1fb4` | Laju! ⚡ → ⏱️ |
| `1bb9bdf` | ⚡ stage engine (all chapters) |
| `e0b11eb` | Ledger batch 2 for chapter 4 in the snapshot (planned cells); Jambatan drops the 7 promoted words |
| `a05f2b5` | ⚡ 4 pilot content and builder; unit tests |
| `19508e6` | Ledger snapshot after the write-back (read-back) |
| `795fa57` | e2e test and screenshots |
| this report | report, README, CHANGELOG, HANDOFF |

**Final `main`:** the commit that adds this report (its hash is in the hand-off message; the commit before it is `795fa57`). Every push was
preceded by a fetch; `main` had not moved, so nothing needed rebasing.

## 2. Rules commit and fixtures

- Copied unedited from Cikgu Sensai `fc7dec494683da6262123aef9c5b0208c5eab054`: `curriculum/stage-rules.json` (SHA-256 `0c6908f5…ccef`) and
  `curriculum/stage-rules-fixtures.json` (`12941abe…1f45`). `malay-proper-nouns.json` is unchanged. `content/rules/SOURCE.json` updated.
- `tools/stage-rules.mjs` now follows `format.extension_rows`: `isExtensionPlace` (the Python `is_extension_place`), checker views (the core view, where an
  extension row counts as no row; the shared extension view), the segment key `extension`, and the fixtures' `ledger_rows` (added for one case only).
- **All 104 fixtures agree in the TS guard** (95 before, plus the 9 extension cases). Kata-Kata adds one view of its own: `extension: N` (a chapter number),
  where only «ChN (extension)» rows are placed. The shared rule places every extension row in extension content; the design note (section 5) and the brief
  say a ⚡ pack uses its own extension rows only, so ⚡ packs use this view. The fixtures run with the shared view.

## 3. Test counts

| | Before (633f44c + docs) | After |
| --- | --- | --- |
| `npm run build` | passes: 48 packs, 1441 cards, 0 flags (7 register, 5 ledger gap not blocking) | passes: 49 packs, 1453 cards, 0 flags (7 register, 7 ledger gap not blocking; the 2 new gaps come from another session's ledger edits, section 5) |
| `npm test` | 142 tests, 4 files | 177 tests, 5 files (3 extension-view tests, 32 in `tests/unit/stretch.test.ts`) |
| `tests/e2e/smoke.cjs` | passes | passes |
| `tests/e2e/fun.cjs` | 11 checks pass | 11 checks pass |
| `tests/e2e/nombor.cjs` | 16 checks pass | 16 checks pass |
| `tests/e2e/stretch.cjs` | (new) | 28 checks pass |

`tests/e2e/bridge.cjs` (needs Hanashishou on port 4179) was not run, before or after.

Unit tests cover: checkpoints (three per chapter, two for 18; lit from existing stamps; a lapse never puts a flame out), unlock and the one-time notice, a ⚡ run,
the 'stretch' stamp condition, moved cards (copy once, never over an existing schedule; old IDs retired), migrate (`lines`, `schemaVersion` 1), savefile merge
(new stamp kinds, lines, an older savefile), decoys, the reply step (⚡ and core lines), prep counts and the path without ⚡ cards, distractor pools, the bar's
segment widths, and the blue tokens' contrast in all 8 themes (and that the `prefers-color-scheme` dark values equal the `data-theme` ones).

## 4. Chapter 18

**2 checkpoints**: class prep and the dialogue (22 scenario lines, so 21 reply steps). It has no cards of its own, so no "every word" checkpoint. It has no ⚡ stage.

## 5. The ledger write

Sheet `1X8t3ENRVUY_NHJ3xEB7UY3OiwwUg_KUZT-ESbtiMC0o`, tab Ledger:

1. "Before" read of A1:T1494. It differed from the repo snapshot in 13 cells of 5 rows that another session changed today (Nombor & Masa answers:
   L-0141 «satu per tiga» → «satu pertiga», L-1410 «haribulan» → «hari bulan», notes on L-1032, the Hanashishou cells of L-1308 and L-1309). None of them is
   a planned cell; all 14 planned "before" values matched.
2. `insert_dimension` rows 1495 to 1506 (0-based 1494 to 1506, inheriting from above), then `update_values` `Ledger!A1495:T1506` (12 rows × 20 cells).
3. `update_values` on J:K of rows 1313, 1322, 1332, 1343, 1352, 1360 and 1400 (one call each).
4. "After" read A1:T1506; `python3 -I tools/ledger/stretch_batch.py verify before after plan`: **14 changed cells in existing rows (14 planned), 12 new rows
   exactly as planned, sheet row N holds L-(N−1) throughout: OK.**
5. Journal rows 228 and 229 written with `update_values` (no blank rows in the tab now), read back. Status Open.

| Rows | Cells |
| --- | --- |
| L-1494 buang, L-1495 setahun, L-1496 tahunan, L-1497 jadual, L-1498 kerap, L-1499 malam-malam, L-1500 musim, L-1501 pagi-pagi, L-1502 percutian, L-1503 seminit, L-1504 serentak, L-1505 siang | new rows: meanings, POS, affix tag and root from the proposal CSV; KD4 «Not yet checked»; card IDs `ms-x04-008` to `-019`; place «Ch4 (extension)»; Hanashishou pack · band from its metfirst CSV; In both «Yes»; Origin «Kata-Kata placement batch 2 (Sam approved 15 Nov)»; Draft; Action «KD4 check»; a note with the placement reason and one Hanashishou line; 2026-11-15; «Claude (Sam approved)» |
| L-1312 beri, L-1321 semula, L-1331 bantu, L-1342 ulang, L-1351 biasa, L-1359 hampir, L-1399 sejam | J: the Jambatan card ID → `ms-x04-001` to `-007`; K: «Jambatan · …» → «Ch4 (extension)» |

The plan is `tools/ledger/batches/x04-plan.json`; `tools/ledger/stretch_batch.py csv` writes the same rows as a CSV if a write ever has to be done by hand.
No `docs/ledger-x04.csv` was needed. The snapshot is now the read-back (L-0001 to L-1505), so it also carries the 13 cells from the other session.
Their Kata-Kata follow-ups (cards `ms-c03-043` and `ms-j-daily-life-52`, the c04 note) are **not** part of Build A: the guard shows them as two non-blocking
Stage 1 gaps, and a re-run of the Jambatan importer would now rename `ms-j-daily-life-52` to «hari bulan» (I left that card as it was).

## 6. Screenshots

`docs/stretch-stage/`, phone width (Pixel 7, 412 px CSS), in kancil light, kancil dark, rebel light and rebel dark (`<n>-<screen>-<palette>-<theme>.png`):

| File | Screen |
| --- | --- |
| `01-sedia-list-*` | Sedia list: chapters 1 to 4 with 0, 1, 2 and 3 flames, the chip on chapter 4 |
| `02-chip-*` | the chapter 4 row and its «4 ⚡» chip |
| `03-stretch-screen-*` | the ⚡ screen |
| `04-decoy-frame-*` | a ⚡ frame with its decoy tile |
| `05-reply-step-*` | a reply step |
| `06-summary-*` | the end of a ⚡ run |
| `07-home-laju-*` | Home: the Laju! ⏱️ tile and the next-class card with the 🔥 bar |
| `08-rekod-*` | Rekod: stamps and the chapter rows with flames |

## 7. What changed from the design note, and why

1. **Three checkpoints, not two** (Sam). The new middle one is the chapter dialogue played once with the reply step; it needs a stamp kind 'dialogue'.
   "Played once" means every reply line answered at least once, right or wrong. Its bar segment has one item per reply line.
2. **Existing learners are not unlocked on day one.** Their 'ready' and 'chapter' flames light from their stamps, as designed, but no one has played a dialogue
   yet, so no one has 🔥 3/3 until they do (question 1).
3. **The chip appears only for a chapter that has a ⚡ stage** (only chapter 4 now). Elsewhere 🔥 3/3 shows no chip.
4. **Laju! ⏱️ "everywhere"** includes the speed-bonus marks in the points badge and the fastest-answer stat (both were ⚡), so ⚡ means one thing only (question 3).
5. **Rebel:** besides the chip (outlined on the soft fill, as in all themes), the Start ⚡ button is also outlined on the soft fill in Rebel, never a filled blue
   button; in the other themes it is filled with `--stretch`. The 🔥 bar's fill stays the brand colour (it is core progress), which in Rebel is also a blue.
6. **Reply step for core dialogues.** Core lines have no authored wrong replies, so the two wrong options are other lines of the same dialogue (same speaker
   first). No new Malay text is needed, so nothing new had to pass the guard. ⚡ lines carry two authored wrong replies (`choices`, `choices_en`).
7. **Guard details.** Each ⚡ pack is checked in its own pass, after the core packs of chapters 1 to N, so the register check sees what the course has taught
   by then, and nothing a ⚡ pack teaches counts for a core pack. Decoys and wrong replies are checked too (wrong replies as kind 'test': checked, but they
   teach nothing).
8. **No Cari Benda ⚡ and no Laju! ⚡ for chapter 4.** Of the 12 new words only «jadual» is a drawable object. Laju! ⚡ was optional.
9. **A ⚡ run** has the three least-played replies; the ⚡ screen also has a button for the whole ⚡ dialogue.
10. **Savefile merge:** one chapter stamp per kind and chapter (the earliest date wins), so two devices that reached a checkpoint on different days do not
    show two hanko. Before, 'ready' and 'chapter' could duplicate the same way.
11. **Teacher Desk:** the report rows carry 🔥 lit / checkpoints and the ⚡ state, shown after the prep cell; the prep count is unchanged (Sedia Kelas words only).
12. **Ledger J column:** the promoted rows' card-ID cells changed to the ⚡ IDs as well as their place (the card column is the ID registry).
13. **Frame 2** («Setahun sekali, keluarga saya datang dari Jepun.») has 7 tiles plus the decoy, 8 on the board; the note asked for 8 to 12 tiles.

## 8. ⚡ 4 content

- Cards: the 19 rows, ledger text; a short note each (root and chapter for affixed and reduplicated words).
- Frames (decoy in brackets): «Saya baca buku itu semula selepas makan malam.» (sebelum), «Setahun sekali, keluarga saya datang dari Jepun.» (sejam),
  «Sekarang sudah hampir pukul sebelas malam dan saya masih di pejabat.» (belum), «Minggu ini dia kerap balik dari pejabat malam-malam.» (jarang),
  «Boleh Encik ulang sekali lagi? Saya belum faham.» (sudah), «Esok pagi saya akan beri Encik jadual baru.» (semalam).
- Dialogue «An early start»: Puan Aini, Tanaka and Encik Rahman before a meeting; Puan Aini's annual leave. Reply steps at lines 2, 4, 6, 10 and 14; the wrong
  replies differ in meaning or tense (for example «Saya akan cetak jadual semalam»).
- Malay rules: standard forms only (no spoken forms at all), Malaysian forms, «dari» for places and times (no «daripada»: it is placed at chapter 6), no greeting
  beyond «Selamat pagi», no ber-, meN-, -kan or -i. Every word has a ledger row placed by chapter 4 or is a ⚡ 4 word; «balik kampung» was avoided because
  its row is placed at 9.
- Not used in a frame or line (cards only): buang, biasa, sejam (only as a decoy), seminit, serentak, siang.

## 9. What Build B still needs

1. **⚡ content for the other chapters:** 347 more «ChN (extension)» rows (366 − 19): 312 new and 35 promoted, chapters 1 to 3 and 5 to 17; source files and
   `tools/build_stretch.py N`; `live_stretch`. Chapter 10 is the second pilot (Stage 2 gates, the chapter 10 picture scene for Cari Benda ⚡).
2. **Ledger:** those rows plus the 219 new Jambatan rows (`tools/ledger/stretch_batch.py` handles the extension rows; Jambatan rows need the importer path and
   every new social word in `SOCIAL_SPLIT`); the 35 promoted IDs in `RETIRED_IDS` and `MOVED_CARDS`; Journal rows.
3. **Rules (Cikgu Sensai first, Sam approves):** the chapter 17 register pairs (je, tau, kejap, motor, komplen, bisnes, takkan), the optional ter- superlatives
   and look-alike roots, the «pasar raya» proper-noun quirk (proposal section 8).
4. **Hanashishou:** its audit must read extension rows like practice-pool rows (they set no scene chapter); its prep list loses the promoted words.
5. **Cikgu Sensai:** refresh `curriculum/reference/katakata/` (ledger and packs, x04 included); keep extension rows out of core counts.
6. **Optional parts:** Cari Benda ⚡ with six objects, Laju! ⚡, branching dialogue.
7. **Checks:** KD4 for the 12 new rows; native Japanese and Malay review of ⚡ 4 (all Japanese and the i18n drafts).
8. **Not Build A's, but now visible:** the Nombor & Masa follow-ups in section 5 (`ms-c03-043`, `ms-j-daily-life-52`).

## 10. Questions for Sam

1. **Existing learners and the dialogue flame.** Nobody has played a dialogue yet, so no one opens ⚡ until they play it once. Keep that, or count the dialogue
   flame lit for learners who already hold the chapter's 'chapter' stamp?
2. **"Played through once":** every reply answered once, right or wrong (as built). Should it need every reply right?
3. **Speed bonus and fastest answer** now show ⏱️ too (they were ⚡). Fine?
4. **Rebel:** the chip and the Start ⚡ button are outlined on a light blue fill (screenshots `02-chip-rebel-*`, `03-stretch-screen-rebel-*`). Enough apart from
   Rebel's own blue?
5. **Chapters with no ⚡ stage yet** show nothing at 🔥 3/3. Show a muted "⚡ soon" instead?
6. **⚡ 4 Malay** for the native read: «pukul lapan setengah», «beri Encik jadual baru» (two objects, no «kepada», which has no ledger row), «Percutian di mana?»,
   «Bawa payung, Puan!», «Encik datang awal hari ini!».
7. **The other session's ledger edits** (L-0141, L-1410): who does the Kata-Kata card follow-ups, and should the Jambatan card become «hari bulan» now?
8. **In both** = «Yes» for the 12 new rows (they are in Hanashishou scenes and now in Kata-Kata), and «Hanashishou meaning» left blank (same meaning). Right?
