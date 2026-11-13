# Kata-Kata hand-off

Last updated 13 Nov 2026 (Stage 2 build step 3d done: chapters 13 to 18 finished, [report](STAGE-2-step3d-report.md); step 3c [report](STAGE-2-step3c-report.md); step 3b [report](STAGE-2-c11-c18-report.md); step 3a [report](STAGE-2-c10-report.md)).
Earlier: [clean-up after Stage 1](CLEANUP-2026-11-12.md), [road to 1.0](RELEASE-1.0.md).

## State

- 43 live packs, 1121 cards: Kelas chapters 1 to 18 (chapter 18 is a review pack with no cards of its own), 20 Dunia scenes,
  5 Jambatan scenes.
- Workbook: `content/source/2026-11-13_KataKata_VocabBank_v6.xlsx`, built by `tools/make_vocab_bank_v6.py` (v5 + chapters 10 to 18).
- Ledger snapshot: `content/ledger/malay-ledger.csv` = the sheet after the step 3d write-back (L-0001 to L-1272; chapter 18 has no ledger cells).
- Affix guard: stage-aware, rules from Cikgu Sensai `a24a993` (`content/rules/`).
- Kata-Kata's half of Stage 2 (build step 3) is finished. Next: Cikgu Sensai step 4 (suites c10 to c17, step 5 chapter 18) and
  Hanashishou step 6; Cikgu Sensai should refresh `curriculum/reference/katakata/` with `c10.json` to `c18.json` and the ledger
  copy (this repo does not edit it). Open questions for Sam: [STAGE-2-step3d-report.md](STAGE-2-step3d-report.md) section 7.

## Backlog

- **Cari Benda picture scene for chapter 10** (Sam, 13 Nov 2026; build later, not in the c11 to c18 session): a Dunia-style
  picture scene made of the ber- verbs and the words of the working-day and new-neighbour scenes, built to the Stage 1 Cari Benda
  pattern (a Dunia scene with pictures, `Note`/emoji images in `tools/import-overrides.json`, at least 4 picture cards, see
  `tests/unit/core.test.ts` "every Dunia scene has enough pictures"), using only words placed up to chapter 10. Chapters 11 to 18
  get a picture scene only if the plan names one (it names none).
- The end-of-project Kamus Dewan and native Japanese checks.

## Naturalness notes

- **No «keputusan» phrasing in casual speech** (Sam, 13 Nov 2026): «Itu keputusan kita» sounds like a court or management ruling. Casual Malay would say something like «Baiklah, kita buat begini».

## Chapter template (how c10 to c18 were built)

### 0. Read first

1. Cikgu Sensai (read only; never edit it): `docs/stage-2-plan.md` for the chapter's unit tables (section 2), its row in the
   section 3 affix table, its section 5 scene, and its revision anchors ("Revision, recognition and deferred candidates");
   `docs/stage-2-decisions.md`; the newest `docs/STAGE-2-*` report and `HANDOFF.md`. Check whether `curriculum/stage-rules.json`
   changed since `a24a993` (see "Rules" below; last copied from `a24a993`, 77 fixtures).
2. This repo: this file, the newest chapter function in `tools/make_vocab_bank_v6.py` (`ch17`; `ch18` for a review chapter),
   `content/ms/kelas/c17.json`.

### 1. Sync the ledger snapshot

- Read the sheet (`1X8t3ENRVUY_NHJ3xEB7UY3OiwwUg_KUZT-ESbtiMC0o`) `Ledger!A1:T<last row>` with Google Sheets `get_values`. It is
  too large for one read: read `A1:T600` and `A601:T1400`, then join with `python3 -I tools/ledger/join_reads.py <a> <b> <out>`.
- `python3 -I tools/ledger/sheet_to_snapshot.py <values.json>`; commit the snapshot on its own if it changed.
- List the chapter's rows: every row whose "Kata-Kata place" starts with `ChN` (core and recognition rows, new and existing).
  Every one of them gets a class card. Compare with the plan's unit tables; if they disagree, ask Sam.

### 2. Write the chapter function (`chNN(b)` in `tools/make_vocab_bank_v6.py`, added to `CHAPTERS`)

- **Cards:** `b.add_kelas(N, "L-xxxx", note=...)` per ledger row, in the plan's unit order (unit A, then B, then recognition).
  The card takes the ledger's Malay, English, Japanese, POS and affix tag. Options:
  - `tag="meN-"` (or the family; `root` for a plain word) only when the ledger's Affix tag is blank: the pack schema rejects a
    blank tag. Say so in the report and the Journal. Do not change the ledger's tag.
  - Use the `kc(b, N, "L-xxxx", note, **opts)` helper (from c12 on): when the row also lists a Jambatan card, it drops that
    card and removes the "; Jambatan · …" part of the place, so the class card replaces it (c10 and c11 spell this out
    with `drop=[…], place="ChN (unit NA)"`). `term="…"` overrides the card's Malay (used once: c17 «takpe / tak apa»).
  - Recognition rows (the plan's spoken partners): the note ends with "Recognise only." (the importer then sets
    `recognise_only`). Begin the note with "Spoken: …".
- **Notes:** show the root on every affixed card: "meN- + tulis (Ch?)" from the ledger's "Root (KD4)" column, with the
  chapter where Kata-Kata teaches the root if it is a card (Kelas or Dunia). Add only what the ledger ("Sam's notes", the
  meaning cells) or the plan says: spelling notes (nasal changes in 11), register (standard first, spoken marked), whole words.
  No other etymology. Short usage examples are fine if they pass `stage-check` (step 4). Notes are not scanned by the guard,
  but write nothing in them that the rules forbid (no Indonesian forms).
- **Frames:** 4 to 6 `b.add_frame(N, "ms-cNN-fNN", frame, example, meaning_en)`, from the plan's section 3 examples for the
  chapter. No bare affixes in a frame ("ber___" fails the guard); slot labels in brackets ("(verb)") are allowed and ignored.
  The first two frames go into Sedia Kelas.
- **Scenario:** `b.ks.append(["ms-cNN-sNN", N, title, speaker, ms, en])` for the plan's scene(s): one title for the chapter,
  both units' scenes in order. Recurring names: Tanaka, Puan Aini, Encik Rahman, Cik Mei Ling, Puan Siti (all in
  `content/rules/malay-proper-nouns.json`, which the checks skip). Fictional places and procedures only.
- **Malay:** Malaysian standard as in Kamus Dewan, never Indonesian; standard form first, spoken form marked; no
  faith-specific greetings; «terus», not «jalan lurus»; every line natural. A chapter may use only words placed in chapters
  1 to N: the guard blocks anything else in a Stage 2 pack, including a word that has no ledger row at all ("ledger gap":
  «kepada», «kata», «ikut», «tahan», «mana» alone, «maksud» … are not in the ledger; rewrite the line).
- **Spoken forms (the register check):** a spoken form (tak, nak, dah, ni, tu, kat, macam tu, set, takpe, tak apa …) in a text
  needs (a) its standard form taught in an earlier segment (cards first, then frames, then scenario lines, chapters in order;
  only the card's *term*, a frame, an example or a scenario line counts, not a note) and (b) an earlier segment containing the
  spoken form whose card note starts with "Spoken:". So the standard form must come from an earlier chapter or an earlier card.
  If the standard form has no ledger row (as «tidak tahan»), it cannot be taught and the spoken card cannot pass: ask Sam.
- **Review chapter (c18):** no cards; frames, a scenario and `sedia_kelas_review["18"]` (15 to 20 cards from chapters 10 to 17).

### 3. Overrides (`tools/import-overrides.json`)

- `live_kelas`: add `cNN`. `chapter_titles["N"]`: ms / en / ja (from the charter's chapter focus; ja is a draft).
- `scenario_titles_ja["N"]`, `frame_meaning_ja` for each frame (drafts).
- `sedia_kelas_review["N"]`: review cards from earlier chapters: the plan's revision anchor set for the chapter, plus the
  roots (Kelas cards) of the affixed forms used in the frames and scenario. Keep it near 10 to 15.

### 4. Build and check

```bash
python3 -I tools/make_vocab_bank_v6.py content/source/2026-11-12_KataKata_VocabBank_v5.xlsx content/source/2026-11-13_KataKata_VocabBank_v6.xlsx --map <scratch>/map.json
python3 -I tools/import_vocab_bank.py content/source/2026-11-13_KataKata_VocabBank_v6.xlsx
python3 -I tools/import_hanashishou_bridge.py ../hanashishou   # Hanashishou checked out at the full commit e5e167cb32d554f1da926b875d4a0e7516de6cd9 (a short SHA cannot be fetched)
node tools/stage-check.mjs N "<every note example you wrote>"
npm run check
npx vite build && npx vite preview --port 4173 &
node tests/e2e/smoke.cjs && node tests/e2e/fun.cjs
```

- The script always starts from v5 and the ledger at `LEDGER_BASELINE` (`484ad8d`), and rebuilds every chapter function, so
  earlier packs must come out unchanged (`git diff content/ms/kelas` shows only the new pack). The bridge importer must change
  only the Jambatan cards whose words became class cards. Re-run the script a second time and compare: it must be identical.
- If the ledger rows for the new chapter changed after `323b5fc` (a ledger session edited them), bump `LEDGER_BASELINE` to the
  new snapshot commit and check that the earlier chapters still rebuild unchanged (done once, acff0ca to 323b5fc: four ber- tags).
- `node tools/stage-check.mjs N "<line>"` checks one line at a time, so it reports every spoken form as unlabelled and every
  standard form as untaught; the real verdict on spoken forms is `npm run content:check` (the guard runs the whole sequence).
- `tests/e2e/fun.cjs` seeds `Math.random`, so the practice run is the same every time (it used to need one lucky first-option
  click in 25 steps). A failure now means the content or the app changed.
- The checker also reads written «-lah» joined to a word («takpelah») from chapter 17: a Kata-Kata addition (`tools/stage-rules.mjs`,
  tests in `tests/unit/stage-rules.test.ts`), not in Cikgu Sensai's Python checker.
- Update `tests/unit/core.test.ts` ("ships the … chapters") with the new chapter number.
- Commit the pack, workbook, script and overrides together ("Chapter N pack: …").

### 5. Ledger write-back (only after the pack commit)

1. Read the whole Ledger tab again (the "before" read) and run
   `python3 -I tools/ledger/writeback.py plan <before.json> <map.json>`: one entry per row with the J (card IDs) and K (place)
   cells to write. Stop and ask if a "before" value is not what the snapshot says.
2. Write with `update_values`: `python3 -I tools/ledger/wbcalls.py <before> <map> <calls.json>` prints one `Ledger!J<a>:K<b>` call
   per run of consecutive planned rows (values included). Write only J and K; leave Action ("KD4 check"), "Last changed" and
   "Changed by" alone. Do the "after" read in a separate step, not in the same batch as the writes.
3. Read the whole tab again (the "after" read) and run `python3 -I tools/ledger/writeback.py verify <before> <after> <map>`:
   it must say the changed cells are exactly the planned ones.
4. Add Journal rows with `update_values` at the next free row (read the tab's tail first; do NOT use `append_values`: the blank row 176 makes it insert above that row and shift Sam's rows, as happened once in step 3d; fixed by a row move). Columns: Date, Entry, Field, Before, After, By, Reason / source,
   Pushed to, Status): one row for the new rows' card IDs, one per group of existing rows, one per decision or finding. "Pushed
   to" = "Sheet; Kata-Kata <pack commit>". Read the new Journal rows back.
5. `python3 -I tools/ledger/sheet_to_snapshot.py <after.json>` and commit the snapshot ("Ledger snapshot after the chapter N
   write-back").

### 6. Report and push

- Add the chapter to the report (or a new `docs/STAGE-2-cNN-report.md`): counts, commits, ledger cells and Journal rows,
  anything unverified, questions for Sam. Update this file's "State", the README content section and the CHANGELOG.
- Fast-forward `main` to the session branch and push both; Cloudflare Workers Builds deploys `main`.

## Rules (`content/rules/`)

- The three JSON files are copies of Cikgu Sensai files at the commit in `SOURCE.json`. Never edit them to make content pass.
  If Cikgu Sensai changes `curriculum/stage-rules.json` (or its fixtures), copy the new files, update the commit and the
  SHA-256 values in `SOURCE.json`, and run `npm run check` (the fixtures test runs every case).
- To compare with the Python checker after a change: run Cikgu Sensai's `language_checks.Checker` with a temporary root whose
  `curriculum/reference/katakata/` holds this repo's ledger snapshot and `content/ms/kelas/c*.json`, on the fixture cases
  (`tests/test_stage_rules.py`'s `run_case`) and on the segments `tools/affix-guard.mjs` `packSegments` builds. The results must
  have identical violation keys.

## Open items

See [STAGE-2-c11-c18-report.md](STAGE-2-c11-c18-report.md) sections 4 to 6 (what is unverified, Sam's questions, the native-read
list, the Cikgu Sensai snapshot refresh), [STAGE-2-c10-report.md](STAGE-2-c10-report.md) sections 4 to 6 and
[CLEANUP-2026-11-12.md](CLEANUP-2026-11-12.md) "Not done".
