# Kata-Kata hand-off

Last updated 13 Nov 2026 (Stage 2 build step 3b in progress: packs c11 to c18, one per commit; step 3a [report](STAGE-2-c10-report.md)).
Earlier: [clean-up after Stage 1](CLEANUP-2026-11-12.md), [road to 1.0](RELEASE-1.0.md).

## State

- 17 live packs, 760 cards: Kelas chapters 1 to 12, 20 Dunia scenes, 5 Jambatan scenes.
- Workbook: `content/source/2026-11-13_KataKata_VocabBank_v6.xlsx`, built by `tools/make_vocab_bank_v6.py` (v5 + chapters 10 to 12).
- Ledger snapshot: `content/ledger/malay-ledger.csv` = the sheet after the chapter 12 write-back (L-0001 to L-1266).
- Affix guard: stage-aware, rules from Cikgu Sensai `56627dc` (`content/rules/`).
- Next: chapters 13 to 17 (one pack each, units A and B in the same pack where the plan splits a chapter) and chapter 18
  (review only, no new words). Sam (G3): build them all, in order, each with an Opus check of its frames before the next.

## Chapter template (how c10 was built; use it for c11 to c18)

### 0. Read first

1. Cikgu Sensai (read only; never edit it): `docs/stage-2-plan.md` for the chapter's unit tables (section 2), its row in the
   section 3 affix table, its section 5 scene, and its revision anchors ("Revision, recognition and deferred candidates");
   `docs/stage-2-decisions.md`; the newest `docs/STAGE-2-*` report and `HANDOFF.md`. Check whether `curriculum/stage-rules.json`
   changed since `56627dc` (see "Rules" below).
2. This repo: this file, the newest chapter function in `tools/make_vocab_bank_v6.py` (`ch10`), `content/ms/kelas/c10.json`.

### 1. Sync the ledger snapshot

- Read the sheet (`1X8t3ENRVUY_NHJ3xEB7UY3OiwwUg_KUZT-ESbtiMC0o`) `Ledger!A1:T<last row>` with Google Sheets `get_values`. It is
  too large for one read: read `A1:T600` and `A601:T<last>`, then join: `{"values": part1 + part2}` in a scratch JSON.
- `python3 -I tools/ledger/sheet_to_snapshot.py <values.json>`; commit the snapshot on its own if it changed.
- List the chapter's rows: every row whose "Kata-Kata place" starts with `ChN` (core and recognition rows, new and existing).
  Every one of them gets a class card. Compare with the plan's unit tables; if they disagree, ask Sam.

### 2. Write the chapter function (`chNN(b)` in `tools/make_vocab_bank_v6.py`, added to `CHAPTERS`)

- **Cards:** `b.add_kelas(N, "L-xxxx", note=...)` per ledger row, in the plan's unit order (unit A, then B, then recognition).
  The card takes the ledger's Malay, English, Japanese, POS and affix tag. Options:
  - `tag="meN-"` (or the family) only when the ledger's Affix tag is blank: say so in the report and the Journal.
  - `drop=["ms-j-…"], place="ChN (unit NA)"` when the row also lists a Jambatan card: the class card replaces it, and the
    place loses its "Jambatan · …" part.
  - Recognition rows (the plan's spoken partners): the note ends with "Recognise only." (the importer then sets
    `recognise_only`). Begin the note with "Spoken: …".
- **Notes:** show the root on every affixed card: "meN- + tulis (Ch?)" from the ledger's "Root (KD4)" column, with the
  chapter where Kata-Kata teaches the root if it is a card (Kelas or Dunia). Add only what the ledger ("Sam's notes", the
  meaning cells) or the plan says: spelling notes (nasal changes in 11), register (standard first, spoken marked), whole words.
  No other etymology. Short usage examples are fine if they pass `stage-check` (step 4).
- **Frames:** 4 to 6 `b.add_frame(N, "ms-cNN-fNN", frame, example, meaning_en)`, from the plan's section 3 examples for the
  chapter. No bare affixes in a frame ("ber___" fails the guard); slot labels in brackets ("(verb)") are allowed and ignored.
  The first two frames go into Sedia Kelas.
- **Scenario:** `b.ks.append(["ms-cNN-sNN", N, title, speaker, ms, en])` for the plan's scene(s): one title for the chapter,
  both units' scenes in order. Recurring names: Tanaka, Puan Aini, Encik Rahman, Cik Mei Ling, Puan Siti (all in
  `content/rules/malay-proper-nouns.json`, which the checks skip). Fictional places and procedures only.
- **Malay:** Malaysian standard as in Kamus Dewan, never Indonesian; standard form first, spoken form marked; no
  faith-specific greetings; «terus», not «jalan lurus»; every line natural. A chapter may use only words placed in chapters
  1 to N: the guard blocks anything else in a Stage 2 pack.

### 3. Overrides (`tools/import-overrides.json`)

- `live_kelas`: add `cNN`. `chapter_titles["N"]`: ms / en / ja (from the charter's chapter focus; ja is a draft).
- `scenario_titles_ja["N"]`, `frame_meaning_ja` for each frame (drafts).
- `sedia_kelas_review["N"]`: review cards from earlier chapters: the plan's revision anchor set for the chapter, plus the
  roots (Kelas cards) of the affixed forms used in the frames and scenario. Keep it near 10 to 15.

### 4. Build and check

```bash
python3 -I tools/make_vocab_bank_v6.py content/source/2026-11-12_KataKata_VocabBank_v5.xlsx content/source/2026-11-13_KataKata_VocabBank_v6.xlsx --map <scratch>/map.json
python3 -I tools/import_vocab_bank.py content/source/2026-11-13_KataKata_VocabBank_v6.xlsx
python3 -I tools/import_hanashishou_bridge.py ../hanashishou   # Hanashishou checked out at e5e167c
node tools/stage-check.mjs N "<every note example you wrote>"
npm run check
npx vite build && npx vite preview --port 4173 &
node tests/e2e/smoke.cjs && node tests/e2e/fun.cjs
```

- The script always starts from v5 and the ledger at `LEDGER_BASELINE` (`acff0ca`), and rebuilds every chapter function, so
  earlier packs must come out unchanged (`git diff content/ms/kelas` shows only the new pack). The bridge importer must change
  only the Jambatan cards whose words became class cards. Re-run the script a second time and compare: it must be identical.
- If the ledger rows for the new chapter changed after `acff0ca` (a ledger session edited them), bump `LEDGER_BASELINE` to the
  new snapshot commit and check that the earlier chapters still rebuild unchanged.
- Update `tests/unit/core.test.ts` ("ships the … chapters") with the new chapter number.
- Commit the pack, workbook, script and overrides together ("Chapter N pack: …").

### 5. Ledger write-back (only after the pack commit)

1. Read the whole Ledger tab again (the "before" read) and run
   `python3 -I tools/ledger/writeback.py plan <before.json> <map.json>`: one entry per row with the J (card IDs) and K (place)
   cells to write. Stop and ask if a "before" value is not what the snapshot says.
2. Write with `update_values`: one call for a run of consecutive rows (`Ledger!J<first>:J<last>`), single calls for the rest.
   Write only J and K; leave Action ("KD4 check"), "Last changed" and "Changed by" alone.
3. Read the whole tab again (the "after" read) and run `python3 -I tools/ledger/writeback.py verify <before> <after> <map>`:
   it must say the changed cells are exactly the planned ones.
4. Append Journal rows (`Journal!A1:I1` with `append_values`; columns Date, Entry, Field, Before, After, By, Reason / source,
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

See [STAGE-2-c10-report.md](STAGE-2-c10-report.md) sections 4 to 6 (Sam's questions, the Cikgu Sensai snapshot refresh) and
[CLEANUP-2026-11-12.md](CLEANUP-2026-11-12.md) "Not done".
